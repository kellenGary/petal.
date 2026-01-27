namespace PetalAPI.Models;

public class UserLikedAlbum
{
    public int UserId { get; set; }
    public User User { get; set; } = default!;

    public int AlbumId { get; set; }
    public Album Album { get; set; } = default!;

    public DateTime LikedAt { get; set; }
}
