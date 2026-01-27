namespace PetalAPI.Models;

public enum UserPlaylistRelation
{
    Owner = 0,
    Subscriber = 1
}

public class UserPlaylist
{
    public int UserId { get; set; }
    public User User { get; set; } = default!;

    public int PlaylistId { get; set; }
    public Playlist Playlist { get; set; } = default!;

    public UserPlaylistRelation Relation { get; set; }
    public DateTime? FollowedAt { get; set; }
}
