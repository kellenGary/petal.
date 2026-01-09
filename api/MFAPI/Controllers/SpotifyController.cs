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

    [HttpGet("songs/{songId}")]
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

            var client = _httpClientFactory.CreateClient();
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

    [HttpGet("songs/{songId}/liked")]
    public async Task<IActionResult> CheckIfSongIsLiked(string songId)
    {
        try{
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
            if (userIdClaim == null || !int.TryParse(userIdClaim.Value, out var userId))
            {
                return Unauthorized(new { error = "Invalid token" });
            }

            var accessToken = await _spotifyTokenService.GetValidAccessTokenAsync(userId);

            var client = _httpClientFactory.CreateClient();
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


    [HttpPost("songs/{songId}/unlike")]
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
            var client = _httpClientFactory.CreateClient();
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

    [HttpPost("songs/{songId}/like")]
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
            var client = _httpClientFactory.CreateClient();
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
}