using System.ComponentModel.DataAnnotations;

namespace MFAPI.Models;

public class User
{
    [Key]
    public int Id { get; set; }
    
    [Required]
    public string SpotifyId { get; set; } = string.Empty;
    
    public string? DisplayName { get; set; }
    
    public string? Email { get; set; }
    
    public string? ProfileImageUrl { get; set; }
    
    [Required]
    public string SpotifyAccessToken { get; set; } = string.Empty;
    
    [Required]
    public string SpotifyRefreshToken { get; set; } = string.Empty;
    
    public DateTime TokenExpiresAt { get; set; }
    
    public DateTime CreatedAt { get; set; }
    
    public DateTime UpdatedAt { get; set; }
}
