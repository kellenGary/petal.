using System.ComponentModel.DataAnnotations;

namespace PetalAPI.Models;

public class Album
{
    [Key]
    public int Id { get; set; }
    [Required]
    public string SpotifyId { get; set; } = string.Empty;
    [Required]
    public string Name { get; set; } = string.Empty;
    public DateTime? ReleaseDate { get; set; }
    public string? AlbumType { get; set; }
    public string? ImageUrl { get; set; }
    public string? Label { get; set; }
    public int? TotalTracks { get; set; }

    public ICollection<Track> Tracks { get; set; } = new List<Track>();
}
