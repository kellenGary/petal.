namespace PetalAPI.Models;

/// <summary>
/// Tracks when a user dismisses (doesn't engage with) a recommendation.
/// Used as negative signal to improve future recommendations.
/// </summary>
public class RecommendationDismissal
{
    public int Id { get; set; }
    
    public int UserId { get; set; }
    public User User { get; set; } = default!;
    
    public int TrackId { get; set; }
    public Track Track { get; set; } = default!;
    
    public DateTime DismissedAt { get; set; }
}
