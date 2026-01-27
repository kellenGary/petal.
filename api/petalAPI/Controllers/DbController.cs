using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Security.Claims;
using PetalAPI.Services;
using PetalAPI.Data;
using PetalAPI.Models;
using System.ComponentModel;

namespace PetalAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class DbController : ControllerBase
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<DbController> _logger;
    private readonly AppDbContext _context;
    private readonly ISpotifyTokenService _spotifyTokenService;

    public DbController(
        IHttpClientFactory httpClientFactory,
        ILogger<DbController> logger,
        AppDbContext context,
        ISpotifyTokenService spotifyTokenService)
    {
        _httpClientFactory = httpClientFactory;
        _logger = logger;
        _context = context;
        _spotifyTokenService = spotifyTokenService;
    }

    [HttpGet("users")]
    public async Task<IActionResult> GetUsers()
    {
        _logger.LogInformation("[API] Fetching all users from database");

        var currentUser = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        var users = await _context.Users.Where(u => u.Id.ToString() != currentUser).ToListAsync();

        _logger.LogInformation("[API] Retrieved {UserCount} users", users.Count);

        return Ok(users);
    }

    [HttpGet("tracks")]
    [AllowAnonymous]
    public async Task<IActionResult> getTracks()
    {
        _logger.LogInformation("[API] Fetching 50 most recent tracks from database using TrackDetailsWithArtists view");

        try
        {
            var rows = await _context.Database
                .SqlQueryRaw<Models.DTOs.TrackDetailsViewRow>(@"
                    SELECT TrackId, TrackSpotifyId, TrackName, DurationMs, ""Explicit"", Popularity,
                           AlbumId, AlbumSpotifyId, AlbumName, AlbumImageUrl, AlbumReleaseDate,
                           ArtistId, ArtistSpotifyId, ArtistName, ArtistOrder
                    FROM TrackDetailsWithArtists
                    WHERE TrackId IN (
                        SELECT DISTINCT TrackId FROM TrackDetailsWithArtists ORDER BY TrackId DESC LIMIT 50
                    )
                    ORDER BY TrackId DESC, ArtistOrder")
                .ToListAsync();

            // Group by track to aggregate artists
            var tracks = rows
                .GroupBy(r => r.TrackId)
                .Select(g =>
                {
                    var first = g.First();
                    return new
                    {
                        id = first.TrackId,
                        spotify_id = first.TrackSpotifyId,
                        name = first.TrackName,
                        duration_ms = first.DurationMs,
                        @explicit = first.Explicit,
                        popularity = first.Popularity,
                        album = first.AlbumId == null ? null : new
                        {
                            id = first.AlbumId,
                            spotify_id = first.AlbumSpotifyId,
                            name = first.AlbumName,
                            image_url = first.AlbumImageUrl,
                            release_date = first.AlbumReleaseDate
                        },
                        artists = g
                            .Where(r => r.ArtistId != null)
                            .OrderBy(r => r.ArtistOrder)
                            .Select(r => new { id = r.ArtistId, spotify_id = r.ArtistSpotifyId, name = r.ArtistName, order = r.ArtistOrder })
                            .ToList()
                    };
                })
                .ToList();

            _logger.LogInformation("[API] Retrieved {TrackCount} tracks with enriched data", tracks.Count);

            return Ok(tracks);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching tracks from TrackDetailsWithArtists view");
            return StatusCode(500, new { error = "Internal server error" });
        }
    }

    /// <summary>
    /// Backfills missing album and artist data for tracks
    /// </summary>
    [HttpPost("backfill-track-albums")]
    public async Task<IActionResult> BackfillTrackAlbums()
    {
        var userIdClaim = User.FindFirst("sub")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userIdClaim) || !int.TryParse(userIdClaim, out var userId))
        {
            return Unauthorized("Invalid user");
        }

        // Get access token for Spotify API
        var accessToken = await _spotifyTokenService.GetValidAccessTokenAsync(userId);
        if (string.IsNullOrEmpty(accessToken))
        {
            return BadRequest("Could not get Spotify access token");
        }

        // Find all tracks without an album
        var tracksWithoutAlbum = await _context.Tracks
            .Where(t => t.AlbumId == null && t.SpotifyId != null)
            .ToListAsync();

        _logger.LogInformation("[BackfillAlbums] Found {Count} tracks without albums", tracksWithoutAlbum.Count);

        if (tracksWithoutAlbum.Count == 0)
        {
            return Ok(new { message = "No tracks need album backfill", updated = 0 });
        }

        var client = _httpClientFactory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);

        int updated = 0;
        int failed = 0;
        int artistsAdded = 0;

        // Process in batches of 50 (Spotify API limit for /tracks endpoint)
        var batches = tracksWithoutAlbum
            .Select((track, index) => new { track, index })
            .GroupBy(x => x.index / 50)
            .Select(g => g.Select(x => x.track).ToList())
            .ToList();

        foreach (var batch in batches)
        {
            var spotifyIds = string.Join(",", batch.Select(t => t.SpotifyId));
            var url = $"https://api.spotify.com/v1/tracks?ids={spotifyIds}";

            try
            {
                var response = await client.GetAsync(url);
                if (!response.IsSuccessStatusCode)
                {
                    var error = await response.Content.ReadAsStringAsync();
                    _logger.LogError("[BackfillAlbums] Spotify API error: {Error}", error);
                    failed += batch.Count;
                    continue;
                }

                var content = await response.Content.ReadAsStringAsync();
                var data = JsonSerializer.Deserialize<JsonElement>(content);

                if (!data.TryGetProperty("tracks", out var tracksArray))
                {
                    failed += batch.Count;
                    continue;
                }

                foreach (var trackData in tracksArray.EnumerateArray())
                {
                    if (trackData.ValueKind == JsonValueKind.Null)
                    {
                        failed++;
                        continue;
                    }

                    var spotifyId = trackData.TryGetProperty("id", out var idProp) ? idProp.GetString() : null;
                    if (string.IsNullOrEmpty(spotifyId)) continue;

                    var dbTrack = batch.FirstOrDefault(t => t.SpotifyId == spotifyId);
                    if (dbTrack == null) continue;

                    // Process album
                    if (trackData.TryGetProperty("album", out var albumElement) && albumElement.ValueKind != JsonValueKind.Null)
                    {
                        var albumSpotifyId = albumElement.TryGetProperty("id", out var albumIdProp) ? albumIdProp.GetString() : null;
                        if (!string.IsNullOrEmpty(albumSpotifyId))
                        {
                            var album = await _context.Albums.FirstOrDefaultAsync(a => a.SpotifyId == albumSpotifyId);
                            if (album == null)
                            {
                                // Get image URL
                                string? imageUrl = null;
                                if (albumElement.TryGetProperty("images", out var imagesElement) && 
                                    imagesElement.ValueKind == JsonValueKind.Array && 
                                    imagesElement.GetArrayLength() > 0)
                                {
                                    imageUrl = imagesElement[0].TryGetProperty("url", out var urlProp) ? urlProp.GetString() : null;
                                }

                                // Parse release date
                                DateTime? releaseDate = null;
                                if (albumElement.TryGetProperty("release_date", out var releaseDateProp))
                                {
                                    var releaseDateStr = releaseDateProp.GetString();
                                    if (!string.IsNullOrEmpty(releaseDateStr))
                                    {
                                        if (DateTime.TryParse(releaseDateStr, out var parsedDate))
                                        {
                                            releaseDate = parsedDate;
                                        }
                                        else if (releaseDateStr.Length == 4 && int.TryParse(releaseDateStr, out var year))
                                        {
                                            releaseDate = new DateTime(year, 1, 1);
                                        }
                                    }
                                }

                                album = new Album
                                {
                                    SpotifyId = albumSpotifyId,
                                    Name = albumElement.TryGetProperty("name", out var nameProp) ? nameProp.GetString() ?? "Unknown" : "Unknown",
                                    ReleaseDate = releaseDate,
                                    AlbumType = albumElement.TryGetProperty("album_type", out var typeProp) ? typeProp.GetString() : null,
                                    ImageUrl = imageUrl
                                };

                                try
                                {
                                    _context.Albums.Add(album);
                                    await _context.SaveChangesAsync();
                                    _logger.LogDebug("[BackfillAlbums] Created album: {AlbumName}", album.Name);
                                }
                                catch (DbUpdateException ex) when (ex.InnerException?.Message.Contains("UNIQUE constraint failed") == true)
                                {
                                    _context.Entry(album).State = EntityState.Detached;
                                    album = await _context.Albums.FirstOrDefaultAsync(a => a.SpotifyId == albumSpotifyId);
                                }
                            }

                            if (album != null)
                            {
                                dbTrack.AlbumId = album.Id;
                                updated++;
                                _logger.LogDebug("[BackfillAlbums] Updated track {TrackName} with album {AlbumName}", 
                                    dbTrack.Name, album.Name);
                            }
                        }
                    }

                    // Also backfill artists if missing
                    var existingArtistCount = await _context.TrackArtists.CountAsync(ta => ta.TrackId == dbTrack.Id);
                    if (existingArtistCount == 0 && trackData.TryGetProperty("artists", out var artistsElement) && 
                        artistsElement.ValueKind == JsonValueKind.Array)
                    {
                        int order = 0;
                        foreach (var artistElement in artistsElement.EnumerateArray())
                        {
                            var artistSpotifyId = artistElement.TryGetProperty("id", out var artistIdProp) ? artistIdProp.GetString() : null;
                            if (string.IsNullOrEmpty(artistSpotifyId)) continue;

                            var artist = await _context.Artists.FirstOrDefaultAsync(a => a.SpotifyId == artistSpotifyId);
                            if (artist == null)
                            {
                                artist = new Artist
                                {
                                    SpotifyId = artistSpotifyId,
                                    Name = artistElement.TryGetProperty("name", out var artistNameProp) ? artistNameProp.GetString() ?? "Unknown" : "Unknown"
                                };

                                try
                                {
                                    _context.Artists.Add(artist);
                                    await _context.SaveChangesAsync();
                                }
                                catch (DbUpdateException ex) when (ex.InnerException?.Message.Contains("UNIQUE constraint failed") == true)
                                {
                                    _context.Entry(artist).State = EntityState.Detached;
                                    artist = await _context.Artists.FirstOrDefaultAsync(a => a.SpotifyId == artistSpotifyId);
                                }
                            }

                            if (artist != null)
                            {
                                var existingRelation = await _context.TrackArtists
                                    .FirstOrDefaultAsync(ta => ta.TrackId == dbTrack.Id && ta.ArtistId == artist.Id);
                                
                                if (existingRelation == null)
                                {
                                    try
                                    {
                                        _context.TrackArtists.Add(new TrackArtist
                                        {
                                            TrackId = dbTrack.Id,
                                            ArtistId = artist.Id,
                                            ArtistOrder = order
                                        });
                                        artistsAdded++;
                                    }
                                    catch { }
                                }
                            }
                            order++;
                        }
                    }
                }

                await _context.SaveChangesAsync();

                // Rate limiting - wait a bit between batches
                if (batches.IndexOf(batch) < batches.Count - 1)
                {
                    await Task.Delay(100);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[BackfillAlbums] Error processing batch");
                failed += batch.Count;
            }
        }

        _logger.LogInformation("[BackfillAlbums] Complete: Updated={Updated}, Failed={Failed}, ArtistsAdded={ArtistsAdded}", 
            updated, failed, artistsAdded);

        return Ok(new 
        { 
            message = "Backfill complete",
            totalTracksWithoutAlbum = tracksWithoutAlbum.Count,
            updated,
            failed,
            artistsAdded
        });
    }

    /// <summary>
    /// Gets stats about tracks missing album/artist data
    /// </summary>
    [HttpGet("data-integrity-stats")]
    public async Task<IActionResult> GetDataIntegrityStats()
    {
        var tracksWithoutAlbum = await _context.Tracks.CountAsync(t => t.AlbumId == null);
        var tracksWithoutArtists = await _context.Tracks
            .Where(t => !_context.TrackArtists.Any(ta => ta.TrackId == t.Id))
            .CountAsync();
        var totalTracks = await _context.Tracks.CountAsync();
        var totalAlbums = await _context.Albums.CountAsync();
        var totalArtists = await _context.Artists.CountAsync();

        return Ok(new
        {
            totalTracks,
            totalAlbums,
            totalArtists,
            tracksWithoutAlbum,
            tracksWithoutArtists
        });
    }

    /// <summary>
    /// Backfills TrackCount for playlists and TotalTracks for albums from Spotify API
    /// </summary>
    [HttpPost("backfill-track-counts")]
    public async Task<IActionResult> BackfillTrackCounts()
    {
        var userIdClaim = User.FindFirst("sub")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userIdClaim) || !int.TryParse(userIdClaim, out var userId))
        {
            return Unauthorized("Invalid user");
        }

        var accessToken = await _spotifyTokenService.GetValidAccessTokenAsync(userId);
        if (string.IsNullOrEmpty(accessToken))
        {
            return BadRequest("Could not get Spotify access token");
        }

        var client = _httpClientFactory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);

        int albumsUpdated = 0;
        int playlistsUpdated = 0;
        int failed = 0;

        // Backfill albums without TotalTracks
        var albumsWithoutTrackCount = await _context.Albums
            .Where(a => a.TotalTracks == null && a.SpotifyId != null)
            .ToListAsync();

        _logger.LogInformation("[BackfillTrackCounts] Found {Count} albums without TotalTracks", albumsWithoutTrackCount.Count);

        // Process albums in batches of 20 (Spotify API limit for /albums endpoint)
        var albumBatches = albumsWithoutTrackCount
            .Select((album, index) => new { album, index })
            .GroupBy(x => x.index / 20)
            .Select(g => g.Select(x => x.album).ToList())
            .ToList();

        foreach (var batch in albumBatches)
        {
            var spotifyIds = string.Join(",", batch.Select(a => a.SpotifyId));
            var url = $"https://api.spotify.com/v1/albums?ids={spotifyIds}";

            try
            {
                var response = await client.GetAsync(url);
                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogError("[BackfillTrackCounts] Spotify API error for albums: {Status}", response.StatusCode);
                    failed += batch.Count;
                    continue;
                }

                var content = await response.Content.ReadAsStringAsync();
                var data = JsonSerializer.Deserialize<JsonElement>(content);

                if (data.TryGetProperty("albums", out var albumsArray))
                {
                    foreach (var albumData in albumsArray.EnumerateArray())
                    {
                        if (albumData.ValueKind == JsonValueKind.Null) continue;

                        var spotifyId = albumData.TryGetProperty("id", out var idProp) ? idProp.GetString() : null;
                        if (string.IsNullOrEmpty(spotifyId)) continue;

                        var dbAlbum = batch.FirstOrDefault(a => a.SpotifyId == spotifyId);
                        if (dbAlbum == null) continue;

                        if (albumData.TryGetProperty("total_tracks", out var totalTracksProp))
                        {
                            dbAlbum.TotalTracks = totalTracksProp.GetInt32();
                            albumsUpdated++;
                        }
                    }
                }

                await _context.SaveChangesAsync();

                if (albumBatches.IndexOf(batch) < albumBatches.Count - 1)
                {
                    await Task.Delay(100);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[BackfillTrackCounts] Error processing album batch");
                failed += batch.Count;
            }
        }

        // Backfill playlists without TrackCount
        var playlistsWithoutTrackCount = await _context.Playlists
            .Where(p => p.TrackCount == null && p.SpotifyId != null)
            .ToListAsync();

        _logger.LogInformation("[BackfillTrackCounts] Found {Count} playlists without TrackCount", playlistsWithoutTrackCount.Count);

        // Playlists need to be fetched one at a time (no batch endpoint)
        foreach (var playlist in playlistsWithoutTrackCount)
        {
            var url = $"https://api.spotify.com/v1/playlists/{playlist.SpotifyId}?fields=tracks.total";

            try
            {
                var response = await client.GetAsync(url);
                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogWarning("[BackfillTrackCounts] Failed to fetch playlist {SpotifyId}: {Status}", 
                        playlist.SpotifyId, response.StatusCode);
                    failed++;
                    continue;
                }

                var content = await response.Content.ReadAsStringAsync();
                var data = JsonSerializer.Deserialize<JsonElement>(content);

                if (data.TryGetProperty("tracks", out var tracksProp) && 
                    tracksProp.TryGetProperty("total", out var totalProp))
                {
                    playlist.TrackCount = totalProp.GetInt32();
                    playlistsUpdated++;
                }

                await _context.SaveChangesAsync();

                // Rate limiting
                await Task.Delay(50);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[BackfillTrackCounts] Error fetching playlist {SpotifyId}", playlist.SpotifyId);
                failed++;
            }
        }

        _logger.LogInformation("[BackfillTrackCounts] Complete: AlbumsUpdated={Albums}, PlaylistsUpdated={Playlists}, Failed={Failed}",
            albumsUpdated, playlistsUpdated, failed);

        return Ok(new
        {
            message = "Track count backfill complete",
            albumsWithoutTrackCount = albumsWithoutTrackCount.Count,
            albumsUpdated,
            playlistsWithoutTrackCount = playlistsWithoutTrackCount.Count,
            playlistsUpdated,
            failed
        });
    }
}

