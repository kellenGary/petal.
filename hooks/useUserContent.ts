import { FeedTrack } from "@/services/feedApi";
import listeningHistoryApi from "@/services/listeningHistoryApi";
import profileApi from "@/services/profileApi";
import userDataApi from "@/services/userDataApi";
import { useCallback, useState } from "react";

type LoadingFlags = {
  tracks: boolean;
  albums: boolean;
  playlists: boolean;
  artists: boolean;
  topArtists: boolean;
  sotd: boolean;
};

type PaginationState = {
  recentTracks: { total: number; hasMore: boolean };
  likedTracks: { total: number; hasMore: boolean };
  likedAlbums: { total: number; hasMore: boolean };
  followedArtists: { total: number; hasMore: boolean };
  topArtists: { total: number; hasMore: boolean };
};

export default function useUserContent(userId?: number) {
  const [recentTracks, setRecentTracks] = useState<FeedTrack[]>([]);
  const [likedTracks, setLikedTracks] = useState<FeedTrack[]>([]);
  const [likedAlbums, setLikedAlbums] = useState<any[]>([]);
  const [playlists, setPlaylists] = useState<any[]>([]);
  const [followedArtists, setFollowedArtists] = useState<any[]>([]);
  const [topArtists, setTopArtists] = useState<any[]>([]);
  const [sotd, setSotd] = useState<any | null>(null);

  const [loading, setLoading] = useState<LoadingFlags>({
    tracks: false,
    albums: false,
    playlists: false,
    artists: false,
    topArtists: false,
    sotd: false,
  });

  const [pagination, setPagination] = useState<PaginationState>({
    recentTracks: { total: 0, hasMore: true },
    likedTracks: { total: 0, hasMore: true },
    likedAlbums: { total: 0, hasMore: true },
    followedArtists: { total: 0, hasMore: true },
    topArtists: { total: 0, hasMore: true },
  });

  /**
   * Transform enriched listening history entry to FeedTrack format
   */
  const transformToFeedTrack = (entry: any): FeedTrack => ({
    id: entry.track?.id ?? 0,
    spotifyId: entry.track?.spotify_id ?? "",
    name: entry.track?.name ?? "Unknown Track",
    artistNames: entry.track?.artists?.map((a: any) => a.name) ?? [],
    albumName: entry.track?.album?.name ?? null,
    albumImageUrl: entry.track?.album?.image_url ?? null,
    durationMs: entry.track?.duration_ms ?? 0,
  });

  /**
   * Fetch recent tracks with pagination support
   * @param limit - Number of items to fetch
   * @param offset - Offset for pagination
   * @param refresh - If true, replaces data; if false, appends data
   */
  const fetchRecentTracks = useCallback(
    async (limit = 50, offset = 0, refresh = false) => {
      // Skip if not refreshing and already have data at offset 0
      if (!refresh && offset === 0 && recentTracks.length > 0) {
        return { items: recentTracks, total: pagination.recentTracks.total };
      }

      // Skip if loading or no more data (unless refreshing)
      if (!refresh && (loading.tracks || !pagination.recentTracks.hasMore)) {
        return { items: recentTracks, total: pagination.recentTracks.total };
      }

      setLoading((s) => ({ ...s, tracks: true }));
      try {
        const data = await listeningHistoryApi.getEnrichedListeningHistory(
          limit,
          offset,
          userId,
        );
        const rawItems = data.items || [];
        const newItems = rawItems.map(transformToFeedTrack);

        if (refresh || offset === 0) {
          setRecentTracks(newItems);
        } else {
          setRecentTracks((prev) => [...prev, ...newItems]);
        }

        const total = data.total || 0;
        const hasMore = offset + newItems.length < total;
        setPagination((prev) => ({
          ...prev,
          recentTracks: { total, hasMore },
        }));

        return { items: newItems, total };
      } finally {
        setLoading((s) => ({ ...s, tracks: false }));
      }
    },
    [recentTracks.length, userId, loading.tracks, pagination.recentTracks],
  );

  /**
   * Transform liked track item to FeedTrack format
   */
  const transformLikedTrackToFeedTrack = (item: any): FeedTrack => ({
    id: parseInt(item.track?.id, 10) || 0,
    spotifyId: item.track?.id ?? "",
    name: item.track?.name ?? "Unknown Track",
    artistNames: item.track?.artists?.map((a: any) => a.name) ?? [],
    albumName: item.track?.album?.name ?? null,
    albumImageUrl: item.track?.album?.imageUrl ?? null,
    durationMs: item.track?.durationMs ?? 0,
  });

  /**
   * Fetch liked tracks with pagination support
   */
  const fetchLikedTracks = useCallback(
    async (limit = 50, offset = 0, refresh = false) => {
      if (!refresh && offset === 0 && likedTracks.length > 0) {
        return { items: likedTracks, total: pagination.likedTracks.total };
      }

      if (!refresh && (loading.tracks || !pagination.likedTracks.hasMore)) {
        return { items: likedTracks, total: pagination.likedTracks.total };
      }

      setLoading((s) => ({ ...s, tracks: true }));
      try {
        const data = await userDataApi.getLikedTracks(limit, offset, userId);
        const rawItems = data.items || [];
        const newItems = rawItems.map(transformLikedTrackToFeedTrack);

        if (refresh || offset === 0) {
          setLikedTracks(newItems);
        } else {
          setLikedTracks((prev) => [...prev, ...newItems]);
        }

        const total = data.total || 0;
        const hasMore = offset + newItems.length < total;
        setPagination((prev) => ({
          ...prev,
          likedTracks: { total, hasMore },
        }));

        return { items: newItems, total };
      } finally {
        setLoading((s) => ({ ...s, tracks: false }));
      }
    },
    [likedTracks.length, userId, loading.tracks, pagination.likedTracks],
  );

  /**
   * Fetch liked albums with pagination support
   */
  const fetchLikedAlbums = useCallback(
    async (limit = 50, offset = 0, refresh = false) => {
      if (!refresh && offset === 0 && likedAlbums.length > 0) {
        return { items: likedAlbums, total: pagination.likedAlbums.total };
      }

      if (!refresh && (loading.albums || !pagination.likedAlbums.hasMore)) {
        return { items: likedAlbums, total: pagination.likedAlbums.total };
      }

      setLoading((s) => ({ ...s, albums: true }));
      try {
        const data = await userDataApi.getLikedAlbums(limit, offset, userId);
        const newItems = data.items || [];

        if (refresh || offset === 0) {
          setLikedAlbums(newItems);
        } else {
          setLikedAlbums((prev) => [...prev, ...newItems]);
        }

        const total = data.total || 0;
        const hasMore = offset + newItems.length < total;
        setPagination((prev) => ({
          ...prev,
          likedAlbums: { total, hasMore },
        }));

        return data;
      } finally {
        setLoading((s) => ({ ...s, albums: false }));
      }
    },
    [likedAlbums.length, userId, loading.albums, pagination.likedAlbums],
  );

  /**
   * Fetch playlists (no pagination - playlists are typically not paginated)
   */
  const fetchPlaylists = useCallback(
    async (refresh = false) => {
      if (!refresh && playlists.length > 0) return { items: playlists };
      setLoading((s) => ({ ...s, playlists: true }));
      try {
        const data = await userDataApi.getPlaylists(userId);
        setPlaylists(data.items || []);
        return data;
      } finally {
        setLoading((s) => ({ ...s, playlists: false }));
      }
    },
    [playlists.length, userId],
  );

  /**
   * Fetch followed artists with pagination support
   */
  const fetchFollowedArtists = useCallback(
    async (limit = 50, offset = 0, refresh = false) => {
      if (!refresh && offset === 0 && followedArtists.length > 0) {
        return {
          items: followedArtists,
          total: pagination.followedArtists.total,
        };
      }

      if (
        !refresh &&
        (loading.artists || !pagination.followedArtists.hasMore)
      ) {
        return {
          items: followedArtists,
          total: pagination.followedArtists.total,
        };
      }

      setLoading((s) => ({ ...s, artists: true }));
      try {
        const data = await userDataApi.getFollowedArtists(
          limit,
          offset,
          userId,
        );
        const newItems = data.items || [];

        if (refresh || offset === 0) {
          setFollowedArtists(newItems);
        } else {
          setFollowedArtists((prev) => [...prev, ...newItems]);
        }

        const total = data.total || 0;
        const hasMore = offset + newItems.length < total;
        setPagination((prev) => ({
          ...prev,
          followedArtists: { total, hasMore },
        }));

        return data;
      } finally {
        setLoading((s) => ({ ...s, artists: false }));
      }
    },
    [
      followedArtists.length,
      userId,
      loading.artists,
      pagination.followedArtists,
    ],
  );

  const fetchSotd = useCallback(async () => {
    setLoading((s) => ({ ...s, sotd: true }));
    try {
      const data = await profileApi.getSotd(userId);
      setSotd(data.songOfTheDay);
    } finally {
      setLoading((s) => ({ ...s, sotd: false }));
    }
  }, [userId]);

  /**
   * Reset pagination state (call when userId changes)
   */
  const resetPagination = useCallback(() => {
    setPagination({
      recentTracks: { total: 0, hasMore: true },
      likedTracks: { total: 0, hasMore: true },
      likedAlbums: { total: 0, hasMore: true },
      followedArtists: { total: 0, hasMore: true },
      topArtists: { total: 0, hasMore: true },
    });
    setRecentTracks([]);
    setLikedTracks([]);
    setLikedAlbums([]);
    setPlaylists([]);
    setFollowedArtists([]);
    setTopArtists([]);
    setSotd(null);
  }, []);

  const refreshAll = useCallback(async () => {
    await Promise.all([
      fetchLikedTracks(50, 0, true),
      fetchLikedAlbums(50, 0, true),
      fetchPlaylists(true),
      fetchFollowedArtists(50, 0, true),
    ]);
  }, [
    fetchLikedAlbums,
    fetchLikedTracks,
    fetchPlaylists,
    fetchFollowedArtists,
  ]);

  // helper to avoid repeating nested field lookup logic in many screens
  const searchItems = useCallback(
    (items: any[], searchFields: string[], query: string) => {
      if (!query || !query.trim()) return items;
      const q = query.toLowerCase();
      return items.filter((item) =>
        searchFields.some((field) => {
          const value = field
            .split(".")
            .reduce((obj: any, key) => obj?.[key], item);
          return value?.toString().toLowerCase().includes(q);
        }),
      );
    },
    [],
  );

  const fetchTopArtists = useCallback(
    async (refresh = false) => {
      if (!refresh && topArtists.length > 0) {
        return { items: topArtists };
      }

      if (!refresh && loading.topArtists) {
        return { items: topArtists };
      }

      setLoading((s) => ({ ...s, topArtists: true }));
      try {
        const data = await profileApi.getTopArtists(userId);
        // Spotify API returns { topItems: { items: [...] } }
        const items = data?.topItems?.items || [];
        setTopArtists(items);
        return { items };
      } catch (error) {
        console.error("Failed to fetch top artists:", error);
        return { items: [] };
      } finally {
        setLoading((s) => ({ ...s, topArtists: false }));
      }
    },
    [topArtists.length, userId, loading.topArtists],
  );

  return {
    sotd,
    topArtists,
    recentTracks,
    likedTracks,
    likedAlbums,
    playlists,
    followedArtists,
    loading,
    pagination,
    fetchSotd,
    fetchTopArtists,
    fetchRecentTracks,
    fetchLikedTracks,
    fetchLikedAlbums,
    fetchPlaylists,
    fetchFollowedArtists,
    resetPagination,
    refreshAll,
    searchItems,
  };
}
