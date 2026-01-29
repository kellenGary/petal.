using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using PetalAPI.Data;
using PetalAPI.Models;

namespace PetalAPI.Services;

public class UserService : IUserService
{
    private readonly AppDbContext _context;
    private readonly ILogger<UserService> _logger;
    private readonly IListeningHistoryService _listeningHistoryService;
    private readonly IServiceScopeFactory _scopeFactory;

    public UserService(
        AppDbContext context,
        ILogger<UserService> logger,
        IListeningHistoryService listeningHistoryService,
        IServiceScopeFactory scopeFactory)
    {
        _context = context;
        _logger = logger;
        _listeningHistoryService = listeningHistoryService;
        _scopeFactory = scopeFactory;
    }

    public async Task<(User User, bool IsNewUser)> FindOrCreateUserAsync(
        string spotifyId, 
        string displayName, 
        string email, 
        string profileImageUrl, 
        string accessToken, 
        string refreshToken, 
        int expiresIn)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.SpotifyId == spotifyId);
        var isNewUser = false;

        if (user == null)
        {
            user = new User
            {
                SpotifyId = spotifyId,
                DisplayName = displayName,
                Handle = !string.IsNullOrEmpty(displayName) ? displayName.Replace(" ", string.Empty).ToLowerInvariant() : null,
                Bio = string.Empty,
                Email = email,
                ProfileImageUrl = profileImageUrl,
                HasCompletedProfile = false,
                SpotifyAccessToken = accessToken,
                SpotifyRefreshToken = refreshToken,
                TokenExpiresAt = DateTime.UtcNow.AddSeconds(expiresIn),
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            isNewUser = true;
            _context.Users.Add(user);
            _logger.LogInformation("[Service] Creating new user with Spotify ID: {SpotifyId}", spotifyId);
        }
        else
        {
            user.DisplayName = displayName;
            if (string.IsNullOrWhiteSpace(user.Handle) && !string.IsNullOrEmpty(displayName))
            {
                user.Handle = displayName.Replace(" ", string.Empty).ToLowerInvariant();
            }
            user.Email = email;
            user.ProfileImageUrl = profileImageUrl;
            user.SpotifyAccessToken = accessToken;
            user.SpotifyRefreshToken = refreshToken;
            user.TokenExpiresAt = DateTime.UtcNow.AddSeconds(expiresIn);
            user.UpdatedAt = DateTime.UtcNow;

            _logger.LogInformation("[Service] Updated existing user with Spotify ID: {SpotifyId}", spotifyId);
        }

        await _context.SaveChangesAsync();

        // Offload sync to background thread so we don't block login
        var userId = user.Id;
        var token = accessToken; // capture for closure
        var isNew = isNewUser;
        
        _ = Task.Run(async () =>
        {
            try
            {
                using (var scope = _scopeFactory.CreateScope())
                {
                    var scopedHistoryService = scope.ServiceProvider.GetRequiredService<IListeningHistoryService>();
                    var logger = scope.ServiceProvider.GetRequiredService<ILogger<UserService>>();
                    
                    if (isNew)
                    {
                        logger.LogInformation("[Service] Starting initial listening history sync for new user {UserId} (Background)", userId);
                        await scopedHistoryService.SyncInitialListeningHistoryAsync(userId, token);
                    }
                    else
                    {
                        logger.LogInformation("[Service] Starting recently played sync for returning user {UserId} (Background)", userId);
                        await scopedHistoryService.SyncRecentlyPlayedAsync(userId, token);
                    }
                }
            }
            catch (Exception syncEx)
            {
                // Create a focused logger since we can't reliably use the class one if scope issues arise, 
                // though usually class logger is singleton or handled by DI correctly.
                // But here we are in a background task, best to be safe or just use _logger if it is singleton (usually is).
                _logger.LogError(syncEx, "[Service] Error syncing Spotify data for user {UserId} in background", userId);
            }
        });

        return (user, isNewUser);
    }
}
