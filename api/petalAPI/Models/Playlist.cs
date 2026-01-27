using System.ComponentModel.DataAnnotations;

namespace PetalAPI.Models;

public class Playlist
{
    [Key]
    public int Id { get; set; }
    [Required]
    public string SpotifyId { get; set; } = string.Empty;
    [Required]
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? OwnerSpotifyId { get; set; }

    public int? OwnerUserId { get; set; }
    public User? OwnerUser { get; set; }

    public bool Public { get; set; }
    public bool Collaborative { get; set; }
    public string? SnapshotId { get; set; }
    public string? ImageUrl { get; set; }
    public int? TrackCount { get; set; }

    public ICollection<PlaylistTrack> Tracks { get; set; } = new List<PlaylistTrack>();
}
