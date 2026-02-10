using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using PetalAPI.Data;

namespace PetalAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class AnalyticsController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly ILogger<AnalyticsController> _logger;

    public AnalyticsController(AppDbContext context, ILogger<AnalyticsController> logger)
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
    /// Gets an overview of user listening analytics for a specified time period.
    /// </summary>
    /// <param name="days">Number of days to look back (7, 30, 90, or 0 for all time)</param>
    [HttpGet("overview")]
    public async Task<IActionResult> GetOverview([FromQuery] int days = 7)
    {
        var userId = GetCurrentUserId();
        if (userId == null)
            return Unauthorized("User not authenticated");

        var cutoffDate = days > 0 
            ? DateTime.UtcNow.AddDays(-days) 
            : DateTime.MinValue;

        var historyQuery = _context.ListeningHistory
            .Where(lh => lh.UserId == userId.Value);
        
        if (days > 0)
            historyQuery = historyQuery.Where(lh => lh.PlayedAt >= cutoffDate);

        var totalPlays = await historyQuery.CountAsync();
        var totalMinutes = await historyQuery.SumAsync(lh => lh.MsPlayed) / 60000.0;
        var uniqueTracks = await historyQuery.Select(lh => lh.TrackId).Distinct().CountAsync();

        return Ok(new
        {
            period = days > 0 ? $"Last {days} days" : "All time",
            totalPlays,
            totalMinutes = Math.Round(totalMinutes, 1),
            uniqueTracks
        });
    }

    /// <summary>
    /// Gets the user's top tracks for a specified time period.
    /// </summary>
    /// <param name="days">Number of days to look back (7, 30, 90, or 0 for all time)</param>
    /// <param name="limit">Maximum number of tracks to return</param>
    [HttpGet("top-tracks")]
    public async Task<IActionResult> GetTopTracks([FromQuery] int days = 7, [FromQuery] int limit = 10)
    {
        var userId = GetCurrentUserId();
        if (userId == null)
            return Unauthorized("User not authenticated");

        var cutoffDate = days > 0 
            ? DateTime.UtcNow.AddDays(-days) 
            : DateTime.MinValue;

        var historyQuery = _context.ListeningHistory
            .Where(lh => lh.UserId == userId.Value);
        
        if (days > 0)
            historyQuery = historyQuery.Where(lh => lh.PlayedAt >= cutoffDate);

        var topTracks = await historyQuery
            .GroupBy(lh => lh.TrackId)
            .Select(g => new
            {
                TrackId = g.Key,
                PlayCount = g.Count(),
                TotalMsPlayed = g.Sum(x => x.MsPlayed)
            })
            .OrderByDescending(x => x.PlayCount)
            .Take(limit)
            .Join(
                _context.Tracks
                    .Include(t => t.Album)
                    .Include(t => t.TrackArtists)
                        .ThenInclude(ta => ta.Artist),
                top => top.TrackId,
                track => track.Id,
                (top, track) => new
                {
                    id = track.Id,
                    spotifyId = track.SpotifyId,
                    name = track.Name,
                    playCount = top.PlayCount,
                    totalMinutes = Math.Round(top.TotalMsPlayed / 60000.0, 1),
                    artists = track.TrackArtists.Select(ta => ta.Artist.Name).ToArray(),
                    album = track.Album != null ? new
                    {
                        id = track.Album.Id,
                        name = track.Album.Name,
                        image_url = track.Album.ImageUrl
                    } : null
                })
            .ToListAsync();

        return Ok(topTracks);
    }

    /// <summary>
    /// Gets the user's top artists for a specified time period.
    /// </summary>
    /// <param name="days">Number of days to look back (7, 30, 90, or 0 for all time)</param>
    /// <param name="limit">Maximum number of artists to return</param>
    [HttpGet("top-artists")]
    public async Task<IActionResult> GetTopArtists([FromQuery] int days = 7, [FromQuery] int limit = 10)
    {
        var userId = GetCurrentUserId();
        if (userId == null)
            return Unauthorized("User not authenticated");

        var cutoffDate = days > 0 
            ? DateTime.UtcNow.AddDays(-days) 
            : DateTime.MinValue;

        var historyQuery = _context.ListeningHistory
            .Where(lh => lh.UserId == userId.Value);
        
        if (days > 0)
            historyQuery = historyQuery.Where(lh => lh.PlayedAt >= cutoffDate);

        // Join with tracks and track artists to get artist play counts
        var topArtists = await historyQuery
            .Join(_context.Tracks, lh => lh.TrackId, t => t.Id, (lh, t) => new { lh, t })
            .Join(_context.TrackArtists, x => x.t.Id, ta => ta.TrackId, (x, ta) => new { x.lh, ta.ArtistId })
            .GroupBy(x => x.ArtistId)
            .Select(g => new
            {
                ArtistId = g.Key,
                PlayCount = g.Count()
            })
            .OrderByDescending(x => x.PlayCount)
            .Take(limit)
            .Join(
                _context.Artists,
                top => top.ArtistId,
                artist => artist.Id,
                (top, artist) => new
                {
                    id = artist.Id,
                    spotifyId = artist.SpotifyId,
                    name = artist.Name,
                    imageUrl = artist.ImageUrl,
                    playCount = top.PlayCount
                })
            .ToListAsync();

        return Ok(topArtists);
    }

    /// <summary>
    /// Gets the user's top albums for a specified time period.
    /// </summary>
    /// <param name="days">Number of days to look back (7, 30, 90, or 0 for all time)</param>
    /// <param name="limit">Maximum number of albums to return</param>
    [HttpGet("top-albums")]
    public async Task<IActionResult> GetTopAlbums([FromQuery] int days = 7, [FromQuery] int limit = 10)
    {
        var userId = GetCurrentUserId();
        if (userId == null)
            return Unauthorized("User not authenticated");

        var cutoffDate = days > 0 
            ? DateTime.UtcNow.AddDays(-days) 
            : DateTime.MinValue;

        var historyQuery = _context.ListeningHistory
            .Where(lh => lh.UserId == userId.Value);
        
        if (days > 0)
            historyQuery = historyQuery.Where(lh => lh.PlayedAt >= cutoffDate);

        var topAlbums = await historyQuery
            .Join(_context.Tracks, lh => lh.TrackId, t => t.Id, (lh, t) => new { lh, t.AlbumId })
            .Where(x => x.AlbumId != null)
            .GroupBy(x => x.AlbumId)
            .Select(g => new
            {
                AlbumId = g.Key,
                PlayCount = g.Count()
            })
            .OrderByDescending(x => x.PlayCount)
            .Take(limit)
            .Join(
                _context.Albums,
                top => top.AlbumId,
                album => album.Id,
                (top, album) => new
                {
                    id = album.Id,
                    spotifyId = album.SpotifyId,
                    name = album.Name,
                    imageUrl = album.ImageUrl,
                    playCount = top.PlayCount
                })
            .ToListAsync();

        return Ok(topAlbums);
    }
}
