using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using PetalAPI.Data;

namespace PetalAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class TrendingController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly ILogger<TrendingController> _logger;

    public TrendingController(AppDbContext context, ILogger<TrendingController> logger)
    {
        _context = context;
        _logger = logger;
    }

    /// <summary>
    /// Gets trending tracks across all users in the app.
    /// </summary>
    /// <param name="limit">Maximum number of tracks to return</param>
    /// <param name="days">Number of days to look back (default 7)</param>
    [HttpGet("tracks")]
    public async Task<IActionResult> GetTrendingTracks([FromQuery] int limit = 20, [FromQuery] int days = 7)
    {
        var cutoffDate = DateTime.UtcNow.AddDays(-days);

        var trendingTracks = await _context.ListeningHistory
            .Where(lh => lh.PlayedAt >= cutoffDate)
            .GroupBy(lh => lh.TrackId)
            .Select(g => new
            {
                TrackId = g.Key,
                PlayCount = g.Count(),
                UniqueListeners = g.Select(x => x.UserId).Distinct().Count()
            })
            .OrderByDescending(x => x.UniqueListeners)
            .ThenByDescending(x => x.PlayCount)
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
                    uniqueListeners = top.UniqueListeners,
                    artists = track.TrackArtists.Select(ta => ta.Artist.Name).ToArray(),
                    album = track.Album != null ? new
                    {
                        id = track.Album.Id,
                        name = track.Album.Name,
                        image_url = track.Album.ImageUrl
                    } : null
                })
            .ToListAsync();

        return Ok(trendingTracks);
    }

    /// <summary>
    /// Gets trending artists across all users in the app.
    /// </summary>
    /// <param name="limit">Maximum number of artists to return</param>
    /// <param name="days">Number of days to look back (default 7)</param>
    [HttpGet("artists")]
    public async Task<IActionResult> GetTrendingArtists([FromQuery] int limit = 20, [FromQuery] int days = 7)
    {
        var cutoffDate = DateTime.UtcNow.AddDays(-days);

        var trendingArtists = await _context.ListeningHistory
            .Where(lh => lh.PlayedAt >= cutoffDate)
            .Join(_context.Tracks, lh => lh.TrackId, t => t.Id, (lh, t) => new { lh, t })
            .Join(_context.TrackArtists, x => x.t.Id, ta => ta.TrackId, (x, ta) => new { x.lh, ta.ArtistId })
            .GroupBy(x => x.ArtistId)
            .Select(g => new
            {
                ArtistId = g.Key,
                PlayCount = g.Count(),
                UniqueListeners = g.Select(x => x.lh.UserId).Distinct().Count()
            })
            .OrderByDescending(x => x.UniqueListeners)
            .ThenByDescending(x => x.PlayCount)
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
                    playCount = top.PlayCount,
                    uniqueListeners = top.UniqueListeners
                })
            .ToListAsync();

        return Ok(trendingArtists);
    }

    /// <summary>
    /// Gets trending albums across all users in the app.
    /// </summary>
    /// <param name="limit">Maximum number of albums to return</param>
    /// <param name="days">Number of days to look back (default 7)</param>
    [HttpGet("albums")]
    public async Task<IActionResult> GetTrendingAlbums([FromQuery] int limit = 20, [FromQuery] int days = 7)
    {
        var cutoffDate = DateTime.UtcNow.AddDays(-days);

        var trendingAlbums = await _context.ListeningHistory
            .Where(lh => lh.PlayedAt >= cutoffDate)
            .Join(_context.Tracks, lh => lh.TrackId, t => t.Id, (lh, t) => new { lh, t.AlbumId })
            .Where(x => x.AlbumId != null)
            .GroupBy(x => x.AlbumId)
            .Select(g => new
            {
                AlbumId = g.Key,
                PlayCount = g.Count(),
                UniqueListeners = g.Select(x => x.lh.UserId).Distinct().Count()
            })
            .OrderByDescending(x => x.UniqueListeners)
            .ThenByDescending(x => x.PlayCount)
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
                    playCount = top.PlayCount,
                    uniqueListeners = top.UniqueListeners
                })
            .ToListAsync();

        return Ok(trendingAlbums);
    }
}
