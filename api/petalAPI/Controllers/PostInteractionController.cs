using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using PetalAPI.Data;
using PetalAPI.Models;

namespace PetalAPI.Controllers;

[ApiController]
[Route("api/post")]
[Authorize]
public class PostInteractionController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly ILogger<PostInteractionController> _logger;

    public PostInteractionController(AppDbContext context, ILogger<PostInteractionController> logger)
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

    #region Likes

    /// <summary>
    /// Like a post
    /// </summary>
    [HttpPost("{postId}/like")]
    public async Task<IActionResult> LikePost(int postId)
    {
        var currentUserId = GetCurrentUserId();
        if (currentUserId == null)
        {
            return Unauthorized(new { error = "Invalid token" });
        }

        var post = await _context.Posts
            .Include(p => p.User)
            .FirstOrDefaultAsync(p => p.Id == postId);
            
        if (post == null)
        {
            return NotFound(new { error = "Post not found" });
        }

        // Check if already liked
        var existingLike = await _context.PostLikes
            .FirstOrDefaultAsync(pl => pl.UserId == currentUserId && pl.PostId == postId);

        if (existingLike != null)
        {
            return BadRequest(new { error = "Already liked this post" });
        }

        // Create like
        var like = new PostLike
        {
            UserId = currentUserId.Value,
            PostId = postId,
            CreatedAt = DateTime.UtcNow
        };

        _context.PostLikes.Add(like);

        // Create notification for post owner (unless liking own post)
        if (post.UserId != currentUserId.Value)
        {
            var notification = new Notification
            {
                UserId = post.UserId,
                ActorUserId = currentUserId.Value,
                Type = NotificationType.Like,
                PostId = postId,
                IsRead = false,
                CreatedAt = DateTime.UtcNow
            };
            _context.Notifications.Add(notification);
        }

        await _context.SaveChangesAsync();

        var likeCount = await _context.PostLikes.CountAsync(pl => pl.PostId == postId);

        _logger.LogInformation("User {UserId} liked post {PostId}", currentUserId, postId);

        return Ok(new { message = "Post liked", isLiked = true, likeCount });
    }

    /// <summary>
    /// Unlike a post
    /// </summary>
    [HttpDelete("{postId}/like")]
    public async Task<IActionResult> UnlikePost(int postId)
    {
        var currentUserId = GetCurrentUserId();
        if (currentUserId == null)
        {
            return Unauthorized(new { error = "Invalid token" });
        }

        var like = await _context.PostLikes
            .FirstOrDefaultAsync(pl => pl.UserId == currentUserId && pl.PostId == postId);

        if (like == null)
        {
            return BadRequest(new { error = "Not liked this post" });
        }

        _context.PostLikes.Remove(like);

        // Also remove the notification if it exists
        var notification = await _context.Notifications
            .FirstOrDefaultAsync(n => 
                n.ActorUserId == currentUserId && 
                n.PostId == postId && 
                n.Type == NotificationType.Like);
        
        if (notification != null)
        {
            _context.Notifications.Remove(notification);
        }

        await _context.SaveChangesAsync();

        var likeCount = await _context.PostLikes.CountAsync(pl => pl.PostId == postId);

        _logger.LogInformation("User {UserId} unliked post {PostId}", currentUserId, postId);

        return Ok(new { message = "Post unliked", isLiked = false, likeCount });
    }

    /// <summary>
    /// Check if current user liked a post
    /// </summary>
    [HttpGet("{postId}/like/status")]
    public async Task<IActionResult> GetLikeStatus(int postId)
    {
        var currentUserId = GetCurrentUserId();
        if (currentUserId == null)
        {
            return Unauthorized(new { error = "Invalid token" });
        }

        var isLiked = await _context.PostLikes
            .AnyAsync(pl => pl.UserId == currentUserId && pl.PostId == postId);

        var likeCount = await _context.PostLikes.CountAsync(pl => pl.PostId == postId);

        return Ok(new { isLiked, likeCount });
    }

    /// <summary>
    /// Get like status for multiple posts at once
    /// </summary>
    [HttpPost("likes/status/batch")]
    public async Task<IActionResult> GetLikeStatusBatch([FromBody] int[] postIds)
    {
        var currentUserId = GetCurrentUserId();
        if (currentUserId == null)
        {
            return Unauthorized(new { error = "Invalid token" });
        }

        if (postIds == null || postIds.Length == 0)
        {
            return BadRequest(new { error = "No post IDs provided" });
        }

        var likedPostIds = await _context.PostLikes
            .Where(pl => pl.UserId == currentUserId && postIds.Contains(pl.PostId))
            .Select(pl => pl.PostId)
            .ToListAsync();

        var likeCounts = await _context.PostLikes
            .Where(pl => postIds.Contains(pl.PostId))
            .GroupBy(pl => pl.PostId)
            .Select(g => new { PostId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.PostId, x => x.Count);

        var result = postIds.ToDictionary(
            id => id,
            id => new { isLiked = likedPostIds.Contains(id), likeCount = likeCounts.GetValueOrDefault(id, 0) }
        );

        return Ok(result);
    }

    #endregion

    #region Reposts

    /// <summary>
    /// Repost a post
    /// </summary>
    [HttpPost("{postId}/repost")]
    public async Task<IActionResult> RepostPost(int postId)
    {
        var currentUserId = GetCurrentUserId();
        if (currentUserId == null)
        {
            return Unauthorized(new { error = "Invalid token" });
        }

        var originalPost = await _context.Posts
            .Include(p => p.User)
            .FirstOrDefaultAsync(p => p.Id == postId);
            
        if (originalPost == null)
        {
            return NotFound(new { error = "Post not found" });
        }

        // Can't repost a repost - find the original
        var targetPostId = originalPost.OriginalPostId ?? postId;
        var targetPost = originalPost.OriginalPostId.HasValue 
            ? await _context.Posts.Include(p => p.User).FirstOrDefaultAsync(p => p.Id == targetPostId)
            : originalPost;

        if (targetPost == null)
        {
            return NotFound(new { error = "Original post not found" });
        }

        // Check if already reposted
        var existingRepost = await _context.Reposts
            .FirstOrDefaultAsync(r => r.UserId == currentUserId && r.OriginalPostId == targetPostId);

        if (existingRepost != null)
        {
            return BadRequest(new { error = "Already reposted this post" });
        }

        // Create new post entry for the repost
        var repostPost = new Post
        {
            UserId = currentUserId.Value,
            Type = PostType.Repost,
            OriginalPostId = targetPostId,
            CreatedAt = DateTime.UtcNow,
            Visibility = PostVisibility.Public,
            // Copy content references from original
            TrackId = targetPost.TrackId,
            AlbumId = targetPost.AlbumId,
            PlaylistId = targetPost.PlaylistId,
            ArtistId = targetPost.ArtistId,
            ListeningSessionId = targetPost.ListeningSessionId
        };

        _context.Posts.Add(repostPost);
        await _context.SaveChangesAsync();

        // Create repost record
        var repost = new Repost
        {
            UserId = currentUserId.Value,
            OriginalPostId = targetPostId,
            RepostPostId = repostPost.Id,
            CreatedAt = DateTime.UtcNow
        };

        _context.Reposts.Add(repost);

        // Create notification for original post owner (unless reposting own post)
        if (targetPost.UserId != currentUserId.Value)
        {
            var notification = new Notification
            {
                UserId = targetPost.UserId,
                ActorUserId = currentUserId.Value,
                Type = NotificationType.Repost,
                PostId = targetPostId,
                IsRead = false,
                CreatedAt = DateTime.UtcNow
            };
            _context.Notifications.Add(notification);
        }

        await _context.SaveChangesAsync();

        var repostCount = await _context.Reposts.CountAsync(r => r.OriginalPostId == targetPostId);

        _logger.LogInformation("User {UserId} reposted post {PostId}", currentUserId, targetPostId);

        return Ok(new { message = "Post reposted", isReposted = true, repostCount, repostPostId = repostPost.Id });
    }

    /// <summary>
    /// Remove a repost
    /// </summary>
    [HttpDelete("{postId}/repost")]
    public async Task<IActionResult> RemoveRepost(int postId)
    {
        var currentUserId = GetCurrentUserId();
        if (currentUserId == null)
        {
            return Unauthorized(new { error = "Invalid token" });
        }

        // Find the original post ID (in case they passed the repost post ID)
        var post = await _context.Posts.FindAsync(postId);
        var targetPostId = post?.OriginalPostId ?? postId;

        var repost = await _context.Reposts
            .Include(r => r.RepostPost)
            .FirstOrDefaultAsync(r => r.UserId == currentUserId && r.OriginalPostId == targetPostId);

        if (repost == null)
        {
            return BadRequest(new { error = "Not reposted this post" });
        }

        // Remove the repost post
        if (repost.RepostPost != null)
        {
            _context.Posts.Remove(repost.RepostPost);
        }

        _context.Reposts.Remove(repost);

        // Remove the notification if it exists
        var notification = await _context.Notifications
            .FirstOrDefaultAsync(n => 
                n.ActorUserId == currentUserId && 
                n.PostId == targetPostId && 
                n.Type == NotificationType.Repost);
        
        if (notification != null)
        {
            _context.Notifications.Remove(notification);
        }

        await _context.SaveChangesAsync();

        var repostCount = await _context.Reposts.CountAsync(r => r.OriginalPostId == targetPostId);

        _logger.LogInformation("User {UserId} removed repost of post {PostId}", currentUserId, targetPostId);

        return Ok(new { message = "Repost removed", isReposted = false, repostCount });
    }

    /// <summary>
    /// Check if current user reposted a post
    /// </summary>
    [HttpGet("{postId}/repost/status")]
    public async Task<IActionResult> GetRepostStatus(int postId)
    {
        var currentUserId = GetCurrentUserId();
        if (currentUserId == null)
        {
            return Unauthorized(new { error = "Invalid token" });
        }

        // Handle if they passed a repost post ID
        var post = await _context.Posts.FindAsync(postId);
        var targetPostId = post?.OriginalPostId ?? postId;

        var isReposted = await _context.Reposts
            .AnyAsync(r => r.UserId == currentUserId && r.OriginalPostId == targetPostId);

        var repostCount = await _context.Reposts.CountAsync(r => r.OriginalPostId == targetPostId);

        return Ok(new { isReposted, repostCount });
    }

    /// <summary>
    /// Get repost status for multiple posts at once
    /// </summary>
    [HttpPost("reposts/status/batch")]
    public async Task<IActionResult> GetRepostStatusBatch([FromBody] int[] postIds)
    {
        var currentUserId = GetCurrentUserId();
        if (currentUserId == null)
        {
            return Unauthorized(new { error = "Invalid token" });
        }

        if (postIds == null || postIds.Length == 0)
        {
            return BadRequest(new { error = "No post IDs provided" });
        }

        var repostedPostIds = await _context.Reposts
            .Where(r => r.UserId == currentUserId && postIds.Contains(r.OriginalPostId))
            .Select(r => r.OriginalPostId)
            .ToListAsync();

        var repostCounts = await _context.Reposts
            .Where(r => postIds.Contains(r.OriginalPostId))
            .GroupBy(r => r.OriginalPostId)
            .Select(g => new { PostId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.PostId, x => x.Count);

        var result = postIds.ToDictionary(
            id => id,
            id => new { isReposted = repostedPostIds.Contains(id), repostCount = repostCounts.GetValueOrDefault(id, 0) }
        );

        return Ok(result);
    }

    #endregion
}
