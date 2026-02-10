import api from "./api";

export interface TrendingTrack {
  id: number;
  spotifyId: string;
  name: string;
  playCount: number;
  uniqueListeners: number;
  artists: string[];
  album: {
    id: number;
    name: string;
    image_url: string;
  } | null;
}

export interface TrendingArtist {
  id: number;
  spotifyId: string;
  name: string;
  imageUrl: string | null;
  playCount: number;
  uniqueListeners: number;
}

export interface TrendingAlbum {
  id: number;
  spotifyId: string;
  name: string;
  imageUrl: string | null;
  playCount: number;
  uniqueListeners: number;
}

class TrendingApiService {
  /**
   * Get trending tracks across all users.
   * @param limit - Maximum number of tracks to return
   * @param days - Number of days to look back
   */
  async getTrendingTracks(
    limit: number = 20,
    days: number = 7,
  ): Promise<TrendingTrack[]> {
    const response = await api.makeAuthenticatedRequest(
      `/api/trending/tracks?limit=${limit}&days=${days}`,
    );
    if (!response.ok) {
      throw new Error(`Failed to get trending tracks: ${response.statusText}`);
    }
    return await response.json();
  }

  /**
   * Get trending artists across all users.
   * @param limit - Maximum number of artists to return
   * @param days - Number of days to look back
   */
  async getTrendingArtists(
    limit: number = 20,
    days: number = 7,
  ): Promise<TrendingArtist[]> {
    const response = await api.makeAuthenticatedRequest(
      `/api/trending/artists?limit=${limit}&days=${days}`,
    );
    if (!response.ok) {
      throw new Error(`Failed to get trending artists: ${response.statusText}`);
    }
    return await response.json();
  }

  /**
   * Get trending albums across all users.
   * @param limit - Maximum number of albums to return
   * @param days - Number of days to look back
   */
  async getTrendingAlbums(
    limit: number = 20,
    days: number = 7,
  ): Promise<TrendingAlbum[]> {
    const response = await api.makeAuthenticatedRequest(
      `/api/trending/albums?limit=${limit}&days=${days}`,
    );
    if (!response.ok) {
      throw new Error(`Failed to get trending albums: ${response.statusText}`);
    }
    return await response.json();
  }
}

export default new TrendingApiService();
