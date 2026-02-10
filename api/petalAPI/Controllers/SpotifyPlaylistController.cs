using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using System.Net.Http.Headers;
using System.Text.Json;
using System.Security.Claims;
using PetalAPI.Services;

namespace PetalAPI.Controllers;

[ApiController]
[Route("api/spotify/playlists")]
[Authorize]
public class SpotifyPlaylistController : ControllerBase
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<SpotifyPlaylistController> _logger;
    private readonly ISpotifyTokenService _spotifyTokenService;
    private readonly IServiceScopeFactory _serviceScopeFactory;

    public SpotifyPlaylistController(
        IHttpClientFactory httpClientFactory,
        ILogger<SpotifyPlaylistController> logger,
        ISpotifyTokenService spotifyTokenService,
        IServiceScopeFactory serviceScopeFactory)
    {
        _httpClientFactory = httpClientFactory;
        _logger = logger;
        _spotifyTokenService = spotifyTokenService;
        _serviceScopeFactory = serviceScopeFactory;
    }

    /// <summary>
    /// Manually triggers a sync of the user's playlists from Spotify.
    /// </summary>
    [HttpPost("sync")]
    public async Task<IActionResult> SyncPlaylists()
    {
        try
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
            if (userIdClaim == null || !int.TryParse(userIdClaim.Value, out var userId))
            {
                return Unauthorized(new { error = "Invalid token" });
            }

            var accessToken = await _spotifyTokenService.GetValidAccessTokenAsync(userId);
            if (accessToken == null) return Unauthorized(new { error = "Spotify token expired" });
            
            _ = Task.Run(async () =>
            {
                try
                {
                    using (var scope = _serviceScopeFactory.CreateScope())
                    {
                        var playlistSyncService = scope.ServiceProvider.GetRequiredService<IPlaylistSyncService>();
                        var logger = scope.ServiceProvider.GetRequiredService<ILogger<SpotifyPlaylistController>>();
                        
                        logger.LogInformation("[Background] Starting playlist sync for user {UserId}", userId);
                        await playlistSyncService.SyncUserPlaylistsAsync(userId, accessToken);
                        logger.LogInformation("[Background] Completed playlist sync for user {UserId}", userId);
                    }
                }
                catch (Exception bgEx)
                {
                     _logger.LogError(bgEx, "[Background] Error syncing playlists for user {UserId}", userId);
                }
            });

            return Accepted(new { message = "Playlist sync started in background" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error starting playlist sync");
            return StatusCode(500, new { error = "Internal server error", message = ex.Message });
        }
    }

    /// <summary>
    /// Retrieves the user's playlists directly from Spotify.
    /// </summary>
    [HttpGet]
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
            if (accessToken == null) return Unauthorized(new { error = "Spotify token expired" });

            var client = _httpClientFactory.CreateClient("Spotify");
            client.DefaultRequestHeaders.Authorization = 
                new AuthenticationHeaderValue("Bearer", accessToken);

            var response = await client.GetAsync("https://api.spotify.com/v1/me/playlists?limit=50");

            if (!response.IsSuccessStatusCode)
            {
                var error = await response.Content.ReadAsStringAsync();
                _logger.LogError("Spotify API error: {Error}", error);
                
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

    /// <summary>
    /// Retrieves a specific playlist directly from Spotify.
    /// </summary>
    [HttpGet("{playlistId}")]
    public async Task<IActionResult> GetPlaylist(string playlistId)
    {
        try
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
            if (userIdClaim == null || !int.TryParse(userIdClaim.Value, out var userId))
            {
                return Unauthorized(new { error = "Invalid token" });
            }

            var accessToken = await _spotifyTokenService.GetValidAccessTokenAsync(userId);
            if (accessToken == null) return Unauthorized(new { error = "Spotify token expired" });

            var client = _httpClientFactory.CreateClient("Spotify");
            client.DefaultRequestHeaders.Authorization = 
                new AuthenticationHeaderValue("Bearer", accessToken);

            var response = await client.GetAsync($"https://api.spotify.com/v1/playlists/{playlistId}");

            if (!response.IsSuccessStatusCode)
            {
                var error = await response.Content.ReadAsStringAsync();
                _logger.LogError("Spotify API error: {Error}", error);
                
                return StatusCode((int)response.StatusCode, new 
                { 
                    error = "Failed to fetch playlist from Spotify",
                    statusCode = (int)response.StatusCode,
                    spotifyError = error
                });
            }

            var content = await response.Content.ReadAsStringAsync();
            var playlist = JsonSerializer.Deserialize<JsonElement>(content);

            return Ok(playlist);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching playlist");
            return StatusCode(500, new { error = "Internal server error" });
        }
    }

    /// <summary>
    /// Retrieves tracks from a specific playlist directly from Spotify.
    /// </summary>
    [HttpGet("{playlistId}/tracks")]
    public async Task<IActionResult> GetPlaylistTracks(string playlistId)
    {
        try
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
            if (userIdClaim == null || !int.TryParse(userIdClaim.Value, out var userId))
            {
                return Unauthorized(new { error = "Invalid token" });
            }

            var accessToken = await _spotifyTokenService.GetValidAccessTokenAsync(userId);
            if (accessToken == null) return Unauthorized(new { error = "Spotify token expired" });

            var client = _httpClientFactory.CreateClient("Spotify");
            client.DefaultRequestHeaders.Authorization = 
                new AuthenticationHeaderValue("Bearer", accessToken);

            var response = await client.GetAsync($"https://api.spotify.com/v1/playlists/{playlistId}/tracks?limit=100");

            if (!response.IsSuccessStatusCode)
            {
                var error = await response.Content.ReadAsStringAsync();
                _logger.LogError("Spotify API error: {Error}", error);
                
                return StatusCode((int)response.StatusCode, new 
                { 
                    error = "Failed to fetch playlist tracks from Spotify",
                    statusCode = (int)response.StatusCode,
                    spotifyError = error
                });
            }

            var content = await response.Content.ReadAsStringAsync();
            var tracks = JsonSerializer.Deserialize<JsonElement>(content);

            return Ok(tracks);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching playlist tracks");
            return StatusCode(500, new { error = "Internal server error" });
        }
    }
}
