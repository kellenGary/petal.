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
    /// Follow a user
    /// </summary>
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
        await _context.SaveChangesAsync();

        _logger.LogInformation("User {FollowerId} followed user {FolloweeId}", currentUserId, targetUserId);

        return Ok(new { message = "Successfully followed user", isFollowing = true });
    }

    /// <summary>
    /// Unfollow a user
    /// </summary>
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
    /// Check if current user is following a specific user
    /// </summary>
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
    /// Check follow status for multiple users at once
    /// </summary>
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
    /// Get followers of a user
    /// </summary>
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
    /// Get users that a user is following
    /// </summary>
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
    /// Get follower and following counts for a user
    /// </summary>
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
