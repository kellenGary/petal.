using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Security.Claims;
using PetalAPI.Services;
using System.ComponentModel;

namespace PetalAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class SpotifyController : ControllerBase
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<SpotifyController> _logger;
    private readonly IConfiguration _configuration;
    private readonly ISpotifyTokenService _spotifyTokenService;
    private readonly IServiceScopeFactory _serviceScopeFactory;

    public SpotifyController(
        IHttpClientFactory httpClientFactory,
        ILogger<SpotifyController> logger,
        IConfiguration configuration,
        ISpotifyTokenService spotifyTokenService,
        IServiceScopeFactory serviceScopeFactory)
    {
        _httpClientFactory = httpClientFactory;
        _logger = logger;
        _configuration = configuration;
        _spotifyTokenService = spotifyTokenService;
        _serviceScopeFactory = serviceScopeFactory;
    }

    /// <summary>
    /// Manually triggers a sync of the user's playlists from Spotify.
    /// </summary>
    [HttpPost("playlists/sync")]
    public async Task<IActionResult> SyncPlaylists()
    {
        try
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
            if (userIdClaim == null || !int.TryParse(userIdClaim.Value, out var userId))
            {
                return Unauthorized(new { error = "Invalid token" });
            }

            // Get token now to pass to background task (or get it there if needed, 
            // but passing it ensures we have it valid now)
            // Ideally we get a valid one. If it expires during sync, the sync service might fail.
            // But usually these are valid for an hour.
            var accessToken = await _spotifyTokenService.GetValidAccessTokenAsync(userId);
            
            // Offload to background
            _ = Task.Run(async () =>
            {
                try
                {
                    using (var scope = _serviceScopeFactory.CreateScope())
                    {
                        var playlistSyncService = scope.ServiceProvider.GetRequiredService<IPlaylistSyncService>();
                        var logger = scope.ServiceProvider.GetRequiredService<ILogger<SpotifyController>>();
                        
                        logger.LogInformation("[Background] Starting playlist sync for user {UserId}", userId);
                        await playlistSyncService.SyncUserPlaylistsAsync(userId, accessToken);
                        logger.LogInformation("[Background] Completed playlist sync for user {UserId}", userId);
                    }
                }
                catch (Exception bgEx)
                {
                    // Create a logger manually if needed, or use a static one, 
                    // but here we can try to resolve one from the scope.
                    // If scope creation failed we are in trouble anyway.
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
    /// Manually triggers a sync of the user's saved tracks from Spotify.
    /// </summary>
    [HttpPost("saved-tracks/sync")]
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
            
            // Offload to background
            _ = Task.Run(async () =>
            {
                try
                {
                    using (var scope = _serviceScopeFactory.CreateScope())
                    {
                        var savedTracksSyncService = scope.ServiceProvider.GetRequiredService<ISavedTracksSyncService>();
                        var logger = scope.ServiceProvider.GetRequiredService<ILogger<SpotifyController>>();

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
    /// Retrieves the user's playlists directly from Spotify.
    /// </summary>
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

            var client = _httpClientFactory.CreateClient("Spotify");
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

    /// <summary>
    /// Retrieves a specific playlist directly from Spotify.
    /// </summary>
    /// <param name="playlistId">The Spotify ID of the playlist.</param>
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
    /// <param name="playlistId">The Spotify ID of the playlist.</param>
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

    /// <summary>
    /// Retrieves details for a specific track directly from Spotify.
    /// </summary>
    /// <param name="songId">The Spotify ID of the track.</param>
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
    /// Checks if a song is in the user's valid Spotify library.
    /// </summary>
    /// <param name="songId">The Spotify ID of the track.</param>
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
    /// Removes a song from the user's Spotify library.
    /// </summary>
    /// <param name="songId">The Spotify ID of the track.</param>
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
    /// Adds a song to the user's Spotify library.
    /// </summary>
    /// <param name="songId">The Spotify ID of the track.</param>
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

    /// <summary>
    /// Retrieves new releases directly from Spotify.
    /// </summary>
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

            var client = _httpClientFactory.CreateClient("Spotify");
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

    /// <summary>
    /// Retrieves artist details directly from Spotify.
    /// </summary>
    /// <param name="artistId">The Spotify ID of the artist.</param>
    [HttpGet("artists/{artistId}")]
    public async Task<IActionResult> GetArtist(string artistId)
    {
        try
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
            if (userIdClaim == null || !int.TryParse(userIdClaim.Value, out var userId))
            {
                return Unauthorized(new { error = "Invalid token" });
            }

            var accessToken = await _spotifyTokenService.GetValidAccessTokenAsync(userId);

            var client = _httpClientFactory.CreateClient("Spotify");
            client.DefaultRequestHeaders.Authorization = 
                new AuthenticationHeaderValue("Bearer", accessToken);

            var response = await client.GetAsync($"https://api.spotify.com/v1/artists/{artistId}");

            if (!response.IsSuccessStatusCode)
            {
                var error = await response.Content.ReadAsStringAsync();
                _logger.LogError("Spotify API error: {Error}", error);
                
                return StatusCode((int)response.StatusCode, new 
                { 
                    error = "Failed to fetch artist from Spotify",
                    statusCode = (int)response.StatusCode,
                    spotifyError = error
                });
            }

            var content = await response.Content.ReadAsStringAsync();
            var artist = JsonSerializer.Deserialize<JsonElement>(content);

            return Ok(artist);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching artist");
            return StatusCode(500, new { error = "Internal server error" });
        }
    }

    /// <summary>
    /// Retrieves an artist's top tracks directly from Spotify.
    /// </summary>
    /// <param name="artistId">The Spotify ID of the artist.</param>
    [HttpGet("artists/{artistId}/top-tracks")]
    public async Task<IActionResult> GetArtistTopTracks(string artistId)
    {
        try
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
            if (userIdClaim == null || !int.TryParse(userIdClaim.Value, out var userId))
            {
                return Unauthorized(new { error = "Invalid token" });
            }

            var accessToken = await _spotifyTokenService.GetValidAccessTokenAsync(userId);

            var client = _httpClientFactory.CreateClient("Spotify");
            client.DefaultRequestHeaders.Authorization = 
                new AuthenticationHeaderValue("Bearer", accessToken);

            var response = await client.GetAsync($"https://api.spotify.com/v1/artists/{artistId}/top-tracks?market=US");

            if (!response.IsSuccessStatusCode)
            {
                var error = await response.Content.ReadAsStringAsync();
                _logger.LogError("Spotify API error: {Error}", error);
                
                return StatusCode((int)response.StatusCode, new 
                { 
                    error = "Failed to fetch artist top tracks from Spotify",
                    statusCode = (int)response.StatusCode,
                    spotifyError = error
                });
            }

            var content = await response.Content.ReadAsStringAsync();
            var topTracks = JsonSerializer.Deserialize<JsonElement>(content);

            return Ok(topTracks);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching artist top tracks");
            return StatusCode(500, new { error = "Internal server error" });
        }
    }

    /// <summary>
    /// Retrieves an artist's albums directly from Spotify.
    /// </summary>
    /// <param name="artistId">The Spotify ID of the artist.</param>
    [HttpGet("artists/{artistId}/albums")]
    public async Task<IActionResult> GetArtistAlbums(string artistId)
    {
        try
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
            if (userIdClaim == null || !int.TryParse(userIdClaim.Value, out var userId))
            {
                return Unauthorized(new { error = "Invalid token" });
            }

            var accessToken = await _spotifyTokenService.GetValidAccessTokenAsync(userId);

            var client = _httpClientFactory.CreateClient("Spotify");
            client.DefaultRequestHeaders.Authorization = 
                new AuthenticationHeaderValue("Bearer", accessToken);

            var response = await client.GetAsync($"https://api.spotify.com/v1/artists/{artistId}/albums?include_groups=album,single&limit=20");

            if (!response.IsSuccessStatusCode)
            {
                var error = await response.Content.ReadAsStringAsync();
                _logger.LogError("Spotify API error: {Error}", error);
                
                return StatusCode((int)response.StatusCode, new 
                { 
                    error = "Failed to fetch artist albums from Spotify",
                    statusCode = (int)response.StatusCode,
                    spotifyError = error
                });
            }

            var content = await response.Content.ReadAsStringAsync();
            var albums = JsonSerializer.Deserialize<JsonElement>(content);

            return Ok(albums);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching artist albums");
            return StatusCode(500, new { error = "Internal server error" });
        }
    }
}