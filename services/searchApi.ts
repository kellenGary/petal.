import api from "@/services/api";

export interface SearchUser {
  id: number;
  displayName: string;
  handle: string;
  profileImageUrl?: string;
}

export interface SearchTrack {
  id: number;
  spotifyId: string;
  name: string;
  durationMs: number;
  albumName?: string;
  albumImageUrl?: string;
  artistName?: string;
}

export interface SearchResults {
  users: SearchUser[];
  tracks: SearchTrack[];
}

class SearchApiService {
  async search(query: string, limit: number = 10): Promise<SearchResults> {
    const response = await api.makeAuthenticatedRequest(
      `/api/search?q=${encodeURIComponent(query)}&limit=${limit}`,
    );

    if (!response.ok) {
      throw new Error("Failed to search");
    }

    return await response.json();
  }
}

export default new SearchApiService();
