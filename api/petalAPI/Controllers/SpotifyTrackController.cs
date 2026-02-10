using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using System.Net.Http.Headers;
using System.Text.Json;
using System.Security.Claims;
using PetalAPI.Services;

namespace PetalAPI.Controllers;

[ApiController]
[Route("api/spotify/tracks")]
[Authorize]
public class SpotifyTrackController : ControllerBase
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<SpotifyTrackController> _logger;
    private readonly ISpotifyTokenService _spotifyTokenService;
    private readonly IServiceScopeFactory _serviceScopeFactory;

    public SpotifyTrackController(
        IHttpClientFactory httpClientFactory,
        ILogger<SpotifyTrackController> logger,
        ISpotifyTokenService spotifyTokenService,
        IServiceScopeFactory serviceScopeFactory)
    {
        _httpClientFactory = httpClientFactory;
        _logger = logger;
        _spotifyTokenService = spotifyTokenService;
        _serviceScopeFactory = serviceScopeFactory;
    }

    /// <summary>
    /// Manually triggers a sync of the user's saved tracks from Spotify.
    /// </summary>
    [HttpPost("saved/sync")]
    public async Task<IActionResult> SyncSavedTracks()
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
                        var savedTracksSyncService = scope.ServiceProvider.GetRequiredService<ISavedTracksSyncService>();
                        var logger = scope.ServiceProvider.GetRequiredService<ILogger<SpotifyTrackController>>();

                        logger.LogInformation("[Background] Starting saved tracks sync for user {UserId}", userId);
                        await savedTracksSyncService.SyncSavedTracksAsync(userId, accessToken);
                        logger.LogInformation("[Background] Completed saved tracks sync for user {UserId}", userId);
                    }
                }
                catch (Exception bgEx)
                {
                     _logger.LogError(bgEx, "[Background] Error syncing saved tracks for user {UserId}", userId);
                }
            });

            return Accepted(new { message = "Saved tracks sync started in background" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error starting saved tracks sync");
            return StatusCode(500, new { error = "Internal server error", message = ex.Message });
        }
    }

    /// <summary>
    /// Retrieves details for a specific track directly from Spotify.
    /// </summary>
    [HttpGet("{songId}")]
    public async Task<IActionResult> GetSongDetails(string songId)
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

            var response = await client.GetAsync($"https://api.spotify.com/v1/tracks/{songId}?fields=artists,name,duration_ms,album(name,images),external_urls,uri");

            if (!response.IsSuccessStatusCode)
            {
                var error = await response.Content.ReadAsStringAsync();
                _logger.LogError("Spotify API error: {Error}", error);
                
                return StatusCode((int)response.StatusCode, new 
                { 
                    error = "Failed to fetch song from Spotify",
                    statusCode = (int)response.StatusCode,
                    spotifyError = error
                });
            }

            var content = await response.Content.ReadAsStringAsync();
            var song = JsonSerializer.Deserialize<JsonElement>(content);

            return Ok(song);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching song details");
            return StatusCode(500, new { error = "Internal server error" });
        }
    }

    /// <summary>
    /// Checks if a song is in the user's Spotify library.
    /// </summary>
    [HttpGet("{songId}/liked")]
    public async Task<IActionResult> CheckIfSongIsLiked(string songId)
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

            var response = await client.GetAsync($"https://api.spotify.com/v1/me/tracks/contains?ids={songId}");

            if (!response.IsSuccessStatusCode)
            {
                var error = await response.Content.ReadAsStringAsync();
                _logger.LogError("Spotify API error: {Error}", error);
                
                return StatusCode((int)response.StatusCode, new 
                { 
                    error = "Failed to check if song is liked on Spotify",
                    statusCode = (int)response.StatusCode,
                    spotifyError = error
                });
            }

            var content = await response.Content.ReadAsStringAsync();
            var isLikedArray = JsonSerializer.Deserialize<bool[]>(content);
            var isLiked = isLikedArray != null && isLikedArray.Length > 0 && isLikedArray[0];

            return Ok(new { isLiked = isLiked });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error checking if song is liked");
            return StatusCode(500, new { error = "Internal server error" });
        }
    }

    /// <summary>
    /// Adds a song to the user's Spotify library.
    /// </summary>
    [HttpPut("{songId}/like")]
    public async Task<IActionResult> LikeSong(string songId)
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

            var response = await client.PutAsync($"https://api.spotify.com/v1/me/tracks?ids={songId}", null);

            if (!response.IsSuccessStatusCode)
            {
                var error = await response.Content.ReadAsStringAsync();
                _logger.LogError("Spotify API error: {Error}", error);
                return StatusCode((int)response.StatusCode, new
                {
                    error = "Failed to like song on Spotify",
                    statusCode = (int)response.StatusCode,
                    spotifyError = error
                });
            }

            return Ok();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error liking song");
            return StatusCode(500, new { error = "Internal server error" });
        }
    }

    /// <summary>
    /// Removes a song from the user's Spotify library.
    /// </summary>
    [HttpDelete("{songId}/like")]
    public async Task<IActionResult> UnlikeSong(string songId)
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

            var response = await client.DeleteAsync($"https://api.spotify.com/v1/me/tracks?ids={songId}");

            if (!response.IsSuccessStatusCode)
            {
                var error = await response.Content.ReadAsStringAsync();
                _logger.LogError("Spotify API error: {Error}", error);
                return StatusCode((int)response.StatusCode, new
                {
                    error = "Failed to unlike song on Spotify",
                    statusCode = (int)response.StatusCode,
                    spotifyError = error
                });
            }

            return Ok();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error unliking song");
            return StatusCode(500, new { error = "Internal server error" });
        }
    }

    /// <summary>
    /// Retrieves the user's recently played tracks directly from Spotify.
    /// </summary>
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
            if (accessToken == null) return Unauthorized(new { error = "Spotify token expired" });

            var client = _httpClientFactory.CreateClient("Spotify");
            client.DefaultRequestHeaders.Authorization = 
                new AuthenticationHeaderValue("Bearer", accessToken);

            var response = await client.GetAsync("https://api.spotify.com/v1/me/player/recently-played?limit=50");

            if (!response.IsSuccessStatusCode)
            {
                var error = await response.Content.ReadAsStringAsync();
                _logger.LogError("Spotify API error: {Error}", error);
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

    /// <summary>
    /// Retrieves the user's liked songs directly from Spotify.
    /// </summary>
    [HttpGet("liked")]
    public async Task<IActionResult> GetLikedSongs()
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

            var response = await client.GetAsync("https://api.spotify.com/v1/me/tracks?limit=50");

            if (!response.IsSuccessStatusCode)
            {
                var error = await response.Content.ReadAsStringAsync();
                _logger.LogError("Spotify API error: {Error}", error);
                
                return StatusCode((int)response.StatusCode, new 
                { 
                    error = "Failed to fetch liked songs from Spotify",
                    statusCode = (int)response.StatusCode,
                    spotifyError = error
                });
            }

            var content = await response.Content.ReadAsStringAsync();
            var likedSongs = JsonSerializer.Deserialize<JsonElement>(content);

            return Ok(likedSongs);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching liked songs");
            return StatusCode(500, new { error = "Internal server error" });
        }
    }
}
