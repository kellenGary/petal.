using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using System.Net.Http.Headers;
using System.Text.Json;
using System.Security.Claims;
using MFAPI.Services;
using MFAPI.Data;

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
            var topArtistsTask = client.GetAsync("https://api.spotify.com/v1/me/top/artists?limit=10&time_range=medium_term");
            var topTracksTask = client.GetAsync("https://api.spotify.com/v1/me/top/tracks?limit=10&time_range=medium_term");
            var recentlyPlayedTask = client.GetAsync("https://api.spotify.com/v1/me/player/recently-played?limit=20");

            await Task.WhenAll(topArtistsTask, topTracksTask, recentlyPlayedTask);

            var stats = new
            {
                topArtists = JsonSerializer.Deserialize<JsonElement>(await topArtistsTask.Result.Content.ReadAsStringAsync()),
                topTracks = JsonSerializer.Deserialize<JsonElement>(await topTracksTask.Result.Content.ReadAsStringAsync()),
                recentlyPlayed = JsonSerializer.Deserialize<JsonElement>(await recentlyPlayedTask.Result.Content.ReadAsStringAsync())
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