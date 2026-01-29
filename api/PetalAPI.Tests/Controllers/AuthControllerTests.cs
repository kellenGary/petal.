using Xunit;
using Moq;
using PetalAPI.Controllers;
using PetalAPI.Services;
using PetalAPI.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;

namespace PetalAPI.Tests.Controllers;

public class AuthControllerTests
{
    private readonly Mock<ILogger<AuthController>> _mockLogger;
    private readonly Mock<IJwtService> _mockJwtService;
    private readonly Mock<ISpotifyAuthService> _mockSpotifyAuthService;
    private readonly Mock<IUserService> _mockUserService;
    private readonly AuthController _controller;

    public AuthControllerTests()
    {
        _mockLogger = new Mock<ILogger<AuthController>>();
        _mockJwtService = new Mock<IJwtService>();
        _mockSpotifyAuthService = new Mock<ISpotifyAuthService>();
        _mockUserService = new Mock<IUserService>();

        _controller = new AuthController(
            _mockLogger.Object,
            _mockJwtService.Object,
            _mockSpotifyAuthService.Object,
            _mockUserService.Object
        );
    }

    [Fact]
    public async Task Callback_ShouldReturnOk_WhenAuthIsSuccessful()
    {
        // Arrange
        string code = "valid-code";
        string state = "valid-state";
        string accessToken = "access-token";
        string refreshToken = "refresh-token";
        int expiresIn = 3600;
        string spotifyId = "spotify-id";
        string displayName = "Display Name";
        string email = "test@example.com";
        string profileImageUrl = "http://image.url";
        var user = new User { Id = 1, SpotifyId = spotifyId, DisplayName = displayName };
        string jwtToken = "jwt-token";

        _mockSpotifyAuthService
            .Setup(s => s.ExchangeCodeForTokenAsync(code, null))
            .ReturnsAsync((accessToken, refreshToken, expiresIn));

        _mockSpotifyAuthService
            .Setup(s => s.GetSpotifyProfileAsync(accessToken))
            .ReturnsAsync((spotifyId, displayName, email, profileImageUrl));

        _mockUserService
            .Setup(s => s.FindOrCreateUserAsync(spotifyId, displayName, email, profileImageUrl, accessToken, refreshToken, expiresIn))
            .ReturnsAsync((user, false));

        _mockJwtService
            .Setup(s => s.GenerateToken(user))
            .Returns(jwtToken);

        // Act
        var result = await _controller.Callback(code, state);

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result);
        Assert.NotNull(okResult.Value);
    }

    [Fact]
    public async Task Callback_ShouldReturnBadRequest_WhenCodeIsMissing()
    {
        // Act
        var result = await _controller.Callback(null, "state");

        // Assert
        var badRequestResult = Assert.IsType<BadRequestObjectResult>(result);
    }
}
