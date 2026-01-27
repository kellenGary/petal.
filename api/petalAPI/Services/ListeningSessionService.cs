using Microsoft.EntityFrameworkCore;
using PetalAPI.Data;
using PetalAPI.Models;
using System.Text.Json;

namespace PetalAPI.Services;

public interface IListeningSessionService
{
    /// <summary>
    /// Process a new track that was just played. This will either add it to an existing
    /// session, start a new session, or finalize the current session and start a new one.
    /// </summary>
    Task ProcessNewTrackAsync(int userId, int listeningHistoryId, int trackId, DateTime playedAt, int durationMs);
    
    /// <summary>
    /// Check for and finalize any stale sessions (inactive for 10+ minutes).
    /// This should be called periodically or when a user opens the app.
    /// </summary>
    Task FinalizeStaleSessionsAsync();
    
    /// <summary>
    /// Finalize stale sessions for a specific user only.
    /// </summary>
    Task FinalizeStaleSessionsForUserAsync(int userId);
}

public class ListeningSessionService : IListeningSessionService
{
    private readonly AppDbContext _context;
    private readonly ILogger<ListeningSessionService> _logger;
    
    // Configuration constants
    private const int MaxGapMinutes = 5;          // Max gap between tracks to continue session
    private const int StaleSessionMinutes = 10;   // Minutes of inactivity before finalizing
    private const int MinTracksForPost = 5;       // Minimum unique tracks to create a post
    
    public ListeningSessionService(AppDbContext context, ILogger<ListeningSessionService> logger)
    {
        _context = context;
        _logger = logger;
    }
    
    public async Task ProcessNewTrackAsync(int userId, int listeningHistoryId, int trackId, DateTime playedAt, int durationMs)
    {
        try
        {
            // First, check for and finalize any stale sessions for this user
            await FinalizeStaleSessionsForUserAsync(userId);
            
            // Get the user's active session (if any)
            var activeSession = await _context.ListeningSessions
                .Include(s => s.SessionTracks)
                .FirstOrDefaultAsync(s => s.UserId == userId && s.Status == SessionStatus.Active);
            
            if (activeSession == null)
            {
                // No active session - start a new one
                await StartNewSessionAsync(userId, listeningHistoryId, trackId, playedAt, durationMs);
                return;
            }
            
            // Check if this track should be added to the existing session
            var lastTrack = activeSession.SessionTracks
                .OrderByDescending(st => st.PlayedAt)
                .FirstOrDefault();
            
            if (lastTrack == null)
            {
                // Session exists but has no tracks (shouldn't happen, but handle it)
                await AddTrackToSessionAsync(activeSession, listeningHistoryId, trackId, playedAt, durationMs);
                return;
            }
            
            // Calculate the gap since the last track
            var gapMinutes = (playedAt - lastTrack.PlayedAt).TotalMinutes;
            
            if (gapMinutes > MaxGapMinutes)
            {
                // Gap too large - finalize current session and start a new one
                _logger.LogInformation(
                    "[ListeningSession] Gap of {Gap:F1} minutes exceeds max ({Max} min). Finalizing session {SessionId} and starting new.",
                    gapMinutes, MaxGapMinutes, activeSession.Id);
                
                await FinalizeSessionAsync(activeSession);
                await StartNewSessionAsync(userId, listeningHistoryId, trackId, playedAt, durationMs);
                return;
            }
            
            // Check if this is the same track as the last one (consecutive duplicate)
            if (lastTrack.TrackId == trackId)
            {
                // Same track - just update EndedAt to extend the session window, don't add duplicate
                _logger.LogDebug(
                    "[ListeningSession] Same track played consecutively. Extending session window but not adding duplicate.");
                
                activeSession.EndedAt = playedAt;
                await _context.SaveChangesAsync();
                return;
            }
            
            // Different track within gap - add to session
            await AddTrackToSessionAsync(activeSession, listeningHistoryId, trackId, playedAt, durationMs);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[ListeningSession] Error processing new track for user {UserId}", userId);
            throw;
        }
    }
    
