namespace PetalAPI.Models;

public class Follow
{
    public int FollowerUserId { get; set; }
    public User Follower { get; set; } = default!;

    public int FolloweeUserId { get; set; }
    public User Followee { get; set; } = default!;

    public DateTime CreatedAt { get; set; }
}
