using System.Net.Http.Headers;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using PetalAPI.Data;
using PetalAPI.Models;

namespace PetalAPI.Services;

public interface IListeningHistoryService
{
    Task<int> SyncInitialListeningHistoryAsync(int userId, string accessToken);
    Task<int> SyncRecentlyPlayedAsync(int userId, string accessToken, bool includeLocation = true, 
        double? latitude = null, double? longitude = null);
    Task AddListeningHistoryAsync(int userId, int trackId, DateTime playedAt, int msPlayed, 
        string? contextUri = null, string? deviceType = null, double? latitude = null, double? longitude = null);
    Task<AddCurrentlyPlayingResult> AddCurrentlyPlayingAsync(int userId, string accessToken, string spotifyTrackId,
        DateTime playedAt, int progressMs, double? latitude = null, double? longitude = null);
}

public record AddCurrentlyPlayingResult(bool Success, string? TrackName = null, string? Error = null);

public class ListeningHistoryService : IListeningHistoryService
{
    private readonly AppDbContext _context;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<ListeningHistoryService> _logger;
    private readonly IListeningSessionService _listeningSessionService;
    private readonly ISpotifyDataService _spotifyDataService;

    public ListeningHistoryService(
        AppDbContext context,
        IHttpClientFactory httpClientFactory,
        ILogger<ListeningHistoryService> logger,
        IListeningSessionService listeningSessionService,
        ISpotifyDataService spotifyDataService)
    {
        _context = context;
        _httpClientFactory = httpClientFactory;
        _logger = logger;
        _listeningSessionService = listeningSessionService;
        _spotifyDataService = spotifyDataService;
    }

    /// <summary>
    /// Syncs the initial 50 most recently played tracks for a new user without location data.
    /// This prevents them from being rendered on the map initially.
    /// </summary>
    public async Task<int> SyncInitialListeningHistoryAsync(int userId, string accessToken)
    {
        try
        {
            var syncState = await _context.SpotifySyncStates
                .FirstOrDefaultAsync(s => s.UserId == userId);
            
            if (syncState == null)
            {
                syncState = new SpotifySyncState { UserId = userId };
                _context.SpotifySyncStates.Add(syncState);
            }

            var (tracksAdded, _) = await FetchAndSaveRecentlyPlayedAsync(userId, accessToken, limit: 50, includeLocation: false);
            
            syncState.RecentlyPlayedLastAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
            
            _logger.LogInformation("[ListeningHistory] Synced initial {Count} tracks for user {UserId}", 
                tracksAdded, userId);
            
            return tracksAdded;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[ListeningHistory] Error syncing initial listening history for user {UserId}", userId);
            throw;
        }
    }

    /// <summary>
    /// Syncs recently played tracks since the last sync. Called periodically in the background.
    /// Includes location data by default.
    /// </summary>
    public async Task<int> SyncRecentlyPlayedAsync(int userId, string accessToken, bool includeLocation = true,
        double? latitude = null, double? longitude = null)
    {
        try
        {
            var syncState = await _context.SpotifySyncStates
                .FirstOrDefaultAsync(s => s.UserId == userId);
            
            if (syncState == null)
            {
                syncState = new SpotifySyncState { UserId = userId };
                _context.SpotifySyncStates.Add(syncState);
                await _context.SaveChangesAsync();
            }

            // If we've synced before, only get tracks played since last sync
            // Otherwise, get the 50 most recent
            var limit = syncState.RecentlyPlayedLastAt == null ? 50 : 50;
            var (tracksAdded, latestPlayedAt) = await FetchAndSaveRecentlyPlayedAsync(
                userId, accessToken, limit, includeLocation, syncState.RecentlyPlayedLastAt, latitude, longitude);
            
            // Only update the sync timestamp if we actually added tracks
            // Use the latest played_at time from Spotify, not current time
            if (tracksAdded > 0 && latestPlayedAt.HasValue)
            {
                syncState.RecentlyPlayedLastAt = latestPlayedAt.Value;
                await _context.SaveChangesAsync();
                _logger.LogInformation("[ListeningHistory] Updated last sync time to {LastSync}", latestPlayedAt.Value);
            }
            else if (tracksAdded == 0 && syncState.RecentlyPlayedLastAt.HasValue)
            {
                // If no new tracks but we have a sync time, just keep it as is
                _logger.LogInformation("[ListeningHistory] No new tracks to sync");
            }
            
            _logger.LogInformation("[ListeningHistory] Synced {Count} new tracks for user {UserId}", 
                tracksAdded, userId);
            
            return tracksAdded;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[ListeningHistory] Error syncing recently played for user {UserId}", userId);
            throw;
        }
    }

