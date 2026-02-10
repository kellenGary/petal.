using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using PetalAPI.Data;
using PetalAPI.Models;
using PetalAPI.Services;

namespace PetalAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class SongOfTheDayController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly ILogger<SongOfTheDayController> _logger;

    public SongOfTheDayController(AppDbContext context, ILogger<SongOfTheDayController> logger)
    {
        _context = context;
        _logger = logger;
    }

    private int? GetCurrentUserId()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (int.TryParse(userIdClaim, out var userId))
            return userId;
        return null;
    }

    /// <summary>
    /// Sets the song of the day for the current user.
    /// </summary>
    /// <param name="request">The song of the day details.</param>
    [HttpPost]
    public async Task<IActionResult> SetSongOfTheDay([FromBody] SetSotdRequest request)
    {
        var userId = GetCurrentUserId();
        if (userId == null)
            return Unauthorized("User not authenticated");

        // Verify track exists
        var track = await _context.Tracks.FindAsync(request.TrackId);
        if (track == null)
            return BadRequest("Track not found");

        var today = DateOnly.FromDateTime(DateTime.UtcNow);

        // Check if user already has SOTD for today
        var existingSotd = await _context.SongsOfTheDay
            .FirstOrDefaultAsync(s => s.UserId == userId.Value && s.Date == today);

        if (existingSotd != null)
        {
            // Update existing
            existingSotd.TrackId = request.TrackId;
            _context.SongsOfTheDay.Update(existingSotd);
        }
        else
        {
            // Create new
            var sotd = new SongOfTheDay
            {
                UserId = userId.Value,
                TrackId = request.TrackId,
                Date = today
            };
            _context.SongsOfTheDay.Add(sotd);
        }

        await _context.SaveChangesAsync();

        _logger.LogInformation("User {UserId} set SOTD to track {TrackId} for {Date}", userId, request.TrackId, today);

        return Ok(new { success = true, date = today.ToString() });
    }

    /// <summary>
    /// Retrieves the current user's song of the day for today.
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> GetSongOfTheDay()
    {
        var userId = GetCurrentUserId();
        if (userId == null)
            return Unauthorized("User not authenticated");

        return await GetSotdForUser(userId.Value);
    }

    /// <summary>
    /// Retrieves another user's song of the day for today.
    /// </summary>
    /// <param name="userId">The ID of the user to retrieve the song for.</param>
    [HttpGet("{userId}")]
    public async Task<IActionResult> GetSongOfTheDayByUserId(int userId)
    {
        return await GetSotdForUser(userId);
    }

    private async Task<IActionResult> GetSotdForUser(int userId)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);

        var sotd = await _context.SongsOfTheDay
            .Include(s => s.Track)
                .ThenInclude(t => t.Album)
            .Include(s => s.Track)
                .ThenInclude(t => t.TrackArtists)
                    .ThenInclude(ta => ta.Artist)
            .FirstOrDefaultAsync(s => s.UserId == userId && s.Date == today);

        if (sotd == null)
            return Ok(new { songOfTheDay = (object?)null });

        return Ok(new
        {
            songOfTheDay = new
            {
                id = sotd.Track.Id.ToString(),
                name = sotd.Track.Name,
                artists = sotd.Track.TrackArtists.Select(ta => ta.Artist.Name).ToArray(),
                album = new
                {
                    id = sotd.Track.Album?.Id.ToString(),
                    name = sotd.Track.Album?.Name,
                    image_url = sotd.Track.Album?.ImageUrl
                }
            }
        });
    }

    /// <summary>
    /// Retrieves songs of the day from users that the current user follows.
    /// </summary>
    [HttpGet("following")]
    public async Task<IActionResult> GetFollowingSotds()
    {
        var userId = GetCurrentUserId();
        if (userId == null)
            return Unauthorized("User not authenticated");

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        
        _logger.LogInformation("[SOTD Following] User {UserId} querying for date {Date}", userId, today);

        // Get the IDs of users the current user follows
        var followedUserIds = await _context.Follows
            .Where(f => f.FollowerUserId == userId.Value)
            .Select(f => f.FolloweeUserId)
            .ToListAsync();
        
        _logger.LogInformation("[SOTD Following] User {UserId} follows {Count} users: [{UserIds}]", 
            userId, followedUserIds.Count, string.Join(", ", followedUserIds));

        if (!followedUserIds.Any())
            return Ok(new List<object>());

        // Debug: Check all SOTDs from followed users regardless of date
        var allFollowedSotds = await _context.SongsOfTheDay
            .Where(s => followedUserIds.Contains(s.UserId))
            .Select(s => new { s.UserId, s.Date })
            .ToListAsync();
        
        _logger.LogInformation("[SOTD Following] All SOTDs from followed users: {Sotds}", 
            string.Join(", ", allFollowedSotds.Select(s => $"User {s.UserId}: {s.Date}")));

        // Get today's SOTDs for followed users
        var followingSotds = await _context.SongsOfTheDay
            .Where(s => followedUserIds.Contains(s.UserId) && s.Date == today)
            .Include(s => s.User)
            .Include(s => s.Track)
                .ThenInclude(t => t.Album)
            .Include(s => s.Track)
                .ThenInclude(t => t.TrackArtists)
                    .ThenInclude(ta => ta.Artist)
            .Select(s => new
            {
                user = new
                {
                    id = s.User.Id,
                    displayName = s.User.DisplayName,
                    handle = s.User.Handle,
                    profileImageUrl = s.User.ProfileImageUrl
                },
                track = new
                {
                    id = s.Track.Id.ToString(),
                    name = s.Track.Name,
                    artists = s.Track.TrackArtists.Select(ta => ta.Artist.Name).ToArray(),
                    album = new
                    {
                        id = s.Track.Album != null ? s.Track.Album.Id.ToString() : null,
                        name = s.Track.Album != null ? s.Track.Album.Name : null,
                        image_url = s.Track.Album != null ? s.Track.Album.ImageUrl : null
                    }
                }
            })
            .ToListAsync();

        _logger.LogInformation("[SOTD Following] Found {Count} SOTDs for today ({Date})", followingSotds.Count, today);

        return Ok(followingSotds);
    }

    /// <summary>
    /// Retrieves songs of the day for the last 7 days from the current user and users they follow.
    /// Grouped by date.
    /// </summary>
    [HttpGet("weekly")]
    public async Task<IActionResult> GetWeeklySotds()
    {
        var userId = GetCurrentUserId();
        if (userId == null)
            return Unauthorized("User not authenticated");

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var weekAgo = today.AddDays(-6); // Include today + 6 previous days = 7 days

        // Get IDs of users the current user follows + current user
        var followedUserIds = await _context.Follows
            .Where(f => f.FollowerUserId == userId.Value)
            .Select(f => f.FolloweeUserId)
            .ToListAsync();

        // Include current user
        var allUserIds = followedUserIds.Append(userId.Value).Distinct().ToList();

        // Get SOTDs for the past week
        var weeklySotds = await _context.SongsOfTheDay
            .Where(s => allUserIds.Contains(s.UserId) && s.Date >= weekAgo && s.Date <= today)
            .Include(s => s.User)
            .Include(s => s.Track)
                .ThenInclude(t => t.Album)
            .Include(s => s.Track)
                .ThenInclude(t => t.TrackArtists)
                    .ThenInclude(ta => ta.Artist)
            .OrderByDescending(s => s.Date)
            .ThenBy(s => s.User.DisplayName)
            .Select(s => new
            {
                date = s.Date.ToString("yyyy-MM-dd"),
                user = new
                {
                    id = s.User.Id,
                    displayName = s.User.DisplayName,
                    handle = s.User.Handle,
                    profileImageUrl = s.User.ProfileImageUrl
                },
                track = new
                {
                    id = s.Track.Id,
                    spotifyId = s.Track.SpotifyId,
                    name = s.Track.Name,
                    artists = s.Track.TrackArtists.Select(ta => ta.Artist.Name).ToArray(),
                    album = new
                    {
                        id = s.Track.Album != null ? s.Track.Album.Id : (int?)null,
                        spotifyId = s.Track.Album != null ? s.Track.Album.SpotifyId : null,
                        name = s.Track.Album != null ? s.Track.Album.Name : null,
                        image_url = s.Track.Album != null ? s.Track.Album.ImageUrl : null
                    }
                }
            })
            .ToListAsync();

        // Group by date
        var grouped = weeklySotds
            .GroupBy(s => s.date)
            .Select(g => new
            {
                date = g.Key,
                songs = g.Select(s => new
                {
                    user = s.user,
                    track = s.track
                }).ToList()
            })
            .ToList();

        return Ok(grouped);
    }

    /// <summary>
    /// Creates a Spotify playlist from the weekly songs of the day.
    /// </summary>
    [HttpPost("create-playlist")]
    public async Task<IActionResult> CreatePlaylistFromWeekly([FromBody] CreatePlaylistRequest? request, [FromServices] ISpotifyTokenService spotifyTokenService, [FromServices] IHttpClientFactory httpClientFactory)
    {
        var userId = GetCurrentUserId();
        if (userId == null)
            return Unauthorized("User not authenticated");

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var weekAgo = today.AddDays(-6);

        // Get user's Spotify ID
        var user = await _context.Users.FindAsync(userId.Value);
        if (user == null || string.IsNullOrEmpty(user.SpotifyId))
            return BadRequest("User not found or Spotify ID not available");

        // Get access token
        var accessToken = await spotifyTokenService.GetValidAccessTokenAsync(userId.Value);
        if (accessToken == null)
            return Unauthorized("Spotify token expired or not available");

        // Get IDs of users the current user follows + current user
        var followedUserIds = await _context.Follows
            .Where(f => f.FollowerUserId == userId.Value)
            .Select(f => f.FolloweeUserId)
            .ToListAsync();
        var allUserIds = followedUserIds.Append(userId.Value).Distinct().ToList();

        // Get SOTDs for the past week
        var spotifyTrackUris = await _context.SongsOfTheDay
            .Where(s => allUserIds.Contains(s.UserId) && s.Date >= weekAgo && s.Date <= today)
            .Include(s => s.Track)
            .OrderByDescending(s => s.Date)
            .Select(s => $"spotify:track:{s.Track.SpotifyId}")
            .Distinct()
            .ToListAsync();

        if (!spotifyTrackUris.Any())
            return BadRequest("No songs found for the past week");

        var client = httpClientFactory.CreateClient("Spotify");
        client.DefaultRequestHeaders.Authorization = 
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", accessToken);

        // Create playlist
        var playlistName = request?.Name ?? $"Songs of the Week - {today:MMM d, yyyy}";
        var playlistDescription = request?.Description ?? "Created by Petal - Songs of the day from you and your friends";

        var createPlaylistBody = new
        {
            name = playlistName,
            description = playlistDescription,
            @public = false
        };

        var createResponse = await client.PostAsJsonAsync(
            $"https://api.spotify.com/v1/me/playlists",
            createPlaylistBody);

        if (!createResponse.IsSuccessStatusCode)
        {
            var error = await createResponse.Content.ReadAsStringAsync();
            _logger.LogError("Failed to create playlist: {Error}", error);
            return StatusCode((int)createResponse.StatusCode, new { error = "Failed to create playlist", details = error });
        }

        var playlistJson = await createResponse.Content.ReadFromJsonAsync<System.Text.Json.JsonElement>();
        var playlistId = playlistJson.GetProperty("id").GetString();
        var playlistUrl = playlistJson.GetProperty("external_urls").GetProperty("spotify").GetString();

        // Add tracks to playlist (max 100 per request)
        for (int i = 0; i < spotifyTrackUris.Count; i += 100)
        {
            var batch = spotifyTrackUris.Skip(i).Take(100).ToList();
            var addTracksBody = new { uris = batch };

            var addResponse = await client.PostAsJsonAsync(
                $"https://api.spotify.com/v1/playlists/{playlistId}/tracks",
                addTracksBody);

            if (!addResponse.IsSuccessStatusCode)
            {
                var error = await addResponse.Content.ReadAsStringAsync();
                _logger.LogError("Failed to add tracks to playlist: {Error}", error);
                // Continue anyway - playlist was created
            }
        }

        _logger.LogInformation("User {UserId} created weekly SOTD playlist with {TrackCount} tracks", userId, spotifyTrackUris.Count);

        return Ok(new
        {
            success = true,
            playlistId = playlistId,
            playlistUrl = playlistUrl,
            tracksAdded = spotifyTrackUris.Count,
            playlistName = playlistName
        });
    }
}

public class SetSotdRequest
{
    public int TrackId { get; set; }
}

public class CreatePlaylistRequest
{
    public string? Name { get; set; }
    public string? Description { get; set; }
}

