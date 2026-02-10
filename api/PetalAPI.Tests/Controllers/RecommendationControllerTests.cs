using Xunit;
using Moq;
using Microsoft.EntityFrameworkCore;
using PetalAPI.Controllers;
using PetalAPI.Data;
using PetalAPI.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using System.Security.Claims;
using System.Text.Json;

namespace PetalAPI.Tests.Controllers
{
    public class RecommendationControllerTests
    {
        private readonly Mock<ILogger<RecommendationController>> _mockLogger;
        private readonly DbContextOptions<AppDbContext> _dbContextOptions;

        public RecommendationControllerTests()
        {
            _mockLogger = new Mock<ILogger<RecommendationController>>();
            
            _dbContextOptions = new DbContextOptionsBuilder<AppDbContext>()
                .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                .Options;
        }

        private AppDbContext CreateContext()
        {
            return new AppDbContext(_dbContextOptions);
        }

        private RecommendationController CreateController(AppDbContext context)
        {
            var controller = new RecommendationController(context, _mockLogger.Object);
            
            // Mock HttpContext for User Claims (UserId = 1)
            var user = new ClaimsPrincipal(new ClaimsIdentity(new Claim[]
            {
                new Claim(ClaimTypes.NameIdentifier, "1"),
            }, "mock"));

            controller.ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext { User = user }
            };

            return controller;
        }

        [Fact]
        public async Task GetForYouRecommendations_ShouldRecommendArtistAffinity()
        {
            // Arrange
            using var context = CreateContext();
            
            // 1. Create User
            var user = new User { Id = 1, SpotifyId = "u1", DisplayName = "User 1" };
            context.Users.Add(user);

            // 2. Create Artists
            var artistRadiohead = new Artist { Id = 10, Name = "Radiohead", SpotifyId = "art1", GenresJson = "[\"rock\"]" };
            var artistColdplay = new Artist { Id = 11, Name = "Coldplay", SpotifyId = "art2", GenresJson = "[\"pop\"]" };
            context.Artists.AddRange(artistRadiohead, artistColdplay);

            // 3. Create Tracks
            // Track 1: By Radiohead (Listened to)
            var track1 = new Track { Id = 100, Name = "Creep", SpotifyId = "t1" };
            
            // Track 2: By Radiohead (NOT Listened to - SHOULD RECOMMEND)
            var track2 = new Track { Id = 101, Name = "Karma Police", SpotifyId = "t2" };
            
            // Track 3: By Coldplay (Random - Lower score)
            var track3 = new Track { Id = 102, Name = "Yellow", SpotifyId = "t3" };

            context.Tracks.AddRange(track1, track2, track3);

            // Link tracks to artists
            context.TrackArtists.Add(new TrackArtist { TrackId = 100, ArtistId = 10 });
            context.TrackArtists.Add(new TrackArtist { TrackId = 101, ArtistId = 10 });
            context.TrackArtists.Add(new TrackArtist { TrackId = 102, ArtistId = 11 });

            // 4. Create Listening History (User listens to Track 1 / Radiohead)
            context.ListeningHistory.Add(new ListeningHistory 
            { 
                UserId = 1, 
                TrackId = 100, 
                PlayedAt = DateTime.UtcNow.AddDays(-1),
                MsPlayed = 30000 
            });

            await context.SaveChangesAsync();

            var controller = CreateController(context);

            // Act
            var result = await controller.GetForYouRecommendations(5);

            // Assert
            var okResult = Assert.IsType<OkObjectResult>(result);
            var response = Assert.IsType<JsonElement>(JsonSerializer.SerializeToElement(okResult.Value));
            
            // We expect "Karma Police" to be recommended because User listens to Radiohead
            // But "Creep" should be excluded because it was already listened to.
            
            // Note: Since result is anonymous type, we inspect via reflection or dynamic if needed, 
            // but here we used JsonSerializer to check properties easily.
            // Actually, we can use dynamic or reflection.
            
            // Let's use dynamic to access "recommendations" property
            dynamic data = okResult.Value!;
            var recommendations = (List<RecommendationDto>)data.GetType().GetProperty("recommendations").GetValue(data, null);

            Assert.Contains(recommendations, r => r.Name == "Karma Police");
            Assert.DoesNotContain(recommendations, r => r.Name == "Creep"); // Previously listened
            
            // Verify reason
            var rec = recommendations.First(r => r.Name == "Karma Police");
            Assert.Contains("Radiohead", rec.Reason);
            Assert.Equal("artist", rec.ReasonType);
        }

        [Fact]
        public async Task DismissRecommendation_ShouldExcludeFromFutureRecommendations()
        {
            // Arrange
            using var context = CreateContext();
            
            // User & Artist
            var user = new User { Id = 1, SpotifyId = "u1" };
            var artist = new Artist { Id = 10, Name = "Radiohead", SpotifyId = "art1" };
            context.Users.Add(user);
            context.Artists.Add(artist);

            // Track to be dismissed
            var track = new Track { Id = 100, Name = "Pyramid Song", SpotifyId = "t1" };
            context.Tracks.Add(track);
            context.TrackArtists.Add(new TrackArtist { TrackId = 100, ArtistId = 10 });

            // History to make it recommendable
            var previousTrack = new Track { Id = 99, Name = "Creep", SpotifyId = "t99" };
            context.Tracks.Add(previousTrack);
            context.TrackArtists.Add(new TrackArtist { TrackId = 99, ArtistId = 10 });
            context.ListeningHistory.Add(new ListeningHistory { UserId = 1, TrackId = 99, PlayedAt = DateTime.UtcNow });

            await context.SaveChangesAsync();

            var controller = CreateController(context);

            // Act 1: Dismiss the track
            await controller.DismissRecommendation(new DismissRequest { TrackId = 100 });

            // Act 2: Get recommendations
            var result = await controller.GetForYouRecommendations(5);

            // Assert
            var okResult = Assert.IsType<OkObjectResult>(result);
            dynamic data = okResult.Value!;
            var recommendations = (List<RecommendationDto>)data.GetType().GetProperty("recommendations").GetValue(data, null);

            Assert.DoesNotContain(recommendations, r => r.Name == "Pyramid Song");
        }
    }
}
