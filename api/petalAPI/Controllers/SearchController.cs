using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using PetalAPI.Data;

namespace PetalAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class SearchController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly ILogger<SearchController> _logger;

    public SearchController(AppDbContext context, ILogger<SearchController> logger)
    {
        _context = context;
        _logger = logger;
    }

    /// <summary>
    /// Searches for users and tracks matching the query.
    /// </summary>
    /// <param name="q">The search query string.</param>
    /// <param name="limit">Maximum results per category (default 10).</param>
    [HttpGet]
    public async Task<IActionResult> Search([FromQuery] string q, [FromQuery] int limit = 10)
    {
        if (string.IsNullOrWhiteSpace(q))
        {
            return Ok(new { users = new List<object>(), tracks = new List<object>() });
        }

        var query = q.ToLower().Trim();

        // Search users by display name or handle
        var users = await _context.Users
            .Where(u => u.DisplayName.ToLower().Contains(query) || 
                        u.Handle.ToLower().Contains(query))
            .Take(limit)
            .Select(u => new
            {
                id = u.Id,
                displayName = u.DisplayName,
                handle = u.Handle,
                profileImageUrl = u.ProfileImageUrl
            })
            .ToListAsync();

        // Search tracks by name, include album and artist info
        var tracks = await _context.Tracks
            .Include(t => t.Album)
            .Include(t => t.TrackArtists)
                .ThenInclude(ta => ta.Artist)
            .Where(t => t.Name.ToLower().Contains(query))
            .Take(limit)
            .Select(t => new
            {
                id = t.Id,
                spotifyId = t.SpotifyId,
                name = t.Name,
                durationMs = t.DurationMs,
                albumName = t.Album != null ? t.Album.Name : null,
                albumImageUrl = t.Album != null ? t.Album.ImageUrl : null,
                artistName = t.TrackArtists.FirstOrDefault() != null 
                    ? t.TrackArtists.First().Artist.Name 
                    : null
            })
            .ToListAsync();

        return Ok(new { users, tracks });
    }
}
