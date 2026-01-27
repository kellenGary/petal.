namespace PetalAPI.Models;

public class SpotifySyncState
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public User User { get; set; } = default!;

    public DateTime? RecentlyPlayedLastAt { get; set; }
    public DateTime? LikedTracksLastAt { get; set; }
    public DateTime? LikedAlbumsLastAt { get; set; }
    public DateTime? FollowedArtistsLastAt { get; set; }
    public string? PlaylistsLastSnapshotId { get; set; }
    public DateTime? LastFullSyncAt { get; set; }
}
