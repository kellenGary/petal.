using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using System.Net.Http.Headers;
using System.Text.Json;
using System.Security.Claims;
using MFAPI.Services;

namespace MFAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class SpotifyController : ControllerBase
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<SpotifyController> _logger;
    private readonly IConfiguration _configuration;
    private readonly ISpotifyTokenService _spotifyTokenService;

    public SpotifyController(
        IHttpClientFactory httpClientFactory,
        ILogger<SpotifyController> logger,
        IConfiguration configuration,
        ISpotifyTokenService spotifyTokenService)
    {
        _httpClientFactory = httpClientFactory;
        _logger = logger;
        _configuration = configuration;
        _spotifyTokenService = spotifyTokenService;
    }

    [HttpGet("playlists")]
    public async Task<IActionResult> GetPlaylists()
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

            var response = await client.GetAsync("https://api.spotify.com/v1/me/playlists?limit=50");

            if (!response.IsSuccessStatusCode)
            {
                var error = await response.Content.ReadAsStringAsync();
                _logger.LogError("Spotify API error: {Error}", error);
                
                // Return the actual Spotify error for debugging
                return StatusCode((int)response.StatusCode, new 
                { 
                    error = "Failed to fetch playlists from Spotify",
                    statusCode = (int)response.StatusCode,
                    spotifyError = error
                });
            }

            var content = await response.Content.ReadAsStringAsync();
            var playlists = JsonSerializer.Deserialize<JsonElement>(content);

            return Ok(playlists);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching playlists");
            return StatusCode(500, new { error = "Internal server error" });
        }
    }

    [HttpGet("recently-played")]
    public async Task<IActionResult> GetRecentlyPlayed()
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

            var response = await client.GetAsync("https://api.spotify.com/v1/me/player/recently-played?limit=50");

            if (!response.IsSuccessStatusCode)
            {
                var error = await response.Content.ReadAsStringAsync();
                _logger.LogError("Spotify API error: {Error}", error);
                
                // Return the actual Spotify error for debugging
                return StatusCode((int)response.StatusCode, new 
                { 
                    error = "Failed to fetch recently played from Spotify",
                    statusCode = (int)response.StatusCode,
                    spotifyError = error
                });
            }

            var content = await response.Content.ReadAsStringAsync();
            var recentlyPlayed = JsonSerializer.Deserialize<JsonElement>(content);

            return Ok(recentlyPlayed);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching recently played");
            return StatusCode(500, new { error = "Internal server error" });
        }
    }
}