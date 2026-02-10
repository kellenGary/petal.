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
[Route("api/spotify/artists")]
[Authorize]
public class SpotifyArtistController : ControllerBase
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<SpotifyArtistController> _logger;
    private readonly ISpotifyTokenService _spotifyTokenService;
    private readonly AppDbContext _dbContext;
    private readonly IServiceScopeFactory _serviceScopeFactory;

    public SpotifyArtistController(
        IHttpClientFactory httpClientFactory,
        ILogger<SpotifyArtistController> logger,
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
    /// Retrieves artist details directly from Spotify.
    /// </summary>
    [HttpGet("{artistId}")]
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
            if (accessToken == null) return Unauthorized(new { error = "Spotify token expired" });

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

    // Note: GetArtistTopTracks was removed — Spotify API no longer supports GET /artists/{id}/top-tracks


    /// <summary>
    /// Retrieves an artist's albums directly from Spotify.
    /// </summary>
    [HttpGet("{artistId}/albums")]
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
            if (accessToken == null) return Unauthorized(new { error = "Spotify token expired" });

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

    /// <summary>
    /// Retrieves the user's followed artists from Spotify.
    /// </summary>
    [HttpGet("following")]
    public async Task<IActionResult> GetFollowedArtists()
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

            var response = await client.GetAsync("https://api.spotify.com/v1/me/following?type=artist&limit=50");

            if (!response.IsSuccessStatusCode)
            {
                var error = await response.Content.ReadAsStringAsync();
                _logger.LogError("Spotify API error: {Error}", error);
                
                return StatusCode((int)response.StatusCode, new 
                { 
                    error = "Failed to fetch followed artists from Spotify",
                    statusCode = (int)response.StatusCode,
                    spotifyError = error
                });
            }

            var content = await response.Content.ReadAsStringAsync();
            var followedArtists = JsonSerializer.Deserialize<JsonElement>(content);

            return Ok(followedArtists);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching followed artists");
            return StatusCode(500, new { error = "Internal server error" });
        }
    }

    /// <summary>
    /// Syncs the user's followed artists from Spotify to the database.
    /// </summary>
    [HttpPost("following/sync")]
    public async Task<IActionResult> SyncFollowedArtists()
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
                    var logger = scope.ServiceProvider.GetRequiredService<ILogger<SpotifyArtistController>>();

                    var client = httpClientFactory.CreateClient("Spotify");
                    client.DefaultRequestHeaders.Authorization = 
                        new AuthenticationHeaderValue("Bearer", accessToken);

                    var allArtists = new List<JsonElement>();
                    string? after = null;

                    do
                    {
                        var url = $"https://api.spotify.com/v1/me/following?type=artist&limit=50";
                        if (after != null) url += $"&after={after}";

                        var response = await client.GetAsync(url);
                        if (!response.IsSuccessStatusCode) break;

                        var content = await response.Content.ReadAsStringAsync();
                        var data = JsonSerializer.Deserialize<JsonElement>(content);

                        if (data.TryGetProperty("artists", out var artistsWrapper) &&
                            artistsWrapper.TryGetProperty("items", out var items))
                        {
                            foreach (var item in items.EnumerateArray())
                            {
                                allArtists.Add(item);
                            }

                            // Get cursor for next page
                            if (artistsWrapper.TryGetProperty("cursors", out var cursors) &&
                                cursors.TryGetProperty("after", out var afterCursor))
                            {
                                after = afterCursor.GetString();
                            }
                            else
                            {
                                after = null;
                            }
                        }
                        else
                        {
                            break;
                        }
                    } while (after != null);

                    logger.LogInformation("Syncing {Count} followed artists for user {UserId}", allArtists.Count, userId);

                    // Get existing followed artist IDs to detect unfollows
                    var existingFollows = await dbContext.UserFollowedArtists
                        .Where(ufa => ufa.UserId == userId)
                        .Select(ufa => ufa.Artist.SpotifyId)
                        .ToListAsync();

                    var spotifyArtistIds = new HashSet<string>();

                    foreach (var artistJson in allArtists)
                    {
                        var spotifyId = artistJson.GetProperty("id").GetString()!;
                        spotifyArtistIds.Add(spotifyId);

                        var name = artistJson.GetProperty("name").GetString()!;
                        var imageUrl = artistJson.TryGetProperty("images", out var images) && 
                                       images.GetArrayLength() > 0
                            ? images[0].GetProperty("url").GetString()
                            : null;
                        // Note: Spotify API no longer returns popularity — this will always be null
                        var popularity = artistJson.TryGetProperty("popularity", out var pop) 
                            ? pop.GetInt32() 
                            : (int?)null;
                        var genres = artistJson.TryGetProperty("genres", out var genresArr)
                            ? JsonSerializer.Serialize(genresArr)
                            : null;

                        // Upsert artist
                        var artist = await dbContext.Artists.FirstOrDefaultAsync(a => a.SpotifyId == spotifyId);
                        if (artist == null)
                        {
                            artist = new Artist
                            {
                                SpotifyId = spotifyId,
                                Name = name,
                                ImageUrl = imageUrl,
                                Popularity = popularity,
                                GenresJson = genres
                            };
                            dbContext.Artists.Add(artist);
                            await dbContext.SaveChangesAsync();
                        }
                        else
                        {
                            artist.Name = name;
                            artist.ImageUrl = imageUrl;
                            artist.Popularity = popularity;
                            artist.GenresJson = genres;
                        }

                        // Check if already following
                        var existingFollow = await dbContext.UserFollowedArtists
                            .FirstOrDefaultAsync(ufa => ufa.UserId == userId && ufa.ArtistId == artist.Id);

                        if (existingFollow == null)
                        {
                            dbContext.UserFollowedArtists.Add(new UserFollowedArtist
                            {
                                UserId = userId,
                                ArtistId = artist.Id,
                                FollowedAt = DateTime.UtcNow
                            });
                        }
                    }

                    // Remove unfollowed artists
                    var artistsToUnfollow = existingFollows.Where(id => !spotifyArtistIds.Contains(id)).ToList();
                    if (artistsToUnfollow.Any())
                    {
                        var artistIds = await dbContext.Artists
                            .Where(a => artistsToUnfollow.Contains(a.SpotifyId))
                            .Select(a => a.Id)
                            .ToListAsync();

                        var followsToRemove = await dbContext.UserFollowedArtists
                            .Where(ufa => ufa.UserId == userId && artistIds.Contains(ufa.ArtistId))
                            .ToListAsync();

                        dbContext.UserFollowedArtists.RemoveRange(followsToRemove);
                    }

                    await dbContext.SaveChangesAsync();
                    logger.LogInformation("Completed syncing followed artists for user {UserId}", userId);
                }
                catch (Exception bgEx)
                {
                    _logger.LogError(bgEx, "[Background] Error syncing followed artists for user {UserId}", userId);
                }
            });

            return Accepted(new { message = "Followed artists sync started in background" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error starting followed artists sync");
            return StatusCode(500, new { error = "Internal server error", message = ex.Message });
        }
    }

    /// <summary>
    /// Checks if the user is following a specific artist.
    /// </summary>
    [HttpGet("{artistId}/following")]
    public async Task<IActionResult> CheckIfFollowing(string artistId)
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

            var response = await client.GetAsync($"https://api.spotify.com/v1/me/following/contains?type=artist&ids={artistId}");

            if (!response.IsSuccessStatusCode)
            {
                var error = await response.Content.ReadAsStringAsync();
                _logger.LogError("Spotify API error: {Error}", error);
                
                return StatusCode((int)response.StatusCode, new 
                { 
                    error = "Failed to check if following artist on Spotify",
                    statusCode = (int)response.StatusCode,
                    spotifyError = error
                });
            }

            var content = await response.Content.ReadAsStringAsync();
            var isFollowingArray = JsonSerializer.Deserialize<bool[]>(content);
            var isFollowing = isFollowingArray != null && isFollowingArray.Length > 0 && isFollowingArray[0];

            return Ok(new { isFollowing });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error checking if following artist");
            return StatusCode(500, new { error = "Internal server error" });
        }
    }

    /// <summary>
    /// Follow an artist on Spotify.
    /// </summary>
    [HttpPut("{artistId}/follow")]
    public async Task<IActionResult> FollowArtist(string artistId)
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

            var response = await client.PutAsync($"https://api.spotify.com/v1/me/following?type=artist&ids={artistId}", null);

            if (!response.IsSuccessStatusCode)
            {
                var error = await response.Content.ReadAsStringAsync();
                _logger.LogError("Spotify API error: {Error}", error);
                return StatusCode((int)response.StatusCode, new
                {
                    error = "Failed to follow artist on Spotify",
                    statusCode = (int)response.StatusCode,
                    spotifyError = error
                });
            }

            // Also update local database
            var artist = await _dbContext.Artists.FirstOrDefaultAsync(a => a.SpotifyId == artistId);
            if (artist != null)
            {
                var existingFollow = await _dbContext.UserFollowedArtists
                    .FirstOrDefaultAsync(ufa => ufa.UserId == userId && ufa.ArtistId == artist.Id);

                if (existingFollow == null)
                {
                    _dbContext.UserFollowedArtists.Add(new UserFollowedArtist
                    {
                        UserId = userId,
                        ArtistId = artist.Id,
                        FollowedAt = DateTime.UtcNow
                    });
                    await _dbContext.SaveChangesAsync();
                }
            }

            return Ok();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error following artist");
            return StatusCode(500, new { error = "Internal server error" });
        }
    }

    /// <summary>
    /// Unfollow an artist on Spotify.
    /// </summary>
    [HttpDelete("{artistId}/follow")]
    public async Task<IActionResult> UnfollowArtist(string artistId)
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

            var response = await client.DeleteAsync($"https://api.spotify.com/v1/me/following?type=artist&ids={artistId}");

            if (!response.IsSuccessStatusCode)
            {
                var error = await response.Content.ReadAsStringAsync();
                _logger.LogError("Spotify API error: {Error}", error);
                return StatusCode((int)response.StatusCode, new
                {
                    error = "Failed to unfollow artist on Spotify",
                    statusCode = (int)response.StatusCode,
                    spotifyError = error
                });
            }

            // Also update local database
            var artist = await _dbContext.Artists.FirstOrDefaultAsync(a => a.SpotifyId == artistId);
            if (artist != null)
            {
                var existingFollow = await _dbContext.UserFollowedArtists
                    .FirstOrDefaultAsync(ufa => ufa.UserId == userId && ufa.ArtistId == artist.Id);

                if (existingFollow != null)
                {
                    _dbContext.UserFollowedArtists.Remove(existingFollow);
                    await _dbContext.SaveChangesAsync();
                }
            }

            return Ok();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error unfollowing artist");
            return StatusCode(500, new { error = "Internal server error" });
        }
    }
}
