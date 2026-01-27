namespace PetalAPI.Models;

public class PlaylistTrack
{
    public int PlaylistId { get; set; }
    public Playlist Playlist { get; set; } = default!;

    public int Position { get; set; }

    public int TrackId { get; set; }
    public Track Track { get; set; } = default!;

    public DateTime? AddedAt { get; set; }
    public string? AddedBySpotifyId { get; set; }
    public int? AddedByUserId { get; set; }
}
