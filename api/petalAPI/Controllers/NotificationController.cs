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
public class NotificationController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly ILogger<NotificationController> _logger;

    public NotificationController(AppDbContext context, ILogger<NotificationController> logger)
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
    /// Get paginated notifications for the current user
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> GetNotifications(
        [FromQuery] int limit = 20,
        [FromQuery] int offset = 0)
    {
        var currentUserId = GetCurrentUserId();
        if (currentUserId == null)
        {
            return Unauthorized(new { error = "Invalid token" });
        }

        var query = _context.Notifications
            .Where(n => n.UserId == currentUserId)
            .OrderByDescending(n => n.CreatedAt);

        var total = await query.CountAsync();

        var notifications = await query
            .Skip(offset)
            .Take(limit)
            .Include(n => n.ActorUser)
            .Include(n => n.Post)
                .ThenInclude(p => p!.Track)
            .Include(n => n.Post)
                .ThenInclude(p => p!.Album)
            .Include(n => n.Post)
                .ThenInclude(p => p!.Artist)
            .Include(n => n.Post)
                .ThenInclude(p => p!.Playlist)
            .Select(n => new NotificationDto
            {
                Id = n.Id,
                Type = n.Type.ToString(),
                IsRead = n.IsRead,
                CreatedAt = n.CreatedAt,
                ActorUser = new NotificationUserDto
                {
                    Id = n.ActorUser.Id,
                    DisplayName = n.ActorUser.DisplayName,
                    Handle = n.ActorUser.Handle,
                    ProfileImageUrl = n.ActorUser.ProfileImageUrl
                },
                Post = n.Post != null ? new NotificationPostDto
                {
                    Id = n.Post.Id,
                    Type = n.Post.Type.ToString(),
                    TrackName = n.Post.Track != null ? n.Post.Track.Name : null,
                    AlbumName = n.Post.Album != null ? n.Post.Album.Name : null,
                    ArtistName = n.Post.Artist != null ? n.Post.Artist.Name : null,
                    PlaylistName = n.Post.Playlist != null ? n.Post.Playlist.Name : null,
                    ImageUrl = n.Post.Track != null && n.Post.Track.Album != null ? n.Post.Track.Album.ImageUrl :
                               n.Post.Album != null ? n.Post.Album.ImageUrl :
                               n.Post.Artist != null ? n.Post.Artist.ImageUrl :
                               n.Post.Playlist != null ? n.Post.Playlist.ImageUrl : null
                } : null
            })
            .ToListAsync();

        return Ok(new NotificationListResponse
        {
            Items = notifications,
            Total = total,
            Limit = limit,
            Offset = offset
        });
    }

    /// <summary>
    /// Get unread notification count
    /// </summary>
    [HttpGet("unread-count")]
    public async Task<IActionResult> GetUnreadCount()
    {
        var currentUserId = GetCurrentUserId();
        if (currentUserId == null)
        {
            return Unauthorized(new { error = "Invalid token" });
        }

        var count = await _context.Notifications
            .CountAsync(n => n.UserId == currentUserId && !n.IsRead);

        return Ok(new { count });
    }

    /// <summary>
    /// Mark a single notification as read
    /// </summary>
    [HttpPut("{notificationId}/read")]
    public async Task<IActionResult> MarkAsRead(int notificationId)
    {
        var currentUserId = GetCurrentUserId();
        if (currentUserId == null)
        {
            return Unauthorized(new { error = "Invalid token" });
        }

        var notification = await _context.Notifications
            .FirstOrDefaultAsync(n => n.Id == notificationId && n.UserId == currentUserId);

        if (notification == null)
        {
            return NotFound(new { error = "Notification not found" });
        }

        notification.IsRead = true;
        await _context.SaveChangesAsync();

        return Ok(new { message = "Notification marked as read" });
    }

    /// <summary>
    /// Mark all notifications as read
    /// </summary>
    [HttpPut("read-all")]
    public async Task<IActionResult> MarkAllAsRead()
    {
        var currentUserId = GetCurrentUserId();
        if (currentUserId == null)
        {
            return Unauthorized(new { error = "Invalid token" });
        }

        await _context.Notifications
            .Where(n => n.UserId == currentUserId && !n.IsRead)
            .ExecuteUpdateAsync(s => s.SetProperty(n => n.IsRead, true));

        _logger.LogInformation("User {UserId} marked all notifications as read", currentUserId);

        return Ok(new { message = "All notifications marked as read" });
    }
}

// DTOs
public class NotificationListResponse
{
    public List<NotificationDto> Items { get; set; } = new();
    public int Total { get; set; }
    public int Limit { get; set; }
    public int Offset { get; set; }
}

public class NotificationDto
{
    public int Id { get; set; }
    public string Type { get; set; } = string.Empty;
    public bool IsRead { get; set; }
    public DateTime CreatedAt { get; set; }
    public NotificationUserDto ActorUser { get; set; } = new();
    public NotificationPostDto? Post { get; set; }
}

public class NotificationUserDto
{
    public int Id { get; set; }
    public string? DisplayName { get; set; }
    public string? Handle { get; set; }
    public string? ProfileImageUrl { get; set; }
}

public class NotificationPostDto
{
    public int Id { get; set; }
    public string Type { get; set; } = string.Empty;
    public string? TrackName { get; set; }
    public string? AlbumName { get; set; }
    public string? ArtistName { get; set; }
    public string? PlaylistName { get; set; }
    public string? ImageUrl { get; set; }
}
