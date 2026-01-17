using Microsoft.EntityFrameworkCore;
using MFAPI.Models;

namespace MFAPI.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }
    
    public DbSet<User> Users { get; set; }
    public DbSet<Artist> Artists { get; set; }
    public DbSet<Album> Albums { get; set; }
    public DbSet<Track> Tracks { get; set; }
    public DbSet<TrackArtist> TrackArtists { get; set; }
    public DbSet<Playlist> Playlists { get; set; }
    public DbSet<PlaylistTrack> PlaylistTracks { get; set; }
    public DbSet<UserLikedTrack> UserLikedTracks { get; set; }
    public DbSet<UserLikedAlbum> UserLikedAlbums { get; set; }
    public DbSet<UserFollowedArtist> UserFollowedArtists { get; set; }
    public DbSet<UserPlaylist> UserPlaylists { get; set; }
    public DbSet<ListeningHistory> ListeningHistory { get; set; }
    public DbSet<Follow> Follows { get; set; }
    public DbSet<Post> Posts { get; set; }
    public DbSet<SpotifySyncState> SpotifySyncStates { get; set; }
    public DbSet<UserProfileData> UserProfileData { get; set; }
    
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        
        // Create unique index on SpotifyId and Handle
        modelBuilder.Entity<User>()
            .HasIndex(u => u.SpotifyId)
            .IsUnique();
        modelBuilder.Entity<User>()
            .HasIndex(u => u.Handle)
            .IsUnique();

        // Core Spotify entities
        modelBuilder.Entity<Artist>()
            .HasIndex(a => a.SpotifyId)
            .IsUnique();
        modelBuilder.Entity<Album>()
            .HasIndex(a => a.SpotifyId)
            .IsUnique();
        modelBuilder.Entity<Track>()
            .HasIndex(t => t.SpotifyId)
            .IsUnique();
        modelBuilder.Entity<Track>()
            .HasOne(t => t.Album)
            .WithMany(a => a.Tracks)
            .HasForeignKey(t => t.AlbumId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<TrackArtist>()
            .HasKey(ta => new { ta.TrackId, ta.ArtistId });
        modelBuilder.Entity<TrackArtist>()
            .HasOne(ta => ta.Track)
            .WithMany(t => t.TrackArtists)
            .HasForeignKey(ta => ta.TrackId)
            .OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<TrackArtist>()
            .HasOne(ta => ta.Artist)
            .WithMany(a => a.TrackArtists)
            .HasForeignKey(ta => ta.ArtistId)
            .OnDelete(DeleteBehavior.Cascade);

        // Playlists
        modelBuilder.Entity<Playlist>()
            .HasIndex(p => p.SpotifyId)
            .IsUnique();
        modelBuilder.Entity<Playlist>()
            .HasOne(p => p.OwnerUser)
            .WithMany()
            .HasForeignKey(p => p.OwnerUserId)
            .OnDelete(DeleteBehavior.SetNull);

        modelBuilder.Entity<PlaylistTrack>()
            .HasKey(pt => new { pt.PlaylistId, pt.Position });
        modelBuilder.Entity<PlaylistTrack>()
            .HasOne(pt => pt.Playlist)
            .WithMany(p => p.Tracks)
            .HasForeignKey(pt => pt.PlaylistId)
            .OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<PlaylistTrack>()
            .HasOne(pt => pt.Track)
            .WithMany(t => t.PlaylistEntries)
            .HasForeignKey(pt => pt.TrackId)
            .OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<PlaylistTrack>()
            .HasIndex(pt => new { pt.PlaylistId, pt.AddedAt });

        // User state: likes & follows & playlists
        modelBuilder.Entity<UserLikedTrack>()
            .HasKey(ult => new { ult.UserId, ult.TrackId });
        modelBuilder.Entity<UserLikedTrack>()
            .HasOne(ult => ult.User)
            .WithMany()
            .HasForeignKey(ult => ult.UserId)
            .OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<UserLikedTrack>()
            .HasOne(ult => ult.Track)
            .WithMany()
            .HasForeignKey(ult => ult.TrackId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<UserLikedAlbum>()
            .HasKey(ula => new { ula.UserId, ula.AlbumId });
        modelBuilder.Entity<UserLikedAlbum>()
            .HasOne(ula => ula.User)
            .WithMany()
            .HasForeignKey(ula => ula.UserId)
            .OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<UserLikedAlbum>()
            .HasOne(ula => ula.Album)
            .WithMany()
            .HasForeignKey(ula => ula.AlbumId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<UserFollowedArtist>()
            .HasKey(ufa => new { ufa.UserId, ufa.ArtistId });
        modelBuilder.Entity<UserFollowedArtist>()
            .HasOne(ufa => ufa.User)
            .WithMany()
            .HasForeignKey(ufa => ufa.UserId)
            .OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<UserFollowedArtist>()
            .HasOne(ufa => ufa.Artist)
            .WithMany()
            .HasForeignKey(ufa => ufa.ArtistId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<UserPlaylist>()
            .HasKey(up => new { up.UserId, up.PlaylistId });
        modelBuilder.Entity<UserPlaylist>()
            .HasOne(up => up.User)
            .WithMany()
            .HasForeignKey(up => up.UserId)
            .OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<UserPlaylist>()
            .HasOne(up => up.Playlist)
            .WithMany()
            .HasForeignKey(up => up.PlaylistId)
            .OnDelete(DeleteBehavior.Cascade);

        // Listening history
        modelBuilder.Entity<ListeningHistory>()
            .HasIndex(lh => new { lh.UserId, lh.PlayedAt });
        modelBuilder.Entity<ListeningHistory>()
            .HasIndex(lh => lh.DedupeKey)
            .IsUnique();
        modelBuilder.Entity<ListeningHistory>()
            .HasOne(lh => lh.User)
            .WithMany()
            .HasForeignKey(lh => lh.UserId)
            .OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<ListeningHistory>()
            .HasOne(lh => lh.Track)
            .WithMany(t => t.Listens)
            .HasForeignKey(lh => lh.TrackId)
            .OnDelete(DeleteBehavior.Restrict);

        // Social graph
        modelBuilder.Entity<Follow>()
            .HasKey(f => new { f.FollowerUserId, f.FolloweeUserId });
        modelBuilder.Entity<Follow>()
            .HasOne(f => f.Follower)
            .WithMany()
            .HasForeignKey(f => f.FollowerUserId)
            .OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<Follow>()
            .HasOne(f => f.Followee)
            .WithMany()
            .HasForeignKey(f => f.FolloweeUserId)
            .OnDelete(DeleteBehavior.Cascade);

        // Feed posts
        modelBuilder.Entity<Post>()
            .HasIndex(p => new { p.UserId, p.CreatedAt });
        modelBuilder.Entity<Post>()
            .HasOne(p => p.User)
            .WithMany()
            .HasForeignKey(p => p.UserId)
            .OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<Post>()
            .HasOne(p => p.Track)
            .WithMany()
            .HasForeignKey(p => p.TrackId)
            .OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<Post>()
            .HasOne(p => p.Album)
            .WithMany()
            .HasForeignKey(p => p.AlbumId)
            .OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<Post>()
            .HasOne(p => p.Playlist)
            .WithMany()
            .HasForeignKey(p => p.PlaylistId)
            .OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<Post>()
            .HasOne(p => p.Artist)
            .WithMany()
            .HasForeignKey(p => p.ArtistId)
            .OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<Post>()
            .HasOne(p => p.SourceListeningHistory)
            .WithMany()
            .HasForeignKey(p => p.SourceListeningHistoryId)
            .OnDelete(DeleteBehavior.SetNull);

        // Sync state per user
        modelBuilder.Entity<SpotifySyncState>()
            .HasIndex(s => s.UserId)
            .IsUnique();
        modelBuilder.Entity<SpotifySyncState>()
            .HasOne(s => s.User)
            .WithMany()
            .HasForeignKey(s => s.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        // View mapping
        modelBuilder.Entity<UserProfileData>()
            .ToView("UserProfileData")
            .HasKey(u => u.UserId);
    }
}
