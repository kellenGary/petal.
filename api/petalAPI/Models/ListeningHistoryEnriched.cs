namespace PetalAPI.Models;

/// <summary>
/// Model for the ListeningHistoryEnriched SQL view.
/// Contains flattened listening history with track and album details.
/// </summary>
public class ListeningHistoryEnriched
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public int TrackId { get; set; }
    public DateTime PlayedAt { get; set; }
    public int MsPlayed { get; set; }
    public string? ContextUri { get; set; }
    public string? DeviceType { get; set; }
    public int Source { get; set; }
    
    // Track fields
    public string TrackSpotifyId { get; set; } = default!;
    public string TrackName { get; set; } = default!;
    public int DurationMs { get; set; }
    public bool Explicit { get; set; }
    public int? Popularity { get; set; }
    
    // Album fields
    public int? AlbumId { get; set; }
    public string? AlbumSpotifyId { get; set; }
    public string? AlbumName { get; set; }
    public string? AlbumImageUrl { get; set; }
    public DateTime? AlbumReleaseDate { get; set; }
}
