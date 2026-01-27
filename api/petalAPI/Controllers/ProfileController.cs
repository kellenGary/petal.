using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using System.Net.Http.Headers;
using System.Text.Json;
using System.Security.Claims;
using PetalAPI.Services;
using PetalAPI.Data;
using Microsoft.EntityFrameworkCore;

namespace PetalAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ProfileController : ControllerBase
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<ProfileController> _logger;
    private readonly IConfiguration _configuration;
    private readonly ISpotifyTokenService _spotifyTokenService;
    private readonly AppDbContext _context;

    public ProfileController(
        IHttpClientFactory httpClientFactory,
        ILogger<ProfileController> logger,
        IConfiguration configuration,
        ISpotifyTokenService spotifyTokenService,
        AppDbContext context)
    {
        _httpClientFactory = httpClientFactory;
        _logger = logger;
        _configuration = configuration;
        _spotifyTokenService = spotifyTokenService;
        _context = context;
    }

    [HttpGet("handle-exists")]
    public async Task<IActionResult> HandleExists([FromQuery] string handle)
    {
        if (string.IsNullOrWhiteSpace(handle))
        {
            return BadRequest(new { error = "handle is required" });
        }

        try
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
            if (userIdClaim == null || !int.TryParse(userIdClaim.Value, out var userId))
            {
                return Unauthorized(new { error = "Invalid token" });
            }

            var normalized = handle.Trim().ToLowerInvariant();
            var exists = await _context.Users
                .AnyAsync(u => u.Handle != null && u.Handle.ToLower() == normalized && u.Id != userId);

            return Ok(new { exists });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error checking handle exists");
            return StatusCode(500, new { error = "Internal server error", details = ex.Message });
        }
    }

    [HttpGet]
    public async Task<IActionResult> GetProfile()
    {
        try
        {
            // Get user ID from JWT claims
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
            if (userIdClaim == null || !int.TryParse(userIdClaim.Value, out var userId))
            {
                return Unauthorized(new { error = "Invalid token" });
            }

            // Get valid Spotify access token (auto-refreshes if needed)
            var accessToken = await _spotifyTokenService.GetValidAccessTokenAsync(userId);

            // Fetch Spotify profile
            var client = _httpClientFactory.CreateClient();
            client.DefaultRequestHeaders.Authorization = 
                new AuthenticationHeaderValue("Bearer", accessToken);

            var response = await client.GetAsync("https://api.spotify.com/v1/me");

            if (!response.IsSuccessStatusCode)
            {
                var error = await response.Content.ReadAsStringAsync();
                _logger.LogError("Spotify API error: {Error}", error);
                return StatusCode((int)response.StatusCode, new 
                { 
                    error = "Failed to fetch profile from Spotify",
                    details = error
                });
            }

            var content = await response.Content.ReadAsStringAsync();
            var profile = JsonSerializer.Deserialize<JsonElement>(content);

            return Ok(profile);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching profile");
            return StatusCode(500, new { error = "Internal server error", details = ex.Message });
        }
    }

    [HttpGet("top-artists")]
    public async Task<IActionResult> GetTopArtists()
    {
        try
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
            if (userIdClaim == null || !int.TryParse(userIdClaim.Value, out var userId))
            {
                return Unauthorized(new { error = "Invalid token" });
            }

            return await FetchTopArtistsForUser(userId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching user stats");
            return StatusCode(500, new { error = "Internal server error", details = ex.Message });
        }
    }

    [HttpGet("top-artists/{targetUserId}")]
    public async Task<IActionResult> GetTopArtistsForUser(int targetUserId)
    {
        try
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
            if (userIdClaim == null || !int.TryParse(userIdClaim.Value, out var _))
            {
                return Unauthorized(new { error = "Invalid token" });
            }

            return await FetchTopArtistsForUser(targetUserId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching user stats for user {UserId}", targetUserId);
            return StatusCode(500, new { error = "Internal server error", details = ex.Message });
        }
    }

    private async Task<IActionResult> FetchTopArtistsForUser(int userId)
    {
        var accessToken = await _spotifyTokenService.GetValidAccessTokenAsync(userId);
        var client = _httpClientFactory.CreateClient();
        client.DefaultRequestHeaders.Authorization = 
            new AuthenticationHeaderValue("Bearer", accessToken);

        // Fetch top artists
        var response = await client.GetAsync("https://api.spotify.com/v1/me/top/artists?limit=3");

        if (!response.IsSuccessStatusCode)
        {
            var error = await response.Content.ReadAsStringAsync();
            _logger.LogError("Spotify API error fetching top artists: {Error}", error);
            return StatusCode((int)response.StatusCode, new 
            { 
                error = "Failed to fetch top artists from Spotify",
                details = error
            });
        }

        var stats = new
        {
            topItems = JsonSerializer.Deserialize<JsonElement>(await response.Content.ReadAsStringAsync())
        };

        return Ok(stats);
    }

    /// <summary>
    /// Delete user account and all associated data (iOS App Store requirement)
    /// </summary>
    [HttpDelete]
    public async Task<IActionResult> DeleteAccount()
    {
        try
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
            if (userIdClaim == null || !int.TryParse(userIdClaim.Value, out var userId))
            {
                return Unauthorized(new { error = "Invalid token" });
            }

            var user = await _context.Users.FindAsync(userId);
            if (user == null)
            {
                return NotFound(new { error = "User not found" });
            }

            // Soft delete: Anonymize user data instead of hard delete
            // This preserves referential integrity while removing PII
            user.DisplayName = "Deleted User";
            user.Handle = $"deleted_{userId}_{Guid.NewGuid().ToString("N")[..8]}";
            user.Bio = null;
            user.Email = null;
            user.ProfileImageUrl = null;
            user.SpotifyAccessToken = string.Empty;  // Clear token but use empty string for non-nullable
            user.SpotifyRefreshToken = string.Empty;
            user.TokenExpiresAt = DateTime.MinValue;  // Set to min value to invalidate
            user.UpdatedAt = DateTime.UtcNow;

            // Delete related data
            var posts = _context.Posts.Where(p => p.UserId == userId);
            _context.Posts.RemoveRange(posts);

            var follows = _context.Follows.Where(f => f.FollowerUserId == userId || f.FolloweeUserId == userId);
            _context.Follows.RemoveRange(follows);

            var listeningHistory = _context.ListeningHistory.Where(lh => lh.UserId == userId);
            _context.ListeningHistory.RemoveRange(listeningHistory);

            await _context.SaveChangesAsync();

            _logger.LogInformation("User {UserId} account deleted (soft delete)", userId);

            return Ok(new { message = "Account deleted successfully" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting account");
            return StatusCode(500, new { error = "Failed to delete account", details = ex.Message });
        }
    }
}