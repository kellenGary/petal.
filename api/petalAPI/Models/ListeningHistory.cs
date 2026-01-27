namespace PetalAPI.Models;

public enum ListeningSource
{
    App = 0,
    SpotifyApi = 1
}

public class ListeningHistory
{
    public int Id { get; set; }

    public int UserId { get; set; }
    public User User { get; set; } = default!;

    public int TrackId { get; set; }
    public Track Track { get; set; } = default!;

    public DateTime PlayedAt { get; set; }
    public int MsPlayed { get; set; }
    public string? ContextUri { get; set; }
    public string? DeviceType { get; set; }
    public ListeningSource Source { get; set; }

    public string? DedupeKey { get; set; }
    public double? Latitude { get; set; }
    public double? Longitude { get; set; }
    public double? LocationAccuracy { get; set; }
}
