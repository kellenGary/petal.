using PetalAPI.Models;

namespace PetalAPI.Services;

public interface ISpotifyAuthService
{
    Task<(string AccessToken, string RefreshToken, int ExpiresIn)> ExchangeCodeForTokenAsync(string code, string redirectUri);
    Task<(string SpotifyId, string DisplayName, string Email, string ProfileImageUrl)> GetSpotifyProfileAsync(string accessToken);
}
