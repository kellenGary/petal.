using System.ComponentModel.DataAnnotations;

namespace PetalAPI.Models;

public class Artist
{
    [Key]
    public int Id { get; set; }
    [Required]
    public string SpotifyId { get; set; } = string.Empty;
    [Required]
    public string Name { get; set; } = string.Empty;
    public string? GenresJson { get; set; }
    public string? ImageUrl { get; set; }
    public int? Popularity { get; set; }

    public ICollection<TrackArtist> TrackArtists { get; set; } = new List<TrackArtist>();
}