    /// <summary>
    /// Manually adds a listening history entry. Used when a track finishes playing in the app.
    /// </summary>
    public async Task AddListeningHistoryAsync(int userId, int trackId, DateTime playedAt, int msPlayed,
        string? contextUri = null, string? deviceType = null, double? latitude = null, double? longitude = null)
    {
        try
        {
            var listeningHistory = new ListeningHistory
            {
                UserId = userId,
                TrackId = trackId,
                PlayedAt = playedAt,
                MsPlayed = msPlayed,
                ContextUri = contextUri,
                DeviceType = deviceType,
                Source = ListeningSource.App,
                Latitude = latitude,
                Longitude = longitude
            };

            _context.ListeningHistory.Add(listeningHistory);
            await _context.SaveChangesAsync();
            
            _logger.LogInformation("[ListeningHistory] Added listening entry for user {UserId}, track {TrackId}", 
                userId, trackId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[ListeningHistory] Error adding listening history for user {UserId}", userId);
            throw;
        }
    }

    /// <summary>
    /// Adds listening history for the currently playing track using Spotify ID.
    /// Fetches track details from Spotify, creates/updates DB records, and adds history with location.
    /// Uses deduplication to prevent duplicate entries for the same track at the same time.
    /// </summary>
    public async Task<AddCurrentlyPlayingResult> AddCurrentlyPlayingAsync(int userId, string accessToken, string spotifyTrackId,
        DateTime playedAt, int progressMs, double? latitude = null, double? longitude = null)
    {
        try
        {
            // Create deduplication key - using a time window to prevent rapid duplicates
            // Round to nearest minute to allow some flexibility
            var playedAtRounded = new DateTime(playedAt.Year, playedAt.Month, playedAt.Day, 
                playedAt.Hour, playedAt.Minute, 0, DateTimeKind.Utc);
            var dedupeKey = $"{userId}_{spotifyTrackId}_{playedAtRounded:O}";

            // Check for existing entry with same dedupe key
            var existingEntry = await _context.ListeningHistory
                .FirstOrDefaultAsync(h => h.DedupeKey == dedupeKey);
            
            if (existingEntry != null)
            {
                _logger.LogDebug("[ListeningHistory] Duplicate entry for currently playing, skipping");
                return new AddCurrentlyPlayingResult(true, "Already recorded");
            }

            // Check if track exists in DB
            var existingTrack = await _context.Tracks
                .FirstOrDefaultAsync(t => t.SpotifyId == spotifyTrackId);

            Track? dbTrack;
            if (existingTrack != null)
            {
                dbTrack = existingTrack;
            }
            else
            {
                // Fetch track from Spotify
                var client = _httpClientFactory.CreateClient();
                client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);

                var response = await client.GetAsync($"https://api.spotify.com/v1/tracks/{spotifyTrackId}");
                if (!response.IsSuccessStatusCode)
                {
                    var error = await response.Content.ReadAsStringAsync();
                    _logger.LogError("[ListeningHistory] Failed to fetch track from Spotify: {Error}", error);
                    return new AddCurrentlyPlayingResult(false, Error: "Failed to fetch track from Spotify");
                }

                var content = await response.Content.ReadAsStringAsync();
                var trackData = JsonSerializer.Deserialize<JsonElement>(content);

                // Create album if needed
                int? albumId = null;
                if (trackData.TryGetProperty("album", out var albumProp) && albumProp.ValueKind != JsonValueKind.Null)
                {
                    var albumSpotifyId = albumProp.TryGetProperty("id", out var albumIdProp) ? albumIdProp.GetString() : null;
                    if (!string.IsNullOrEmpty(albumSpotifyId))
                    {
                        var album = await _context.Albums.FirstOrDefaultAsync(a => a.SpotifyId == albumSpotifyId);
                        if (album == null)
                        {
                            album = new Album
                            {
                                SpotifyId = albumSpotifyId,
                                Name = albumProp.TryGetProperty("name", out var nameProp) ? nameProp.GetString() ?? "Unknown" : "Unknown",
                                ImageUrl = albumProp.TryGetProperty("images", out var imagesProp) && imagesProp.GetArrayLength() > 0
                                    ? (imagesProp[0].TryGetProperty("url", out var urlProp) ? urlProp.GetString() : null)
                                    : null
                            };
                            _context.Albums.Add(album);
                            await _context.SaveChangesAsync();
                        }
                        albumId = album.Id;
                    }
                }

                // Create track
                dbTrack = new Track
                {
                    SpotifyId = spotifyTrackId,
                    Name = trackData.TryGetProperty("name", out var trackNameProp) ? trackNameProp.GetString() ?? "Unknown" : "Unknown",
                    DurationMs = trackData.TryGetProperty("duration_ms", out var durationProp) ? durationProp.GetInt32() : 0,
                    Explicit = trackData.TryGetProperty("explicit", out var explicitProp) && explicitProp.GetBoolean(),
                    // Note: Spotify API no longer returns popularity — this will always be null for new tracks
                    Popularity = trackData.TryGetProperty("popularity", out var popProp) ? popProp.GetInt32() : null,
                    AlbumId = albumId
                };
                _context.Tracks.Add(dbTrack);
                await _context.SaveChangesAsync();

                // Create artist relationships
                if (trackData.TryGetProperty("artists", out var artistsProp) && artistsProp.ValueKind == JsonValueKind.Array)
                {
                    int order = 0;
                    foreach (var artistElement in artistsProp.EnumerateArray())
                    {
                        var artist = await _spotifyDataService.GetOrCreateArtistAsync(artistElement, accessToken);
                        if (artist != null)
                        {
                            _context.TrackArtists.Add(new TrackArtist
                            {
                                TrackId = dbTrack.Id,
                                ArtistId = artist.Id,
                                ArtistOrder = order++
                            });
                        }
                    }
                }
            }

            // Create listening history entry
            var listeningHistory = new ListeningHistory
            {
                UserId = userId,
                TrackId = dbTrack.Id,
                PlayedAt = playedAt,
                MsPlayed = progressMs,
                Source = ListeningSource.App,
                DedupeKey = dedupeKey,
                Latitude = latitude,
                Longitude = longitude
            };

            _context.ListeningHistory.Add(listeningHistory);
            await _context.SaveChangesAsync();

            // Trigger session detection for automatic listening sessions
            try
            {
                await _listeningSessionService.ProcessNewTrackAsync(
                    userId,
                    listeningHistory.Id,
                    dbTrack.Id,
                    playedAt,
                    dbTrack.DurationMs);
            }
            catch (Exception sessionEx)
            {
                // Log but don't fail the main operation if session processing fails
                _logger.LogWarning(sessionEx, "[ListeningHistory] Session processing failed for user {UserId}", userId);
            }

            _logger.LogInformation("[ListeningHistory] Added currently playing for user {UserId}, track {TrackName} at ({Lat}, {Lng})",
                userId, dbTrack.Name, latitude, longitude);

            return new AddCurrentlyPlayingResult(true, dbTrack.Name);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[ListeningHistory] Error adding currently playing for user {UserId}", userId);
            return new AddCurrentlyPlayingResult(false, Error: ex.Message);
        }
    }

