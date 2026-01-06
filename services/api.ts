import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const API_URL = __DEV__ 
  ? Platform.OS === 'ios' 
    ? 'http://localhost:5000' 
    : 'http://10.0.2.2:5000'
  : 'https://your-production-api.com';

export interface User {
  id: number;
  spotifyId: string;
  displayName: string | null;
  email: string | null;
  profileImageUrl: string | null;
}

export interface AuthResponse {
  token: string;
  user: User;
}

class ApiService {
  private async getToken(): Promise<string | null> {
    return await SecureStore.getItemAsync('jwt_token');
  }

  private async saveToken(token: string): Promise<void> {
    await SecureStore.setItemAsync('jwt_token', token);
  }

  private async clearToken(): Promise<void> {
    await SecureStore.deleteItemAsync('jwt_token');
  }

  async login(): Promise<string> {
    // Return the login URL for WebBrowser to open
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
    await this.saveToken(data.token);
    await SecureStore.setItemAsync('user', JSON.stringify(data.user));
    
    return data;
  }

  async logout(): Promise<void> {
    await this.clearToken();
    await SecureStore.deleteItemAsync('user');
  }

  async getCurrentUser(): Promise<User | null> {
    const userStr = await SecureStore.getItemAsync('user');
    return userStr ? JSON.parse(userStr) : null;
  }

  async isAuthenticated(): Promise<boolean> {
    const token = await this.getToken();
    return token !== null;
  }

  private async makeAuthenticatedRequest(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<Response> {
    const token = await this.getToken();

    if (!token) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    // If unauthorized, clear token and throw
    if (response.status === 401) {
      await this.clearToken();
      throw new Error('Session expired');
    }

    return response;
  }

  // Profile endpoints
  async getProfile(): Promise<any> {
    const response = await this.makeAuthenticatedRequest('/api/profile');
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

  async getRecentlyPlayed(): Promise<any> {
    const response = await this.makeAuthenticatedRequest('/api/spotify/recently-played');
    return await response.json();
  }
}

export default new ApiService();
