using System.Net.Http.Headers;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using PetalAPI.Data;
using PetalAPI.Models;

namespace PetalAPI.Services;

public interface ISpotifyTokenService
{
    Task<string> GetValidAccessTokenAsync(int userId);
    Task<string> ForceRefreshTokenAsync(int userId);
    Task RefreshTokenAsync(User user);
}

public class SpotifyTokenService : ISpotifyTokenService
{
    private readonly AppDbContext _context;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IConfiguration _configuration;
    private readonly ILogger<SpotifyTokenService> _logger;

    public SpotifyTokenService(
        AppDbContext context,
        IHttpClientFactory httpClientFactory,
        IConfiguration configuration,
        ILogger<SpotifyTokenService> logger)
    {
        _context = context;
        _httpClientFactory = httpClientFactory;
        _configuration = configuration;
        _logger = logger;
    }

    public async Task<string> GetValidAccessTokenAsync(int userId)
    {
        var user = await _context.Users.FindAsync(userId);
        
        if (user == null)
        {
            throw new InvalidOperationException($"User with ID {userId} not found");
        }

        if (string.IsNullOrEmpty(user.SpotifyAccessToken))
        {
            _logger.LogError("User {UserId} has no Spotify access token", userId);
            throw new InvalidOperationException("User has no Spotify access token. Please re-authenticate.");
        }

        // Check if token is expired or will expire in the next 5 minutes
        if (user.TokenExpiresAt <= DateTime.UtcNow.AddMinutes(5))
        {
            _logger.LogInformation("Token expired for user {UserId}. Attempting refresh...", userId);
            await RefreshTokenAsync(user);
        }

        if (string.IsNullOrEmpty(user.SpotifyAccessToken))
        {
            _logger.LogError("Access token is still null after refresh for user {UserId}", userId);
            throw new InvalidOperationException("Failed to obtain valid Spotify access token");
        }

        return user.SpotifyAccessToken;
    }

    public async Task<string> ForceRefreshTokenAsync(int userId)
    {
        var user = await _context.Users.FindAsync(userId);
        
        if (user == null)
        {
            throw new InvalidOperationException($"User with ID {userId} not found");
        }

        await RefreshTokenAsync(user);
        return user.SpotifyAccessToken;
    }

    public async Task RefreshTokenAsync(User user)
    {
        _logger.LogInformation("Refreshing Spotify token for user {UserId}", user.Id);

        var clientId = _configuration["Spotify:ClientId"];
        var clientSecret = _configuration["Spotify:ClientSecret"];

        var client = _httpClientFactory.CreateClient();
        
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