    private async Task<(int tracksAdded, DateTime? latestPlayedAt)> FetchAndSaveRecentlyPlayedAsync(
        int userId, 
        string accessToken, 
        int limit = 50, 
        bool includeLocation = true,
        DateTime? sinceTime = null,
        double? latitude = null,
        double? longitude = null)
    {
        var client = _httpClientFactory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);

        int totalAdded = 0;
        DateTime? latestPlayedAt = null;
        string? after = null;
        int fetchedCount = 0;
        const int maxFetches = 20; // Prevent infinite loops

        _logger.LogInformation("[ListeningHistory] Starting fetch for user {UserId}, limit: {Limit}, sinceTime: {SinceTime}", 
            userId, limit, sinceTime);

        while (fetchedCount < maxFetches)
        {
            var url = $"https://api.spotify.com/v1/me/player/recently-played?limit=50";
            if (!string.IsNullOrEmpty(after))
            {
                url += $"&after={after}";
            }

            _logger.LogDebug("[ListeningHistory] Fetching from Spotify: {Url}", url);

            var response = await client.GetAsync(url);

            if (!response.IsSuccessStatusCode)
            {
                var error = await response.Content.ReadAsStringAsync();
                _logger.LogError("[ListeningHistory] Spotify API error (status {StatusCode}): {Error}", 
                    response.StatusCode, error);
                break;
            }

            var content = await response.Content.ReadAsStringAsync();
            var result = JsonSerializer.Deserialize<JsonElement>(content);

            if (!result.TryGetProperty("items", out var items))
            {
                _logger.LogWarning("[ListeningHistory] No items property in response");
                break;
            }

            int itemsCount = items.GetArrayLength();
            if (itemsCount == 0)
            {
                _logger.LogInformation("[ListeningHistory] No more items to fetch");
                break;
            }

            _logger.LogInformation("[ListeningHistory] Processing {Count} items from Spotify", itemsCount);

            foreach (var item in items.EnumerateArray())
            {
                // Get played_at for this item
                DateTime? itemPlayedAt = null;
                if (item.TryGetProperty("played_at", out var playedAtProp))
                {
                    itemPlayedAt = DateTime.Parse(playedAtProp.GetString() ?? "");
                    
                    // Track the latest played_at time
                    if (!latestPlayedAt.HasValue || itemPlayedAt > latestPlayedAt)
                    {
                        latestPlayedAt = itemPlayedAt;
                    }
                    
                    // Check if we've reached tracks before our last sync
                    if (sinceTime.HasValue && itemPlayedAt < sinceTime.Value)
                    {
                        _logger.LogInformation("[ListeningHistory] Reached tracks before last sync time, stopping");
                        return (totalAdded, latestPlayedAt);
                    }
                }

                if (await ProcessRecentlyPlayedItemAsync(userId, item, includeLocation, accessToken, latitude, longitude))
                {
                    totalAdded++;
                }

                if (totalAdded >= limit)
                {
                    _logger.LogInformation("[ListeningHistory] Reached limit of {Limit} tracks", limit);
                    return (totalAdded, latestPlayedAt);
                }
            }

            // Get cursor for next page
            if (result.TryGetProperty("cursors", out var cursors) &&
                cursors.TryGetProperty("after", out var afterProp))
            {
                after = afterProp.GetString();
                _logger.LogDebug("[ListeningHistory] Got next cursor: {After}", after);
            }
            else
            {
                _logger.LogInformation("[ListeningHistory] No more pages available");
                break;
            }

            fetchedCount++;
        }

