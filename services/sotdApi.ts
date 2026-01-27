import api from "./api";

export interface SongOfTheDayResponse {
  songOfTheDay: {
    id: string;
    name: string;
    artists: string[];
    album: {
      id: string;
      name: string;
      image_url: string;
    };
  } | null;
}

class SotdApiService {
  /**
   * Set the song of the day for the current user
   * @param trackId - Database track ID (numeric)
   */
  async setSongOfTheDay(
    trackId: number,
  ): Promise<{ success: boolean; date: string }> {
    const response = await api.makeAuthenticatedRequest("/api/songoftheday", {
      method: "POST",
      body: JSON.stringify({ trackId }),
    });

    if (!response.ok) {
      throw new Error(`Failed to set song of the day: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Get song of the day for current user or specified user
   * @param userId - Optional user ID to fetch SOTD for another user
   */
  async getSongOfTheDay(userId?: number): Promise<SongOfTheDayResponse> {
    const endpoint = userId
      ? `/api/songoftheday/${userId}`
      : "/api/songoftheday";

    const response = await api.makeAuthenticatedRequest(endpoint);

    if (!response.ok) {
      throw new Error(`Failed to get song of the day: ${response.statusText}`);
    }

    return await response.json();
  }
}

export default new SotdApiService();
