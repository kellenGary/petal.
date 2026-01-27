namespace PetalAPI.Models;

public enum SessionStatus
{
    Active = 0,
    Posted = 1,
    Cancelled = 2
}

public class ListeningSession
{
    public int Id { get; set; }
    
    public int UserId { get; set; }
    public User User { get; set; } = default!;
    
    /// <summary>
    /// When the first track in the session was played
    /// </summary>
    public DateTime StartedAt { get; set; }
    
    /// <summary>
    /// When the last track in the session was played (updated as tracks are added)
    /// </summary>
    public DateTime? EndedAt { get; set; }
    
    /// <summary>
    /// Sum of all track durations in milliseconds
    /// </summary>
    public int TotalDurationMs { get; set; }
    
    /// <summary>
    /// Number of unique tracks in the session
    /// </summary>
    public int TrackCount { get; set; }
    
    /// <summary>
    /// Current status: Active (0), Posted (1), or Cancelled (2)
    /// </summary>
    public SessionStatus Status { get; set; }
    
    /// <summary>
    /// When this session record was created
    /// </summary>
    public DateTime CreatedAt { get; set; }
    
    /// <summary>
    /// Navigation property to tracks in this session
    /// </summary>
    public ICollection<ListeningSessionTrack> SessionTracks { get; set; } = new List<ListeningSessionTrack>();
    
    /// <summary>
    /// The post created for this session (if Status == Posted)
    /// </summary>
    public Post? Post { get; set; }
}

public class ListeningSessionTrack
{
    public int Id { get; set; }
    
    public int ListeningSessionId { get; set; }
    public ListeningSession Session { get; set; } = default!;
    
    public int ListeningHistoryId { get; set; }
    public ListeningHistory ListeningHistory { get; set; } = default!;
    
    public int TrackId { get; set; }
    public Track Track { get; set; } = default!;
    
    /// <summary>
    /// When this track was played (copied from ListeningHistory for easier querying)
    /// </summary>
    public DateTime PlayedAt { get; set; }
    
    /// <summary>
    /// Position in the session (1-indexed)
    /// </summary>
    public int Position { get; set; }
}
