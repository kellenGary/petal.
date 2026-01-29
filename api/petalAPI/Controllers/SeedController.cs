using Microsoft.AspNetCore.Mvc;
using PetalAPI.Data;
using PetalAPI.Models;
using Microsoft.EntityFrameworkCore;

namespace PetalAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
public class SeedController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly ILogger<SeedController> _logger;

    public SeedController(AppDbContext context, ILogger<SeedController> logger)
    {
        _context = context;
        _logger = logger;
    }

    [HttpPost("users")]
    public async Task<IActionResult> SeedUsers([FromQuery] int count = 10)
    {
        if (count <= 0 || count > 100)
        {
            return BadRequest("Count must be between 1 and 100.");
        }

        var users = new List<User>();
        var random = new Random();
        var baseTime = DateTime.UtcNow;

        for (int i = 0; i < count; i++)
        {
            var id = Guid.NewGuid().ToString("N").Substring(0, 8);
            var user = new User
            {
                SpotifyId = $"seed_spot_{id}",
                DisplayName = $"Seed User {id}",
                Handle = $"user_{id}",
                Bio = "I am a seeded user for testing purposes.",
                Email = $"user_{id}@example.com",
                ProfileImageUrl = $"https://api.dicebear.com/7.x/avataaars/svg?seed={id}", // Free avatar API
                HasCompletedProfile = true,
                SpotifyAccessToken = $"mock_access_token_{id}",
                SpotifyRefreshToken = $"mock_refresh_token_{id}",
                TokenExpiresAt = baseTime.AddHours(1),
                CreatedAt = baseTime,
                UpdatedAt = baseTime
            };
            users.Add(user);
        }

        _context.Users.AddRange(users);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Seeded {Count} users.", users.Count);

        return Ok(new
        {
            message = $"Successfully seeded {users.Count} users.",
            users = users.Select(u => new { u.Id, u.SpotifyId, u.DisplayName, u.Handle })
        });
    }

    [HttpPost("follows")]
    public async Task<IActionResult> SeedFollows([FromQuery] int count = 10)
    {
        if (count <= 0 || count > 100)
        {
            return BadRequest("Count must be between 1 and 100.");
        }

        var userIds = await _context.Users.Select(u => u.Id).ToListAsync();
        if (userIds.Count < 2)
        {
            return BadRequest("Need at least 2 users to seed follows.");
        }

        var follows = new List<Follow>();
        var random = new Random();
        var baseTime = DateTime.UtcNow;

        for (int i = 0; i < count; i++)
        {
            // Pick two distinct users
            int followerId = userIds[random.Next(userIds.Count)];
            int followeeId = userIds[random.Next(userIds.Count)];

            // Ensure they are different
            int attempts = 0;
            while (followerId == followeeId && attempts < 10)
            {
                followeeId = userIds[random.Next(userIds.Count)];
                attempts++;
            }

            if (followerId == followeeId) continue; // Skip if we couldn't find a pair

            // Check if this relationship already exists in our pending list or DB
            // (Checking DB for every item might be slow, for seeding simple data this might be okay to skip or catch duplicates later, 
            // but let's just create the object. DB constraints should handle duplicates if set, or we assume random enough)
            
            var follow = new Follow
            {
                FollowerUserId = followerId,
                FolloweeUserId = followeeId,
                CreatedAt = baseTime
            };
            follows.Add(follow);
        }

        // Ideally we should filter out duplicates that are already in DB, but for simple seeding we'll try to add.
        // If there's a unique constraint, this might fail. 
        // For now, let's just add them.
        
        _context.Follows.AddRange(follows);
        try 
        {
            await _context.SaveChangesAsync();
        }
        catch (Exception ex)
        {
             _logger.LogWarning(ex, "Error saving seeded follows (possibly duplicates).");
             // Continue
        }

        _logger.LogInformation("Seeded {Count} follows.", follows.Count);

        return Ok(new
        {
            message = $"Attempted to seed {follows.Count} follows.",
            follows = follows.Select(f => new { f.FollowerUserId, f.FolloweeUserId })
        });
    }
}
