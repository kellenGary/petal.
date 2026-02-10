import api from "./api";

/**
 * Recommendation returned from the for-you endpoint
 */
export interface Recommendation {
  trackId: number;
  spotifyId: string;
  name: string;
  artistNames: string[];
  albumName: string | null;
  albumImageUrl: string | null;
  durationMs: number;
  /** Human-readable reason, e.g. "Because you like Radiohead" */
  reason: string;
  /** Type of reason: "artist", "friend", "genre", or "trending" */
  reasonType: string;
  /** Recommendation score 0-1 */
  score: number;
}

export interface RecommendationsResponse {
  recommendations: Recommendation[];
}

/**
 * API service for personalized recommendations.
 */
const recommendationApi = {
  /**
   * Get personalized "For You" recommendations.
   * @param count Number of recommendations (default 5, max 20)
   */
  async getForYouRecommendations(count: number = 5): Promise<Recommendation[]> {
    const response = await api.makeAuthenticatedRequest(
      `/api/recommendation/for-you?count=${count}`,
    );

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ error: "Unknown error" }));
      throw new Error(error.error || "Failed to fetch recommendations");
    }

    const data: RecommendationsResponse = await response.json();
    return data.recommendations;
  },

  /**
   * Record that a user dismissed (didn't engage with) a recommendation.
   * This is used as a negative signal to improve future recommendations.
   * @param trackId The ID of the track that was dismissed
   */
  async dismissRecommendation(trackId: number): Promise<void> {
    const response = await api.makeAuthenticatedRequest(
      "/api/recommendation/dismiss",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trackId }),
      },
    );

    if (!response.ok) {
      console.warn("Failed to record recommendation dismissal");
    }
  },
};

export default recommendationApi;
