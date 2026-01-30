using System.Net.Http.Headers;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using PetalAPI.Data;
using PetalAPI.Models;

namespace PetalAPI.Services;

public interface IPlaylistSyncService
{
    Task<PlaylistSyncResult> SyncUserPlaylistsAsync(int userId, string accessToken);
}

public class PlaylistSyncResult
{
    public int PlaylistsAdded { get; set; }
    public int PlaylistsUpdated { get; set; }
    public int PlaylistsRemoved { get; set; }
    public int TracksAdded { get; set; }
    public DateTime SyncedAt { get; set; }
}

public class PlaylistSyncService : IPlaylistSyncService
{
    private readonly AppDbContext _context;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<PlaylistSyncService> _logger;
    private readonly ISpotifyDataService _spotifyDataService;

    public PlaylistSyncService(
        AppDbContext context,
        IHttpClientFactory httpClientFactory,
        ILogger<PlaylistSyncService> logger,
        ISpotifyDataService spotifyDataService)
    {
        _context = context;
        _httpClientFactory = httpClientFactory;
        _logger = logger;
        _spotifyDataService = spotifyDataService;
    }

    public async Task<PlaylistSyncResult> SyncUserPlaylistsAsync(int userId, string accessToken)
    {
        var result = new PlaylistSyncResult { SyncedAt = DateTime.UtcNow };

        try
        {
            // Fetch all playlists from Spotify (handle pagination)
            var spotifyPlaylists = await FetchAllPlaylistsFromSpotifyAsync(accessToken);
            
            _logger.LogInformation("[PlaylistSync] Fetched {Count} playlists from Spotify for user {UserId}", 
                spotifyPlaylists.Count, userId);

            // Get existing user playlists from database
            var existingUserPlaylists = await _context.UserPlaylists
                .Include(up => up.Playlist)
                .Where(up => up.UserId == userId)
                .ToListAsync();

            var existingPlaylistSpotifyIds = existingUserPlaylists
                .Select(up => up.Playlist.SpotifyId)
                .ToHashSet();

            var spotifyPlaylistIds = spotifyPlaylists
                .Select(p => p.GetProperty("id").GetString()!)
                .ToHashSet();

            // Process each Spotify playlist
            foreach (var spotifyPlaylist in spotifyPlaylists)
            {
                var spotifyId = spotifyPlaylist.GetProperty("id").GetString()!;
                var name = spotifyPlaylist.GetProperty("name").GetString() ?? "Untitled";
                var description = spotifyPlaylist.TryGetProperty("description", out var desc) 
                    ? desc.GetString() 
                    : null;
                var isPublic = spotifyPlaylist.TryGetProperty("public", out var pubProp) && pubProp.GetBoolean();
                var isCollaborative = spotifyPlaylist.TryGetProperty("collaborative", out var collabProp) && collabProp.GetBoolean();
                var snapshotId = spotifyPlaylist.TryGetProperty("snapshot_id", out var snapProp) 
                    ? snapProp.GetString() 
                    : null;
                
                // Get track count
                int? trackCount = null;
                if (spotifyPlaylist.TryGetProperty("tracks", out var tracksObj) && 
                    tracksObj.TryGetProperty("total", out var totalProp))
                {
                    trackCount = totalProp.GetInt32();
                }
                
                // Get image URL
                string? imageUrl = null;
                if (spotifyPlaylist.TryGetProperty("images", out var images) && images.GetArrayLength() > 0)
                {
                    imageUrl = images[0].GetProperty("url").GetString();
                }

                // Get owner info
                string? ownerSpotifyId = null;
                if (spotifyPlaylist.TryGetProperty("owner", out var owner))
                {
                    ownerSpotifyId = owner.TryGetProperty("id", out var ownerIdProp) 
                        ? ownerIdProp.GetString() 
                        : null;
                }

                // Check if playlist already exists in database
                var existingPlaylist = await _context.Playlists
                    .FirstOrDefaultAsync(p => p.SpotifyId == spotifyId);

                Playlist? playlist;

                if (existingPlaylist == null)
                {
                    // Create new playlist
                    playlist = new Playlist
                    {
                        SpotifyId = spotifyId,
                        Name = name,
                        Description = description,
                        OwnerSpotifyId = ownerSpotifyId,
                        Public = isPublic,
                        Collaborative = isCollaborative,
                        SnapshotId = snapshotId,
                        ImageUrl = imageUrl,
                        TrackCount = trackCount
                    };

                    // If the owner is this user, link the OwnerUserId
                    var user = await _context.Users.FindAsync(userId);
                    if (user != null && ownerSpotifyId == user.SpotifyId)
                    {
                        playlist.OwnerUserId = userId;
                    }

                    try
                    {
                        _context.Playlists.Add(playlist);
                        await _context.SaveChangesAsync();
                        result.PlaylistsAdded++;
                        _logger.LogDebug("[PlaylistSync] Added new playlist: {PlaylistName} ({SpotifyId})", name, spotifyId);
                    }
                    catch (DbUpdateException ex) when (ex.InnerException?.Message.Contains("UNIQUE constraint failed") == true)
                    {
                        // Another process inserted this playlist, fetch it
                        _context.Entry(playlist).State = EntityState.Detached;
                        playlist = await _context.Playlists.FirstOrDefaultAsync(p => p.SpotifyId == spotifyId);
                        if (playlist == null)
                        {
                            _logger.LogError(ex, "[PlaylistSync] Failed to create or fetch playlist: {SpotifyId}", spotifyId);
                            continue;
                        }
                        _logger.LogDebug("[PlaylistSync] Playlist already exists (race condition): {SpotifyId}", spotifyId);
                    }
                }
                else
                {
                    playlist = existingPlaylist;
                    
                    // Always update all playlist fields
                    playlist.Name = name;
                    playlist.Description = description;
                    playlist.Public = isPublic;
                    playlist.Collaborative = isCollaborative;
                    playlist.SnapshotId = snapshotId;
                    playlist.ImageUrl = imageUrl;
                    playlist.TrackCount = trackCount;
                    result.PlaylistsUpdated++;
                    _logger.LogDebug("[PlaylistSync] Updated playlist: {PlaylistName} ({SpotifyId})", name, spotifyId);
                }

                // Ensure user has relationship with playlist
                var userPlaylistExists = existingUserPlaylists.Any(up => up.Playlist.SpotifyId == spotifyId);
                if (!userPlaylistExists)
                {
                    var user = await _context.Users.FindAsync(userId);
                    
                    // Double-check in database to avoid race condition
                    var existingRelation = await _context.UserPlaylists
                        .FirstOrDefaultAsync(up => up.UserId == userId && up.PlaylistId == playlist.Id);
                    
                    if (existingRelation == null)
                    {
                        try
                        {
                            var userPlaylist = new UserPlaylist
                            {
                                UserId = userId,
                                PlaylistId = playlist.Id,
                                Relation = ownerSpotifyId == user?.SpotifyId 
                                    ? UserPlaylistRelation.Owner 
                                    : UserPlaylistRelation.Subscriber,
                                FollowedAt = DateTime.UtcNow
                            };
                            _context.UserPlaylists.Add(userPlaylist);
                            await _context.SaveChangesAsync();
                        }
                        catch (DbUpdateException)
                        {
                            // UserPlaylist relationship already exists, ignore
                            _context.ChangeTracker.Clear();
                        }
                    }
                }

                // Sync tracks for this playlist
                var tracksAdded = await SyncPlaylistTracksAsync(playlist.Id, spotifyId, accessToken);
                result.TracksAdded += tracksAdded;
            }

            // Remove playlists that user no longer follows on Spotify
            foreach (var existingUserPlaylist in existingUserPlaylists)
            {
                if (!spotifyPlaylistIds.Contains(existingUserPlaylist.Playlist.SpotifyId))
                {
                    _context.UserPlaylists.Remove(existingUserPlaylist);
                    result.PlaylistsRemoved++;
                    _logger.LogDebug("[PlaylistSync] Removed user playlist relationship: {PlaylistName}", 
                        existingUserPlaylist.Playlist.Name);
                }
            }

            // Update sync state
            var syncState = await _context.SpotifySyncStates
                .FirstOrDefaultAsync(s => s.UserId == userId);
            
            if (syncState == null)
            {
                syncState = new SpotifySyncState { UserId = userId };
                _context.SpotifySyncStates.Add(syncState);
            }

            syncState.LastFullSyncAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            _logger.LogInformation(
                "[PlaylistSync] Sync complete for user {UserId}: Added={Added}, Updated={Updated}, Removed={Removed}, Tracks={Tracks}",
                userId, result.PlaylistsAdded, result.PlaylistsUpdated, result.PlaylistsRemoved, result.TracksAdded);

            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[PlaylistSync] Error syncing playlists for user {UserId}", userId);
            throw;
        }
    }

