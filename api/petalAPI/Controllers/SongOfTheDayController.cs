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
    /// Set song of the day for current user
    /// </summary>
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
    /// Get current user's song of the day for today
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
    /// Get another user's song of the day for today
    /// </summary>
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
}

public class SetSotdRequest
{
    public int TrackId { get; set; }
}
