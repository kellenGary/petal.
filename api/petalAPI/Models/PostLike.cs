namespace PetalAPI.Models;

/// <summary>
/// Represents a user's like on a post.
/// Composite key: (UserId, PostId)
/// </summary>
public class PostLike
{
    public int UserId { get; set; }
    public User User { get; set; } = default!;
    
    public int PostId { get; set; }
    public Post Post { get; set; } = default!;
    
    public DateTime CreatedAt { get; set; }
}
