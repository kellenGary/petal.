using System.Net.Http.Headers;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using PetalAPI.Data;
using PetalAPI.Models;

namespace PetalAPI.Services;

public interface ISavedTracksSyncService
{
    Task<SavedTracksSyncResult> SyncSavedTracksAsync(int userId, string accessToken);
}

public class SavedTracksSyncResult
{
    public int TracksAdded { get; set; }
    public int TracksRemoved { get; set; }
    public int TotalLikedTracks { get; set; }
    public DateTime SyncedAt { get; set; }
}

public class SavedTracksSyncService : ISavedTracksSyncService
{
    private readonly AppDbContext _context;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<SavedTracksSyncService> _logger;
    private readonly ISpotifyDataService _spotifyDataService;

    public SavedTracksSyncService(
        AppDbContext context,
        IHttpClientFactory httpClientFactory,
        ILogger<SavedTracksSyncService> logger,
        ISpotifyDataService spotifyDataService)
    {
        _context = context;
        _httpClientFactory = httpClientFactory;
        _logger = logger;
        _spotifyDataService = spotifyDataService;
    }

    public async Task<SavedTracksSyncResult> SyncSavedTracksAsync(int userId, string accessToken)
    {
        var result = new SavedTracksSyncResult { SyncedAt = DateTime.UtcNow };

        try
        {
            // Fetch all saved tracks from Spotify (handle pagination)
            var spotifySavedTracks = await FetchAllSavedTracksFromSpotifyAsync(accessToken);
            
            _logger.LogInformation("[SavedTracksSync] Fetched {Count} saved tracks from Spotify for user {UserId}", 
                spotifySavedTracks.Count, userId);

            result.TotalLikedTracks = spotifySavedTracks.Count;

            // Get existing user liked tracks from database
            var existingLikedTracks = await _context.UserLikedTracks
                .Include(ult => ult.Track)
                .Where(ult => ult.UserId == userId)
                .ToListAsync();

            var existingLikedSpotifyIds = existingLikedTracks
                .Select(ult => ult.Track.SpotifyId)
                .ToHashSet();

            var spotifyTrackIds = new HashSet<string>();

            // Process each saved track from Spotify
            foreach (var savedTrackItem in spotifySavedTracks)
            {
                if (!savedTrackItem.TryGetProperty("track", out var trackElement) || 
                    trackElement.ValueKind == JsonValueKind.Null)
                {
                    continue;
                }

                var spotifyId = trackElement.TryGetProperty("id", out var idProp) 
                    ? idProp.GetString() 
                    : null;

                if (string.IsNullOrEmpty(spotifyId))
                {
                    continue;
                }

                spotifyTrackIds.Add(spotifyId);

                // Get the added_at timestamp
                var addedAt = savedTrackItem.TryGetProperty("added_at", out var addedAtProp)
                    ? DateTime.Parse(addedAtProp.GetString() ?? DateTime.UtcNow.ToString("O"))
                    : DateTime.UtcNow;

                // Check if we already have this liked track
                if (existingLikedSpotifyIds.Contains(spotifyId))
                {
                    continue; // Already liked, skip
                }

                // Get or create the track (and related album/artists)
                // Get or create the track (and related album/artists)
                var track = await GetOrCreateTrackAsync(trackElement, accessToken);
                if (track == null)
                {
                    continue;
                }

                // Create UserLikedTrack relationship
                var userLikedTrack = new UserLikedTrack
                {
                    UserId = userId,
                    TrackId = track.Id,
                    LikedAt = addedAt
                };

                _context.UserLikedTracks.Add(userLikedTrack);
                result.TracksAdded++;

                _logger.LogDebug("[SavedTracksSync] Added liked track: {TrackName} ({SpotifyId})", 
                    track.Name, spotifyId);
            }

            // Remove liked tracks that user no longer has saved on Spotify
            foreach (var existingLikedTrack in existingLikedTracks)
            {
                if (!spotifyTrackIds.Contains(existingLikedTrack.Track.SpotifyId))
                {
                    _context.UserLikedTracks.Remove(existingLikedTrack);
                    result.TracksRemoved++;
                    _logger.LogDebug("[SavedTracksSync] Removed liked track: {TrackName}", 
                        existingLikedTrack.Track.Name);
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

            syncState.LikedTracksLastAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            _logger.LogInformation(
                "[SavedTracksSync] Sync complete for user {UserId}: Added={Added}, Removed={Removed}, Total={Total}",
                userId, result.TracksAdded, result.TracksRemoved, result.TotalLikedTracks);

            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[SavedTracksSync] Error syncing saved tracks for user {UserId}", userId);
            throw;
        }
    }

    private async Task<List<JsonElement>> FetchAllSavedTracksFromSpotifyAsync(string accessToken)
    {
        var allTracks = new List<JsonElement>();
        var client = _httpClientFactory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);

        var offset = 0;
        const int limit = 50;
        bool hasMore = true;

        while (hasMore)
        {
            var url = $"https://api.spotify.com/v1/me/tracks?limit={limit}&offset={offset}";
            var response = await client.GetAsync(url);

            if (!response.IsSuccessStatusCode)
            {
                var error = await response.Content.ReadAsStringAsync();
                _logger.LogError("[SavedTracksSync] Spotify API error: {Error}", error);
                throw new Exception($"Failed to fetch saved tracks from Spotify: {response.StatusCode}");
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

            // Check if there are more tracks
            var total = data.TryGetProperty("total", out var totalProp) ? totalProp.GetInt32() : 0;
            offset += limit;
            hasMore = offset < total;

            _logger.LogDebug("[SavedTracksSync] Fetched {Count}/{Total} saved tracks", allTracks.Count, total);
        }

        return allTracks;
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
            // Ensure album relationship exists (may have been missed in earlier syncs)
            if (existingTrack.AlbumId == null && trackElement.TryGetProperty("album", out var albumElement) && 
                albumElement.ValueKind != JsonValueKind.Null)
            {
                var album = await GetOrCreateAlbumAsync(albumElement);
                if (album != null)
                {
                    existingTrack.AlbumId = album.Id;
                    await _context.SaveChangesAsync();
                    _logger.LogDebug("[SavedTracksSync] Updated track with album: {TrackName} -> {AlbumName}", 
                        existingTrack.Name, album.Name);
                }
            }

            // Ensure artist relationships exist
            // Ensure artist relationships exist
            await EnsureTrackArtistsAsync(existingTrack.Id, trackElement, accessToken);

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
            // Note: Spotify API no longer returns popularity — this will always be null for new tracks
            Popularity = trackElement.TryGetProperty("popularity", out var popularityProp) 
                ? popularityProp.GetInt32() 
                : null,
            // Note: Spotify API no longer returns external_ids — ISRC will always be null for new tracks
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
            // Another process inserted this track, fetch it
            _context.Entry(track).State = EntityState.Detached;
            var fetchedTrack = await _context.Tracks.FirstOrDefaultAsync(t => t.SpotifyId == spotifyId);
            if (fetchedTrack != null)
            {
                _logger.LogDebug("[SavedTracksSync] Track already exists (race condition): {SpotifyId}", spotifyId);
                return fetchedTrack;
            }
            _logger.LogError(ex, "[SavedTracksSync] Failed to create or fetch track: {SpotifyId}", spotifyId);
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
                    // Check if track-artist relationship already exists
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
                            // TrackArtist relationship already exists, ignore
                            _context.ChangeTracker.Clear();
                        }
                    }
                    order++;
                }
            }
        }

        _logger.LogDebug("[SavedTracksSync] Created track: {TrackName} ({SpotifyId})", track.Name, spotifyId);
        return track;
    }

    private async Task EnsureTrackArtistsAsync(int trackId, JsonElement trackElement, string accessToken)
    {
        if (!trackElement.TryGetProperty("artists", out var artistsElement) || 
            artistsElement.ValueKind != JsonValueKind.Array)
        {
            return;
        }

        // Check if track already has artists
        var existingArtistCount = await _context.TrackArtists.CountAsync(ta => ta.TrackId == trackId);
        if (existingArtistCount > 0)
        {
            return; // Already has artists, skip
        }

        int order = 0;
        foreach (var artistElement in artistsElement.EnumerateArray())
        {
            var artist = await _spotifyDataService.GetOrCreateArtistAsync(artistElement, accessToken);
            if (artist != null)
            {
                var existingTrackArtist = await _context.TrackArtists
                    .FirstOrDefaultAsync(ta => ta.TrackId == trackId && ta.ArtistId == artist.Id);

                if (existingTrackArtist == null)
                {
                    try
                    {
                        _context.TrackArtists.Add(new TrackArtist
                        {
                            TrackId = trackId,
                            ArtistId = artist.Id,
                            ArtistOrder = order
                        });
                        await _context.SaveChangesAsync();
                        _logger.LogDebug("[SavedTracksSync] Added artist {ArtistName} to existing track {TrackId}", 
                            artist.Name, trackId);
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

    private async Task<Album?> GetOrCreateAlbumAsync(JsonElement albumElement)
    {
        var spotifyId = albumElement.TryGetProperty("id", out var idProp) 
            ? idProp.GetString() 
            : null;

        if (string.IsNullOrEmpty(spotifyId))
        {
            return null;
        }

        // Check if album already exists
        var existingAlbum = await _context.Albums
            .FirstOrDefaultAsync(a => a.SpotifyId == spotifyId);

        if (existingAlbum != null)
        {
            return existingAlbum;
        }

        // Get image URL (first/largest image)
        string? imageUrl = null;
        if (albumElement.TryGetProperty("images", out var imagesElement) && 
            imagesElement.ValueKind == JsonValueKind.Array && 
            imagesElement.GetArrayLength() > 0)
        {
            imageUrl = imagesElement[0].TryGetProperty("url", out var urlProp) 
                ? urlProp.GetString() 
                : null;
        }

        // Parse release date
        DateTime? releaseDate = null;
        if (albumElement.TryGetProperty("release_date", out var releaseDateProp))
        {
            var releaseDateStr = releaseDateProp.GetString();
            if (!string.IsNullOrEmpty(releaseDateStr))
            {
                // Handle different date formats (YYYY, YYYY-MM, YYYY-MM-DD)
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
            ImageUrl = imageUrl,
            Label = albumElement.TryGetProperty("label", out var labelProp) 
                ? labelProp.GetString() 
                : null
        };

        try
        {
            _context.Albums.Add(album);
            await _context.SaveChangesAsync();
            _logger.LogDebug("[SavedTracksSync] Created album: {AlbumName} ({SpotifyId})", album.Name, spotifyId);
            return album;
        }
        catch (DbUpdateException ex) when (ex.InnerException?.Message.Contains("UNIQUE constraint failed") == true)
        {
            // Another process inserted this album, fetch it
            _context.Entry(album).State = EntityState.Detached;
            var fetchedAlbum = await _context.Albums.FirstOrDefaultAsync(a => a.SpotifyId == spotifyId);
            if (fetchedAlbum != null)
            {
                _logger.LogDebug("[SavedTracksSync] Album already exists (race condition): {SpotifyId}", spotifyId);
                return fetchedAlbum;
            }
            _logger.LogError(ex, "[SavedTracksSync] Failed to create or fetch album: {SpotifyId}", spotifyId);
            return null;
        }
    }
}


