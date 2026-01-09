using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Security.Claims;
using MFAPI.Services;
using System.ComponentModel;

namespace MFAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class PlaybackController : ControllerBase
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ISpotifyTokenService _spotifyTokenService;
    private readonly ILogger<PlaybackController> _logger;

    public PlaybackController(
        IHttpClientFactory httpClientFactory,
        ISpotifyTokenService spotifyTokenService,
        ILogger<PlaybackController> logger)
    {
        _httpClientFactory = httpClientFactory;
        _spotifyTokenService = spotifyTokenService;
        _logger = logger;
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

    [HttpGet("player-state")]
    public async Task<IActionResult> GetPlayerState()
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

            var response = await client.GetAsync("https://api.spotify.com/v1/me/player");

            if (response.StatusCode == System.Net.HttpStatusCode.Unauthorized)
            {
                _logger.LogWarning("Spotify returned 401 for user {UserId}. Attempting forced refresh...", userId);
                try
                {
                    accessToken = await _spotifyTokenService.ForceRefreshTokenAsync(userId);
                    client.DefaultRequestHeaders.Authorization =
                        new AuthenticationHeaderValue("Bearer", accessToken);
                    response = await client.GetAsync("https://api.spotify.com/v1/me/player");
                }
                catch (Exception refreshEx)
                {
                    _logger.LogError(refreshEx, "Failed to force refresh Spotify token");
                    return Unauthorized(new { error = "Spotify session expired" });
                }
            }

            // Spotify may return 204 if there's no active device
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
                    error = "Failed to fetch player state from Spotify",
                    statusCode = (int)response.StatusCode,
                    spotifyError = error
                });
            }

            var content = await response.Content.ReadAsStringAsync();
            var playerState = JsonSerializer.Deserialize<JsonElement>(content);

            return Ok(playerState);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching player state");
            return StatusCode(500, new { error = "Internal server error" });
        }
    }

    [HttpPost("play")]
    public async Task<IActionResult> Play([FromQuery] string? uri = null, [FromQuery] string? contextUri = null)
    {
        if (uri != null)
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

                // If no context provided and it's a track URI, fetch the track's album to play from context
                if (string.IsNullOrEmpty(contextUri) && uri.StartsWith("spotify:track:"))
                {
                    var trackId = uri.Split(':')[2];
                    var trackInfoRequest = new HttpRequestMessage(HttpMethod.Get, 
                        $"https://api.spotify.com/v1/tracks/{trackId}");
                    trackInfoRequest.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);
                    
                    var trackInfoResponse = await client.SendAsync(trackInfoRequest);
                    if (trackInfoResponse.IsSuccessStatusCode)
                    {
                        var trackInfo = await trackInfoResponse.Content.ReadAsStringAsync();
                        var trackJson = JsonSerializer.Deserialize<JsonElement>(trackInfo);
                        
                        // Get the album URI from the track
                        if (trackJson.TryGetProperty("album", out var album) && 
                            album.TryGetProperty("uri", out var albumUri))
                        {
                            contextUri = albumUri.GetString();
                            _logger.LogInformation("Auto-fetched album context: {AlbumUri} for track {TrackUri}", 
                                contextUri, uri);
                        }
                    }
                }

                // Play the specific track with context to maintain Spotify's recommendations
                var playUrl = "https://api.spotify.com/v1/me/player/play";
                var request = new HttpRequestMessage(HttpMethod.Put, playUrl);
                request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);

                // Build request body
                var requestBody = new Dictionary<string, object>();
                
                if (!string.IsNullOrEmpty(contextUri))
                {
                    // If we have a context (album, playlist, artist), play from that context
                    requestBody["context_uri"] = contextUri;
                    requestBody["offset"] = new Dictionary<string, string> { { "uri", uri } };
                }
                else
                {
                    // Play just the track (no context - may have limited recommendations)
                    requestBody["uris"] = new[] { uri };
                }

                var jsonContent = JsonSerializer.Serialize(requestBody);
                request.Content = new StringContent(jsonContent, Encoding.UTF8, "application/json");

                var response = await client.SendAsync(request);

                if (!response.IsSuccessStatusCode)
                {
                    var error = await response.Content.ReadAsStringAsync();
                    _logger.LogError("Spotify API error (PUT {Url}): {Error}", playUrl, error);
                    return StatusCode((int)response.StatusCode, new { error = "Spotify playback command failed", details = error });
                }

                return Ok();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error executing play command with URI {Uri}", uri);
                return StatusCode(500, new { error = "Internal server error" });
            }
        }
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