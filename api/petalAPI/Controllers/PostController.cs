using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using PetalAPI.Data;
using PetalAPI.Models;
using PetalAPI.Services;

namespace PetalAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class PostController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly PostService _postService;
    private readonly ILogger<PostController> _logger;

    public PostController(AppDbContext context, PostService postService, ILogger<PostController> logger)
    {
        _context = context;
        _postService = postService;
        _logger = logger;
    }

    private int? GetCurrentUserId()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
        if (userIdClaim == null || !int.TryParse(userIdClaim.Value, out var userId))
        {
            return null;
        }
        return userId;
    }

    /// <summary>
    /// Share a track to the feed
    /// </summary>
    [HttpPost("share/track")]
    public async Task<IActionResult> ShareTrack([FromBody] ShareTrackRequest request)
    {
        var userId = GetCurrentUserId();
        if (userId == null) return Unauthorized(new { error = "Invalid token" });

        // Find the track by Spotify ID or internal ID
        Track? track = null;
        if (request.TrackId.HasValue)
        {
            track = await _context.Tracks.FindAsync(request.TrackId.Value);
        }
        else if (!string.IsNullOrEmpty(request.SpotifyId))
        {
            track = await _context.Tracks.FirstOrDefaultAsync(t => t.SpotifyId == request.SpotifyId);
        }

        if (track == null)
        {
            return NotFound(new { error = "Track not found" });
        }

        var post = await _postService.CreateSharedTrackPost(
            userId.Value, 
            track.Id, 
            request.Caption,
            request.Visibility);

        return Ok(new { message = "Track shared successfully", postId = post.Id });
    }

    /// <summary>
    /// Share an album to the feed
    /// </summary>
    [HttpPost("share/album")]
    public async Task<IActionResult> ShareAlbum([FromBody] ShareAlbumRequest request)
    {
        var userId = GetCurrentUserId();
        if (userId == null) return Unauthorized(new { error = "Invalid token" });

        Album? album = null;
        if (request.AlbumId.HasValue)
        {
            album = await _context.Albums.FindAsync(request.AlbumId.Value);
        }
        else if (!string.IsNullOrEmpty(request.SpotifyId))
        {
            album = await _context.Albums.FirstOrDefaultAsync(a => a.SpotifyId == request.SpotifyId);
        }

        if (album == null)
        {
            return NotFound(new { error = "Album not found" });
        }

        var post = await _postService.CreateSharedAlbumPost(
            userId.Value, 
            album.Id, 
            request.Caption,
            request.Visibility);

        return Ok(new { message = "Album shared successfully", postId = post.Id });
    }

    /// <summary>
    /// Share a playlist to the feed
    /// </summary>
    [HttpPost("share/playlist")]
    public async Task<IActionResult> SharePlaylist([FromBody] SharePlaylistRequest request)
    {
        var userId = GetCurrentUserId();
        if (userId == null) return Unauthorized(new { error = "Invalid token" });

        Playlist? playlist = null;
        if (request.PlaylistId.HasValue)
        {
            playlist = await _context.Playlists.FindAsync(request.PlaylistId.Value);
        }
        else if (!string.IsNullOrEmpty(request.SpotifyId))
        {
            playlist = await _context.Playlists.FirstOrDefaultAsync(p => p.SpotifyId == request.SpotifyId);
        }

        if (playlist == null)
        {
            return NotFound(new { error = "Playlist not found" });
        }

        var post = await _postService.CreateSharedPlaylistPost(
            userId.Value, 
            playlist.Id, 
            request.Caption,
            request.Visibility);

        return Ok(new { message = "Playlist shared successfully", postId = post.Id });
    }

    /// <summary>
    /// Share an artist to the feed
    /// </summary>
    [HttpPost("share/artist")]
    public async Task<IActionResult> ShareArtist([FromBody] ShareArtistRequest request)
    {
        var userId = GetCurrentUserId();
        if (userId == null) return Unauthorized(new { error = "Invalid token" });

        Artist? artist = null;
        if (request.ArtistId.HasValue)
        {
            artist = await _context.Artists.FindAsync(request.ArtistId.Value);
        }
        else if (!string.IsNullOrEmpty(request.SpotifyId))
        {
            artist = await _context.Artists.FirstOrDefaultAsync(a => a.SpotifyId == request.SpotifyId);
        }

        if (artist == null)
        {
            return NotFound(new { error = "Artist not found" });
        }

        var post = await _postService.CreateSharedArtistPost(
            userId.Value, 
            artist.Id, 
            request.Caption,
            request.Visibility);

        return Ok(new { message = "Artist shared successfully", postId = post.Id });
    }

    /// <summary>
    /// Create a listening session post from recent listening history
    /// </summary>
    [HttpPost("listening-session")]
    public async Task<IActionResult> CreateListeningSession([FromBody] CreateListeningSessionRequest request)
    {
        var userId = GetCurrentUserId();
        if (userId == null) return Unauthorized(new { error = "Invalid token" });

        if (request.Tracks == null || request.Tracks.Count == 0)
        {
            return BadRequest(new { error = "At least one track is required" });
        }

        var post = await _postService.CreateListeningSessionPost(
            userId.Value,
            request.Tracks,
            request.Visibility);

        if (post == null)
        {
            return BadRequest(new { error = "Failed to create listening session" });
        }

        return Ok(new { message = "Listening session created", postId = post.Id });
    }

    /// <summary>
    /// Delete a post (only owner can delete)
    /// </summary>
    [HttpDelete("{postId}")]
    public async Task<IActionResult> DeletePost(int postId)
    {
        var userId = GetCurrentUserId();
        if (userId == null) return Unauthorized(new { error = "Invalid token" });

        var deleted = await _postService.DeletePost(userId.Value, postId);
        if (!deleted)
        {
            return NotFound(new { error = "Post not found or you don't have permission to delete it" });
        }

        return Ok(new { message = "Post deleted successfully" });
    }

    /// <summary>
    /// Seed dummy posts for testing (dev only)
    /// </summary>
    [HttpPost("seed")]
    [AllowAnonymous]
    public async Task<IActionResult> SeedPosts()
    {
        // Get some existing data to create posts with
        var users = await _context.Users.Take(5).ToListAsync();
        var tracks = await _context.Tracks
            .Include(t => t.TrackArtists)
                .ThenInclude(ta => ta.Artist)
            .Include(t => t.Album)
            .Take(20)
            .ToListAsync();
        var albums = await _context.Albums.Take(10).ToListAsync();
        var playlists = await _context.Playlists.Take(5).ToListAsync();
        var artists = await _context.Artists.Take(10).ToListAsync();

        if (!users.Any())
        {
            return BadRequest(new { error = "No users found. Create some users first." });
        }

        if (!tracks.Any())
        {
            return BadRequest(new { error = "No tracks found. Sync some Spotify data first." });
        }

        var random = new Random();
        var postsCreated = 0;

        foreach (var user in users)
        {
            // Create a listening session for each user
            if (tracks.Count >= 3)
            {
                var sessionTracks = tracks
                    .OrderBy(_ => random.Next())
                    .Take(random.Next(3, Math.Min(8, tracks.Count)))
                    .Select(t => new SessionTrackMetadata
                    {
                        TrackId = t.Id,
                        SpotifyId = t.SpotifyId,
                        Name = t.Name,
                        ArtistNames = string.Join(", ", t.TrackArtists.Select(ta => ta.Artist.Name)),
                        AlbumImageUrl = t.Album?.ImageUrl,
                        DurationMs = t.DurationMs,
                        PlayedAt = DateTime.UtcNow.AddMinutes(-random.Next(10, 120))
                    })
                    .ToList();

                var sessionPost = await _postService.CreateListeningSessionPost(user.Id, sessionTracks);
                if (sessionPost != null) postsCreated++;
            }

            // Create some liked track posts
            var likedTracks = tracks.OrderBy(_ => random.Next()).Take(random.Next(1, 3));
            foreach (var track in likedTracks)
            {
                await _postService.CreateLikedTrackPost(user.Id, track.Id);
                postsCreated++;
            }

            // Create shared track posts with captions
            if (tracks.Any())
            {
                var shareTrack = tracks[random.Next(tracks.Count)];
                var captions = new[]
                {
                    "This song hits different 🔥",
                    "On repeat all day!",
                    "Just discovered this gem 💎",
                    "Vibes ✨",
                    "You NEED to hear this",
                    null // Some posts without caption
                };
                await _postService.CreateSharedTrackPost(user.Id, shareTrack.Id, captions[random.Next(captions.Length)]);
                postsCreated++;
            }

            // Create liked album posts
            if (albums.Any())
            {
                var album = albums[random.Next(albums.Count)];
                await _postService.CreateLikedAlbumPost(user.Id, album.Id);
                postsCreated++;
            }

            // Create shared album posts
            if (albums.Any())
            {
                var album = albums[random.Next(albums.Count)];
                var captions = new[]
                {
                    "Album of the year 🏆",
                    "This whole album is a masterpiece",
                    "Finally got around to this one",
                    null
                };
                await _postService.CreateSharedAlbumPost(user.Id, album.Id, captions[random.Next(captions.Length)]);
                postsCreated++;
            }

            // Create shared playlist posts
            if (playlists.Any())
            {
                var playlist = playlists[random.Next(playlists.Count)];
                await _postService.CreateSharedPlaylistPost(user.Id, playlist.Id, "Check out my playlist!");
                postsCreated++;
            }

            // Create shared artist posts
            if (artists.Any())
            {
                var artist = artists[random.Next(artists.Count)];
                var captions = new[]
                {
                    "Can't stop listening to them",
                    "New favorite artist 🎤",
                    "Underrated tbh",
                    null
                };
                await _postService.CreateSharedArtistPost(user.Id, artist.Id, captions[random.Next(captions.Length)]);
                postsCreated++;
            }
        }

        return Ok(new { message = $"Created {postsCreated} seed posts for {users.Count} users" });
    }
}

// Request DTOs
public class ShareTrackRequest
{
    public int? TrackId { get; set; }
    public string? SpotifyId { get; set; }
    public string? Caption { get; set; }
    public PostVisibility Visibility { get; set; } = PostVisibility.Public;
}

public class ShareAlbumRequest
{
    public int? AlbumId { get; set; }
    public string? SpotifyId { get; set; }
    public string? Caption { get; set; }
    public PostVisibility Visibility { get; set; } = PostVisibility.Public;
}

public class SharePlaylistRequest
{
    public int? PlaylistId { get; set; }
    public string? SpotifyId { get; set; }
    public string? Caption { get; set; }
    public PostVisibility Visibility { get; set; } = PostVisibility.Public;
}

public class ShareArtistRequest
{
    public int? ArtistId { get; set; }
    public string? SpotifyId { get; set; }
    public string? Caption { get; set; }
    public PostVisibility Visibility { get; set; } = PostVisibility.Public;
}

public class CreateListeningSessionRequest
{
    public List<SessionTrackMetadata> Tracks { get; set; } = new();
    public PostVisibility Visibility { get; set; } = PostVisibility.Public;
}