    private async Task<int> SyncPlaylistTracksAsync(int playlistId, string spotifyPlaylistId, string accessToken)
    {
        var tracksAdded = 0;
        
        try
        {
            // Fetch all tracks for this playlist from Spotify
            var spotifyTracks = await FetchPlaylistTracksFromSpotifyAsync(spotifyPlaylistId, accessToken);
            
            _logger.LogDebug("[PlaylistSync] Fetched {Count} tracks for playlist {PlaylistId}", 
                spotifyTracks.Count, spotifyPlaylistId);

            // Use a transaction to ensure delete+insert is atomic and prevents race conditions
            // where another sync process might insert tracks in between our delete and insert.
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                // Clear existing playlist tracks
                var existingPlaylistTracks = await _context.PlaylistTracks
                    .Where(pt => pt.PlaylistId == playlistId)
                    .ToListAsync();
                
                _context.PlaylistTracks.RemoveRange(existingPlaylistTracks);
                await _context.SaveChangesAsync();

                // Add new tracks
                int position = 0;
                foreach (var trackItem in spotifyTracks)
                {
                    if (!trackItem.TryGetProperty("track", out var trackElement) || 
                        trackElement.ValueKind == JsonValueKind.Null)
                    {
                        position++;
                        continue;
                    }

                    var spotifyId = trackElement.TryGetProperty("id", out var idProp) 
                        ? idProp.GetString() 
                        : null;

                    if (string.IsNullOrEmpty(spotifyId))
                    {
                        position++;
                        continue;
                    }

                    // Get or create the track
                    // Note: We might want to move this outside the transaction if it takes too long, 
                    // but keeping it here ensures consistency. 
                    // However, GetOrCreateTrackAsync saves changes itself, which is fine in a transaction.
                    var track = await GetOrCreateTrackAsync(trackElement, accessToken);
                    if (track == null)
                    {
                        position++;
                        continue;
                    }

                    // Get added_at and added_by info
                    var addedAt = trackItem.TryGetProperty("added_at", out var addedAtProp) && 
                                  !string.IsNullOrEmpty(addedAtProp.GetString())
                        ? DateTime.Parse(addedAtProp.GetString()!)
                        : (DateTime?)null;

                    string? addedBySpotifyId = null;
                    if (trackItem.TryGetProperty("added_by", out var addedBy) && 
                        addedBy.TryGetProperty("id", out var addedByIdProp))
                    {
                        addedBySpotifyId = addedByIdProp.GetString();
                    }

                    // Create PlaylistTrack entry
                    var playlistTrack = new PlaylistTrack
                    {
                        PlaylistId = playlistId,
                        TrackId = track.Id,
                        Position = position,
                        AddedAt = addedAt,
                        AddedBySpotifyId = addedBySpotifyId
                    };

                    _context.PlaylistTracks.Add(playlistTrack);
                    tracksAdded++;
                    position++;
                }

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();
                
                _logger.LogDebug("[PlaylistSync] Synced {Count} tracks for playlist {PlaylistId}", 
                    tracksAdded, spotifyPlaylistId);
            }
            catch (Exception)
            {
                await transaction.RollbackAsync();
                throw;
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[PlaylistSync] Error syncing tracks for playlist {PlaylistId}", spotifyPlaylistId);
        }

        return tracksAdded;
    }

