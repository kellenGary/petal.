import api from "./api";

export interface PlaylistSyncResult {
  success: boolean;
  playlistsAdded: number;
  playlistsUpdated: number;
  playlistsRemoved: number;
  syncedAt: string;
}

export interface SavedTracksSyncResult {
  success: boolean;
  tracksAdded: number;
  tracksRemoved: number;
  totalLikedTracks: number;
  syncedAt: string;
}

export interface SavedAlbumsSyncResult {
  success: boolean;
  albumsAdded: number;
  albumsRemoved: number;
  totalSavedAlbums: number;
  syncedAt: string;
}

export interface FollowedArtistsSyncResult {
  success: boolean;
  artistsAdded: number;
  artistsRemoved: number;
  totalFollowedArtists: number;
  syncedAt: string;
}

class SpotifyApiService {
  // Sync playlists from Spotify to database
  async syncPlaylists(): Promise<PlaylistSyncResult> {
    const response = await api.makeAuthenticatedRequest(
      "/api/spotify/playlists/sync",
      {
        method: "POST",
      },
    );
    return await response.json();
  }

  // Sync saved/liked tracks from Spotify to database
  async syncSavedTracks(): Promise<SavedTracksSyncResult> {
    const response = await api.makeAuthenticatedRequest(
      "/api/spotify/tracks/saved/sync",
      {
        method: "POST",
      },
    );
    return await response.json();
  }

  // Sync saved albums from Spotify to database
  async syncSavedAlbums(): Promise<SavedAlbumsSyncResult> {
    const response = await api.makeAuthenticatedRequest(
      "/api/spotify/albums/saved/sync",
      {
        method: "POST",
      },
    );
    return await response.json();
  }

  // Sync followed artists from Spotify to database
  async syncFollowedArtists(): Promise<FollowedArtistsSyncResult> {
    const response = await api.makeAuthenticatedRequest(
      "/api/spotify/artists/following/sync",
      {
        method: "POST",
      },
    );
    return await response.json();
  }

  // Sync all user data from Spotify
  async syncAll(): Promise<{
    playlists: PlaylistSyncResult;
    tracks: SavedTracksSyncResult;
    albums: SavedAlbumsSyncResult;
    artists: FollowedArtistsSyncResult;
  }> {
    const [playlists, tracks, albums, artists] = await Promise.all([
      this.syncPlaylists(),
      this.syncSavedTracks(),
      this.syncSavedAlbums(),
      this.syncFollowedArtists(),
    ]);
    return { playlists, tracks, albums, artists };
  }

  // Spotify endpoints
  async getPlaylists(userId?: string): Promise<any> {
    const response = await api.makeAuthenticatedRequest(
      "/api/spotify/playlists",
    );
    return await response.json();
  }

  async getPlaylist(playlistId: string): Promise<any> {
    const response = await api.makeAuthenticatedRequest(
      `/api/spotify/playlists/${playlistId}`,
    );
    return await response.json();
  }

  // Fetch playlist with tracks from database (synced from Spotify)
  async getPlaylistSongs(playlistId: string): Promise<any> {
    const response = await api.makeAuthenticatedRequest(
      `/api/UserData/playlist/${playlistId}`,
    );
    return await response.json();
  }

  async getLikedSongs(userId?: string): Promise<any> {
    const response = await api.makeAuthenticatedRequest(
      "/api/spotify/tracks/liked",
    );
    return await response.json();
  }

  async checkIfSongIsLiked(songId: string): Promise<boolean> {
    const response = await api.makeAuthenticatedRequest(
      `/api/spotify/tracks/${songId}/liked`,
    );
    const data = await response.json();
    return data.isLiked;
  }

  async unlikeSong(songId: string): Promise<void> {
    await api.makeAuthenticatedRequest(`/api/spotify/tracks/${songId}/like`, {
      method: "DELETE",
    });
  }

  async likeSong(songId: string): Promise<void> {
    await api.makeAuthenticatedRequest(`/api/spotify/tracks/${songId}/like`, {
      method: "PUT",
    });
  }

  async getSongDetails(songId: string): Promise<any> {
    const response = await api.makeAuthenticatedRequest(
      `/api/spotify/tracks/${songId}`,
    );
    return await response.json();
  }

  // Note: getNewReleases removed — Spotify API no longer supports GET /browse/new-releases

  async getRecentlyPlayed(userId?: string): Promise<any> {
    const response = await api.makeAuthenticatedRequest(
      "/api/spotify/tracks/recently-played",
    );
    return await response.json();
  }

  // Check if album is saved in user's library
  async checkIfAlbumIsSaved(albumId: string): Promise<boolean> {
    const response = await api.makeAuthenticatedRequest(
      `/api/spotify/albums/${albumId}/saved`,
    );
    const data = await response.json();
    return data.isSaved;
  }

  // Save album to user's library
  async saveAlbum(albumId: string): Promise<void> {
    await api.makeAuthenticatedRequest(`/api/spotify/albums/${albumId}/save`, {
      method: "PUT",
    });
  }

  // Remove album from user's library
  async unsaveAlbum(albumId: string): Promise<void> {
    await api.makeAuthenticatedRequest(`/api/spotify/albums/${albumId}/save`, {
      method: "DELETE",
    });
  }

  // Fetch album with tracks from database (or cached from Spotify)
  async getAlbumWithTracks(albumId: string): Promise<any> {
    const response = await api.makeAuthenticatedRequest(
      `/api/UserData/album/${albumId}`,
    );
    return await response.json();
  }
}

export default new SpotifyApiService();
