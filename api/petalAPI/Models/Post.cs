namespace PetalAPI.Models;

public enum PostType
{
    // Legacy/simple types
    Play = 0,
    LikedTrack = 1,
    LikedAlbum = 2,
    PlaylistAdd = 3,
    
    // Listening session - multiple tracks listened consecutively
    ListeningSession = 4,
    
    // Liked content
    LikedPlaylist = 5,
    
    // Shared content with caption
    SharedTrack = 10,
    SharedAlbum = 11,
    SharedPlaylist = 12,
    SharedArtist = 13
}

public enum PostVisibility
{
    Public = 0,
    Followers = 1
}

public class Post
{
    public int Id { get; set; }

    public int UserId { get; set; }
    public User User { get; set; } = default!;

    public PostType Type { get; set; }

    public int? TrackId { get; set; }
    public Track? Track { get; set; }

    public int? AlbumId { get; set; }
    public Album? Album { get; set; }

    public int? PlaylistId { get; set; }
    public Playlist? Playlist { get; set; }
    
    public int? ArtistId { get; set; }
    public Artist? Artist { get; set; }

    public int? SourceListeningHistoryId { get; set; }
    public ListeningHistory? SourceListeningHistory { get; set; }

    public int? ListeningSessionId { get; set; }
    public ListeningSession? ListeningSession { get; set; }

    public DateTime CreatedAt { get; set; }
    public PostVisibility Visibility { get; set; }

    /// <summary>
    /// JSON metadata for the post. Used for:
    /// - ListeningSession: array of track IDs and play info
    /// - Shared posts: caption text
    /// </summary>
    public string? MetadataJson { get; set; }
}