    public async Task FinalizeStaleSessionsAsync()
    {
        try
        {
            var staleThreshold = DateTime.UtcNow.AddMinutes(-StaleSessionMinutes);
            
            var staleSessions = await _context.ListeningSessions
                .Include(s => s.SessionTracks)
                .Where(s => s.Status == SessionStatus.Active && s.EndedAt < staleThreshold)
                .ToListAsync();
            
            _logger.LogInformation("[ListeningSession] Found {Count} stale sessions to finalize", staleSessions.Count);
            
            foreach (var session in staleSessions)
            {
                await FinalizeSessionAsync(session);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[ListeningSession] Error finalizing stale sessions");
            throw;
        }
    }
    
    public async Task FinalizeStaleSessionsForUserAsync(int userId)
    {
        try
        {
            var staleThreshold = DateTime.UtcNow.AddMinutes(-StaleSessionMinutes);
            
            var staleSessions = await _context.ListeningSessions
                .Include(s => s.SessionTracks)
                .Where(s => s.UserId == userId && s.Status == SessionStatus.Active && s.EndedAt < staleThreshold)
                .ToListAsync();
            
            foreach (var session in staleSessions)
            {
                await FinalizeSessionAsync(session);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[ListeningSession] Error finalizing stale sessions for user {UserId}", userId);
            throw;
        }
    }
    
    private async Task StartNewSessionAsync(int userId, int listeningHistoryId, int trackId, DateTime playedAt, int durationMs)
    {
        var session = new ListeningSession
        {
            UserId = userId,
            StartedAt = playedAt,
            EndedAt = playedAt,
            TotalDurationMs = durationMs,
            TrackCount = 1,
            Status = SessionStatus.Active,
            CreatedAt = DateTime.UtcNow
        };
        
        _context.ListeningSessions.Add(session);
        await _context.SaveChangesAsync();
        
        var sessionTrack = new ListeningSessionTrack
        {
            ListeningSessionId = session.Id,
            ListeningHistoryId = listeningHistoryId,
            TrackId = trackId,
            PlayedAt = playedAt,
            Position = 1
        };
        
        _context.ListeningSessionTracks.Add(sessionTrack);
        await _context.SaveChangesAsync();
        
        _logger.LogInformation("[ListeningSession] Started new session {SessionId} for user {UserId}", 
            session.Id, userId);
    }
    
    private async Task AddTrackToSessionAsync(ListeningSession session, int listeningHistoryId, int trackId, DateTime playedAt, int durationMs)
    {
        // Check if this track is already in the session (not just last track - any track)
        var existingTrack = session.SessionTracks.FirstOrDefault(st => st.TrackId == trackId);
        
        if (existingTrack != null)
        {
            // Track already in session - just update the end time
            _logger.LogDebug("[ListeningSession] Track {TrackId} already in session. Updating end time only.", trackId);
            session.EndedAt = playedAt;
            await _context.SaveChangesAsync();
            return;
        }
        
        // New track - add to session
        var nextPosition = session.SessionTracks.Count + 1;
        
        var sessionTrack = new ListeningSessionTrack
        {
            ListeningSessionId = session.Id,
            ListeningHistoryId = listeningHistoryId,
            TrackId = trackId,
            PlayedAt = playedAt,
            Position = nextPosition
        };
        
        _context.ListeningSessionTracks.Add(sessionTrack);
        
        session.EndedAt = playedAt;
        session.TotalDurationMs += durationMs;
        session.TrackCount = nextPosition;
        
        await _context.SaveChangesAsync();
        
        _logger.LogInformation("[ListeningSession] Added track {TrackId} to session {SessionId} (position {Position})", 
            trackId, session.Id, nextPosition);
    }
    
    private async Task FinalizeSessionAsync(ListeningSession session)
    {
        if (session.TrackCount >= MinTracksForPost)
        {
            // Create a post for this session
            await CreatePostForSessionAsync(session);
            session.Status = SessionStatus.Posted;
            _logger.LogInformation("[ListeningSession] Finalized and posted session {SessionId} with {TrackCount} tracks", 
                session.Id, session.TrackCount);
        }
        else
        {
            // Not enough tracks - cancel the session
            session.Status = SessionStatus.Cancelled;
            _logger.LogInformation("[ListeningSession] Cancelled session {SessionId} (only {TrackCount} tracks)", 
                session.Id, session.TrackCount);
        }
        
        await _context.SaveChangesAsync();
    }
    
    private async Task CreatePostForSessionAsync(ListeningSession session)
    {
        // Load related data for the metadata
        var sessionTracks = await _context.ListeningSessionTracks
            .Where(st => st.ListeningSessionId == session.Id)
            .Include(st => st.Track)
                .ThenInclude(t => t.Album)
            .Include(st => st.Track)
                .ThenInclude(t => t.TrackArtists)
                    .ThenInclude(ta => ta.Artist)
            .OrderBy(st => st.Position)
            .ToListAsync();
        
        // Build metadata JSON for backwards compatibility with frontend
        var metadata = new ListeningSessionMetadata
        {
            Tracks = sessionTracks.Select(st => new SessionTrackMetadata
            {
                TrackId = st.TrackId,
                SpotifyId = st.Track.SpotifyId,
                Name = st.Track.Name,
                ArtistNames = string.Join(", ", st.Track.TrackArtists.OrderBy(ta => ta.ArtistOrder).Select(ta => ta.Artist.Name)),
                AlbumImageUrl = st.Track.Album?.ImageUrl,
                DurationMs = st.Track.DurationMs,
                PlayedAt = st.PlayedAt
            }).ToList(),
            TotalDurationMs = session.TotalDurationMs,
            TrackCount = session.TrackCount
        };
        
        var post = new Post
        {
            UserId = session.UserId,
            Type = PostType.ListeningSession,
            ListeningSessionId = session.Id,
            TrackId = sessionTracks.First().TrackId, // Primary track for display
            CreatedAt = DateTime.UtcNow,
            Visibility = PostVisibility.Public,
            MetadataJson = JsonSerializer.Serialize(metadata)
        };
        
        _context.Posts.Add(post);
        await _context.SaveChangesAsync();
        
        _logger.LogInformation("[ListeningSession] Created post {PostId} for session {SessionId}", 
            post.Id, session.Id);
    }
}
