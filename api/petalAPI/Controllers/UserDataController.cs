using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;
using System.Net.Http.Headers;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using PetalAPI.Data;
using PetalAPI.Models;
using PetalAPI.Models.DTOs;
using PetalAPI.Services;

namespace PetalAPI.Controllers;
[Route("api/[controller]")]
[Authorize]
public class UserDataController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly ILogger<UserDataController> _logger;
    private readonly ISpotifyTokenService _spotifyTokenService;
    private readonly IHttpClientFactory _httpClientFactory;

    public UserDataController(
        AppDbContext context, 
        ILogger<UserDataController> logger,
        ISpotifyTokenService spotifyTokenService,
        IHttpClientFactory httpClientFactory)
    {
        _context = context;
        _logger = logger;
        _spotifyTokenService = spotifyTokenService;
        _httpClientFactory = httpClientFactory;
    }

    private int? GetCurrentUserId()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
        if (userIdClaim == null || !int.TryParse(userIdClaim.Value, out var userId))
        {
            return null;
        }
        return userId;
    }

    /// <summary>
    /// Gets user's playlists from the database (synced from Spotify)
    /// </summary>
    [HttpGet("playlists")]
    public async Task<IActionResult> GetPlaylists()
    {
        var userId = GetCurrentUserId();
        if (userId == null)
        {
            return Unauthorized(new { error = "Invalid token" });
        }
        return await GetPlaylistsForUser(userId.Value);
    }

    /// <summary>
    /// Gets another user's playlists from the database
    /// </summary>
    [HttpGet("playlists/{targetUserId}")]
    public async Task<IActionResult> GetPlaylistsByUserId(int targetUserId)
    {
        var currentUserId = GetCurrentUserId();
        if (currentUserId == null)
        {
            return Unauthorized(new { error = "Invalid token" });
        }

        // Check if target user exists
        var targetUser = await _context.Users.FindAsync(targetUserId);
        if (targetUser == null)
        {
            return NotFound(new { error = "User not found" });
        }

        return await GetPlaylistsForUser(targetUserId);
    }

    private async Task<IActionResult> GetPlaylistsForUser(int userId)
    {
        try
        {
            var playlists = await _context.UserPlaylists
                .Where(up => up.UserId == userId)
                .Include(up => up.Playlist)
                .Select(up => new
                {
                    id = up.Playlist.SpotifyId,
                    name = up.Playlist.Name,
                    images = new[] { new { url = up.Playlist.ImageUrl } },
                    tracks = new { total = up.Playlist.TrackCount ?? 0 },
                    owner = new
                    {
                        id = up.Playlist.OwnerSpotifyId != null
                            ? up.Playlist.OwnerSpotifyId
                            : (up.Playlist.OwnerUserId.HasValue ? up.Playlist.OwnerUserId.Value.ToString() : null)
                    }
                })
                .ToListAsync();

            return Ok(new { items = playlists });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching user playlists for user {UserId}", userId);
            return StatusCode(500, new { error = "Internal server error" });
        }
    }

    /// <summary>
    /// Gets a specific playlist with its tracks from the database by Spotify playlist ID
    /// </summary>
    [HttpGet("playlist/{spotifyPlaylistId}")]
    public async Task<IActionResult> GetPlaylistWithTracks(string spotifyPlaylistId)
    {
        var userId = GetCurrentUserId();
        if (userId == null)
        {
            return Unauthorized(new { error = "Invalid token" });
        }

        try
        {
            // Find the playlist by Spotify ID
            var playlist = await _context.Playlists
                .FirstOrDefaultAsync(p => p.SpotifyId == spotifyPlaylistId);

            if (playlist == null)
            {
                return NotFound(new { error = "Playlist not found" });
            }

            // Get tracks with their albums and artists
            var tracks = await _context.PlaylistTracks
                .Where(pt => pt.PlaylistId == playlist.Id)
                .Include(pt => pt.Track)
                    .ThenInclude(t => t.Album)
                .Include(pt => pt.Track)
                    .ThenInclude(t => t.TrackArtists)
                    .ThenInclude(ta => ta.Artist)
                .OrderBy(pt => pt.Position)
                .Select(pt => new
                {
                    added_at = pt.AddedAt,
                    added_by = pt.AddedBySpotifyId != null ? new { id = pt.AddedBySpotifyId } : null,
                    track = new
                    {
                        id = pt.Track.SpotifyId,
                        trackId = pt.Track.Id,  // Database Track ID for navigation
                        name = pt.Track.Name,
                        duration_ms = pt.Track.DurationMs,
                        @explicit = pt.Track.Explicit,
                        artists = pt.Track.TrackArtists
                            .OrderBy(ta => ta.ArtistOrder)
                            .Select(ta => new
                            {
                                id = ta.Artist.SpotifyId,
                                name = ta.Artist.Name
                            }),
                        album = pt.Track.Album == null ? null : new
                        {
                            id = pt.Track.Album.SpotifyId,
                            name = pt.Track.Album.Name,
                            images = new[] { new { url = pt.Track.Album.ImageUrl } }
                        },
                        external_urls = new { spotify = $"https://open.spotify.com/track/{pt.Track.SpotifyId}" }
                    }
                })
                .ToListAsync();

            return Ok(new
            {
                id = playlist.SpotifyId,
                name = playlist.Name,
                description = playlist.Description,
                images = new[] { new { url = playlist.ImageUrl } },
                owner = new { id = playlist.OwnerSpotifyId },
                tracks = new
                {
                    total = tracks.Count,
                    items = tracks
                }
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching playlist {PlaylistId}", spotifyPlaylistId);
            return StatusCode(500, new { error = "Internal server error" });
        }
    }

    /// <summary>
    /// Gets a specific album with its tracks. If not cached, fetches from Spotify and stores in AlbumTracks.
    /// </summary>
    [HttpGet("album/{spotifyAlbumId}")]
    public async Task<IActionResult> GetAlbumWithTracks(string spotifyAlbumId)
    {
        var userId = GetCurrentUserId();
        if (userId == null)
        {
            return Unauthorized(new { error = "Invalid token" });
        }

        try
        {
            // Find the album by Spotify ID
            var album = await _context.Albums
                .FirstOrDefaultAsync(a => a.SpotifyId == spotifyAlbumId);

            // Check if we have cached album tracks
            var hasCachedTracks = album != null && await _context.AlbumTracks
                .AnyAsync(at => at.AlbumId == album.Id);

            if (!hasCachedTracks)
            {
                // Fetch from Spotify and cache
                await FetchAndCacheAlbumTracksFromSpotifyAsync(spotifyAlbumId, userId.Value);
                
                // Re-fetch the album after caching
                album = await _context.Albums
                    .FirstOrDefaultAsync(a => a.SpotifyId == spotifyAlbumId);
            }

            if (album == null)
            {
                return NotFound(new { error = "Album not found" });
            }

            // Get tracks with their artists
            var tracks = await _context.AlbumTracks
                .Where(at => at.AlbumId == album.Id)
                .Include(at => at.Track)
                    .ThenInclude(t => t.TrackArtists)
                    .ThenInclude(ta => ta.Artist)
                .OrderBy(at => at.Position)
                .Select(at => new
                {
                    id = at.Track.SpotifyId,
                    trackId = at.Track.Id,
                    name = at.Track.Name,
                    duration_ms = at.Track.DurationMs,
                    @explicit = at.Track.Explicit,
                    track_number = at.Position + 1,
                    artists = at.Track.TrackArtists
                        .OrderBy(ta => ta.ArtistOrder)
                        .Select(ta => new
                        {
                            id = ta.Artist.SpotifyId,
                            name = ta.Artist.Name
                        }),
                    external_urls = new { spotify = $"https://open.spotify.com/track/{at.Track.SpotifyId}" }
                })
                .ToListAsync();

            // Get album artists (from the first track's artists as a fallback)
            var albumArtists = tracks.FirstOrDefault()?.artists ?? Enumerable.Empty<object>();

            return Ok(new
            {
                id = album.SpotifyId,
                name = album.Name,
                images = new[] { new { url = album.ImageUrl } },
                release_date = album.ReleaseDate?.ToString("yyyy-MM-dd"),
                album_type = album.AlbumType,
                total_tracks = album.TotalTracks ?? tracks.Count,
                label = album.Label,
                artists = albumArtists,
                tracks = new
                {
                    total = tracks.Count,
                    items = tracks
                }
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching album {AlbumId}", spotifyAlbumId);
            return StatusCode(500, new { error = "Internal server error" });
        }
    }

    private async Task FetchAndCacheAlbumTracksFromSpotifyAsync(string spotifyAlbumId, int userId)
    {
        try
        {
            _logger.LogInformation("Starting FetchAndCache for album: {AlbumId}", spotifyAlbumId);
            
            var accessToken = await _spotifyTokenService.GetValidAccessTokenAsync(userId);
            var client = _httpClientFactory.CreateClient();
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);

            // Fetch album details from Spotify
            var albumResponse = await client.GetAsync($"https://api.spotify.com/v1/albums/{spotifyAlbumId}");
            if (!albumResponse.IsSuccessStatusCode)
            {
                var errorContent = await albumResponse.Content.ReadAsStringAsync();
                _logger.LogError("Failed to fetch album from Spotify: {AlbumId}. Status: {Status}. Error: {Error}", 
                    spotifyAlbumId, albumResponse.StatusCode, errorContent);
                return;
            }

            var albumContent = await albumResponse.Content.ReadAsStringAsync();
            var albumData = JsonSerializer.Deserialize<JsonElement>(albumContent);

            // Get or create album
            var album = await GetOrCreateAlbumFromSpotifyDataAsync(albumData);
            if (album == null)
            {
                 _logger.LogError("Failed to get/create album for {AlbumId}", spotifyAlbumId);
                 return;
            }
            _logger.LogInformation("Album resolved: {AlbumId} (DB ID: {DbId})", spotifyAlbumId, album.Id);

            // Clear existing album tracks
            var existingAlbumTracks = await _context.AlbumTracks
                .Where(at => at.AlbumId == album.Id)
                .ToListAsync();
            _context.AlbumTracks.RemoveRange(existingAlbumTracks);
            await _context.SaveChangesAsync();
            _logger.LogInformation("Cleared {Count} existing tracks for album {DbId}", existingAlbumTracks.Count, album.Id);

            // Process tracks from album
            if (albumData.TryGetProperty("tracks", out var tracksElement) &&
                tracksElement.TryGetProperty("items", out var trackItems))
            {
                int position = 0;
                int addedCount = 0;
                foreach (var trackItem in trackItems.EnumerateArray())
                {
                    // Debug log for track item structure
                    // _logger.LogInformation("Processing track item: {Json}", trackItem.GetRawText());

                    var track = await GetOrCreateTrackFromSpotifyDataAsync(trackItem, album.Id);
                    if (track != null)
                    {
                        try
                        {
                            var albumTrack = new AlbumTrack
                            {
                                AlbumId = album.Id,
                                TrackId = track.Id,
                                Position = position
                            };
                            _context.AlbumTracks.Add(albumTrack);
                            await _context.SaveChangesAsync();
                            addedCount++;
                        }
                        catch (DbUpdateException ex)
                        {
                            _logger.LogWarning(ex, "Failed to add AlbumTrack relation for Album {AlbumId} Track {TrackId} Position {Pos}", 
                                album.Id, track.Id, position);
                            _context.ChangeTracker.Clear();
                        }
                    }
                    else
                    {
                         _logger.LogWarning("GetOrCreateTrack returned null for a track item in album {AlbumId}", spotifyAlbumId);
                    }
                    position++;
                }
                _logger.LogInformation("Added {Count} tracks to AlbumTracks table for album {AlbumId}", addedCount, spotifyAlbumId);
            }
            else
            {
                _logger.LogWarning("No 'tracks.items' found in Spotify response for album {AlbumId}", spotifyAlbumId);
            }

            var finalCount = await _context.AlbumTracks.Where(at => at.AlbumId == album.Id).CountAsync();
            _logger.LogInformation("Final DB count for album {DbId}: {Count}", album.Id, finalCount);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error caching album tracks from Spotify: {AlbumId}", spotifyAlbumId);
        }
    }

    private async Task<Album?> GetOrCreateAlbumFromSpotifyDataAsync(JsonElement albumData)
    {
        var spotifyId = albumData.TryGetProperty("id", out var idProp) ? idProp.GetString() : null;
        if (string.IsNullOrEmpty(spotifyId)) return null;

        var existingAlbum = await _context.Albums.FirstOrDefaultAsync(a => a.SpotifyId == spotifyId);
        if (existingAlbum != null)
        {
            // Update album metadata
            existingAlbum.Name = albumData.TryGetProperty("name", out var nameProp) ? nameProp.GetString() ?? existingAlbum.Name : existingAlbum.Name;
            existingAlbum.TotalTracks = albumData.TryGetProperty("total_tracks", out var totalProp) ? totalProp.GetInt32() : existingAlbum.TotalTracks;
            existingAlbum.Label = albumData.TryGetProperty("label", out var labelProp) ? labelProp.GetString() : existingAlbum.Label;
            if (albumData.TryGetProperty("images", out var images) && images.GetArrayLength() > 0)
            {
                existingAlbum.ImageUrl = images[0].TryGetProperty("url", out var urlProp) ? urlProp.GetString() : existingAlbum.ImageUrl;
            }
            await _context.SaveChangesAsync();
            return existingAlbum;
        }

        string? imageUrl = null;
        if (albumData.TryGetProperty("images", out var imagesElement) && imagesElement.GetArrayLength() > 0)
        {
            imageUrl = imagesElement[0].TryGetProperty("url", out var urlProp) ? urlProp.GetString() : null;
        }

        DateTime? releaseDate = null;
        if (albumData.TryGetProperty("release_date", out var releaseDateProp))
        {
            var releaseDateStr = releaseDateProp.GetString();
            if (!string.IsNullOrEmpty(releaseDateStr))
            {
                if (DateTime.TryParse(releaseDateStr, out var parsedDate))
                    releaseDate = parsedDate;
                else if (releaseDateStr.Length == 4 && int.TryParse(releaseDateStr, out var year))
                    releaseDate = new DateTime(year, 1, 1);
            }
        }

        var album = new Album
        {
            SpotifyId = spotifyId,
            Name = albumData.TryGetProperty("name", out var nameP) ? nameP.GetString() ?? "Unknown" : "Unknown",
            ReleaseDate = releaseDate,
            AlbumType = albumData.TryGetProperty("album_type", out var typeP) ? typeP.GetString() : null,
            ImageUrl = imageUrl,
            Label = albumData.TryGetProperty("label", out var labP) ? labP.GetString() : null,
            TotalTracks = albumData.TryGetProperty("total_tracks", out var totP) ? totP.GetInt32() : null
        };

        try
        {
            _context.Albums.Add(album);
            await _context.SaveChangesAsync();
            return album;
        }
        catch (DbUpdateException)
        {
            _context.Entry(album).State = EntityState.Detached;
            return await _context.Albums.FirstOrDefaultAsync(a => a.SpotifyId == spotifyId);
        }
    }

    private async Task<Track?> GetOrCreateTrackFromSpotifyDataAsync(JsonElement trackData, int? albumId)
    {
        var spotifyId = trackData.TryGetProperty("id", out var idProp) ? idProp.GetString() : null;
        if (string.IsNullOrEmpty(spotifyId)) return null;

        var existingTrack = await _context.Tracks.FirstOrDefaultAsync(t => t.SpotifyId == spotifyId);
        if (existingTrack != null) return existingTrack;

        var track = new Track
        {
            SpotifyId = spotifyId,
            Name = trackData.TryGetProperty("name", out var nameProp) ? nameProp.GetString() ?? "Unknown" : "Unknown",
            DurationMs = trackData.TryGetProperty("duration_ms", out var durationProp) ? durationProp.GetInt32() : 0,
            Explicit = trackData.TryGetProperty("explicit", out var explicitProp) && explicitProp.GetBoolean(),
            AlbumId = albumId
        };

        try
        {
            _context.Tracks.Add(track);
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateException)
        {
            _context.Entry(track).State = EntityState.Detached;
            return await _context.Tracks.FirstOrDefaultAsync(t => t.SpotifyId == spotifyId);
        }

        // Process artists
        if (trackData.TryGetProperty("artists", out var artistsElement))
        {
            int order = 0;
            foreach (var artistElement in artistsElement.EnumerateArray())
            {
                var artist = await GetOrCreateArtistFromSpotifyDataAsync(artistElement);
                if (artist != null)
                {
                    var existingTrackArtist = await _context.TrackArtists
                        .FirstOrDefaultAsync(ta => ta.TrackId == track.Id && ta.ArtistId == artist.Id);

                    if (existingTrackArtist == null)
                    {
                        try
                        {
                            _context.TrackArtists.Add(new TrackArtist
                            {
                                TrackId = track.Id,
                                ArtistId = artist.Id,
                                ArtistOrder = order
                            });
                            await _context.SaveChangesAsync();
                        }
                        catch (DbUpdateException)
                        {
                            _context.ChangeTracker.Clear();
                        }
                    }
                    order++;
                }
            }
        }

        return track;
    }

    private async Task<Artist?> GetOrCreateArtistFromSpotifyDataAsync(JsonElement artistData)
    {
        var spotifyId = artistData.TryGetProperty("id", out var idProp) ? idProp.GetString() : null;
        if (string.IsNullOrEmpty(spotifyId)) return null;

        var existingArtist = await _context.Artists.FirstOrDefaultAsync(a => a.SpotifyId == spotifyId);
        if (existingArtist != null) return existingArtist;

        string? imageUrl = null;
        if (artistData.TryGetProperty("images", out var imagesElement) && imagesElement.GetArrayLength() > 0)
        {
            imageUrl = imagesElement[0].TryGetProperty("url", out var urlProp) ? urlProp.GetString() : null;
        }

        var artist = new Artist
        {
            SpotifyId = spotifyId,
            Name = artistData.TryGetProperty("name", out var nameProp) ? nameProp.GetString() ?? "Unknown" : "Unknown",
            ImageUrl = imageUrl
        };

        try
        {
            _context.Artists.Add(artist);
            await _context.SaveChangesAsync();
            return artist;
        }
        catch (DbUpdateException)
        {
            _context.Entry(artist).State = EntityState.Detached;
            return await _context.Artists.FirstOrDefaultAsync(a => a.SpotifyId == spotifyId);
        }
    }

    /// <summary>
    /// Gets user's liked tracks from the database (synced from Spotify)
    /// Uses UserLikedTracksEnriched view for efficient querying
    /// </summary>
    [HttpGet("liked-tracks")]
    public async Task<IActionResult> GetLikedTracks(
        [FromQuery] int limit = 50,
        [FromQuery] int offset = 0)
    {
        var userId = GetCurrentUserId();
        if (userId == null)
        {
            return Unauthorized(new { error = "Invalid token" });
        }
        return await GetLikedTracksForUser(userId.Value, limit, offset);
    }

    /// <summary>
    /// Gets another user's liked tracks from the database
    /// </summary>
    [HttpGet("liked-tracks/{targetUserId}")]
    public async Task<IActionResult> GetLikedTracksByUserId(
        int targetUserId,
        [FromQuery] int limit = 50,
        [FromQuery] int offset = 0)
    {
        var currentUserId = GetCurrentUserId();
        if (currentUserId == null)
        {
            return Unauthorized(new { error = "Invalid token" });
        }

        // Check if target user exists
        var targetUser = await _context.Users.FindAsync(targetUserId);
        if (targetUser == null)
        {
            return NotFound(new { error = "User not found" });
        }

        return await GetLikedTracksForUser(targetUserId, limit, offset);
    }

    private async Task<IActionResult> GetLikedTracksForUser(int userId, int limit, int offset)
    {
        try
        {
            if (limit < 1 || limit > 1000) limit = 50;
            if (offset < 0) offset = 0;

            // Query the enriched view
            var rawResults = await _context.Database
                .SqlQueryRaw<LikedTrackViewRow>(@"
                    SELECT 
                        UserId, LikedAt, TrackId, TrackSpotifyId, TrackName, 
                        DurationMs, ""Explicit"", Popularity, Isrc,
                        AlbumId, AlbumSpotifyId, AlbumName, AlbumImageUrl, AlbumReleaseDate, AlbumType,
                        ArtistId, ArtistSpotifyId, ArtistName, ArtistOrder
                    FROM UserLikedTracksEnriched 
                    WHERE UserId = {0}
                    ORDER BY LikedAt DESC, TrackId, ArtistOrder", userId)
                .ToListAsync();

            // Group by track and aggregate artists
            var groupedTracks = rawResults
                .GroupBy(r => new { r.TrackSpotifyId, r.LikedAt })
                .Skip(offset)
                .Take(limit)
                .Select(g => new
                {
                    likedAt = g.First().LikedAt,
                    track = new
                    {
                        id = g.First().TrackId,
                        spotifyId = g.First().TrackSpotifyId,
                        name = g.First().TrackName,
                        durationMs = g.First().DurationMs,
                        @explicit = g.First().Explicit,
                        popularity = g.First().Popularity,
                        isrc = g.First().Isrc,
                        artists = g.Where(x => x.ArtistSpotifyId != null)
                            .OrderBy(x => x.ArtistOrder)
                            .Select(x => new { id = x.ArtistSpotifyId, name = x.ArtistName })
                            .Distinct()
                            .ToList(),
                        album = g.First().AlbumSpotifyId == null ? null : new
                        {
                            id = g.First().AlbumSpotifyId,
                            name = g.First().AlbumName,
                            imageUrl = g.First().AlbumImageUrl,
                            releaseDate = g.First().AlbumReleaseDate,
                            albumType = g.First().AlbumType
                        }
                    }
                })
                .ToList();

            var total = rawResults
                .Select(r => r.TrackSpotifyId)
                .Distinct()
                .Count();

            return Ok(new
            {
                items = groupedTracks,
                total,
                limit,
                offset
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching liked tracks for user {UserId}", userId);
            return StatusCode(500, new { error = "Internal server error" });
        }
    }

    /// <summary>
    /// Gets user's recently played tracks from database
    /// </summary>
    [HttpGet("recently-played")]
    public async Task<IActionResult> GetRecentlyPlayed(
        [FromQuery] int limit = 50,
        [FromQuery] int offset = 0)
    {
        var userId = GetCurrentUserId();
        if (userId == null)
        {
            return Unauthorized(new { error = "Invalid token" });
        }
        return await GetRecentlyPlayedForUser(userId.Value, limit, offset);
    }

    /// <summary>
    /// Gets another user's recently played tracks from database
    /// </summary>
    [HttpGet("recently-played/{targetUserId}")]
    public async Task<IActionResult> GetRecentlyPlayedByUserId(
        int targetUserId,
        [FromQuery] int limit = 50,
        [FromQuery] int offset = 0)
    {
        var currentUserId = GetCurrentUserId();
        if (currentUserId == null)
        {
            return Unauthorized(new { error = "Invalid token" });
        }

        // Check if target user exists
        var targetUser = await _context.Users.FindAsync(targetUserId);
        if (targetUser == null)
        {
            return NotFound(new { error = "User not found" });
        }

        return await GetRecentlyPlayedForUser(targetUserId, limit, offset);
    }

    private async Task<IActionResult> GetRecentlyPlayedForUser(int userId, int limit, int offset)
    {
        try
        {
            if (limit < 1 || limit > 1000) limit = 50;
            if (offset < 0) offset = 0;

            // Get all listening history with tracks, then group in memory
            var allHistory = await _context.ListeningHistory
                .Where(lh => lh.UserId == userId)
                .Include(lh => lh.Track)
                    .ThenInclude(t => t.Album)
                .Include(lh => lh.Track)
                    .ThenInclude(t => t.TrackArtists)
                    .ThenInclude(ta => ta.Artist)
                .OrderByDescending(lh => lh.PlayedAt)
                .ToListAsync();

            // Group by track and get the most recent play for each unique track
            var recentlyPlayed = allHistory
                .GroupBy(lh => lh.TrackId)
                .Select(g => g.First()) // First item is already the most recent due to OrderBy
                .Skip(offset)
                .Take(limit)
                .Select(lh => new
                {
                    track = new
                    {
                        id = lh.Track.SpotifyId,
                        name = lh.Track.Name,
                        duration_ms = lh.Track.DurationMs,
                        @explicit = lh.Track.Explicit,
                        artists = lh.Track.TrackArtists.Select(ta => new { id = ta.Artist.SpotifyId, name = ta.Artist.Name }),
                        album = lh.Track.Album == null ? null : new
                        {
                            id = lh.Track.Album.SpotifyId,
                            name = lh.Track.Album.Name,
                            images = new[] { new { url = lh.Track.Album.ImageUrl } }
                        }
                    },
                    played_at = lh.PlayedAt
                })
                .ToList();

            var total = allHistory
                .GroupBy(lh => lh.TrackId)
                .Count();

            return Ok(new
            {
                items = recentlyPlayed,
                total,
                limit,
                offset
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching recently played for user {UserId}", userId);
            return StatusCode(500, new { error = "Internal server error" });
        }
    }

    /// <summary>
    /// Gets user's liked albums from the database (synced from Spotify)
    /// </summary>
    [HttpGet("liked-albums")]
    public async Task<IActionResult> GetLikedAlbums(
        [FromQuery] int limit = 50,
        [FromQuery] int offset = 0)
    {
        var userId = GetCurrentUserId();
        if (userId == null)
        {
            return Unauthorized(new { error = "Invalid token" });
        }
        return await GetLikedAlbumsForUser(userId.Value, limit, offset);
    }

    /// <summary>
    /// Gets another user's liked albums from the database
    /// </summary>
    [HttpGet("liked-albums/{targetUserId}")]
    public async Task<IActionResult> GetLikedAlbumsByUserId(
        int targetUserId,
        [FromQuery] int limit = 50,
        [FromQuery] int offset = 0)
    {
        var currentUserId = GetCurrentUserId();
        if (currentUserId == null)
        {
            return Unauthorized(new { error = "Invalid token" });
        }

        var targetUser = await _context.Users.FindAsync(targetUserId);
        if (targetUser == null)
        {
            return NotFound(new { error = "User not found" });
        }

        return await GetLikedAlbumsForUser(targetUserId, limit, offset);
    }

    private async Task<IActionResult> GetLikedAlbumsForUser(int userId, int limit, int offset)
    {
        try
        {
            if (limit < 1 || limit > 1000) limit = 50;
            if (offset < 0) offset = 0;

            var likedAlbums = await _context.UserLikedAlbums
                .Where(ula => ula.UserId == userId)
                .Include(ula => ula.Album)
                .OrderByDescending(ula => ula.LikedAt)
                .Skip(offset)
                .Take(limit)
                .Select(ula => new
                {
                    likedAt = ula.LikedAt,
                    album = new
                    {
                        id = ula.Album.SpotifyId,
                        name = ula.Album.Name,
                        imageUrl = ula.Album.ImageUrl,
                        releaseDate = ula.Album.ReleaseDate,
                        albumType = ula.Album.AlbumType,
                        totalTracks = ula.Album.TotalTracks
                    }
                })
                .ToListAsync();

            var total = await _context.UserLikedAlbums
                .Where(ula => ula.UserId == userId)
                .CountAsync();

            return Ok(new
            {
                items = likedAlbums,
                total,
                limit,
                offset
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching liked albums for user {UserId}", userId);
            return StatusCode(500, new { error = "Internal server error" });
        }
    }

    /// <summary>
    /// Gets user's followed artists from the database (synced from Spotify)
    /// </summary>
    [HttpGet("followed-artists")]
    public async Task<IActionResult> GetFollowedArtists(
        [FromQuery] int limit = 50,
        [FromQuery] int offset = 0)
    {
        var userId = GetCurrentUserId();
        if (userId == null)
        {
            return Unauthorized(new { error = "Invalid token" });
        }
        return await GetFollowedArtistsForUser(userId.Value, limit, offset);
    }

    /// <summary>
    /// Gets another user's followed artists from the database
    /// </summary>
    [HttpGet("followed-artists/{targetUserId}")]
    public async Task<IActionResult> GetFollowedArtistsByUserId(
        int targetUserId,
        [FromQuery] int limit = 50,
        [FromQuery] int offset = 0)
    {
        var currentUserId = GetCurrentUserId();
        if (currentUserId == null)
        {
            return Unauthorized(new { error = "Invalid token" });
        }

        var targetUser = await _context.Users.FindAsync(targetUserId);
        if (targetUser == null)
        {
            return NotFound(new { error = "User not found" });
        }

        return await GetFollowedArtistsForUser(targetUserId, limit, offset);
    }

    private async Task<IActionResult> GetFollowedArtistsForUser(int userId, int limit, int offset)
    {
        try
        {
            if (limit < 1 || limit > 1000) limit = 50;
            if (offset < 0) offset = 0;

            var followedArtists = await _context.UserFollowedArtists
                .Where(ufa => ufa.UserId == userId)
                .Include(ufa => ufa.Artist)
                .OrderByDescending(ufa => ufa.FollowedAt)
                .Skip(offset)
                .Take(limit)
                .Select(ufa => new
                {
                    followedAt = ufa.FollowedAt,
                    artist = new
                    {
                        id = ufa.Artist.SpotifyId,
                        name = ufa.Artist.Name,
                        imageUrl = ufa.Artist.ImageUrl,
                        popularity = ufa.Artist.Popularity
                    }
                })
                .ToListAsync();

            var total = await _context.UserFollowedArtists
                .Where(ufa => ufa.UserId == userId)
                .CountAsync();

            return Ok(new
            {
                items = followedArtists,
                total,
                limit,
                offset
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching followed artists for user {UserId}", userId);
            return StatusCode(500, new { error = "Internal server error" });
        }
    }
}
