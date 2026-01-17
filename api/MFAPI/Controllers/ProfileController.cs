using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using System.Net.Http.Headers;
using System.Text.Json;
using System.Security.Claims;
using MFAPI.Services;
using MFAPI.Data;
using Microsoft.EntityFrameworkCore;

namespace MFAPI.Controllers;

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

    [HttpGet("stats")]
    public async Task<IActionResult> GetUserStats()
    {
        try
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
            if (userIdClaim == null || !int.TryParse(userIdClaim.Value, out var userId))
            {
                return Unauthorized(new { error = "Invalid token" });
            }

            var accessToken = await _spotifyTokenService.GetValidAccessTokenAsync(userId);
            var client = _httpClientFactory.CreateClient();
            client.DefaultRequestHeaders.Authorization = 
                new AuthenticationHeaderValue("Bearer", accessToken);

            // Fetch top artists and tracks
            var topItems = client.GetAsync("https://api.spotify.com/v1/me/top/artists,tracks");

            await Task.WhenAll(topItems);

            var stats = new
            {
                topItems = JsonSerializer.Deserialize<JsonElement>(await topItems.Result.Content.ReadAsStringAsync())
            };

            return Ok(stats);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching user stats");
            return StatusCode(500, new { error = "Internal server error", details = ex.Message });
        }
    }
}