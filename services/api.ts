import { Platform } from 'react-native';

const API_URL = __DEV__ 
  ? Platform.OS === 'ios' 
    ? 'http://localhost:5164' 
    : 'http://10.0.2.2:5164'
  : 'https://your-production-api.com';

export interface User {
  id: number;
  spotifyId: string;
  displayName: string | null;
  handle: string | null;
  bio: string | null;
  email: string | null;
  profileImageUrl: string | null;
  hasCompletedProfile: boolean;
}

export interface AuthResponse {
  token: string;
  isNewUser: boolean;
  user: User;
}

class ApiService {
  private token: string | null = null;
  private onUnauthorized?: () => void;

  setAuthToken(token: string | null) {
    this.token = token;
  }

  setUnauthorizedHandler(handler: () => void) {
    this.onUnauthorized = handler;
  }

  async login(): Promise<string> {
    return `${API_URL}/api/auth/login`;
  }

  async handleAuthCallback(code: string, state: string): Promise<AuthResponse> {
    const response = await fetch(
      `${API_URL}/api/auth/callback?code=${code}&state=${state}`
    );

    if (!response.ok) {
      throw new Error('Authentication failed');
    }

    const data: AuthResponse = await response.json();
    return data;
  }

  private async makeAuthenticatedRequest(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<Response> {
    if (!this.token) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
    });

    // If unauthorized, clear token and throw
    if (response.status === 401) {
      if (this.onUnauthorized) {
        this.onUnauthorized();
      }
      throw new Error('Session expired');
    }

    return response;
  }

  // Profile endpoints
  async getProfile(): Promise<any> {
    const response = await this.makeAuthenticatedRequest('/api/profile');
    return await response.json();
  }

  async getAppProfile(): Promise<User> {
    const response = await this.makeAuthenticatedRequest('/api/profile/app');
    return await response.json();
  }

  async updateAppProfile(payload: Partial<Pick<User, 'displayName' | 'handle' | 'bio'>>): Promise<User> {
    const response = await this.makeAuthenticatedRequest('/api/profile/app', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    return await response.json();
  }

  async getProfileStats(): Promise<any> {
    const response = await this.makeAuthenticatedRequest('/api/profile/stats');
    return await response.json();
  }

  // Spotify endpoints
  async getPlaylists(): Promise<any> {
    const response = await this.makeAuthenticatedRequest('/api/spotify/playlists');
    return await response.json();
  }

  async getPlaylist(playlistId: string): Promise<any> {
    const response = await this.makeAuthenticatedRequest(`/api/spotify/playlists/${playlistId}`);
    return await response.json();
  }

  async getPlaylistSongs(playlistId: string): Promise<any> {
    return this.getPlaylist(playlistId);
  }

  async getSongDetails(songId: string): Promise<any> {
    const response = await this.makeAuthenticatedRequest(`/api/spotify/songs/${songId}`);
    return await response.json();
  }

  async getRecentlyPlayed(): Promise<any> {
    const response = await this.makeAuthenticatedRequest('/api/spotify/recently-played');
    return await response.json();
  }

  async getCurrentlyPlaying(): Promise<any> {
    const response = await this.makeAuthenticatedRequest('/api/spotify/currently-playing');
    return await response.json();
  }

  async getPlayerState(): Promise<any> {
    const response = await this.makeAuthenticatedRequest('/api/spotify/player-state');
    return await response.json();
  }

  async getNewReleases(): Promise<any> {
    const response = await this.makeAuthenticatedRequest('/api/spotify/new-releases');
    return await response.json();
  }

  async getLikedSongs(): Promise<any> {
    const response = await this.makeAuthenticatedRequest('/api/spotify/liked-songs');
    return await response.json();
  }

  async play(): Promise<void> {
    await this.makeAuthenticatedRequest('/api/spotify/play', { method: 'POST' });
  }

  async pause(): Promise<void> {
    await this.makeAuthenticatedRequest('/api/spotify/pause', { method: 'POST' });
  }

  async next(): Promise<void> {
    await this.makeAuthenticatedRequest('/api/spotify/next', { method: 'POST' });
  }

  async previous(): Promise<void> {
    await this.makeAuthenticatedRequest('/api/spotify/previous', { method: 'POST' });
  }

  async setShuffle(state: boolean): Promise<void> {
    await this.makeAuthenticatedRequest(`/api/spotify/shuffle?state=${state}`, { method: 'POST' });
  }

  async setRepeat(state: 'track' | 'context' | 'off'): Promise<void> {
    await this.makeAuthenticatedRequest(`/api/spotify/repeat?state=${state}`, { method: 'POST' });
  }
}

export default new ApiService();
