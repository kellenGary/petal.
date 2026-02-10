using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using System.Net.Http.Headers;
using System.Text.Json;
using System.Security.Claims;
using PetalAPI.Data;
using PetalAPI.Models;
using PetalAPI.Services;

namespace PetalAPI.Controllers;

[ApiController]
[Route("api/spotify/albums")]
[Authorize]
public class SpotifyAlbumController : ControllerBase
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<SpotifyAlbumController> _logger;
    private readonly ISpotifyTokenService _spotifyTokenService;
    private readonly AppDbContext _dbContext;
    private readonly IServiceScopeFactory _serviceScopeFactory;

    public SpotifyAlbumController(
        IHttpClientFactory httpClientFactory,
        ILogger<SpotifyAlbumController> logger,
        ISpotifyTokenService spotifyTokenService,
        AppDbContext dbContext,
        IServiceScopeFactory serviceScopeFactory)
    {
        _httpClientFactory = httpClientFactory;
        _logger = logger;
        _spotifyTokenService = spotifyTokenService;
        _dbContext = dbContext;
        _serviceScopeFactory = serviceScopeFactory;
    }

    /// <summary>
    /// Retrieves album details directly from Spotify.
    /// </summary>
    [HttpGet("{albumId}")]
    public async Task<IActionResult> GetAlbum(string albumId)
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

            var response = await client.GetAsync($"https://api.spotify.com/v1/albums/{albumId}");

            if (!response.IsSuccessStatusCode)
            {
                var error = await response.Content.ReadAsStringAsync();
                _logger.LogError("Spotify API error: {Error}", error);
                
                return StatusCode((int)response.StatusCode, new 
                { 
                    error = "Failed to fetch album from Spotify",
                    statusCode = (int)response.StatusCode,
                    spotifyError = error
                });
            }

            var content = await response.Content.ReadAsStringAsync();
            var album = JsonSerializer.Deserialize<JsonElement>(content);

            return Ok(album);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching album");
            return StatusCode(500, new { error = "Internal server error" });
        }
    }

    /// <summary>
    /// Retrieves the user's saved albums from Spotify.
    /// </summary>
    [HttpGet("saved")]
    public async Task<IActionResult> GetSavedAlbums()
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

            var response = await client.GetAsync("https://api.spotify.com/v1/me/albums?limit=50");

            if (!response.IsSuccessStatusCode)
            {
                var error = await response.Content.ReadAsStringAsync();
                _logger.LogError("Spotify API error: {Error}", error);
                
                return StatusCode((int)response.StatusCode, new 
                { 
                    error = "Failed to fetch saved albums from Spotify",
                    statusCode = (int)response.StatusCode,
                    spotifyError = error
                });
            }

            var content = await response.Content.ReadAsStringAsync();
            var savedAlbums = JsonSerializer.Deserialize<JsonElement>(content);

            return Ok(savedAlbums);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching saved albums");
            return StatusCode(500, new { error = "Internal server error" });
        }
    }

    /// <summary>
    /// Syncs the user's saved albums from Spotify to the database.
    /// </summary>
    [HttpPost("saved/sync")]
    public async Task<IActionResult> SyncSavedAlbums()
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
                    using var scope = _serviceScopeFactory.CreateScope();
                    var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
                    var httpClientFactory = scope.ServiceProvider.GetRequiredService<IHttpClientFactory>();
                    var logger = scope.ServiceProvider.GetRequiredService<ILogger<SpotifyAlbumController>>();

                    var client = httpClientFactory.CreateClient("Spotify");
                    client.DefaultRequestHeaders.Authorization = 
                        new AuthenticationHeaderValue("Bearer", accessToken);

                    var allAlbums = new List<(JsonElement album, DateTime addedAt)>();
                    int offset = 0;
                    bool hasMore = true;

                    while (hasMore)
                    {
                        var url = $"https://api.spotify.com/v1/me/albums?limit=50&offset={offset}";
                        var response = await client.GetAsync(url);
                        if (!response.IsSuccessStatusCode) break;

                        var content = await response.Content.ReadAsStringAsync();
                        var data = JsonSerializer.Deserialize<JsonElement>(content);

                        if (data.TryGetProperty("items", out var items))
                        {
                            foreach (var item in items.EnumerateArray())
                            {
                                var album = item.GetProperty("album");
                                var addedAtStr = item.GetProperty("added_at").GetString();
                                var addedAt = DateTime.Parse(addedAtStr ?? DateTime.UtcNow.ToString());
                                allAlbums.Add((album, addedAt));
                            }

                            hasMore = data.TryGetProperty("next", out var next) && next.ValueKind != JsonValueKind.Null;
                            offset += 50;
                        }
                        else
                        {
                            hasMore = false;
                        }
                    }

                    logger.LogInformation("Syncing {Count} saved albums for user {UserId}", allAlbums.Count, userId);

                    // Get existing saved album IDs to detect unsaves
                    var existingSaves = await dbContext.UserLikedAlbums
                        .Where(ula => ula.UserId == userId)
                        .Select(ula => ula.Album.SpotifyId)
                        .ToListAsync();

                    var spotifyAlbumIds = new HashSet<string>();

                    foreach (var (albumJson, addedAt) in allAlbums)
                    {
                        var spotifyId = albumJson.GetProperty("id").GetString()!;
                        spotifyAlbumIds.Add(spotifyId);

                        var name = albumJson.GetProperty("name").GetString()!;
                        var imageUrl = albumJson.TryGetProperty("images", out var images) && 
                                       images.GetArrayLength() > 0
                            ? images[0].GetProperty("url").GetString()
                            : null;
                        var releaseDateStr = albumJson.TryGetProperty("release_date", out var rd) 
                            ? rd.GetString() 
                            : null;
                        // Parse release date (Spotify uses YYYY, YYYY-MM, or YYYY-MM-DD)
                        DateTime? releaseDate = null;
                        if (!string.IsNullOrEmpty(releaseDateStr))
                        {
                            if (DateTime.TryParse(releaseDateStr, out var parsed))
                                releaseDate = parsed;
                        }
                        var albumType = albumJson.TryGetProperty("album_type", out var at) 
                            ? at.GetString() 
                            : null;
                        var label = albumJson.TryGetProperty("label", out var lb) 
                            ? lb.GetString() 
                            : null;

                        // Upsert album
                        var album = await dbContext.Albums.FirstOrDefaultAsync(a => a.SpotifyId == spotifyId);
                        if (album == null)
                        {
                            album = new Album
                            {
                                SpotifyId = spotifyId,
                                Name = name,
                                ImageUrl = imageUrl,
                                ReleaseDate = releaseDate,
                                AlbumType = albumType,
                                Label = label
                            };
                            dbContext.Albums.Add(album);
                            await dbContext.SaveChangesAsync();
                        }
                        else
                        {
                            album.Name = name;
                            album.ImageUrl = imageUrl;
                            album.ReleaseDate = releaseDate;
                            album.AlbumType = albumType;
                            album.Label = label;
                        }

                        // Check if already saved
                        var existingSave = await dbContext.UserLikedAlbums
                            .FirstOrDefaultAsync(ula => ula.UserId == userId && ula.AlbumId == album.Id);

                        if (existingSave == null)
                        {
                            dbContext.UserLikedAlbums.Add(new UserLikedAlbum
                            {
                                UserId = userId,
                                AlbumId = album.Id,
                                LikedAt = addedAt
                            });
                        }
                    }

                    // Remove unsaved albums
                    var albumsToUnsave = existingSaves.Where(id => !spotifyAlbumIds.Contains(id)).ToList();
                    if (albumsToUnsave.Any())
                    {
                        var albumIds = await dbContext.Albums
                            .Where(a => albumsToUnsave.Contains(a.SpotifyId))
                            .Select(a => a.Id)
                            .ToListAsync();

                        var savesToRemove = await dbContext.UserLikedAlbums
                            .Where(ula => ula.UserId == userId && albumIds.Contains(ula.AlbumId))
                            .ToListAsync();

                        dbContext.UserLikedAlbums.RemoveRange(savesToRemove);
                    }

                    await dbContext.SaveChangesAsync();
                    logger.LogInformation("Completed syncing saved albums for user {UserId}", userId);
                }
                catch (Exception bgEx)
                {
                    _logger.LogError(bgEx, "[Background] Error syncing saved albums for user {UserId}", userId);
                }
            });

            return Accepted(new { message = "Saved albums sync started in background" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error starting saved albums sync");
            return StatusCode(500, new { error = "Internal server error", message = ex.Message });
        }
    }

    /// <summary>
    /// Checks if the user has saved a specific album.
    /// </summary>
    [HttpGet("{albumId}/saved")]
    public async Task<IActionResult> CheckIfSaved(string albumId)
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

            var response = await client.GetAsync($"https://api.spotify.com/v1/me/albums/contains?ids={albumId}");

            if (!response.IsSuccessStatusCode)
            {
                var error = await response.Content.ReadAsStringAsync();
                _logger.LogError("Spotify API error: {Error}", error);
                
                return StatusCode((int)response.StatusCode, new 
                { 
                    error = "Failed to check if album is saved on Spotify",
                    statusCode = (int)response.StatusCode,
                    spotifyError = error
                });
            }

            var content = await response.Content.ReadAsStringAsync();
            var isSavedArray = JsonSerializer.Deserialize<bool[]>(content);
            var isSaved = isSavedArray != null && isSavedArray.Length > 0 && isSavedArray[0];

            return Ok(new { isSaved });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error checking if album is saved");
            return StatusCode(500, new { error = "Internal server error" });
        }
    }

    /// <summary>
    /// Save an album to the user's Spotify library.
    /// </summary>
    [HttpPut("{albumId}/save")]
    public async Task<IActionResult> SaveAlbum(string albumId)
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

            var response = await client.PutAsync($"https://api.spotify.com/v1/me/albums?ids={albumId}", null);

            if (!response.IsSuccessStatusCode)
            {
                var error = await response.Content.ReadAsStringAsync();
                _logger.LogError("Spotify API error: {Error}", error);
                return StatusCode((int)response.StatusCode, new
                {
                    error = "Failed to save album on Spotify",
                    statusCode = (int)response.StatusCode,
                    spotifyError = error
                });
            }

            // Also update local database
            var album = await _dbContext.Albums.FirstOrDefaultAsync(a => a.SpotifyId == albumId);
            if (album != null)
            {
                var existingSave = await _dbContext.UserLikedAlbums
                    .FirstOrDefaultAsync(ula => ula.UserId == userId && ula.AlbumId == album.Id);

                if (existingSave == null)
                {
                    _dbContext.UserLikedAlbums.Add(new UserLikedAlbum
                    {
                        UserId = userId,
                        AlbumId = album.Id,
                        LikedAt = DateTime.UtcNow
                    });
                    await _dbContext.SaveChangesAsync();
                }
            }

            return Ok();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error saving album");
            return StatusCode(500, new { error = "Internal server error" });
        }
    }

    /// <summary>
    /// Remove an album from the user's Spotify library.
    /// </summary>
    [HttpDelete("{albumId}/save")]
    public async Task<IActionResult> UnsaveAlbum(string albumId)
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

            var response = await client.DeleteAsync($"https://api.spotify.com/v1/me/albums?ids={albumId}");

            if (!response.IsSuccessStatusCode)
            {
                var error = await response.Content.ReadAsStringAsync();
                _logger.LogError("Spotify API error: {Error}", error);
                return StatusCode((int)response.StatusCode, new
                {
                    error = "Failed to unsave album on Spotify",
                    statusCode = (int)response.StatusCode,
                    spotifyError = error
                });
            }

            // Also update local database
            var album = await _dbContext.Albums.FirstOrDefaultAsync(a => a.SpotifyId == albumId);
            if (album != null)
            {
                var existingSave = await _dbContext.UserLikedAlbums
                    .FirstOrDefaultAsync(ula => ula.UserId == userId && ula.AlbumId == album.Id);

                if (existingSave != null)
                {
                    _dbContext.UserLikedAlbums.Remove(existingSave);
                    await _dbContext.SaveChangesAsync();
                }
            }

            return Ok();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error unsaving album");
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
            if (accessToken == null) return Unauthorized(new { error = "Spotify token expired" });

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
}
