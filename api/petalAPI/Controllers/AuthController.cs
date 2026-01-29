using Microsoft.AspNetCore.Mvc;
using PetalAPI.Services;

namespace PetalAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly ILogger<AuthController> _logger;
    private readonly IJwtService _jwtService;
    private readonly ISpotifyAuthService _spotifyAuthService;
    private readonly IUserService _userService;

    public AuthController(
        ILogger<AuthController> logger,
        IJwtService jwtService,
        ISpotifyAuthService spotifyAuthService,
        IUserService userService)
    {
        _logger = logger;
        _jwtService = jwtService;
        _spotifyAuthService = spotifyAuthService;
        _userService = userService;
    }

    /// <summary>
    /// Handles the Spotify OAuth callback to exchange authorization code for tokens.
    /// </summary>
    /// <param name="code">The authorization code returned by Spotify.</param>
    /// <param name="state">The state parameter for preventing CSRF attacks.</param>
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
            // 1. Exchange code for Spotify tokens
            var (accessToken, refreshToken, expiresIn) = await _spotifyAuthService.ExchangeCodeForTokenAsync(code, null);
            _logger.LogInformation("[API] Successfully retrieved access token");

            // 2. Get Spotify user profile
            var (spotifyId, displayName, email, profileImageUrl) = await _spotifyAuthService.GetSpotifyProfileAsync(accessToken);
            _logger.LogInformation("[API] Retrieved Spotify profile for {SpotifyId}", spotifyId);
            
            // 3. Find or create user
            var (user, isNewUser) = await _userService.FindOrCreateUserAsync(
                spotifyId, displayName, email, profileImageUrl, 
                accessToken, refreshToken, expiresIn);
            _logger.LogInformation("[API] User found/created: {UserId}", user.Id);
            
            // 4. Generate JWT token
            var jwt = _jwtService.GenerateToken(user);
            _logger.LogInformation("[API] JWT generated for user {UserId}", user.Id);
            
            return Ok(new
            {
                token = jwt,
                isNewUser = isNewUser,
                user = new
                {
                    id = user.Id,
                    spotifyId = user.SpotifyId,
                    displayName = user.DisplayName,
                    handle = user.Handle,
                    bio = user.Bio,
                    email = user.Email,
                    profileImageUrl = user.ProfileImageUrl,
                    hasCompletedProfile = user.HasCompletedProfile
                }
            });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
        catch (HttpRequestException ex)
        {
             _logger.LogError(ex, "[API] External service error during callback");
            return StatusCode(502, new { error = "External service error", details = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[API] Error during callback");
            return StatusCode(500, new { error = "Internal server error", details = ex.Message });
        }
    }
}