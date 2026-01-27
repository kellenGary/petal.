namespace PetalAPI.Models;

public class TrackArtist
{
    public int TrackId { get; set; }
    public Track Track { get; set; } = default!;

    public int ArtistId { get; set; }
    public Artist Artist { get; set; } = default!;

    public int ArtistOrder { get; set; }
}
