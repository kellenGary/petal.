namespace PetalAPI.Models;

public class UserFollowedArtist
{
    public int UserId { get; set; }
    public User User { get; set; } = default!;

    public int ArtistId { get; set; }
    public Artist Artist { get; set; } = default!;

    public DateTime FollowedAt { get; set; }
}
