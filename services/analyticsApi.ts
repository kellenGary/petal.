import api from "./api";

export interface AnalyticsOverview {
  period: string;
  totalPlays: number;
  totalMinutes: number;
  uniqueTracks: number;
}

export interface TopTrack {
  id: number;
  spotifyId: string;
  name: string;
  playCount: number;
  totalMinutes: number;
  artists: string[];
  album: {
    id: number;
    name: string;
    image_url: string;
  } | null;
}

export interface TopArtist {
  id: number;
  spotifyId: string;
  name: string;
  imageUrl: string | null;
  playCount: number;
}

export interface TopAlbum {
  id: number;
  spotifyId: string;
  name: string;
  imageUrl: string | null;
  playCount: number;
}

class AnalyticsApiService {
  /**
   * Get an overview of listening analytics for the specified time period.
   * @param days - Number of days to look back (7, 30, 90, or 0 for all time)
   */
  async getOverview(days: number = 7): Promise<AnalyticsOverview> {
    const response = await api.makeAuthenticatedRequest(
      `/api/analytics/overview?days=${days}`,
    );
    if (!response.ok) {
      throw new Error(
        `Failed to get analytics overview: ${response.statusText}`,
      );
    }
    return await response.json();
  }

  /**
   * Get the user's top tracks for the specified time period.
   * @param days - Number of days to look back
   * @param limit - Maximum number of tracks to return
   */
  async getTopTracks(
    days: number = 7,
    limit: number = 10,
  ): Promise<TopTrack[]> {
    const response = await api.makeAuthenticatedRequest(
      `/api/analytics/top-tracks?days=${days}&limit=${limit}`,
    );
    if (!response.ok) {
      throw new Error(`Failed to get top tracks: ${response.statusText}`);
    }
    return await response.json();
  }

  /**
   * Get the user's top artists for the specified time period.
   * @param days - Number of days to look back
   * @param limit - Maximum number of artists to return
   */
  async getTopArtists(
    days: number = 7,
    limit: number = 10,
  ): Promise<TopArtist[]> {
    const response = await api.makeAuthenticatedRequest(
      `/api/analytics/top-artists?days=${days}&limit=${limit}`,
    );
    if (!response.ok) {
      throw new Error(`Failed to get top artists: ${response.statusText}`);
    }
    return await response.json();
  }

  /**
   * Get the user's top albums for the specified time period.
   * @param days - Number of days to look back
   * @param limit - Maximum number of albums to return
   */
  async getTopAlbums(
    days: number = 7,
    limit: number = 10,
  ): Promise<TopAlbum[]> {
    const response = await api.makeAuthenticatedRequest(
      `/api/analytics/top-albums?days=${days}&limit=${limit}`,
    );
    if (!response.ok) {
      throw new Error(`Failed to get top albums: ${response.statusText}`);
    }
    return await response.json();
  }
}

export default new AnalyticsApiService();
