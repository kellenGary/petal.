using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using PetalAPI.Data;
using PetalAPI.Models;

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
}

public class SetSotdRequest
{
    public int TrackId { get; set; }
}
