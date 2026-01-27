using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using PetalAPI.Data;
using PetalAPI.Models;

namespace PetalAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class FeedController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly ILogger<FeedController> _logger;

    public FeedController(AppDbContext context, ILogger<FeedController> logger)
    {
        _context = context;
        _logger = logger;
    }

    private int? GetCurrentUserId()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
        if (userIdClaim == null || !int.TryParse(userIdClaim.Value, out var userId))
        {
            return null;
        }
        return userId;
    }

    /// <summary>
    /// Get the feed of posts from users the current user follows
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> GetFeed(
        [FromQuery] int limit = 20,
        [FromQuery] int offset = 0,
        [FromQuery] PostType? type = null)
    {
        var currentUserId = GetCurrentUserId();
        if (currentUserId == null)
        {
            return Unauthorized(new { error = "Invalid token" });
        }

        // Get the list of user IDs the current user follows
        var followedUserIds = await _context.Follows
            .Where(f => f.FollowerUserId == currentUserId.Value)
            .Select(f => f.FolloweeUserId)
            .ToListAsync();

        // Include current user's posts in their feed as well
        followedUserIds.Add(currentUserId.Value);

        // Build the query for posts
        var query = _context.Posts
            .Where(p => followedUserIds.Contains(p.UserId))
            .Where(p => p.Visibility == PostVisibility.Public || 
                       (p.Visibility == PostVisibility.Followers && followedUserIds.Contains(p.UserId)));

        // Filter by type if specified
        if (type.HasValue)
        {
            query = query.Where(p => p.Type == type.Value);
        }

        // Get total count before pagination
        var total = await query.CountAsync();

        // Get paginated posts with related data
        var posts = await query
            .OrderByDescending(p => p.CreatedAt)
            .Skip(offset)
            .Take(limit)
            .Include(p => p.User)
            .Include(p => p.Track)
                .ThenInclude(t => t!.TrackArtists)
                    .ThenInclude(ta => ta.Artist)
            .Include(p => p.Track)
                .ThenInclude(t => t!.Album)
            .Include(p => p.Album)
            .Include(p => p.Playlist)
            .Include(p => p.Artist)
            .Include(p => p.ListeningSession)
            .Select(p => new FeedPostDto
            {
                Id = p.Id,
                Type = p.Type.ToString(),
                CreatedAt = p.CreatedAt,
                User = new FeedUserDto
                {
                    Id = p.User.Id,
                    DisplayName = p.User.DisplayName,
                    Handle = p.User.Handle,
                    ProfileImageUrl = p.User.ProfileImageUrl
                },
                Track = p.Track != null ? new FeedTrackDto
                {
                    Id = p.Track.Id,
                    SpotifyId = p.Track.SpotifyId,
                    Name = p.Track.Name,
                    ArtistNames = p.Track.TrackArtists.Select(ta => ta.Artist.Name).ToList(),
                    AlbumName = p.Track.Album != null ? p.Track.Album.Name : null,
                    AlbumImageUrl = p.Track.Album != null ? p.Track.Album.ImageUrl : null,
                    DurationMs = p.Track.DurationMs
                } : null,
                Album = p.Album != null ? new FeedAlbumDto
                {
                    Id = p.Album.Id,
                    SpotifyId = p.Album.SpotifyId,
                    Name = p.Album.Name,
                    ImageUrl = p.Album.ImageUrl
                } : null,
                Playlist = p.Playlist != null ? new FeedPlaylistDto
                {
                    Id = p.Playlist.Id,
                    SpotifyId = p.Playlist.SpotifyId,
                    Name = p.Playlist.Name,
                    ImageUrl = p.Playlist.ImageUrl
                } : null,
                Artist = p.Artist != null ? new FeedArtistDto
                {
                    Id = p.Artist.Id,
                    SpotifyId = p.Artist.SpotifyId,
                    Name = p.Artist.Name,
                    ImageUrl = p.Artist.ImageUrl
                } : null,
                MetadataJson = p.MetadataJson,
                ListeningSessionId = p.ListeningSessionId
            })
            .ToListAsync();

        return Ok(new FeedResponse
        {
            Items = posts,
            Total = total,
            Limit = limit,
            Offset = offset
        });
    }

    /// <summary>
    /// Get a single user's posts (for profile view)
    /// </summary>
    [HttpGet("user/{userId}")]
    public async Task<IActionResult> GetUserPosts(
        int userId,
        [FromQuery] int limit = 20,
        [FromQuery] int offset = 0,
        [FromQuery] PostType? type = null)
    {
        var currentUserId = GetCurrentUserId();
        if (currentUserId == null)
        {
            return Unauthorized(new { error = "Invalid token" });
        }

        // Check if current user follows this user (for visibility)
        var isFollowing = await _context.Follows
            .AnyAsync(f => f.FollowerUserId == currentUserId.Value && f.FolloweeUserId == userId);

        var isOwnProfile = currentUserId.Value == userId;

        // Build query
        var query = _context.Posts
            .Where(p => p.UserId == userId);

        // Apply visibility filter
        if (!isOwnProfile)
        {
            query = query.Where(p => 
                p.Visibility == PostVisibility.Public || 
                (p.Visibility == PostVisibility.Followers && isFollowing));
        }

        // Filter by type if specified
        if (type.HasValue)
        {
            query = query.Where(p => p.Type == type.Value);
        }

        var total = await query.CountAsync();

        var posts = await query
            .OrderByDescending(p => p.CreatedAt)
            .Skip(offset)
            .Take(limit)
            .Include(p => p.User)
            .Include(p => p.Track)
                .ThenInclude(t => t!.TrackArtists)
                    .ThenInclude(ta => ta.Artist)
            .Include(p => p.Track)
                .ThenInclude(t => t!.Album)
            .Include(p => p.Album)
            .Include(p => p.Playlist)
            .Include(p => p.Artist)
            .Include(p => p.ListeningSession)
            .Select(p => new FeedPostDto
            {
                Id = p.Id,
                Type = p.Type.ToString(),
                CreatedAt = p.CreatedAt,
                User = new FeedUserDto
                {
                    Id = p.User.Id,
                    DisplayName = p.User.DisplayName,
                    Handle = p.User.Handle,
                    ProfileImageUrl = p.User.ProfileImageUrl
                },
                Track = p.Track != null ? new FeedTrackDto
                {
                    Id = p.Track.Id,
                    SpotifyId = p.Track.SpotifyId,
                    Name = p.Track.Name,
                    ArtistNames = p.Track.TrackArtists.Select(ta => ta.Artist.Name).ToList(),
                    AlbumName = p.Track.Album != null ? p.Track.Album.Name : null,
                    AlbumImageUrl = p.Track.Album != null ? p.Track.Album.ImageUrl : null,
                    DurationMs = p.Track.DurationMs
                } : null,
                Album = p.Album != null ? new FeedAlbumDto
                {
                    Id = p.Album.Id,
                    SpotifyId = p.Album.SpotifyId,
                    Name = p.Album.Name,
                    ImageUrl = p.Album.ImageUrl
                } : null,
                Playlist = p.Playlist != null ? new FeedPlaylistDto
                {
                    Id = p.Playlist.Id,
                    SpotifyId = p.Playlist.SpotifyId,
                    Name = p.Playlist.Name,
                    ImageUrl = p.Playlist.ImageUrl
                } : null,
                Artist = p.Artist != null ? new FeedArtistDto
                {
                    Id = p.Artist.Id,
                    SpotifyId = p.Artist.SpotifyId,
                    Name = p.Artist.Name,
                    ImageUrl = p.Artist.ImageUrl
                } : null,
                MetadataJson = p.MetadataJson,
                ListeningSessionId = p.ListeningSessionId
            })
            .ToListAsync();

        return Ok(new FeedResponse
        {
            Items = posts,
            Total = total,
            Limit = limit,
            Offset = offset
        });
    }
}

