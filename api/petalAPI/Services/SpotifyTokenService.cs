using System.Collections.Concurrent;
using System.Net.Http.Headers;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using PetalAPI.Data;
using PetalAPI.Models;
using Microsoft.Extensions.Caching.Memory;

namespace PetalAPI.Services;

public interface ISpotifyTokenService
{
    Task<string?> GetValidAccessTokenAsync(int userId, bool autoRefresh = true);
    Task<string> ForceRefreshTokenAsync(int userId);
    Task RefreshTokenAsync(User user);
}

public class SpotifyTokenService : ISpotifyTokenService
{
    private readonly AppDbContext _context;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IConfiguration _configuration;
    private readonly ILogger<SpotifyTokenService> _logger;
    private readonly IMemoryCache _cache;

    public SpotifyTokenService(
        AppDbContext context,
        IHttpClientFactory httpClientFactory,
        IConfiguration configuration,
        ILogger<SpotifyTokenService> logger,
        IMemoryCache cache)
    {
        _context = context;
        _httpClientFactory = httpClientFactory;
        _configuration = configuration;
        _logger = logger;
        _cache = cache;
    }

    private static readonly ConcurrentDictionary<int, SemaphoreSlim> _userLocks = new();

    public async Task<string?> GetValidAccessTokenAsync(int userId, bool autoRefresh = true)
    {
        // 0. Check In-Memory Cache first (Super fast path - no DB)
        var cacheKey = $"spotify_token_{userId}";
        if (_cache.TryGetValue(cacheKey, out string? cachedToken))
        {
            return cachedToken;
        }

        // 1. Initial check (fast path)
        var user = await _context.Users.FindAsync(userId);
        if (user == null) throw new InvalidOperationException($"User with ID {userId} not found");

        // Cache existing valid token found in key
        if (!string.IsNullOrEmpty(user.SpotifyAccessToken) && user.TokenExpiresAt > DateTime.UtcNow.AddMinutes(5))
        {
            // Cache it for the remaining duration
            var remaining = user.TokenExpiresAt - DateTime.UtcNow;
            if (remaining.TotalMinutes > 5) 
            {
               _cache.Set(cacheKey, user.SpotifyAccessToken, remaining.Subtract(TimeSpan.FromMinutes(4)));
            }
            return user.SpotifyAccessToken;
        }

        if (string.IsNullOrEmpty(user.SpotifyAccessToken))
        {
            if (!autoRefresh) return null;
            _logger.LogError("User {UserId} has no Spotify access token", userId);
            throw new InvalidOperationException("User has no Spotify access token. Please re-authenticate.");
        }

        if (!autoRefresh)
        {
            _logger.LogWarning("Token for user {UserId} is expired and autoRefresh is false. Returning null.", userId);
            return null;
        }

        // 2. Lock and Double-Check
        var userLock = _userLocks.GetOrAdd(userId, _ => new SemaphoreSlim(1, 1));
        
        var sw = System.Diagnostics.Stopwatch.StartNew();
        // Log if waiting for lock
        if (userLock.CurrentCount == 0)
        {
             _logger.LogWarning("Waiting for lock for user {UserId}...", userId);
        }
        
        await userLock.WaitAsync();
        sw.Stop();
        
        if (sw.ElapsedMilliseconds > 100)
        {
             _logger.LogWarning("Acquired lock for user {UserId} after {Elapsed}ms", userId, sw.ElapsedMilliseconds);
        }

        try
        {
            // Determine if valid in cache again (double check)
            if (_cache.TryGetValue(cacheKey, out cachedToken))
            {
                return cachedToken;
            }

            // Detach the previous entity tracked by EF to avoid conflicts when reloading
            _context.Entry(user).State = EntityState.Detached;

            // RELOAD user from DB to get latest token data committed by other threads
            user = await _context.Users.FindAsync(userId);
            if (user == null) throw new InvalidOperationException($"User {userId} not found during refresh");

            // Double-check: Did another thread already refresh it?
            if (user.TokenExpiresAt > DateTime.UtcNow.AddMinutes(5))
            {
                var remaining = user.TokenExpiresAt - DateTime.UtcNow;
                _cache.Set(cacheKey, user.SpotifyAccessToken, remaining.Subtract(TimeSpan.FromMinutes(4)));
                return user.SpotifyAccessToken;
            }

            _logger.LogInformation("Token expired for user {UserId}. Attempting refresh...", userId);
            await RefreshTokenAsync(user);

            // RefreshTokenAsync updates the DB and the passed user object
            // Let's cache the new token
            // TokenExpiresAt is non-nullable, so checking > MinValue is a sanity check
            if (user.TokenExpiresAt > DateTime.MinValue)
            {
                 var remaining = user.TokenExpiresAt - DateTime.UtcNow;
                 _cache.Set(cacheKey, user.SpotifyAccessToken, remaining.Subtract(TimeSpan.FromMinutes(4)));
            }

            return user.SpotifyAccessToken;
        }
        finally
        {
            userLock.Release();
        }
    }

    public async Task<string> ForceRefreshTokenAsync(int userId)
    {
        var user = await _context.Users.FindAsync(userId);
        
        if (user == null)
        {
            throw new InvalidOperationException($"User with ID {userId} not found");
        }

        await RefreshTokenAsync(user);

        // Update cache
        var cacheKey = $"spotify_token_{userId}";
        if (user.TokenExpiresAt > DateTime.MinValue)
        {
             var remaining = user.TokenExpiresAt - DateTime.UtcNow;
             _cache.Set(cacheKey, user.SpotifyAccessToken, remaining.Subtract(TimeSpan.FromMinutes(4)));
        }

        return user.SpotifyAccessToken;
    }

    public async Task RefreshTokenAsync(User user)
    {
        _logger.LogInformation("Refreshing Spotify token for user {UserId}", user.Id);

        var clientId = _configuration["Spotify:ClientId"];
        var clientSecret = _configuration["Spotify:ClientSecret"];

        var client = _httpClientFactory.CreateClient("Spotify");
        
        var authValue = Convert.ToBase64String(
            System.Text.Encoding.UTF8.GetBytes($"{clientId}:{clientSecret}"));
        client.DefaultRequestHeaders.Authorization = 
            new AuthenticationHeaderValue("Basic", authValue);

        var formData = new Dictionary<string, string>
        {
            { "grant_type", "refresh_token" },
            { "refresh_token", user.SpotifyRefreshToken }
        };

        var response = await client.PostAsync(
            "https://accounts.spotify.com/api/token",
            new FormUrlEncodedContent(formData));

        if (!response.IsSuccessStatusCode)
        {
            var error = await response.Content.ReadAsStringAsync();
            _logger.LogError("Failed to refresh token: {Error}", error);
            throw new Exception($"Failed to refresh Spotify token: {error}");
        }

        var content = await response.Content.ReadAsStringAsync();
        var tokenData = JsonSerializer.Deserialize<JsonElement>(content);

        user.SpotifyAccessToken = tokenData.GetProperty("access_token").GetString()!;
        
        // Spotify may return a new refresh token
        if (tokenData.TryGetProperty("refresh_token", out var refreshToken))
        {
            user.SpotifyRefreshToken = refreshToken.GetString()!;
        }

        var expiresIn = tokenData.GetProperty("expires_in").GetInt32();
        user.TokenExpiresAt = DateTime.UtcNow.AddSeconds(expiresIn);
        user.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        
        _logger.LogInformation("Successfully refreshed token for user {UserId}", user.Id);
    }
}
