using System;

namespace MFAPI.Models;

public class UserProfileData
{
    public int UserId { get; set; }
    public string? DisplayName { get; set; }
    public string? Handle { get; set; }
    public string? Bio { get; set; }
    public string? ProfileImageUrl { get; set; }
    public int TotalUniqueTracks { get; set; }
    public int TotalPlaybacks { get; set; }
    public int RecentPlaysLast7Days { get; set; }
    public int TotalArtistsHeard { get; set; }
    public int TotalAlbumsHeard { get; set; }
    public int TotalFollowers { get; set; }
    public int TotalFollowing { get; set; }
    public DateTime? LastPlayedAt { get; set; }
}
