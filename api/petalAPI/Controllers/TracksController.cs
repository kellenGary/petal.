using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using PetalAPI.Data;
using PetalAPI.Models.DTOs;

namespace PetalAPI.Controllers;

[Route("api/[controller]")]
[Authorize]
public class TracksController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly ILogger<TracksController> _logger;

    public TracksController(AppDbContext context, ILogger<TracksController> logger)
    {
        _context = context;
        _logger = logger;
    }

    /// <summary>
    /// Gets a single track by native Track Id (not Spotify id) using the TrackDetailsWithArtists view
    /// </summary>
    [HttpGet("{trackId}")]
    public async Task<IActionResult> GetTrackById(int trackId)
    {
        try
        {
            var rows = await _context.Database
                .SqlQueryRaw<TrackDetailsViewRow>(@"
                    SELECT TrackId, TrackSpotifyId, TrackName, DurationMs, ""Explicit"", Popularity,
                           AlbumId, AlbumSpotifyId, AlbumName, AlbumImageUrl, AlbumReleaseDate,
                           ArtistId, ArtistSpotifyId, ArtistName, ArtistOrder
                    FROM TrackDetailsWithArtists
                    WHERE TrackId = {0}
                    ORDER BY ArtistOrder", trackId)
                .ToListAsync();

            if (rows == null || rows.Count == 0)
            {
                return NotFound(new { error = "Track not found" });
            }

            var first = rows.First();

            var track = new
            {
                id = first.TrackId,
                spotify_id = first.TrackSpotifyId,
                name = first.TrackName,
                duration_ms = first.DurationMs,
                @explicit = first.Explicit,
                popularity = first.Popularity,
                album = first.AlbumId == null ? null : new
                {
                    id = first.AlbumId,
                    spotify_id = first.AlbumSpotifyId,
                    name = first.AlbumName,
                    image_url = first.AlbumImageUrl,
                    release_date = first.AlbumReleaseDate
                },
                artists = rows
                    .Where(r => r.ArtistId != null)
                    .OrderBy(r => r.ArtistOrder)
                    .Select(r => new { id = r.ArtistId, spotify_id = r.ArtistSpotifyId, name = r.ArtistName, order = r.ArtistOrder })
                    .ToList()
            };

            return Ok(new { track });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching track details for {TrackId}", trackId);
            return StatusCode(500, new { error = "Internal server error" });
        }
    }

    /// <summary>
    /// Gets users who have liked this track (prioritizes users you follow)
    /// </summary>
    [HttpGet("{trackId}/fans")]
    public async Task<IActionResult> GetTrackFans(int trackId, [FromQuery] int limit = 10)
    {
        try
        {
            var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier);
            if (userIdClaim == null || !int.TryParse(userIdClaim.Value, out var currentUserId))
            {
                return Unauthorized(new { error = "Invalid token" });
            }

            // Get users who liked this track, prioritizing those the current user follows
            var fans = await _context.UserLikedTracks
                .Where(ult => ult.TrackId == trackId && ult.UserId != currentUserId)
                .Join(_context.Users,
                    ult => ult.UserId,
                    u => u.Id,
                    (ult, u) => new { ult, u })
                .GroupJoin(_context.Follows.Where(f => f.FollowerUserId == currentUserId),
                    x => x.u.Id,
                    f => f.FolloweeUserId,
                    (x, follows) => new { x.ult, x.u, IsFollowing = follows.Any() })
                .OrderByDescending(x => x.IsFollowing)
                .ThenByDescending(x => x.ult.LikedAt)
                .Take(limit)
                .Select(x => new
                {
                    id = x.u.Id,
                    displayName = x.u.DisplayName,
                    handle = x.u.Handle,
                    profileImageUrl = x.u.ProfileImageUrl,
                    isFollowing = x.IsFollowing,
                    likedAt = x.ult.LikedAt
                })
                .ToListAsync();

            return Ok(new { fans, totalCount = fans.Count });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching fans for track {TrackId}", trackId);
            return StatusCode(500, new { error = "Internal server error" });
        }
    }
}
