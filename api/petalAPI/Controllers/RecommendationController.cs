using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using System.Text.Json;
using PetalAPI.Data;
using PetalAPI.Models;

namespace PetalAPI.Controllers;

/// <summary>
/// Controller for personalized music recommendations.
/// Uses a weighted scoring algorithm based on user's listening history,
/// friend activity, and genre preferences.
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class RecommendationController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly ILogger<RecommendationController> _logger;

    // ============================================================================
    // SCORING WEIGHTS - Tweak these values to adjust recommendation behavior
    // ============================================================================
    
    /// <summary>
    /// Weight for tracks by artists the user listens to frequently.
    /// Higher value = more recommendations from familiar artists.
    /// </summary>
    private const double ARTIST_AFFINITY_WEIGHT = 0.43;    // 43%
    
    /// <summary>
    /// Weight for tracks that followed users have listened to recently.
    /// Higher value = more social/discovery-based recommendations.
    /// </summary>
    private const double FRIEND_ACTIVITY_WEIGHT = 0.33;    // 33%
    
    /// <summary>
    /// Weight for tracks from artists that share genres with user's favorites.
    /// Higher value = more genre-exploration recommendations.
    /// </summary>
    private const double GENRE_MATCH_WEIGHT = 0.24;        // 24%
    
    /// <summary>
    /// Number of days to look back for user's listening history analysis.
    /// </summary>
    private const int LISTENING_HISTORY_DAYS = 30;
    
    /// <summary>
    /// Number of days to look back for friend activity.
    /// </summary>
    private const int FRIEND_ACTIVITY_DAYS = 14;
    
    /// <summary>
    /// Maximum number of top artists to consider for affinity scoring.
    /// </summary>
    private const int TOP_ARTISTS_LIMIT = 20;
    
    /// <summary>
    /// Number of days a dismissal remains valid (prevents re-recommending).
    /// </summary>
    private const int DISMISSAL_EXPIRY_DAYS = 30;

    public RecommendationController(AppDbContext context, ILogger<RecommendationController> logger)
    {
        _context = context;
        _logger = logger;
    }

    private int GetCurrentUserId()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return int.TryParse(userIdClaim, out var id) ? id : 0;
    }

    /// <summary>
    /// Gets personalized track recommendations for the authenticated user.
    /// </summary>
    /// <param name="count">Number of recommendations to return (default 5, max 20).</param>
    /// <returns>List of recommended tracks with reasons.</returns>
    [HttpGet("for-you")]
    public async Task<IActionResult> GetForYouRecommendations([FromQuery] int count = 5)
    {
        var userId = GetCurrentUserId();
        if (userId == 0) return Unauthorized();

        count = Math.Clamp(count, 1, 20);

        try
        {
            var recommendations = await GenerateRecommendations(userId, count);
            return Ok(new { recommendations });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating recommendations for user {UserId}", userId);
            return StatusCode(500, new { error = "Failed to generate recommendations" });
        }
    }

    /// <summary>
    /// Records a dismissed recommendation (negative signal).
    /// Called when user views a recommendation but doesn't engage with it.
    /// </summary>
    [HttpPost("dismiss")]
    public async Task<IActionResult> DismissRecommendation([FromBody] DismissRequest request)
    {
        var userId = GetCurrentUserId();
        if (userId == 0) return Unauthorized();

        if (request.TrackId <= 0)
            return BadRequest(new { error = "Invalid trackId" });

        try
        {
            // Check if already dismissed
            var existing = await _context.RecommendationDismissals
                .FirstOrDefaultAsync(rd => rd.UserId == userId && rd.TrackId == request.TrackId);

            if (existing != null)
            {
                // Update the dismissal timestamp
                existing.DismissedAt = DateTime.UtcNow;
            }
            else
            {
                _context.RecommendationDismissals.Add(new RecommendationDismissal
                {
                    UserId = userId,
                    TrackId = request.TrackId,
                    DismissedAt = DateTime.UtcNow
                });
            }

            await _context.SaveChangesAsync();
            return Ok(new { message = "Recommendation dismissed", trackId = request.TrackId });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error dismissing recommendation for user {UserId}", userId);
            return StatusCode(500, new { error = "Failed to dismiss recommendation" });
        }
    }

    /// <summary>
    /// Core recommendation generation logic.
    /// Combines multiple signals with configurable weights.
    /// </summary>
    private async Task<List<RecommendationDto>> GenerateRecommendations(int userId, int count)
    {
        var cutoffDate = DateTime.UtcNow.AddDays(-LISTENING_HISTORY_DAYS);
        var friendCutoffDate = DateTime.UtcNow.AddDays(-FRIEND_ACTIVITY_DAYS);
        var dismissalCutoffDate = DateTime.UtcNow.AddDays(-DISMISSAL_EXPIRY_DAYS);

        // ========================================================================
        // STEP 1: Gather user's listening data and preferences
        // ========================================================================
        
        // Get tracks the user has already listened to (to exclude from recommendations)
        var listenedTrackIds = await _context.ListeningHistory
            .Where(lh => lh.UserId == userId)
            .Select(lh => lh.TrackId)
            .Distinct()
            .ToListAsync();

        // Get dismissed tracks (to exclude from recommendations)
        var dismissedTrackIds = await _context.RecommendationDismissals
            .Where(rd => rd.UserId == userId && rd.DismissedAt > dismissalCutoffDate)
            .Select(rd => rd.TrackId)
            .ToListAsync();

        var excludedTrackIds = listenedTrackIds.Union(dismissedTrackIds).ToHashSet();

        // ========================================================================
        // STEP 2: Calculate artist affinity scores
        // Get user's top artists based on play count in the last N days
        // ========================================================================
        
        var artistPlayCounts = await _context.ListeningHistory
            .Where(lh => lh.UserId == userId && lh.PlayedAt > cutoffDate)
            .Join(_context.TrackArtists, lh => lh.TrackId, ta => ta.TrackId, (lh, ta) => ta.ArtistId)
            .GroupBy(artistId => artistId)
            .Select(g => new { ArtistId = g.Key, PlayCount = g.Count() })
            .OrderByDescending(x => x.PlayCount)
            .Take(TOP_ARTISTS_LIMIT)
            .ToListAsync();

        var topArtistIds = artistPlayCounts.Select(x => x.ArtistId).ToHashSet();
        var maxArtistPlayCount = artistPlayCounts.Any() ? artistPlayCounts.Max(x => x.PlayCount) : 1;
        var artistAffinityScores = artistPlayCounts.ToDictionary(
            x => x.ArtistId,
            x => (double)x.PlayCount / maxArtistPlayCount   // Normalize to 0-1
        );

        // ========================================================================
        // STEP 3: Get user's genre preferences from top artists
        // ========================================================================
        
        var userGenres = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var topArtists = await _context.Artists
            .Where(a => topArtistIds.Contains(a.Id))
            .Select(a => new { a.Id, a.GenresJson })
            .ToListAsync();

        foreach (var artist in topArtists.Where(a => !string.IsNullOrEmpty(a.GenresJson)))
        {
            try
            {
                var genres = JsonSerializer.Deserialize<List<string>>(artist.GenresJson!);
                if (genres != null) userGenres.UnionWith(genres);
            }
            catch { /* Ignore parse errors */ }
        }

        // ========================================================================
        // STEP 4: Get friend activity (tracks listened to by followed users)
        // ========================================================================
        
        var followedUserIds = await _context.Follows
            .Where(f => f.FollowerUserId == userId)
            .Select(f => f.FolloweeUserId)
            .ToListAsync();

        var friendTrackActivity = await _context.ListeningHistory
            .Where(lh => followedUserIds.Contains(lh.UserId) && lh.PlayedAt > friendCutoffDate)
            .GroupBy(lh => lh.TrackId)
            .Select(g => new
            {
                TrackId = g.Key,
                FriendCount = g.Select(lh => lh.UserId).Distinct().Count(),
                MostRecentPlay = g.Max(lh => lh.PlayedAt),
                // Get one friend's name for the "why this" reason
                FriendUserId = g.Select(lh => lh.UserId).FirstOrDefault()
            })
            .Where(x => !excludedTrackIds.Contains(x.TrackId))
            .OrderByDescending(x => x.FriendCount)
            .ThenByDescending(x => x.MostRecentPlay)
            .Take(100) // Limit for performance
            .ToListAsync();

        var friendTrackIds = friendTrackActivity.Select(x => x.TrackId).ToHashSet();
        var maxFriendCount = friendTrackActivity.Any() ? friendTrackActivity.Max(x => x.FriendCount) : 1;

        // Get friend display names for "why this" reasons
        var friendUserIdToName = await _context.Users
            .Where(u => friendTrackActivity.Select(f => f.FriendUserId).Contains(u.Id))
            .ToDictionaryAsync(u => u.Id, u => u.DisplayName ?? u.Handle ?? "A friend");

        // ========================================================================
        // STEP 5: Build candidate pool and score each track
        // ========================================================================
        
        // Get candidate tracks: 
        // - From user's top artists (but haven't listened to)
        // - From friend activity
        // - Popular tracks matching user's genres
        
        var candidateTrackIds = new HashSet<int>();
        
        // Add tracks from top artists that user hasn't heard
        var artistTracks = await _context.TrackArtists
            .Where(ta => topArtistIds.Contains(ta.ArtistId))
            .Select(ta => ta.TrackId)
            .Where(trackId => !excludedTrackIds.Contains(trackId))
            .Take(200)
            .ToListAsync();
        candidateTrackIds.UnionWith(artistTracks);
        
        // Add friend-listened tracks
        candidateTrackIds.UnionWith(friendTrackIds);

        // Check if we have enough candidates
        if (candidateTrackIds.Count < 20)
        {
            // Fallback: fill with most-played tracks across all users
            // (Spotify popularity field is no longer available)
            var needed = 20 - candidateTrackIds.Count;
            var mostPlayedTracks = await _context.ListeningHistory
                .Where(lh => !excludedTrackIds.Contains(lh.TrackId) && !candidateTrackIds.Contains(lh.TrackId))
                .GroupBy(lh => lh.TrackId)
                .OrderByDescending(g => g.Count())
                .Take(needed + 10)
                .Select(g => g.Key)
                .ToListAsync();
            candidateTrackIds.UnionWith(mostPlayedTracks);
        }

        // Load full track data for candidates
        var candidateTracks = await _context.Tracks
            .Where(t => candidateTrackIds.Contains(t.Id))
            .Include(t => t.Album)
            .Include(t => t.TrackArtists)
                .ThenInclude(ta => ta.Artist)
            .ToListAsync();

        // ========================================================================
        // STEP 6: Score and rank candidates
        // ========================================================================
        
        var scoredRecommendations = new List<(Track Track, double Score, string Reason, string? ReasonContext)>();

        foreach (var track in candidateTracks)
        {
            double artistScore = 0;
            double friendScore = 0;
            double genreScore = 0;
            
            string primaryReason = "trending";
            string? reasonContext = null;

            // --- Artist Affinity Score ---
            // Higher score if track is by an artist the user frequently listens to
            foreach (var ta in track.TrackArtists)
            {
                if (artistAffinityScores.TryGetValue(ta.ArtistId, out var affinity))
                {
                    if (affinity > artistScore)
                    {
                        artistScore = affinity;
                        primaryReason = "artist";
                        reasonContext = ta.Artist?.Name;
                    }
                }
            }

            // --- Friend Activity Score ---
            // Higher score if multiple friends listened recently
            var friendActivity = friendTrackActivity.FirstOrDefault(f => f.TrackId == track.Id);
            if (friendActivity != null)
            {
                friendScore = (double)friendActivity.FriendCount / maxFriendCount;
                
                // Recency boost: more recent = higher score
                var daysSincePlay = (DateTime.UtcNow - friendActivity.MostRecentPlay).TotalDays;
                var recencyMultiplier = Math.Max(0.5, 1 - (daysSincePlay / FRIEND_ACTIVITY_DAYS));
                friendScore *= recencyMultiplier;

                // Friend reason might override artist reason if stronger signal
                if (friendScore * FRIEND_ACTIVITY_WEIGHT > artistScore * ARTIST_AFFINITY_WEIGHT)
                {
                    primaryReason = "friend";
                    if (friendUserIdToName.TryGetValue(friendActivity.FriendUserId, out var name))
                    {
                        reasonContext = name;
                    }
                }
            }

            // --- Genre Match Score ---
            // Check if track's artists share genres with user's preferences
            foreach (var ta in track.TrackArtists)
            {
                if (!string.IsNullOrEmpty(ta.Artist?.GenresJson))
                {
                    try
                    {
                        var artistGenres = JsonSerializer.Deserialize<List<string>>(ta.Artist.GenresJson);
                        if (artistGenres != null)
                        {
                            var matchCount = artistGenres.Count(g => userGenres.Contains(g));
                            var matchRatio = artistGenres.Count > 0 ? (double)matchCount / artistGenres.Count : 0;
                            genreScore = Math.Max(genreScore, matchRatio);
                        }
                    }
                    catch { /* Ignore parse errors */ }
                }
            }

            // ================================================================
            // FINAL WEIGHTED SCORE
            // Adjust the weights at the top of this file to tune behavior
            // Note: Spotify popularity field removed — scoring uses only
            // artist affinity, friend activity, and genre match.
            // ================================================================
            double totalScore = 
                (artistScore * ARTIST_AFFINITY_WEIGHT) +
                (friendScore * FRIEND_ACTIVITY_WEIGHT) +
                (genreScore * GENRE_MATCH_WEIGHT);

            // Small random factor to add variety (±5%)
            totalScore *= (0.95 + Random.Shared.NextDouble() * 0.1);

            scoredRecommendations.Add((track, totalScore, primaryReason, reasonContext));
        }

        // ========================================================================
        // STEP 7: Select top recommendations with diversity
        // ========================================================================
        
        var finalRecommendations = scoredRecommendations
            .OrderByDescending(x => x.Score)
            .Take(count * 2) // Get extra to ensure variety
            .GroupBy(x => x.Track.TrackArtists.FirstOrDefault()?.ArtistId ?? 0) // Limit per artist
            .SelectMany(g => g.Take(2)) // Max 2 songs per artist
            .Take(count)
            .Select(x => new RecommendationDto
            {
                TrackId = x.Track.Id,
                SpotifyId = x.Track.SpotifyId,
                Name = x.Track.Name,
                ArtistNames = x.Track.TrackArtists.Select(ta => ta.Artist?.Name ?? "").Where(n => !string.IsNullOrEmpty(n)).ToList(),
                AlbumName = x.Track.Album?.Name,
                AlbumImageUrl = x.Track.Album?.ImageUrl,
                DurationMs = x.Track.DurationMs,
                Reason = FormatReason(x.Reason, x.ReasonContext),
                ReasonType = x.Reason,
                Score = Math.Round(x.Score, 2)
            })
            .ToList();

        return finalRecommendations;
    }

    /// <summary>
    /// Formats the recommendation reason for display.
    /// </summary>
    private static string FormatReason(string reasonType, string? context)
    {
        return reasonType switch
        {
            "artist" when !string.IsNullOrEmpty(context) => $"Because you like {context}",
            "friend" when !string.IsNullOrEmpty(context) => $"{context} listened to this",
            "genre" => "Matches your favorite genres",
            "trending" => "Trending now",
            _ => "Recommended for you"
        };
    }
}

// ============================================================================
// Request/Response DTOs
// ============================================================================

public class DismissRequest
{
    public int TrackId { get; set; }
}

public class RecommendationDto
{
    public int TrackId { get; set; }
    public string SpotifyId { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public List<string> ArtistNames { get; set; } = new();
    public string? AlbumName { get; set; }
    public string? AlbumImageUrl { get; set; }
    public int DurationMs { get; set; }
    
    /// <summary>
    /// Human-readable explanation of why this track was recommended.
    /// e.g., "Because you like Radiohead" or "Sarah listened to this"
    /// </summary>
    public string Reason { get; set; } = string.Empty;
    
    /// <summary>
    /// The type of reason: "artist", "friend", "genre", or "trending"
    /// </summary>
    public string ReasonType { get; set; } = string.Empty;
    
    /// <summary>
    /// The recommendation score (0-1). Higher = stronger recommendation.
    /// </summary>
    public double Score { get; set; }
}
