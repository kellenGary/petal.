using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using PetalAPI.Services;
using PetalAPI.Data;
using PetalAPI.Models;

namespace PetalAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ListeningHistoryController : ControllerBase
{
    private readonly IListeningHistoryService _listeningHistoryService;
    private readonly ISpotifyTokenService _spotifyTokenService;
    private readonly ILogger<ListeningHistoryController> _logger;
    private readonly AppDbContext _context;

    public ListeningHistoryController(
        IListeningHistoryService listeningHistoryService,
        ISpotifyTokenService spotifyTokenService,
        ILogger<ListeningHistoryController> logger,
        AppDbContext context)
    {
        _listeningHistoryService = listeningHistoryService;
        _spotifyTokenService = spotifyTokenService;
        _logger = logger;
        _context = context;
    }

    /// <summary>
    /// Manually adds a listening history entry.
    /// </summary>
    /// <param name="request">The listening history data.</param>
    [HttpPost("add")]
    public async Task<IActionResult> AddListeningHistory([FromBody] AddListeningHistoryRequest request)
    {
        try
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
            if (userIdClaim == null || !int.TryParse(userIdClaim.Value, out var userId))
            {
                return Unauthorized(new { error = "Invalid token" });
            }

            if (request.TrackId <= 0 || request.MsPlayed < 0)
            {
                return BadRequest(new { error = "Invalid track ID or ms played" });
            }

            if (request.Latitude.HasValue || request.Longitude.HasValue)
            {
                if (!request.Latitude.HasValue || !request.Longitude.HasValue)
                {
                    return BadRequest(new { error = "Both latitude and longitude must be provided together" });
                }

                if (request.Latitude < -90 || request.Latitude > 90 || request.Longitude < -180 || request.Longitude > 180)
                {
                    return BadRequest(new { error = "Invalid latitude or longitude values" });
                }
            }

            await _listeningHistoryService.AddListeningHistoryAsync(
                userId,
                request.TrackId,
                request.PlayedAt ?? DateTime.UtcNow,
                request.MsPlayed,
                request.ContextUri,
                request.DeviceType,
                request.Latitude,
                request.Longitude);

            return Ok(new { message = "Listening history recorded" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error adding listening history");
            return StatusCode(500, new { error = "Internal server error" });
        }
    }

    /// <summary>
    /// Syncs the user's recently played tracks from Spotify.
    /// </summary>
    /// <param name="request">Optional location data to attach to synced tracks.</param>
    [HttpPost("sync")]
    public async Task<IActionResult> SyncRecentlyPlayed([FromBody] SyncRecentlyPlayedRequest? request)
    {
        try
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
            if (userIdClaim == null || !int.TryParse(userIdClaim.Value, out var userId))
            {
                return Unauthorized(new { error = "Invalid token" });
            }

            var accessToken = await _spotifyTokenService.GetValidAccessTokenAsync(userId);
            if (accessToken == null) return Unauthorized(new { error = "Spotify token expired" });

            var tracksAdded = await _listeningHistoryService.SyncRecentlyPlayedAsync(
                userId, 
                accessToken, 
                includeLocation: true,
                latitude: request?.Latitude,
                longitude: request?.Longitude);

            return Ok(new
            {
                message = $"Synced {tracksAdded} new tracks",
                tracksAdded = tracksAdded
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error syncing recently played");
            return StatusCode(500, new { error = "Internal server error" });
        }
    }

    /// <summary>
    /// Adds a listening history entry for the currently playing track using its Spotify ID.
    /// Enables real-time location tracking without waiting for Spotify's Recently Played API update.
    /// </summary>
    /// <param name="request">The currently playing track and location data.</param>
    [HttpPost("add-current")]
    public async Task<IActionResult> AddCurrentlyPlaying([FromBody] AddCurrentlyPlayingRequest request)
    {
        try
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
            if (userIdClaim == null || !int.TryParse(userIdClaim.Value, out var userId))
            {
                return Unauthorized(new { error = "Invalid token" });
            }

            if (string.IsNullOrEmpty(request.SpotifyTrackId))
            {
                return BadRequest(new { error = "Spotify track ID is required" });
            }

            // Validate location if provided
            if (request.Latitude.HasValue || request.Longitude.HasValue)
            {
                if (!request.Latitude.HasValue || !request.Longitude.HasValue)
                {
                    return BadRequest(new { error = "Both latitude and longitude must be provided together" });
                }

                if (request.Latitude < -90 || request.Latitude > 90 || request.Longitude < -180 || request.Longitude > 180)
                {
                    return BadRequest(new { error = "Invalid latitude or longitude values" });
                }
            }

            // Check if this is a duplicate of the last played track for this user
            var lastPlayed = await _context.ListeningHistory
                .Where(h => h.UserId == userId)
                .OrderByDescending(h => h.PlayedAt)
                .Include(h => h.Track)
                .FirstOrDefaultAsync();

            if (lastPlayed?.Track?.SpotifyId == request.SpotifyTrackId)
            {
                return Ok(new { message = "Already recorded", trackName = lastPlayed.Track.Name, duplicate = true });
            }

            var accessToken = await _spotifyTokenService.GetValidAccessTokenAsync(userId);
            if (accessToken == null) return Unauthorized(new { error = "Spotify token expired" });

            var result = await _listeningHistoryService.AddCurrentlyPlayingAsync(
                userId,
                accessToken,
                request.SpotifyTrackId,
                request.PlayedAt ?? DateTime.UtcNow,
                request.ProgressMs ?? 0,
                request.Latitude,
                request.Longitude);

            if (!result.Success)
            {
                return BadRequest(new { error = result.Error });
            }

            return Ok(new { message = "Listening history recorded", trackName = result.TrackName });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error adding currently playing");
            return StatusCode(500, new { error = "Internal server error" });
        }
    }

    /// <summary>
    /// Retrieves the authenticated user's listening history with enriched track data.
    /// </summary>
    /// <param name="limit">The maximum number of items to return.</param>
    /// <param name="offset">The number of items to skip.</param>
    /// <param name="days">Optional. Filter to only include tracks from the last N days.</param>
    [HttpGet("enriched")]
    public async Task<IActionResult> GetEnrichedListeningHistory(
        [FromQuery] int limit = 50,
        [FromQuery] int offset = 0,
        [FromQuery] int? days = null)
    {
        try
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
            if (userIdClaim == null || !int.TryParse(userIdClaim.Value, out var userId))
            {
                return Unauthorized(new { error = "Invalid token" });
            }

            if (limit < 1 || limit > 1000) limit = 50;
            if (offset < 0) offset = 0;

            // Use the enriched view for better performance
            var query = _context.ListeningHistoryEnriched
                .Where(h => h.UserId == userId);

            // Apply date filter if days is specified
            if (days.HasValue && days.Value > 0)
            {
                var sinceDate = DateTime.UtcNow.AddDays(-days.Value);
                query = query.Where(h => h.PlayedAt >= sinceDate);
            }

            query = query.OrderByDescending(h => h.PlayedAt);

            var total = await query.CountAsync();
            var items = await query
                .Skip(offset)
                .Take(limit)
                .ToListAsync();

            // Get track IDs for fetching artists
            var trackIds = items.Select(h => h.TrackId).Distinct().ToList();
            
            // Fetch artists separately (view doesn't aggregate them)
            var trackArtists = await _context.TrackArtists
                .Where(ta => trackIds.Contains(ta.TrackId))
                .Include(ta => ta.Artist)
                .OrderBy(ta => ta.ArtistOrder)
                .ToListAsync();
            
            var artistsByTrackId = trackArtists
                .GroupBy(ta => ta.TrackId)
                .ToDictionary(g => g.Key, g => g.Select(ta => new
                {
                    id = ta.Artist.Id,
                    spotify_id = ta.Artist.SpotifyId,
                    name = ta.Artist.Name
                }).ToList());

            var enrichedItems = items.Select(h => new
            {
                id = h.Id,
                played_at = h.PlayedAt,
                ms_played = h.MsPlayed,
                context_uri = h.ContextUri,
                device_type = h.DeviceType,
                source = ((Models.ListeningSource)h.Source).ToString(),
                track = new
                {
                    id = h.TrackId,
                    spotify_id = h.TrackSpotifyId,
                    name = h.TrackName,
                    duration_ms = h.DurationMs,
                    @explicit = h.Explicit,
                    popularity = h.Popularity,
                    album = h.AlbumId.HasValue ? new
                    {
                        id = h.AlbumId.Value,
                        spotify_id = h.AlbumSpotifyId,
                        name = h.AlbumName,
                        image_url = h.AlbumImageUrl,
                        release_date = h.AlbumReleaseDate
                    } : null,
                    artists = artistsByTrackId.GetValueOrDefault(h.TrackId) ?? []
                }
            }).ToList();

            var response = new
            {
                total = total,
                limit = limit,
                offset = offset,
                items = enrichedItems
            };

            return Ok(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting enriched listening history");
            return StatusCode(500, new { error = "Internal server error" });
        }
    }

    /// <summary>
    /// Retrieves enriched listening history for a specific user.
    /// </summary>
    /// <param name="userId">The ID of the user to retrieve history for.</param>
    /// <param name="limit">The maximum number of items to return.</param>
    /// <param name="offset">The number of items to skip.</param>
    /// <param name="days">Optional. Filter to only include tracks from the last N days.</param>
    [HttpGet("enriched/{userId}")]
    public async Task<IActionResult> GetEnrichedListeningHistoryByUserId(
        int userId,
        [FromQuery] int limit = 50,
        [FromQuery] int offset = 0,
        [FromQuery] int? days = null)
    {
        try
        {
            // Verify the requesting user is authenticated
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
            if (userIdClaim == null)
            {
                return Unauthorized(new { error = "Invalid token" });
            }

            // Check if the target user exists
            var targetUser = await _context.Users.FindAsync(userId);
            if (targetUser == null)
            {
                return NotFound(new { error = "User not found" });
            }

            if (limit < 1 || limit > 1000) limit = 50;
            if (offset < 0) offset = 0;

            // Use the enriched view for better performance
            var query = _context.ListeningHistoryEnriched
                .Where(h => h.UserId == userId);

            // Apply date filter if days is specified
            if (days.HasValue && days.Value > 0)
            {
                var sinceDate = DateTime.UtcNow.AddDays(-days.Value);
                query = query.Where(h => h.PlayedAt >= sinceDate);
            }

            query = query.OrderByDescending(h => h.PlayedAt);

            var total = await query.CountAsync();
            var items = await query
                .Skip(offset)
                .Take(limit)
                .ToListAsync();

            // Get track IDs for fetching artists
            var trackIds = items.Select(h => h.TrackId).Distinct().ToList();
            
            // Fetch artists separately (view doesn't aggregate them)
            var trackArtists = await _context.TrackArtists
                .Where(ta => trackIds.Contains(ta.TrackId))
                .Include(ta => ta.Artist)
                .OrderBy(ta => ta.ArtistOrder)
                .ToListAsync();
            
            var artistsByTrackId = trackArtists
                .GroupBy(ta => ta.TrackId)
                .ToDictionary(g => g.Key, g => g.Select(ta => new
                {
                    id = ta.Artist.Id,
                    spotify_id = ta.Artist.SpotifyId,
                    name = ta.Artist.Name
                }).ToList());

            var enrichedItems = items.Select(h => new
            {
                id = h.Id,
                played_at = h.PlayedAt,
                ms_played = h.MsPlayed,
                context_uri = h.ContextUri,
                device_type = h.DeviceType,
                source = ((Models.ListeningSource)h.Source).ToString(),
                track = new
                {
                    id = h.TrackId,
                    spotify_id = h.TrackSpotifyId,
                    name = h.TrackName,
                    duration_ms = h.DurationMs,
                    @explicit = h.Explicit,
                    popularity = h.Popularity,
                    album = h.AlbumId.HasValue ? new
                    {
                        id = h.AlbumId.Value,
                        spotify_id = h.AlbumSpotifyId,
                        name = h.AlbumName,
                        image_url = h.AlbumImageUrl,
                        release_date = h.AlbumReleaseDate
                    } : null,
                    artists = artistsByTrackId.GetValueOrDefault(h.TrackId) ?? []
                }
            }).ToList();

            var response = new
            {
                total = total,
                limit = limit,
                offset = offset,
                items = enrichedItems
            };

            return Ok(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting enriched listening history for user {UserId}", userId);
            return StatusCode(500, new { error = "Internal server error" });
        }
    }

    /// <summary>
    /// Gets listening history entries that have location data for map display.
    /// Returns only entries with valid latitude and longitude coordinates.
    /// </summary>
    [HttpGet("with-location")]
    public async Task<IActionResult> GetListeningHistoryWithLocation(
        [FromQuery] int limit = 500,
        [FromQuery] int offset = 0)
    {
        try
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
            if (userIdClaim == null || !int.TryParse(userIdClaim.Value, out var userId))
            {
                return Unauthorized(new { error = "Invalid token" });
            }

            if (limit < 1 || limit > 1000) limit = 500;
            if (offset < 0) offset = 0;

            var query = _context.ListeningHistory
                .Where(h => h.UserId == userId && h.Latitude.HasValue && h.Longitude.HasValue)
                .Include(h => h.Track)
                    .ThenInclude(t => t.Album)
                .Include(h => h.Track)
                    .ThenInclude(t => t.TrackArtists)
                        .ThenInclude(ta => ta.Artist)
                .OrderByDescending(h => h.PlayedAt);

            var total = await query.CountAsync();
            var items = await query
                .Skip(offset)
                .Take(limit)
                .ToListAsync();

            var locationItems = items.Select(h => new
            {
                id = h.Id,
                played_at = h.PlayedAt,
                latitude = h.Latitude,
                longitude = h.Longitude,
                location_accuracy = h.LocationAccuracy,
                track = new
                {
                    id = h.Track.Id,
                    spotify_id = h.Track.SpotifyId,
                    name = h.Track.Name,
                    album = h.Track.Album != null ? new
                    {
                        id = h.Track.Album.Id,
                        name = h.Track.Album.Name,
                        image_url = h.Track.Album.ImageUrl
                    } : null,
                    artists = h.Track.TrackArtists
                        .OrderBy(ta => ta.ArtistOrder)
                        .Select(ta => new
                        {
                            id = ta.Artist.Id,
                            name = ta.Artist.Name
                        })
                        .ToList()
                }
            }).ToList();

            return Ok(new
            {
                total = total,
                limit = limit,
                offset = offset,
                items = locationItems
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting listening history with location");
            return StatusCode(500, new { error = "Internal server error" });
        }
    }

    /// <summary>
    /// Gets listening history entries with location data from all users for the global map.
    /// </summary>
    /// <param name="limit">The maximum number of items to return.</param>
    /// <param name="offset">The number of items to skip.</param>
    [HttpGet("all-with-location")]
    public async Task<IActionResult> GetAllListeningHistoryWithLocation(
        [FromQuery] int limit = 500,
        [FromQuery] int offset = 0)
    {
        try
        {
            // Verify the requesting user is authenticated
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
            if (userIdClaim == null)
            {
                return Unauthorized(new { error = "Invalid token" });
            }

            if (limit < 1 || limit > 1000) limit = 500;
            if (offset < 0) offset = 0;

            var query = _context.ListeningHistory
                .Where(h => h.Latitude.HasValue && h.Longitude.HasValue)
                .Include(h => h.User)
                .Include(h => h.Track)
                    .ThenInclude(t => t.Album)
                .Include(h => h.Track)
                    .ThenInclude(t => t.TrackArtists)
                        .ThenInclude(ta => ta.Artist)
                .OrderByDescending(h => h.PlayedAt);

            var total = await query.CountAsync();
            var items = await query
                .Skip(offset)
                .Take(limit)
                .ToListAsync();

            var locationItems = items.Select(h => new
            {
                id = h.Id,
                played_at = h.PlayedAt,
                latitude = h.Latitude,
                longitude = h.Longitude,
                location_accuracy = h.LocationAccuracy,
                user = new
                {
                    id = h.User.Id,
                    display_name = h.User.DisplayName,
                    avatar_url = h.User.ProfileImageUrl
                },
                track = new
                {
                    id = h.Track.Id,
                    spotify_id = h.Track.SpotifyId,
                    name = h.Track.Name,
                    album = h.Track.Album != null ? new
                    {
                        id = h.Track.Album.Id,
                        name = h.Track.Album.Name,
                        image_url = h.Track.Album.ImageUrl
                    } : null,
                    artists = h.Track.TrackArtists
                        .OrderBy(ta => ta.ArtistOrder)
                        .Select(ta => new
                        {
                            id = ta.Artist.Id,
                            name = ta.Artist.Name
                        })
                        .ToList()
                }
            }).ToList();

            return Ok(new
            {
                total = total,
                limit = limit,
                offset = offset,
                items = locationItems
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting all listening history with location");
            return StatusCode(500, new { error = "Internal server error" });
        }
    }

    /// <summary>
    /// Gets consecutive day streaks for all tracks played by a user (streak >= 2).
    /// </summary>
    /// <param name="userId">The ID of the user to retrieve streaks for.</param>
    [HttpGet("streaks/{userId}")]
    public async Task<IActionResult> GetTrackStreaks(int userId)
    {
        try
        {
            // Verify the requesting user is authenticated
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
            if (userIdClaim == null)
            {
                return Unauthorized(new { error = "Invalid token" });
            }

            // Check if the target user exists
            var targetUser = await _context.Users.FindAsync(userId);
            if (targetUser == null)
            {
                return NotFound(new { error = "User not found" });
            }

            // Get today's date in UTC
            var today = DateTime.UtcNow.Date;

            // Get all listening history for the user with track info
            var listeningHistory = await _context.ListeningHistory
                .Where(h => h.UserId == userId)
                .Include(h => h.Track)
                .Select(h => new { h.Track.SpotifyId, PlayedDate = h.PlayedAt.Date })
                .ToListAsync();

            // Group by SpotifyId and calculate streaks
            var streaks = listeningHistory
                .GroupBy(h => h.SpotifyId)
                .Select(g => new
                {
                    SpotifyId = g.Key,
                    Streak = CalculateStreak(g.Select(x => x.PlayedDate).Distinct().ToList(), today)
                })
                .Where(x => x.Streak >= 2)
                .ToDictionary(x => x.SpotifyId, x => x.Streak);

            return Ok(streaks);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting track streaks for user {UserId}", userId);
            return StatusCode(500, new { error = "Internal server error" });
        }
    }

    /// <summary>
    /// Calculates the current consecutive day streak from a list of dates.
    /// Counts backwards from today (or yesterday if no play today).
    /// </summary>
    private static int CalculateStreak(List<DateTime> playedDates, DateTime today)
    {
        if (playedDates.Count == 0) return 0;

        var sortedDates = playedDates.OrderByDescending(d => d).ToList();
        
        // Check if chain starts today or yesterday
        var mostRecent = sortedDates[0];
        if (mostRecent != today && mostRecent != today.AddDays(-1))
        {
            return 0; // Streak is broken
        }

        int streak = 1;
        var currentDate = mostRecent;

        for (int i = 1; i < sortedDates.Count; i++)
        {
            var previousDate = sortedDates[i];
            
            // Check if this date is exactly one day before
            if (currentDate.AddDays(-1) == previousDate)
            {
                streak++;
                currentDate = previousDate;
            }
            else if (currentDate == previousDate)
            {
                // Same date, skip (already counted)
                continue;
            }
            else
            {
                // Gap in dates, streak is broken
                break;
            }
        }

        return streak;
    }
    /// <summary>
    /// Seeds the listening history with dummy data containing random global locations for testing map visualization.
    /// </summary>
    /// <param name="count">The number of entries to generate (default 50).</param>
    [HttpPost("seed")]
    public async Task<IActionResult> SeedListeningHistory([FromQuery] int count = 50)
    {
        try
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
            if (userIdClaim == null || !int.TryParse(userIdClaim.Value, out var userId))
            {
                return Unauthorized(new { error = "Invalid token" });
            }

            if (count < 1 || count > 1000) count = 50;

            // Get some tracks to use
            // Fetch first 100 tracks and pick randomly in memory to avoid LINQ translation issues with Guid.NewGuid()
            var candidateTracks = await _context.Tracks
                .Take(100)
                .ToListAsync();
            
            if (!candidateTracks.Any())
            {
                return BadRequest(new { error = "No tracks found in database to seed with" });
            }
            
            var random = new Random();
            var tracks = candidateTracks.OrderBy(x => random.Next()).Take(20).ToList();

            if (!tracks.Any())
            {
                return BadRequest(new { error = "No tracks found in database to seed with" });
            }


            var historyEntries = new List<ListeningHistory>();
            var now = DateTime.UtcNow;

            for (int i = 0; i < count; i++)
            {
                var track = tracks[random.Next(tracks.Count)];
                
                // Generate random location
                // Latitude: -90 to 90
                var latitude = random.NextDouble() * 180 - 90;
                // Longitude: -180 to 180
                var longitude = random.NextDouble() * 360 - 180;

                historyEntries.Add(new ListeningHistory
                {
                    UserId = userId,
                    TrackId = track.Id,
                    PlayedAt = now.AddMinutes(-random.Next(1, 10000)), // Random time in past
                    MsPlayed = track.DurationMs,
                    ContextUri = null,
                    DeviceType = "generated_seed",
                    Source = ListeningSource.App,
                    Latitude = latitude,
                    Longitude = longitude,
                    LocationAccuracy = 10.0,
                    DedupeKey = Guid.NewGuid().ToString() // Ensure uniqueness
                });
            }

            _context.ListeningHistory.AddRange(historyEntries);
            await _context.SaveChangesAsync();

            return Ok(new 
            { 
                message = $"Successfully seeded {count} listening history entries",
                locations = historyEntries.Select(h => new { h.Latitude, h.Longitude })
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error seeding listening history");
            return StatusCode(500, new { error = "Internal server error" });
        }
    }
}

public class AddListeningHistoryRequest
{
    public int TrackId { get; set; }
    public int MsPlayed { get; set; }
    public DateTime? PlayedAt { get; set; }
    public string? ContextUri { get; set; }
    public string? DeviceType { get; set; }
    public double? Latitude { get; set; }
    public double? Longitude { get; set; }
}

public class SyncRecentlyPlayedRequest
{
    public double? Latitude { get; set; }
    public double? Longitude { get; set; }
}

public class AddCurrentlyPlayingRequest
{
    public required string SpotifyTrackId { get; set; }
    public DateTime? PlayedAt { get; set; }
    public int? ProgressMs { get; set; }
    public double? Latitude { get; set; }
    public double? Longitude { get; set; }
}
