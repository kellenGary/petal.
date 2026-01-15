import api from "./api";

interface AddListeningHistoryPayload {
  trackId: number;
  msPlayed: number;
  playedAt?: string;
  contextUri?: string;
  deviceType?: string;
  latitude?: number;
  longitude?: number;
}

interface ListeningHistoryEntry {
  id: number;
  trackId: number;
  playedAt: string;
  msPlayed: number;
  contextUri?: string;
  deviceType?: string;
  source: string;
}

interface ListeningHistoryResponse {
  total: number;
  limit: number;
  offset: number;
  items: ListeningHistoryEntry[];
}

interface Artist {
  id: number;
  spotify_id: string;
  name: string;
}

interface Album {
  id: number;
  spotify_id: string;
  name: string;
  image_url?: string;
  release_date?: string;
}

interface TrackInfo {
  id: number;
  spotify_id: string;
  name: string;
  duration_ms: number;
  explicit: boolean;
  popularity?: number;
  album?: Album;
  artists: Artist[];
}

interface EnrichedListeningHistoryEntry {
  id: number;
  played_at: string;
  ms_played: number;
  context_uri?: string;
  device_type?: string;
  source: string;
  track: TrackInfo;
}

interface EnrichedListeningHistoryResponse {
  total: number;
  limit: number;
  offset: number;
  items: EnrichedListeningHistoryEntry[];
}

// Types for location-based listening history (map view)
interface LocationTrackInfo {
  id: number;
  spotify_id: string;
  name: string;
  album?: {
    id: number;
    name: string;
    image_url?: string;
  };
  artists: {
    id: number;
    name: string;
  }[];
}

export interface LocationHistoryEntry {
  id: number;
  played_at: string;
  latitude: number;
  longitude: number;
  location_accuracy?: number;
  track: LocationTrackInfo;
}

interface LocationHistoryResponse {
  total: number;
  limit: number;
  offset: number;
  items: LocationHistoryEntry[];
}

class ListeningHistoryService {
  private lastTrackedSpotifyId: string | null = null;

