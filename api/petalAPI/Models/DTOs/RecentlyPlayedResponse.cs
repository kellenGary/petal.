namespace PetalAPI.Models.DTOs;

public class RecentlyPlayedResponse
{
    public List<RecentlyPlayedItem> Items { get; set; } = new();
    public int Total { get; set; }
    public int Limit { get; set; }
    public int Offset { get; set; }
}

public class RecentlyPlayedItem
{
    public TrackData Track { get; set; } = new();
    public string PlayedAt { get; set; } = "";
}

public class TrackData
{
    public string Id { get; set; } = "";
    public string Name { get; set; } = "";
    public int DurationMs { get; set; }
    public bool Explicit { get; set; }
    public int? Popularity { get; set; }
    public AlbumData? Album { get; set; }
    public List<ArtistData> Artists { get; set; } = new();
}

public class AlbumData
{
    public string Id { get; set; } = "";
    public string Name { get; set; } = "";
    public List<ImageData> Images { get; set; } = new();
    public string? ReleaseDate { get; set; }
}

public class ArtistData
{
    public string Id { get; set; } = "";
    public string Name { get; set; } = "";
}

public class ImageData
{
    public string? Url { get; set; }
    public int? Height { get; set; }
    public int? Width { get; set; }
}

public class UserProfileResponse
{
    public int Id { get; set; }
    public string DisplayName { get; set; } = "";
    public string Handle { get; set; } = "";
    public string? Bio { get; set; }
    public string? ProfileImageUrl { get; set; }
    public int TotalUniqueTracks { get; set; }
    public int TotalPlaybacks { get; set; }
    public int TotalArtistsHeard { get; set; }
    public int TotalAlbumsHeard { get; set; }
    public DateTime? LastPlayedAt { get; set; }
    public List<RecentlyPlayedItem> RecentlyPlayed { get; set; } = new();
}