    private async Task<List<JsonElement>> FetchPlaylistTracksFromSpotifyAsync(string playlistId, string accessToken)
    {
        var allTracks = new List<JsonElement>();
        var client = _httpClientFactory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);

        var offset = 0;
        const int limit = 100;
        bool hasMore = true;

        while (hasMore)
        {
            var url = $"https://api.spotify.com/v1/playlists/{playlistId}/tracks?limit={limit}&offset={offset}";
            var response = await client.GetAsync(url);

            if (!response.IsSuccessStatusCode)
            {
                var error = await response.Content.ReadAsStringAsync();
                _logger.LogError("[PlaylistSync] Spotify API error fetching playlist tracks: {Error}", error);
                break;
            }

            var content = await response.Content.ReadAsStringAsync();
            var data = JsonSerializer.Deserialize<JsonElement>(content);

            if (data.TryGetProperty("items", out var items))
            {
                foreach (var item in items.EnumerateArray())
                {
                    allTracks.Add(item);
                }
            }

            var total = data.TryGetProperty("total", out var totalProp) ? totalProp.GetInt32() : 0;
            offset += limit;
            hasMore = offset < total;
        }

        return allTracks;
    }

    private async Task<List<JsonElement>> FetchAllPlaylistsFromSpotifyAsync(string accessToken)
    {
        var allPlaylists = new List<JsonElement>();
        var client = _httpClientFactory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);

        var nextUrl = "https://api.spotify.com/v1/me/playlists?limit=50";

        while (!string.IsNullOrEmpty(nextUrl))
        {
            var response = await client.GetAsync(nextUrl);
            
            if (!response.IsSuccessStatusCode)
            {
                var error = await response.Content.ReadAsStringAsync();
                _logger.LogError("[PlaylistSync] Spotify API error: {Error}", error);
                throw new Exception($"Failed to fetch playlists from Spotify: {response.StatusCode}");
            }

            var content = await response.Content.ReadAsStringAsync();
            var data = JsonSerializer.Deserialize<JsonElement>(content);

            if (data.TryGetProperty("items", out var items))
            {
                foreach (var item in items.EnumerateArray())
                {
                    allPlaylists.Add(item);
                }
            }

            // Check for next page
            nextUrl = data.TryGetProperty("next", out var next) && next.ValueKind != JsonValueKind.Null
                ? next.GetString()
                : null;
        }

        return allPlaylists;
    }

    private async Task<Track?> GetOrCreateTrackAsync(JsonElement trackElement, string accessToken)
    {
        var spotifyId = trackElement.TryGetProperty("id", out var idProp) 
            ? idProp.GetString() 
            : null;

        if (string.IsNullOrEmpty(spotifyId))
        {
            return null;
        }

        // Check if track already exists
        var existingTrack = await _context.Tracks
            .FirstOrDefaultAsync(t => t.SpotifyId == spotifyId);

        if (existingTrack != null)
        {
            return existingTrack;
        }

        // Process album first
        int? albumId = null;
        if (trackElement.TryGetProperty("album", out var albumEl) && 
            albumEl.ValueKind != JsonValueKind.Null)
        {
            var album = await GetOrCreateAlbumAsync(albumEl);
            albumId = album?.Id;
        }

        // Create new track
        var track = new Track
        {
            SpotifyId = spotifyId,
            Name = trackElement.TryGetProperty("name", out var nameProp) 
                ? nameProp.GetString() ?? "Unknown" 
                : "Unknown",
            DurationMs = trackElement.TryGetProperty("duration_ms", out var durationProp) 
                ? durationProp.GetInt32() 
                : 0,
            Explicit = trackElement.TryGetProperty("explicit", out var explicitProp) 
                && explicitProp.GetBoolean(),
            Popularity = trackElement.TryGetProperty("popularity", out var popularityProp) 
                ? popularityProp.GetInt32() 
                : null,
            Isrc = trackElement.TryGetProperty("external_ids", out var externalIds) &&
                   externalIds.TryGetProperty("isrc", out var isrcProp)
                ? isrcProp.GetString()
                : null,
            AlbumId = albumId
        };

        try
        {
            _context.Tracks.Add(track);
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateException ex) when (ex.InnerException?.Message.Contains("UNIQUE constraint failed") == true)
        {
            _context.Entry(track).State = EntityState.Detached;
            var fetchedTrack = await _context.Tracks.FirstOrDefaultAsync(t => t.SpotifyId == spotifyId);
            if (fetchedTrack != null)
            {
                return fetchedTrack;
            }
            _logger.LogError(ex, "[PlaylistSync] Failed to create or fetch track: {SpotifyId}", spotifyId);
            return null;
        }

        // Process artists
        if (trackElement.TryGetProperty("artists", out var artistsElement) && 
            artistsElement.ValueKind == JsonValueKind.Array)
        {
            int order = 0;
            foreach (var artistElement in artistsElement.EnumerateArray())
            {
                var artist = await _spotifyDataService.GetOrCreateArtistAsync(artistElement, accessToken);
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

    private async Task<Album?> GetOrCreateAlbumAsync(JsonElement albumElement)
    {
        var spotifyId = albumElement.TryGetProperty("id", out var idProp) 
            ? idProp.GetString() 
            : null;

        if (string.IsNullOrEmpty(spotifyId))
        {
            return null;
        }

        var existingAlbum = await _context.Albums
            .FirstOrDefaultAsync(a => a.SpotifyId == spotifyId);

        if (existingAlbum != null)
        {
            return existingAlbum;
        }

        string? imageUrl = null;
        if (albumElement.TryGetProperty("images", out var imagesElement) && 
            imagesElement.ValueKind == JsonValueKind.Array && 
            imagesElement.GetArrayLength() > 0)
        {
            imageUrl = imagesElement[0].TryGetProperty("url", out var urlProp) 
                ? urlProp.GetString() 
                : null;
        }

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

        var album = new Album
        {
            SpotifyId = spotifyId,
            Name = albumElement.TryGetProperty("name", out var nameProp) 
                ? nameProp.GetString() ?? "Unknown" 
                : "Unknown",
            ReleaseDate = releaseDate,
            AlbumType = albumElement.TryGetProperty("album_type", out var typeProp) 
                ? typeProp.GetString() 
                : null,
            ImageUrl = imageUrl
        };

        try
        {
            _context.Albums.Add(album);
            await _context.SaveChangesAsync();
            return album;
        }
        catch (DbUpdateException ex) when (ex.InnerException?.Message.Contains("UNIQUE constraint failed") == true)
        {
            _context.Entry(album).State = EntityState.Detached;
            var fetchedAlbum = await _context.Albums.FirstOrDefaultAsync(a => a.SpotifyId == spotifyId);
            if (fetchedAlbum != null)
            {
                return fetchedAlbum;
            }
            _logger.LogError(ex, "[PlaylistSync] Failed to create or fetch album: {SpotifyId}", spotifyId);
            return null;
        }
    }
}

