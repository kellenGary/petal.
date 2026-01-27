using System.ComponentModel.DataAnnotations;

namespace PetalAPI.Models;

public class Track
{
    [Key]
    public int Id { get; set; }
    [Required]
    public string SpotifyId { get; set; } = string.Empty;
    [Required]
    public string Name { get; set; } = string.Empty;
    public int DurationMs { get; set; }
    public bool Explicit { get; set; }
    public int? Popularity { get; set; }
    public string? Isrc { get; set; }

    public int? AlbumId { get; set; }
    public Album? Album { get; set; }

    public ICollection<TrackArtist> TrackArtists { get; set; } = new List<TrackArtist>();
    public ICollection<PlaylistTrack> PlaylistEntries { get; set; } = new List<PlaylistTrack>();
    public ICollection<ListeningHistory> Listens { get; set; } = new List<ListeningHistory>();
}
