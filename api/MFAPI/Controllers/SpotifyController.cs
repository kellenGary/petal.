using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using System.Net.Http.Headers;
using System.Text.Json;
using System.Security.Claims;
using MFAPI.Services;
using System.ComponentModel;

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

    [HttpGet("playlists/{playlistId}")]
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

            var client = _httpClientFactory.CreateClient();
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

    [HttpGet("playlists/{playlistId}/tracks")]
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

            var client = _httpClientFactory.CreateClient();
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

    [HttpGet("liked-songs")]
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

            var client = _httpClientFactory.CreateClient();
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

    [HttpGet("new-releases")]
    public async Task<IActionResult> GetNewReleases() 
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

            var response = await client.GetAsync("https://api.spotify.com/v1/browse/new-releases?limit=20");

            if (!response.IsSuccessStatusCode)
            {
                var error = await response.Content.ReadAsStringAsync();
                _logger.LogError("Spotify API error: {Error}", error);
                
                return StatusCode((int)response.StatusCode, new 
                { 
                    error = "Failed to fetch new releases from Spotify",
                    statusCode = (int)response.StatusCode,
                    spotifyError = error
                });
            }

            var content = await response.Content.ReadAsStringAsync();
            var data = JsonSerializer.Deserialize<JsonElement>(content);

            var albums = new List<JsonElement>();
            if (data.TryGetProperty("albums", out var albumsWrapper) && 
                albumsWrapper.TryGetProperty("items", out var items))
            {
                foreach (var album in items.EnumerateArray())
                {
                    albums.Add(album);
                }
            }

            _logger.LogInformation("Returning {Count} new releases", albums.Count);

            var result = new
            {
                albums = albums
            };

            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching new releases");
            return StatusCode(500, new { error = "Internal server error" });
        }
    }

    [HttpGet("currently-playing")]
    public async Task<IActionResult> GetCurrentlyPlaying()
    {
        try
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
            if (userIdClaim == null || !int.TryParse(userIdClaim.Value, out var userId))
            {
                return Unauthorized(new { error = "Invalid token" });
            }

            // Initial attempt with valid token
            var accessToken = await _spotifyTokenService.GetValidAccessTokenAsync(userId);

            var client = _httpClientFactory.CreateClient();
            client.DefaultRequestHeaders.Authorization = 
                new AuthenticationHeaderValue("Bearer", accessToken);

            var response = await client.GetAsync("https://api.spotify.com/v1/me/player/currently-playing");

            // Retry logic for expired tokens (401)
            if (response.StatusCode == System.Net.HttpStatusCode.Unauthorized)
            {
                _logger.LogWarning("Spotify returned 401 for user {UserId}. Attempting forced refresh...", userId);
                try 
                {
                    accessToken = await _spotifyTokenService.ForceRefreshTokenAsync(userId);
                    client.DefaultRequestHeaders.Authorization = 
                        new AuthenticationHeaderValue("Bearer", accessToken);
                    response = await client.GetAsync("https://api.spotify.com/v1/me/player/currently-playing");
                }
                catch (Exception refreshEx)
                {
                    _logger.LogError(refreshEx, "Failed to force refresh Spotify token");
                    // Failed to refresh -> Return 401 (App will logout user)
                    // Or return specific error?
                    // The App expects "Session expired" message for logout.
                    // But if I return 401 here, api.ts handles it.
                    return Unauthorized(new { error = "Spotify session expired" });
                }
            }

            // 204 No Content means nothing is playing
            if (response.StatusCode == System.Net.HttpStatusCode.NoContent)
            {
                return Ok(new { isPlaying = false });
            }

            if (!response.IsSuccessStatusCode)
            {
                var error = await response.Content.ReadAsStringAsync();
                _logger.LogError("Spotify API error: {Error}", error);
                
                return StatusCode((int)response.StatusCode, new 
                { 
                    error = "Failed to fetch currently playing from Spotify",
                    statusCode = (int)response.StatusCode,
                    spotifyError = error
                });
            }

            var content = await response.Content.ReadAsStringAsync();
            var playbackState = JsonSerializer.Deserialize<JsonElement>(content);

            return Ok(playbackState);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching currently playing");
            return StatusCode(500, new { error = "Internal server error" });
        }
    }

    [HttpPost("play")]
    public async Task<IActionResult> Play()
    {
        return await SendPlayerRequest("https://api.spotify.com/v1/me/player/play", HttpMethod.Put);
    }

    [HttpPost("pause")]
    public async Task<IActionResult> Pause()
    {
        return await SendPlayerRequest("https://api.spotify.com/v1/me/player/pause", HttpMethod.Put);
    }

    [HttpPost("next")]
    public async Task<IActionResult> Next()
    {
        return await SendPlayerRequest("https://api.spotify.com/v1/me/player/next", HttpMethod.Post);
    }

    [HttpPost("previous")]
    public async Task<IActionResult> Previous()
    {
        return await SendPlayerRequest("https://api.spotify.com/v1/me/player/previous", HttpMethod.Post);
    }

    [HttpPost("shuffle")]
    public async Task<IActionResult> Shuffle([FromQuery] bool state)
    {
        return await SendPlayerRequest($"https://api.spotify.com/v1/me/player/shuffle?state={state.ToString().ToLower()}", HttpMethod.Put);
    }

    [HttpPost("repeat")]
    public async Task<IActionResult> Repeat([FromQuery] string state)
    {
        // state can be 'track', 'context' or 'off'
        return await SendPlayerRequest($"https://api.spotify.com/v1/me/player/repeat?state={state}", HttpMethod.Put);
    }

    private async Task<IActionResult> SendPlayerRequest(string url, HttpMethod method)
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
            
            var request = new HttpRequestMessage(method, url);
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);

            var response = await client.SendAsync(request);

            if (!response.IsSuccessStatusCode)
            {
                var error = await response.Content.ReadAsStringAsync();
                _logger.LogError("Spotify API error ({Method} {Url}): {Error}", method, url, error);
                return StatusCode((int)response.StatusCode, new { error = "Spotify playback command failed", details = error });
            }

            return Ok();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error executing player command {Method} {Url}", method, url);
            return StatusCode(500, new { error = "Internal server error" });
        }
    }
}