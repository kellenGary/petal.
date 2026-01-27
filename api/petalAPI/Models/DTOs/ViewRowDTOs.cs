namespace PetalAPI.Models.DTOs;

/// <summary>
/// DTO for rows from the UserLikedTracksEnriched SQL view
/// </summary>
public class LikedTrackViewRow
{
    public int UserId { get; set; }
    public DateTime LikedAt { get; set; }
    public int TrackId { get; set; }
    public string TrackSpotifyId { get; set; } = string.Empty;
    public string TrackName { get; set; } = string.Empty;
    public int DurationMs { get; set; }
    public bool Explicit { get; set; }
    public int? Popularity { get; set; }
    public string? Isrc { get; set; }
    public int? AlbumId { get; set; }
    public string? AlbumSpotifyId { get; set; }
    public string? AlbumName { get; set; }
    public string? AlbumImageUrl { get; set; }
    public DateTime? AlbumReleaseDate { get; set; }
    public string? AlbumType { get; set; }
    public int? ArtistId { get; set; }
    public string? ArtistSpotifyId { get; set; }
    public string? ArtistName { get; set; }
    public int? ArtistOrder { get; set; }
}

/// <summary>
/// DTO for rows from the UserPlaylistsEnriched SQL view
/// </summary>
public class PlaylistViewRow
{
    public int UserId { get; set; }
    public int Relation { get; set; }
    public DateTime? FollowedAt { get; set; }
    public int PlaylistId { get; set; }
    public string PlaylistSpotifyId { get; set; } = string.Empty;
    public string PlaylistName { get; set; } = string.Empty;
    public string? PlaylistDescription { get; set; }
    public string? OwnerSpotifyId { get; set; }
    public int? OwnerUserId { get; set; }
    public bool Public { get; set; }
    public bool Collaborative { get; set; }
    public string? SnapshotId { get; set; }
    public string? PlaylistImageUrl { get; set; }
    public int TrackCount { get; set; }
}

/// <summary>
/// DTO for rows from the TrackDetailsWithArtists SQL view
/// </summary>
public class TrackDetailsViewRow
{
    public int TrackId { get; set; }
    public string? TrackSpotifyId { get; set; }
    public string TrackName { get; set; } = string.Empty;
    public int DurationMs { get; set; }
    public bool Explicit { get; set; }
    public int? Popularity { get; set; }
    public int? AlbumId { get; set; }
    public string? AlbumSpotifyId { get; set; }
    public string? AlbumName { get; set; }
    public string? AlbumImageUrl { get; set; }
    public DateTime? AlbumReleaseDate { get; set; }
    public int? ArtistId { get; set; }
    public string? ArtistSpotifyId { get; set; }
    public string? ArtistName { get; set; }
    public int? ArtistOrder { get; set; }
}
