namespace PetalAPI.Models;

public class UserLikedTrack
{
    public int UserId { get; set; }
    public User User { get; set; } = default!;

    public int TrackId { get; set; }
    public Track Track { get; set; } = default!;

    public DateTime LikedAt { get; set; }
}