// DTOs for feed responses
public class FeedResponse
{
    public List<FeedPostDto> Items { get; set; } = new();
    public int Total { get; set; }
    public int Limit { get; set; }
    public int Offset { get; set; }
}

public class FeedPostDto
{
    public int Id { get; set; }
    public string Type { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public FeedUserDto User { get; set; } = new();
    public FeedTrackDto? Track { get; set; }
    public FeedAlbumDto? Album { get; set; }
    public FeedPlaylistDto? Playlist { get; set; }
    public FeedArtistDto? Artist { get; set; }
    public string? MetadataJson { get; set; }
    public int? ListeningSessionId { get; set; }
}

public class FeedUserDto
{
    public int Id { get; set; }
    public string? DisplayName { get; set; }
    public string? Handle { get; set; }
    public string? ProfileImageUrl { get; set; }
}

public class FeedTrackDto
{
    public int Id { get; set; }
    public string SpotifyId { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public List<string> ArtistNames { get; set; } = new();
    public string? AlbumName { get; set; }
    public string? AlbumImageUrl { get; set; }
    public int DurationMs { get; set; }
}

public class FeedAlbumDto
{
    public int Id { get; set; }
    public string SpotifyId { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? ImageUrl { get; set; }
}

public class FeedPlaylistDto
{
    public int Id { get; set; }
    public string SpotifyId { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? ImageUrl { get; set; }
}

public class FeedArtistDto
{
    public int Id { get; set; }
    public string SpotifyId { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? ImageUrl { get; set; }
}
