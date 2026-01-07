using Microsoft.AspNetCore.Mvc;
using System.Net.Http.Headers;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using MFAPI.Data;
using MFAPI.Models;
using MFAPI.Services;

namespace MFAPI.Controllers;

[ApiController]
[Route("[controller]")]
public class AuthController : ControllerBase
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<AuthController> _logger;
    private readonly IConfiguration _configuration;
    private readonly AppDbContext _context;
    private readonly IJwtService _jwtService;

    public AuthController(
        IHttpClientFactory httpClientFactory,
        ILogger<AuthController> logger,
        IConfiguration configuration,
        AppDbContext context,
        IJwtService jwtService)
    {
        _httpClientFactory = httpClientFactory;
        _logger = logger;
        _configuration = configuration;
        _context = context;
        _jwtService = jwtService;
    }

    [HttpGet("callback")]
    public async Task<IActionResult> Callback([FromQuery] string code, [FromQuery] string state)
    {
        _logger.LogInformation("[API] Callback received - Code: {Code}, State: {State}", 
            code?.Substring(0, Math.Min(10, code?.Length ?? 0)) + "...", state);

        if (string.IsNullOrEmpty(code))
        {
            _logger.LogWarning("[API] No authorization code provided");
            return BadRequest(new { error = "Authorization code is required" });
        }

        try
        {
            var clientId = _configuration["Spotify:ClientId"];
            var clientSecret = _configuration["Spotify:ClientSecret"];
            var redirectUri = _configuration["Spotify:RedirectUri"];

            _logger.LogInformation("[API] Exchanging code for token - ClientId: {ClientId}, RedirectUri: {RedirectUri}",
                clientId, redirectUri);

            var client = _httpClientFactory.CreateClient();
            
            var authValue = Convert.ToBase64String(
                System.Text.Encoding.UTF8.GetBytes($"{clientId}:{clientSecret}"));
            client.DefaultRequestHeaders.Authorization = 
                new AuthenticationHeaderValue("Basic", authValue);

            var formData = new Dictionary<string, string>
            {
                { "grant_type", "authorization_code" },
                { "code", code },
                { "redirect_uri", redirectUri }
            };

            _logger.LogInformation("[API] Posting to Spotify token endpoint");
            var response = await client.PostAsync(
                "https://accounts.spotify.com/api/token",
                new FormUrlEncodedContent(formData));

            _logger.LogInformation("[API] Spotify token response status: {StatusCode}", response.StatusCode);

            if (!response.IsSuccessStatusCode)
            {
                var error = await response.Content.ReadAsStringAsync();
                _logger.LogError("[API] Token exchange failed: {Error}", error);
                return StatusCode((int)response.StatusCode, new { error = "Failed to exchange code for token", details = error });
            }

            var content = await response.Content.ReadAsStringAsync();
            _logger.LogInformation("[API] Spotify token response: {Content}", content);
            
            var tokenData = JsonSerializer.Deserialize<JsonElement>(content);
            var accessToken = tokenData.GetProperty("access_token").GetString()!;
            var refreshToken = tokenData.GetProperty("refresh_token").GetString()!;
            var expiresIn = tokenData.GetProperty("expires_in").GetInt32();
            
            _logger.LogInformation("[API] Successfully retrieved access token");

            // Get Spotify user profile
            var profileClient = _httpClientFactory.CreateClient();
            profileClient.DefaultRequestHeaders.Authorization = 
                new AuthenticationHeaderValue("Bearer", accessToken);
            
            var profileResponse = await profileClient.GetAsync("https://api.spotify.com/v1/me");
            
            if (!profileResponse.IsSuccessStatusCode)
            {
                _logger.LogError("[API] Failed to fetch Spotify profile");
                return StatusCode(500, new { error = "Failed to fetch user profile" });
            }
            
            var profileContent = await profileResponse.Content.ReadAsStringAsync();
            var profileData = JsonSerializer.Deserialize<JsonElement>(profileContent);
            
            var spotifyId = profileData.GetProperty("id").GetString()!;
            var displayName = profileData.TryGetProperty("display_name", out var name) 
                ? name.GetString() : null;
            var email = profileData.TryGetProperty("email", out var emailProp) 
                ? emailProp.GetString() : null;
            
            string? profileImageUrl = null;
            if (profileData.TryGetProperty("images", out var images) && 
                images.GetArrayLength() > 0)
            {
                profileImageUrl = images[0].GetProperty("url").GetString();
            }
            
            // Find or create user
            var user = await _context.Users
                .FirstOrDefaultAsync(u => u.SpotifyId == spotifyId);
            
            if (user == null)
            {
                user = new User
                {
                    SpotifyId = spotifyId,
                    DisplayName = displayName,
                    Email = email,
                    ProfileImageUrl = profileImageUrl,
                    SpotifyAccessToken = accessToken,
                    SpotifyRefreshToken = refreshToken,
                    TokenExpiresAt = DateTime.UtcNow.AddSeconds(expiresIn),
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };
                
                _context.Users.Add(user);
                _logger.LogInformation("[API] Created new user with Spotify ID: {SpotifyId}", spotifyId);
            }
            else
            {
                user.DisplayName = displayName;
                user.Email = email;
                user.ProfileImageUrl = profileImageUrl;
                user.SpotifyAccessToken = accessToken;
                user.SpotifyRefreshToken = refreshToken;
                user.TokenExpiresAt = DateTime.UtcNow.AddSeconds(expiresIn);
                user.UpdatedAt = DateTime.UtcNow;
                
                _logger.LogInformation("[API] Updated existing user with Spotify ID: {SpotifyId}", spotifyId);
            }
            
            await _context.SaveChangesAsync();
            
            // Generate JWT token
            var jwt = _jwtService.GenerateToken(user);
            
            return Ok(new
            {
                token = jwt,
                user = new
                {
                    id = user.Id,
                    spotifyId = user.SpotifyId,
                    displayName = user.DisplayName,
                    email = user.Email,
                    profileImageUrl = user.ProfileImageUrl
                }
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[API] Error during callback");
            return StatusCode(500, new { error = "Internal server error", details = ex.Message });
        }
    }
}