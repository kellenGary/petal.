using PetalAPI.Models;

namespace PetalAPI.Services;

public interface IUserService
{
    Task<(User User, bool IsNewUser)> FindOrCreateUserAsync(string spotifyId, string displayName, string email, string profileImageUrl, string accessToken, string refreshToken, int expiresIn);
}
