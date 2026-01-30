using System.Net.Http.Headers;
using System.Text.Json;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace PetalAPI.Services;

public class SpotifyAuthService : ISpotifyAuthService
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IConfiguration _configuration;
    private readonly ILogger<SpotifyAuthService> _logger;

    public SpotifyAuthService(
        IHttpClientFactory httpClientFactory,
        IConfiguration configuration,
        ILogger<SpotifyAuthService> logger)
    {
        _httpClientFactory = httpClientFactory;
        _configuration = configuration;
        _logger = logger;
    }

    public async Task<(string AccessToken, string RefreshToken, int ExpiresIn)> ExchangeCodeForTokenAsync(string code, string? redirectUri)
    {
        if (string.IsNullOrEmpty(code))
        {
            throw new ArgumentException("Authorization code is required", nameof(code));
        }

        var clientId = _configuration["Spotify:ClientId"];
        var clientSecret = _configuration["Spotify:ClientSecret"];
        // Allow overriding redirectUri via parameter, or use config as fallback/default
        var configuredRedirectUri = _configuration["Spotify:RedirectUri"];
        var finalRedirectUri = !string.IsNullOrEmpty(redirectUri) ? redirectUri : configuredRedirectUri;

        _logger.LogInformation("[Service] Exchanging code for token - ClientId: {ClientId}, RedirectUri: {RedirectUri}", clientId, finalRedirectUri);

        var client = _httpClientFactory.CreateClient("Spotify");
        var authValue = Convert.ToBase64String(System.Text.Encoding.UTF8.GetBytes($"{clientId}:{clientSecret}"));
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Basic", authValue);

        var formData = new Dictionary<string, string?>
        {
            { "grant_type", "authorization_code" },
            { "code", code },
            { "redirect_uri", finalRedirectUri }
        };

        var response = await client.PostAsync("https://accounts.spotify.com/api/token", new FormUrlEncodedContent(formData));

        if (!response.IsSuccessStatusCode)
        {
            var error = await response.Content.ReadAsStringAsync();
            _logger.LogError("[Service] Token exchange failed: {Error}", error);
            throw new HttpRequestException($"Failed to exchange code for token: {error}");
        }

        var content = await response.Content.ReadAsStringAsync();
        var tokenData = JsonSerializer.Deserialize<JsonElement>(content);
        
        var accessToken = tokenData.GetProperty("access_token").GetString() ?? throw new InvalidOperationException("Access token missing in response");
        var refreshToken = tokenData.GetProperty("refresh_token").GetString() ?? throw new InvalidOperationException("Refresh token missing in response");
        var expiresIn = tokenData.GetProperty("expires_in").GetInt32();

        return (accessToken, refreshToken, expiresIn);
    }

    public async Task<(string SpotifyId, string DisplayName, string Email, string ProfileImageUrl)> GetSpotifyProfileAsync(string accessToken)
    {
        var client = _httpClientFactory.CreateClient("Spotify");
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);

        var response = await client.GetAsync("https://api.spotify.com/v1/me");

        if (!response.IsSuccessStatusCode)
        {
            var error = await response.Content.ReadAsStringAsync();
            _logger.LogError("[Service] Failed to fetch Spotify profile. Status: {StatusCode}, Response: {Error}", response.StatusCode, error);
            throw new HttpRequestException($"Failed to fetch user profile: {error}");
        }

        var content = await response.Content.ReadAsStringAsync();
        var profileData = JsonSerializer.Deserialize<JsonElement>(content);

        var spotifyId = profileData.GetProperty("id").GetString() ?? throw new InvalidOperationException("Spotify ID missing in profile");
        
        var displayName = profileData.TryGetProperty("display_name", out var name) ? name.GetString() : null;
        var email = profileData.TryGetProperty("email", out var emailProp) ? emailProp.GetString() : null;
        
        string? profileImageUrl = null;
        if (profileData.TryGetProperty("images", out var images) && images.GetArrayLength() > 0)
        {
            profileImageUrl = images[0].GetProperty("url").GetString();
        }

        return (spotifyId, displayName ?? string.Empty, email ?? string.Empty, profileImageUrl ?? string.Empty);
    }
}
