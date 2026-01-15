using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using MFAPI.Services;
using MFAPI.Data;

namespace MFAPI.Controllers;

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
    /// Add listening history for the currently playing track using Spotify ID.
    /// This enables real-time location tracking without waiting for Spotify's Recently Played API.
    /// </summary>
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

            var accessToken = await _spotifyTokenService.GetValidAccessTokenAsync(userId);

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

    [HttpGet("enriched")]
    public async Task<IActionResult> GetEnrichedListeningHistory(
        [FromQuery] int limit = 50,
        [FromQuery] int offset = 0)
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

            var query = _context.ListeningHistory
                .Where(h => h.UserId == userId)
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

            var enrichedItems = items.Select(h => new
            {
                id = h.Id,
                played_at = h.PlayedAt,
                ms_played = h.MsPlayed,
                context_uri = h.ContextUri,
                device_type = h.DeviceType,
                source = h.Source.ToString(),
                track = new
                {
                    id = h.Track.Id,
                    spotify_id = h.Track.SpotifyId,
                    name = h.Track.Name,
                    duration_ms = h.Track.DurationMs,
                    @explicit = h.Track.Explicit,
                    popularity = h.Track.Popularity,
                    album = h.Track.Album != null ? new
                    {
                        id = h.Track.Album.Id,
                        spotify_id = h.Track.Album.SpotifyId,
                        name = h.Track.Album.Name,
                        image_url = h.Track.Album.ImageUrl,
                        release_date = h.Track.Album.ReleaseDate
                    } : null,
                    artists = h.Track.TrackArtists
                        .OrderBy(ta => ta.ArtistOrder)
                        .Select(ta => new
                        {
                            id = ta.Artist.Id,
                            spotify_id = ta.Artist.SpotifyId,
                            name = ta.Artist.Name
                        })
                        .ToList()
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

    [HttpGet("enriched/{userId}")]
    public async Task<IActionResult> GetEnrichedListeningHistoryByUserId(
        int userId,
        [FromQuery] int limit = 50,
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

            // Check if the target user exists
            var targetUser = await _context.Users.FindAsync(userId);
            if (targetUser == null)
            {
                return NotFound(new { error = "User not found" });
            }

            if (limit < 1 || limit > 1000) limit = 50;
            if (offset < 0) offset = 0;

            var query = _context.ListeningHistory
                .Where(h => h.UserId == userId)
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

            var enrichedItems = items.Select(h => new
            {
                id = h.Id,
                played_at = h.PlayedAt,
                ms_played = h.MsPlayed,
                context_uri = h.ContextUri,
                device_type = h.DeviceType,
                source = h.Source.ToString(),
                track = new
                {
                    id = h.Track.Id,
                    spotify_id = h.Track.SpotifyId,
                    name = h.Track.Name,
                    duration_ms = h.Track.DurationMs,
                    @explicit = h.Track.Explicit,
                    popularity = h.Track.Popularity,
                    album = h.Track.Album != null ? new
                    {
                        id = h.Track.Album.Id,
                        spotify_id = h.Track.Album.SpotifyId,
                        name = h.Track.Album.Name,
                        image_url = h.Track.Album.ImageUrl,
                        release_date = h.Track.Album.ReleaseDate
                    } : null,
                    artists = h.Track.TrackArtists
                        .OrderBy(ta => ta.ArtistOrder)
                        .Select(ta => new
                        {
                            id = ta.Artist.Id,
                            spotify_id = ta.Artist.SpotifyId,
                            name = ta.Artist.Name
                        })
                        .ToList()
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
