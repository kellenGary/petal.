using System.ComponentModel.DataAnnotations;

namespace PetalAPI.Models;

public class SongOfTheDay
{
    [Key]
    public int Id { get; set; }

    [Required]
    public int UserId { get; set; }
    public User User { get; set; } = default!;

    [Required]
    public int TrackId { get; set; }
    public Track Track { get; set; } = default!;

    [Required]
    public DateOnly Date { get; set; }
}
