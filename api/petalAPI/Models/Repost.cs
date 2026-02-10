namespace PetalAPI.Models;

/// <summary>
/// Represents a repost of an existing post.
/// Links a user's repost action to both the original post and the new post created for the repost.
/// </summary>
public class Repost
{
    public int Id { get; set; }
    
    /// <summary>
    /// The user who created this repost
    /// </summary>
    public int UserId { get; set; }
    public User User { get; set; } = default!;
    
    /// <summary>
    /// The original post being reposted
    /// </summary>
    public int OriginalPostId { get; set; }
    public Post OriginalPost { get; set; } = default!;
    
    /// <summary>
    /// The new post entry created for this repost (appears in reposter's feed)
    /// </summary>
    public int RepostPostId { get; set; }
    public Post RepostPost { get; set; } = default!;
    
    public DateTime CreatedAt { get; set; }
}
