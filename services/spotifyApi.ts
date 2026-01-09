import api from "./api";

class SpotifyApiService {
  // Spotify endpoints
  async getPlaylists(): Promise<any> {
    const response = await api.makeAuthenticatedRequest('/api/spotify/playlists');
    return await response.json();
  }

  async getPlaylist(playlistId: string): Promise<any> {
    const response = await api.makeAuthenticatedRequest(`/api/spotify/playlists/${playlistId}`);
    return await response.json();
  }

  async getPlaylistSongs(playlistId: string): Promise<any> {
    return this.getPlaylist(playlistId);
  }

  async getLikedSongs(): Promise<any> {
    const response = await api.makeAuthenticatedRequest('/api/spotify/liked-songs');
    return await response.json();
  }

  async checkIfSongIsLiked(songId: string): Promise<boolean> {
    const response = await api.makeAuthenticatedRequest(`/api/spotify/songs/${songId}/liked`);
    const data = await response.json();
    return data.isLiked;
  }

  async unlikeSong(songId: string): Promise<void> {
    await api.makeAuthenticatedRequest(`/api/spotify/songs/${songId}/unlike`, {
      method: 'POST',
    });
  }

  async likeSong(songId: string): Promise<void> {
    await api.makeAuthenticatedRequest(`/api/spotify/songs/${songId}/like`, {
      method: 'POST',
    });
  } 

  async getSongDetails(songId: string): Promise<any> {
    const response = await api.makeAuthenticatedRequest(`/api/spotify/songs/${songId}`);
    return await response.json();
  }

  async getNewReleases(): Promise<any> {
    const response = await api.makeAuthenticatedRequest('/api/spotify/new-releases');
    return await response.json();
  }


  async getRecentlyPlayed(): Promise<any> {
    const response = await api.makeAuthenticatedRequest('/api/spotify/recently-played');
    return await response.json();
  }
}

export default new SpotifyApiService();