        _logger.LogInformation("[ListeningHistory] Finished fetching, total added: {TotalAdded}", totalAdded);
        return (totalAdded, latestPlayedAt);
    }

    private async Task<bool> ProcessRecentlyPlayedItemAsync(int userId, JsonElement item, bool includeLocation,
        string accessToken, double? latitude = null, double? longitude = null)
    {
        try
        {
            // Extract track info
            if (!item.TryGetProperty("track", out var track) || track.ValueKind == JsonValueKind.Null)
            {
                _logger.LogWarning("[ListeningHistory] Item missing track property");
                return false;
            }

            if (!track.TryGetProperty("id", out var spotifyIdProp) || spotifyIdProp.ValueKind == JsonValueKind.Null)
            {
                _logger.LogWarning("[ListeningHistory] Track missing Spotify ID");
                return false;
            }

            var spotifyId = spotifyIdProp.GetString();
            if (string.IsNullOrEmpty(spotifyId))
            {
                _logger.LogWarning("[ListeningHistory] Empty Spotify ID");
                return false;
            }

            // Check for duplicate FIRST before processing anything else
            var playedAtString = item.TryGetProperty("played_at", out var playedAtProp) ? playedAtProp.GetString() : "";
            var dedupeKey = $"{userId}_{spotifyId}_{playedAtString}";
            
            var existingHistory = await _context.ListeningHistory
                .FirstOrDefaultAsync(h => h.DedupeKey == dedupeKey);

            if (existingHistory != null)
            {
                _logger.LogDebug("[ListeningHistory] Duplicate entry found for track {SpotifyId}, skipping", spotifyId);
                return false; // Already have this entry
            }

            // Check if track already exists in database
            var existingTrack = await _context.Tracks
                .FirstOrDefaultAsync(t => t.SpotifyId == spotifyId);

            Track? dbTrack;
            if (existingTrack == null)
            {
                // Process album
                int? albumId = null;
                if (track.TryGetProperty("album", out var albumProp) && albumProp.ValueKind != JsonValueKind.Null)
                {
                    var albumSpotifyId = albumProp.TryGetProperty("id", out var albumIdProp) ? albumIdProp.GetString() : null;
                    if (!string.IsNullOrEmpty(albumSpotifyId))
                    {
                        var album = await _context.Albums.FirstOrDefaultAsync(a => a.SpotifyId == albumSpotifyId);
                        if (album == null)
                        {
                            album = new Album
                            {
                                SpotifyId = albumSpotifyId,
                                Name = albumProp.TryGetProperty("name", out var albumNameProp) ? albumNameProp.GetString() ?? "Unknown" : "Unknown",
                                ImageUrl = albumProp.TryGetProperty("images", out var imagesProp) && imagesProp.GetArrayLength() > 0
                                    ? (imagesProp[0].TryGetProperty("url", out var urlProp) ? urlProp.GetString() : null)
                                    : null,
                                ReleaseDate = albumProp.TryGetProperty("release_date", out var releaseDateProp)
                                    ? (DateTime.TryParse(releaseDateProp.GetString(), out var parsedDate) ? parsedDate : (DateTime?)null)
                                    : null
                            };
                            _context.Albums.Add(album);
                            try
                            {
                                await _context.SaveChangesAsync();
                            }
                            catch (DbUpdateException ex) when (ex.InnerException?.Message.Contains("UNIQUE constraint failed") == true)
                            {
                                _context.Entry(album).State = EntityState.Detached;
                                album = await _context.Albums.FirstOrDefaultAsync(a => a.SpotifyId == albumSpotifyId);
                            }
                        }
                        albumId = album?.Id;
                    }
                }

                // Create new track
                dbTrack = new Track
                {
                    SpotifyId = spotifyId,
                    Name = track.TryGetProperty("name", out var nameProp) ? nameProp.GetString() ?? "Unknown" : "Unknown",
                    DurationMs = track.TryGetProperty("duration_ms", out var durationProp) ? durationProp.GetInt32() : 0,
                    Explicit = track.TryGetProperty("explicit", out var explicitProp) ? explicitProp.GetBoolean() : false,
                    // Note: Spotify API no longer returns popularity — this will always be null for new tracks
                    Popularity = track.TryGetProperty("popularity", out var popularityProp) ? popularityProp.GetInt32() : null,
                    AlbumId = albumId
                };

                _context.Tracks.Add(dbTrack);
                try
                {
                    await _context.SaveChangesAsync();
                }
                catch (DbUpdateException ex) when (ex.InnerException?.Message.Contains("UNIQUE constraint failed") == true)
                {
                    _context.Entry(dbTrack).State = EntityState.Detached;
                    dbTrack = await _context.Tracks.FirstOrDefaultAsync(t => t.SpotifyId == spotifyId);
                    if (dbTrack == null)
                    {
                        _logger.LogError("[ListeningHistory] Failed to find track after UNIQUE constraint: {SpotifyId}", spotifyId);
                        return false;
                    }
                }

                // Process artists
                if (track.TryGetProperty("artists", out var artistsProp) && artistsProp.ValueKind == JsonValueKind.Array)
                {
                    int order = 0;
                    foreach (var artistElement in artistsProp.EnumerateArray())
                    {
                        var artist = await _spotifyDataService.GetOrCreateArtistAsync(artistElement, accessToken);
                        if (artist != null)
                        {

                            if (artist != null)
                            {
                                // Create track-artist relationship if it doesn't exist
                                var existingTrackArtist = await _context.TrackArtists
                                    .FirstOrDefaultAsync(ta => ta.TrackId == dbTrack.Id && ta.ArtistId == artist.Id);
                                if (existingTrackArtist == null)
                                {
                                    _context.TrackArtists.Add(new TrackArtist
                                    {
                                        TrackId = dbTrack.Id,
                                        ArtistId = artist.Id,
                                        ArtistOrder = order
                                    });
                                    // Don't save yet, will save with listening history
                                }
                            }
                            order++;
                        }
                    }
                }
            }
            else
            {
                dbTrack = existingTrack;
                
                // Ensure album relationship exists for existing track
                if (existingTrack.AlbumId == null && track.TryGetProperty("album", out var albumPropExisting) && albumPropExisting.ValueKind != JsonValueKind.Null)
                {
                    var albumSpotifyId = albumPropExisting.TryGetProperty("id", out var albumIdPropExisting) ? albumIdPropExisting.GetString() : null;
                    if (!string.IsNullOrEmpty(albumSpotifyId))
                    {
                        var album = await _context.Albums.FirstOrDefaultAsync(a => a.SpotifyId == albumSpotifyId);
                        if (album == null)
                        {
                            album = new Album
                            {
                                SpotifyId = albumSpotifyId,
                                Name = albumPropExisting.TryGetProperty("name", out var albumNamePropExisting) ? albumNamePropExisting.GetString() ?? "Unknown" : "Unknown",
                                ImageUrl = albumPropExisting.TryGetProperty("images", out var imagesPropExisting) && imagesPropExisting.GetArrayLength() > 0
                                    ? (imagesPropExisting[0].TryGetProperty("url", out var urlPropExisting) ? urlPropExisting.GetString() : null)
                                    : null,
                                ReleaseDate = albumPropExisting.TryGetProperty("release_date", out var releaseDatePropExisting)
                                    ? (DateTime.TryParse(releaseDatePropExisting.GetString(), out var parsedDateExisting) ? parsedDateExisting : (DateTime?)null)
                                    : null
                            };
                            _context.Albums.Add(album);
                            try
                            {
                                await _context.SaveChangesAsync();
                            }
                            catch (DbUpdateException ex) when (ex.InnerException?.Message.Contains("UNIQUE constraint failed") == true)
                            {
                                _context.Entry(album).State = EntityState.Detached;
                                album = await _context.Albums.FirstOrDefaultAsync(a => a.SpotifyId == albumSpotifyId);
                            }
                        }
                        if (album != null)
                        {
                            existingTrack.AlbumId = album.Id;
                            await _context.SaveChangesAsync();
                            _logger.LogDebug("[ListeningHistory] Updated existing track with album: {TrackName} -> {AlbumName}", 
                                existingTrack.Name, album.Name);
                        }
                    }
                }

                // Ensure artist relationships exist for existing track
                var existingArtistCount = await _context.TrackArtists.CountAsync(ta => ta.TrackId == existingTrack.Id);
                if (existingArtistCount == 0 && track.TryGetProperty("artists", out var artistsPropExisting) && artistsPropExisting.ValueKind == JsonValueKind.Array)
                {
                    int orderExisting = 0;
                    foreach (var artistElement in artistsPropExisting.EnumerateArray())
                    {
                        var artist = await _spotifyDataService.GetOrCreateArtistAsync(artistElement, accessToken);
                        if (artist != null)
                        {

                            {
                                _context.TrackArtists.Add(new TrackArtist
                                {
                                    TrackId = existingTrack.Id,
                                    ArtistId = artist.Id,
                                    ArtistOrder = orderExisting
                                });
                            }
                            orderExisting++;
                        }
                    }
                    if (orderExisting > 0)
                    {
                        await _context.SaveChangesAsync();
                        _logger.LogDebug("[ListeningHistory] Added {Count} artists to existing track: {TrackName}", 
                            orderExisting, existingTrack.Name);
                    }
                }
            }

            // Extract playback info
            var playedAt = DateTime.Parse(item.TryGetProperty("played_at", out var playedProp) 
                ? playedProp.GetString() ?? DateTime.UtcNow.ToString("O") 
                : DateTime.UtcNow.ToString("O"));

            // Note: Spotify's recently-played endpoint doesn't include progress_ms
            // We'll use the full duration since we don't know how much was actually played
            var msPlayed = dbTrack.DurationMs;

            var contextUri = item.TryGetProperty("context", out var contextProp) && contextProp.ValueKind != JsonValueKind.Null
                ? (contextProp.TryGetProperty("uri", out var uriProp) ? uriProp.GetString() : null)
                : null;

            // Create listening history entry
            var listeningHistory = new ListeningHistory
            {
                UserId = userId,
                TrackId = dbTrack.Id,
                PlayedAt = playedAt,
                MsPlayed = msPlayed,
                ContextUri = contextUri,
                Source = ListeningSource.SpotifyApi,
                DedupeKey = dedupeKey,
                Latitude = latitude,
                Longitude = longitude
            };

            _context.ListeningHistory.Add(listeningHistory);
            
            // Save all changes together (track-artists + listening history)
            await _context.SaveChangesAsync();

            _logger.LogInformation("[ListeningHistory] Added listening entry for user {UserId}, track {TrackName} ({SpotifyId})", 
                userId, dbTrack.Name, spotifyId);

            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[ListeningHistory] Error processing recently played item for user {UserId}", userId);
            return false;
        }
    }
}
