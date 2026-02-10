namespace PetalAPI.Models;

public enum NotificationType
{
    Like = 0,
    Repost = 1,
    Follow = 2
}

/// <summary>
/// Represents a notification sent to a user (e.g., someone liked their post).
/// </summary>
public class Notification
{
    public int Id { get; set; }
    
    /// <summary>
    /// The user who receives this notification
    /// </summary>
    public int UserId { get; set; }
    public User User { get; set; } = default!;
    
    /// <summary>
    /// The user who triggered this notification (liker, reposter, follower)
    /// </summary>
    public int ActorUserId { get; set; }
    public User ActorUser { get; set; } = default!;
    
    public NotificationType Type { get; set; }
    
    /// <summary>
    /// The related post (for Like/Repost notifications). Null for Follow notifications.
    /// </summary>
    public int? PostId { get; set; }
    public Post? Post { get; set; }
    
    public bool IsRead { get; set; }
    
    public DateTime CreatedAt { get; set; }
}
