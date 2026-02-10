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
public class FollowController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly ILogger<FollowController> _logger;

    public FollowController(AppDbContext context, ILogger<FollowController> logger)
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
    /// Follows a user.
    /// </summary>
    /// <param name="targetUserId">The ID of the user to follow.</param>
    [HttpPost("{targetUserId}")]
    public async Task<IActionResult> FollowUser(int targetUserId)
    {
        var currentUserId = GetCurrentUserId();
        if (currentUserId == null)
        {
            return Unauthorized(new { error = "Invalid token" });
        }

        if (currentUserId == targetUserId)
        {
            return BadRequest(new { error = "You cannot follow yourself" });
        }

        // Check if target user exists
        var targetUser = await _context.Users.FindAsync(targetUserId);
        if (targetUser == null)
        {
            return NotFound(new { error = "User not found" });
        }

        // Check if already following
        var existingFollow = await _context.Follows
            .FirstOrDefaultAsync(f => f.FollowerUserId == currentUserId && f.FolloweeUserId == targetUserId);

        if (existingFollow != null)
        {
            return BadRequest(new { error = "Already following this user" });
        }

        var follow = new Follow
        {
            FollowerUserId = currentUserId.Value,
            FolloweeUserId = targetUserId,
            CreatedAt = DateTime.UtcNow
        };

        _context.Follows.Add(follow);

        // Create notification for the followed user
        var notification = new Notification
        {
            UserId = targetUserId,
            ActorUserId = currentUserId.Value,
            Type = NotificationType.Follow,
            PostId = null,
            IsRead = false,
            CreatedAt = DateTime.UtcNow
        };
        _context.Notifications.Add(notification);

        await _context.SaveChangesAsync();

        _logger.LogInformation("User {FollowerId} followed user {FolloweeId}", currentUserId, targetUserId);

        return Ok(new { message = "Successfully followed user", isFollowing = true });
    }

    /// <summary>
    /// Unfollows a user.
    /// </summary>
    /// <param name="targetUserId">The ID of the user to unfollow.</param>
    [HttpDelete("{targetUserId}")]
    public async Task<IActionResult> UnfollowUser(int targetUserId)
    {
        var currentUserId = GetCurrentUserId();
        if (currentUserId == null)
        {
            return Unauthorized(new { error = "Invalid token" });
        }

        var follow = await _context.Follows
            .FirstOrDefaultAsync(f => f.FollowerUserId == currentUserId && f.FolloweeUserId == targetUserId);

        if (follow == null)
        {
            return BadRequest(new { error = "Not following this user" });
        }

        _context.Follows.Remove(follow);
        await _context.SaveChangesAsync();

        _logger.LogInformation("User {FollowerId} unfollowed user {FolloweeId}", currentUserId, targetUserId);

        return Ok(new { message = "Successfully unfollowed user", isFollowing = false });
    }

    /// <summary>
    /// Checks if the authenticated user is following a specific user.
    /// </summary>
    /// <param name="targetUserId">The ID of the user to check.</param>
    [HttpGet("status/{targetUserId}")]
    public async Task<IActionResult> GetFollowStatus(int targetUserId)
    {
        var currentUserId = GetCurrentUserId();
        if (currentUserId == null)
        {
            return Unauthorized(new { error = "Invalid token" });
        }

        var isFollowing = await _context.Follows
            .AnyAsync(f => f.FollowerUserId == currentUserId && f.FolloweeUserId == targetUserId);

        return Ok(new { isFollowing });
    }

    /// <summary>
    /// Checks follow status for multiple users in a single request.
    /// </summary>
    /// <param name="userIds">A list of user IDs to check.</param>
    [HttpPost("status/batch")]
    public async Task<IActionResult> GetFollowStatusBatch([FromBody] int[] userIds)
    {
        var currentUserId = GetCurrentUserId();
        if (currentUserId == null)
        {
            return Unauthorized(new { error = "Invalid token" });
        }

        if (userIds == null || userIds.Length == 0)
        {
            return BadRequest(new { error = "No user IDs provided" });
        }

        var followedUserIds = await _context.Follows
            .Where(f => f.FollowerUserId == currentUserId && userIds.Contains(f.FolloweeUserId))
            .Select(f => f.FolloweeUserId)
            .ToListAsync();

        var result = userIds.ToDictionary(id => id, id => followedUserIds.Contains(id));

        return Ok(result);
    }

    /// <summary>
    /// Retrieves all follow connections between the specified users.
    /// Used for drawing the graph of connections.
    /// </summary>
    /// <param name="userIds">List of user IDs to check connections between.</param>
    [HttpPost("connections")]
    public async Task<IActionResult> GetGraphConnections([FromBody] int[] userIds)
    {
        var currentUserId = GetCurrentUserId();
        if (currentUserId == null)
        {
            return Unauthorized(new { error = "Invalid token" });
        }

        if (userIds == null || userIds.Length == 0)
        {
            return Ok(new List<object>());
        }

        // Find all follows where BOTH follower and followee are in the provided list
        var connections = await _context.Follows
            .Where(f => userIds.Contains(f.FollowerUserId) && userIds.Contains(f.FolloweeUserId))
            .Select(f => new 
            { 
                followerId = f.FollowerUserId, 
                followeeId = f.FolloweeUserId 
            })
            .ToListAsync();

        return Ok(connections);
    }

    /// <summary>
    /// Retrieves a list of users who follow the specified user.
    /// </summary>
    /// <param name="userId">The ID of the user whose followers to retrieve.</param>
    /// <param name="limit">The maximum number of items to return.</param>
    /// <param name="offset">The number of items to skip.</param>
    [HttpGet("followers/{userId}")]
    public async Task<IActionResult> GetFollowers(int userId, [FromQuery] int limit = 50, [FromQuery] int offset = 0)
    {
        var currentUserId = GetCurrentUserId();
        if (currentUserId == null)
        {
            return Unauthorized(new { error = "Invalid token" });
        }

        // Check if user exists
        var user = await _context.Users.FindAsync(userId);
        if (user == null)
        {
            return NotFound(new { error = "User not found" });
        }

        var query = _context.Follows
            .Where(f => f.FolloweeUserId == userId)
            .Include(f => f.Follower)
            .OrderByDescending(f => f.CreatedAt);

        var total = await query.CountAsync();

        var followers = await query
            .Skip(offset)
            .Take(limit)
            .Select(f => new
            {
                id = f.Follower.Id,
                displayName = f.Follower.DisplayName,
                handle = f.Follower.Handle,
                profileImageUrl = f.Follower.ProfileImageUrl,
                followedAt = f.CreatedAt
            })
            .ToListAsync();

        return Ok(new
        {
            items = followers,
            total,
            limit,
            offset
        });
    }

    /// <summary>
    /// Retrieves a list of users that the specified user is following.
    /// </summary>
    /// <param name="userId">The ID of the user whose following list to retrieve.</param>
    /// <param name="limit">The maximum number of items to return.</param>
    /// <param name="offset">The number of items to skip.</param>
    [HttpGet("following/{userId}")]
    public async Task<IActionResult> GetFollowing(int userId, [FromQuery] int limit = 50, [FromQuery] int offset = 0)
    {
        var currentUserId = GetCurrentUserId();
        if (currentUserId == null)
        {
            return Unauthorized(new { error = "Invalid token" });
        }

        // Check if user exists
        var user = await _context.Users.FindAsync(userId);
        if (user == null)
        {
            return NotFound(new { error = "User not found" });
        }

        var query = _context.Follows
            .Where(f => f.FollowerUserId == userId)
            .Include(f => f.Followee)
            .OrderByDescending(f => f.CreatedAt);

        var total = await query.CountAsync();

        var following = await query
            .Skip(offset)
            .Take(limit)
            .Select(f => new
            {
                id = f.Followee.Id,
                displayName = f.Followee.DisplayName,
                handle = f.Followee.Handle,
                profileImageUrl = f.Followee.ProfileImageUrl,
                followedAt = f.CreatedAt
            })
            .ToListAsync();

        return Ok(new
        {
            items = following,
            total,
            limit,
            offset
        });
    }

    /// <summary>
    /// Retrieves follower and following counts for a user.
    /// </summary>
    /// <param name="userId">The ID of the user to retrieve counts for.</param>
    [HttpGet("counts/{userId}")]
    public async Task<IActionResult> GetFollowCounts(int userId)
    {
        var currentUserId = GetCurrentUserId();
        if (currentUserId == null)
        {
            return Unauthorized(new { error = "Invalid token" });
        }

        // Check if user exists
        var user = await _context.Users.FindAsync(userId);
        if (user == null)
        {
            return NotFound(new { error = "User not found" });
        }

        var followersCount = await _context.Follows.CountAsync(f => f.FolloweeUserId == userId);
        var followingCount = await _context.Follows.CountAsync(f => f.FollowerUserId == userId);

        return Ok(new
        {
            followers = followersCount,
            following = followingCount
        });
    }
}