  /**
   * Adds listening history for the currently playing track using Spotify ID.
   * This enables real-time location tracking without waiting for Spotify's Recently Played API delay.
   * 
   * @param spotifyTrackId - The Spotify ID of the currently playing track
   * @param progressMs - Current playback position in milliseconds
   * @param latitude - Optional latitude for location tracking
   * @param longitude - Optional longitude for location tracking
   */
  async addCurrentlyPlaying(
    spotifyTrackId: string,
    progressMs: number,
    latitude?: number,
    longitude?: number
  ): Promise<{ trackName?: string; error?: string }> {
    // Deduplicate on client side as well to reduce API calls
    if (this.lastTrackedSpotifyId === spotifyTrackId) {
      return { trackName: "Already tracked" };
    }

    const payload: {
      spotifyTrackId: string;
      progressMs: number;
      playedAt: string;
      latitude?: number;
      longitude?: number;
    } = {
      spotifyTrackId,
      progressMs,
      playedAt: new Date().toISOString(),
    };

    if (latitude !== undefined && longitude !== undefined) {
      payload.latitude = latitude;
      payload.longitude = longitude;
    }

    const response = await api.makeAuthenticatedRequest(
      "/api/listeninghistory/add-current",
      {
        method: "POST",
        body: JSON.stringify(payload),
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { error: errorData.error || response.statusText };
    }

    const data = await response.json();
    this.lastTrackedSpotifyId = spotifyTrackId;
    console.log("[ListeningHistory] Added currently playing:", data.trackName, latitude ? `at (${latitude}, ${longitude})` : "");
    return { trackName: data.trackName };
  }

  private lastTrackedId: number | null = null;
  
  /**
   * Adds a listening history entry with optional location data.
   * Call this when a track finishes playing in the app.
   * 
   * @param trackId - The ID of the track in the database
   * @param msPlayed - Milliseconds of the track that was played
   * @param playedAt - When the track was played (defaults to now)
   * @param contextUri - Optional Spotify context URI (playlist, album, etc)
   * @param deviceType - Optional device type (smartphone, speaker, etc)
   * @param latitude - Optional latitude for map tracking
   * @param longitude - Optional longitude for map tracking
   */
  async addListeningHistory(
    trackId: number,
    msPlayed: number,
    playedAt?: string,
    contextUri?: string,
    deviceType?: string,
    latitude?: number,
    longitude?: number
  ): Promise<void> {
    if (this.lastTrackedId === trackId) {
      return;
    }
    const payload: AddListeningHistoryPayload = {
      trackId,
      msPlayed,
      ...(playedAt && { playedAt }),
      ...(contextUri && { contextUri }),
      ...(deviceType && { deviceType }),
      ...(latitude !== undefined && { latitude }),
      ...(longitude !== undefined && { longitude }),
    };

    const response = await api.makeAuthenticatedRequest(
      "/api/listeninghistory/add",
      {
        method: "POST",
        body: JSON.stringify(payload),
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      throw new Error(
        `Failed to add listening history: ${response.statusText}`
      );
    }
    this.lastTrackedId = trackId;
  }

  /**
   * Records when a track has finished playing.
   * Includes optional location data for map tracking.
   * 
   * @param trackId - The ID of the track that was played
   * @param durationMs - Total duration of the track in milliseconds
   * @param latitude - Optional latitude
   * @param longitude - Optional longitude
   */
  async recordTrackCompletion(
    trackId: number,
    durationMs: number,
    latitude?: number,
    longitude?: number
  ): Promise<void> {
    await this.addListeningHistory(
      trackId,
      durationMs,
      new Date().toISOString(),
      undefined,
      "smartphone",
      latitude,
      longitude
    );
  }

  /**
   * Syncs recently played tracks from Spotify.
   * Should be called periodically (every 1-5 minutes) in the background.
   * Returns the number of new tracks synced.
   * 
   * @param latitude - Optional current latitude for location tracking
   * @param longitude - Optional current longitude for location tracking
   */
  async syncRecentlyPlayed(latitude?: number, longitude?: number): Promise<number> {
    const body: { latitude?: number; longitude?: number } = {};
    if (latitude !== undefined && longitude !== undefined) {
      body.latitude = latitude;
      body.longitude = longitude;
    }

    const response = await api.makeAuthenticatedRequest(
      "/api/listeninghistory/sync",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to sync recently played: ${response.statusText}`);
    }

    const data = await response.json();
    return data.tracksAdded || 0;
  }

  /**
   * Gets listening history for the current user.
   * 
   * @param limit - Number of records to return (1-1000, default 50)
   * @param offset - Number of records to skip (default 0)
   * @param withLocation - Filter by location data (true = with location, false = without, null = all)
   */
  async getListeningHistory(
    limit: number = 50,
    offset: number = 0,
    withLocation?: boolean
  ): Promise<ListeningHistoryResponse> {
    const params = new URLSearchParams();
    params.append("limit", Math.min(Math.max(limit, 1), 1000).toString());
    params.append("offset", Math.max(offset, 0).toString());
    if (withLocation !== null && withLocation !== undefined) {
      params.append("withLocation", withLocation.toString());
    }

    const response = await api.makeAuthenticatedRequest(
      `/api/listeninghistory?${params.toString()}`
    );

    if (!response.ok) {
      throw new Error(
        `Failed to fetch listening history: ${response.statusText}`
      );
    }

    return await response.json();
  }

  /**
   * Gets all listening history entries (paginated).
   * Useful for scrolling or infinite load scenarios.
   */
  async getAllListeningHistory(pageSize: number = 50): Promise<ListeningHistoryEntry[]> {
    const allEntries: ListeningHistoryEntry[] = [];
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
      const response = await this.getListeningHistory(pageSize, offset);
      allEntries.push(...response.items);

      if (response.items.length < pageSize) {
        hasMore = false;
      } else {
        offset += pageSize;
      }
    }

    return allEntries;
  }

  /**
   * Gets enriched listening history with full track, album, and artist details.
   * 
   * @param limit - Number of records to return (1-1000, default 50)
   * @param offset - Number of records to skip (default 0)
   * @param userId - Optional user ID to fetch history for another user
   */
  async getEnrichedListeningHistory(
    limit: number = 50,
    offset: number = 0,
    userId?: number
  ): Promise<EnrichedListeningHistoryResponse> {
    const params = new URLSearchParams();
    params.append("limit", Math.min(Math.max(limit, 1), 1000).toString());
    params.append("offset", Math.max(offset, 0).toString());

    const endpoint = userId 
      ? `/api/listeninghistory/enriched/${userId}?${params.toString()}`
      : `/api/listeninghistory/enriched?${params.toString()}`;

    const response = await api.makeAuthenticatedRequest(endpoint);

    if (!response.ok) {
      throw new Error(
        `Failed to fetch enriched listening history: ${response.statusText}`
      );
    }

    return await response.json();
  }

  /**
   * Gets all enriched listening history entries (paginated).
   * Useful for scrolling or infinite load scenarios with complete track details.
   */
  async getAllEnrichedListeningHistory(pageSize: number = 50): Promise<EnrichedListeningHistoryEntry[]> {
    const allEntries: EnrichedListeningHistoryEntry[] = [];
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
      const response = await this.getEnrichedListeningHistory(pageSize, offset);
      allEntries.push(...response.items);

      if (response.items.length < pageSize) {
        hasMore = false;
      } else {
        offset += pageSize;
      }
    }

    return allEntries;
  }

  /**
   * Gets listening history entries with location data for map display.
   * Only returns entries that have valid latitude and longitude coordinates.
   * 
   * @param limit - Number of records to return (1-1000, default 500)
   * @param offset - Number of records to skip (default 0)
   */
  async getListeningHistoryWithLocation(
    limit: number = 500,
    offset: number = 0
  ): Promise<LocationHistoryResponse> {
    const params = new URLSearchParams();
    params.append("limit", Math.min(Math.max(limit, 1), 1000).toString());
    params.append("offset", Math.max(offset, 0).toString());

    const response = await api.makeAuthenticatedRequest(
      `/api/listeninghistory/with-location?${params.toString()}`
    );

    if (!response.ok) {
      throw new Error(
        `Failed to fetch listening history with location: ${response.statusText}`
      );
    }

    return await response.json();
  }
}

export default new ListeningHistoryService();
