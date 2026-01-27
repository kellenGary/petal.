namespace PetalAPI.Models;

public class AlbumTrack
{
    public int AlbumId { get; set; }
    public Album Album { get; set; } = default!;

    public int Position { get; set; }

    public int TrackId { get; set; }
    public Track Track { get; set; } = default!;
}
