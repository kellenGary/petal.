import api from "./api";

export interface Artist {
  id: string;
  name: string;
  images: { url: string; height: number; width: number }[];
  genres: string[];
  followers: { total: number };
  popularity: number;
  external_urls: { spotify: string };
}

// Note: Track interface and getArtistTopTracks removed — Spotify API no longer supports GET /artists/{id}/top-tracks

export interface Album {
  id: string;
  name: string;
  images: { url: string; height: number; width: number }[];
  release_date: string;
  total_tracks: number;
  album_type: string;
  artists: { id: string; name: string }[];
  external_urls: { spotify: string };
}

class ArtistApi {
  async getArtist(id: string): Promise<Artist> {
    const response = await api.makeAuthenticatedRequest(
      `/api/spotify/artists/${id}`,
    );
    if (!response.ok) {
      throw new Error("Failed to fetch artist");
    }
    return response.json();
  }

  async getArtistAlbums(id: string): Promise<{ items: Album[] }> {
    const response = await api.makeAuthenticatedRequest(
      `/api/spotify/artists/${id}/albums`,
    );
    if (!response.ok) {
      throw new Error("Failed to fetch artist albums");
    }
    return response.json();
  }
}

const artistApi = new ArtistApi();
export default artistApi;
