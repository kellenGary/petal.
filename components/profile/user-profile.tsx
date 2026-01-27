import { Colors } from "@/constants/theme";
import { useAuth } from "@/contexts/AuthContext";
import { useColorScheme } from "@/hooks/use-color-scheme";
import useTrackStreaks from "@/hooks/useTrackStreaks";
import useUserContent from "@/hooks/useUserContent";
import profileApi, { ProfileData } from "@/services/profileApi";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import ProfileContent from "./profile-content";
import ProfileHeader from "./profile-header";
import ProfileStats from "./profile-stats";

const PAGE_SIZE = 50;

export type TabType = "history" | "playlists" | "liked";

export interface AlbumGroup {
  type: "album-group";
  albumId: string | null;
  albumSpotifyId: string | null;
  albumName: string;
  albumCover: string;
  artists: any[];
  tracks: {
    id: string;
    spotifyId: string;
    name: string;
    artists: any[];
    played_at: string;
  }[];
}

interface UserProfileProps {
  userId?: number;
}

/**
 * Main user profile component.
 * If `userId` prop is provided, shows that user's profile; otherwise shows current user's profile.
 */
export default function UserProfile({ userId }: UserProfileProps) {
  const insets = useSafeAreaInsets();
  const { isAuthenticated } = useAuth();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = Colors[isDark ? "dark" : "light"];

  // Profile-specific state
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>("history");
  const [refreshing, setRefreshing] = useState(false);
  const [followCounts, setFollowCounts] = useState({
    followers: 0,
    following: 0,
  });

  const scrollViewRef = useRef<ScrollView>(null);
  const isOwnProfile = !userId;

  // Use the shared content hook for data fetching
  const {
    topArtists,
    recentTracks,
    likedTracks,
    playlists,
    loading: contentLoading,
    pagination,
    sotd,
    fetchTopArtists,
    fetchRecentTracks,
    fetchLikedTracks,
    fetchPlaylists,
    fetchSotd,
    resetPagination,
  } = useUserContent(userId);

  // Track streaks
  const effectiveUserId = userId ?? profileData?.id;
  const { getStreak } = useTrackStreaks(effectiveUserId);

  // === Utility Functions ===

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const groupConsecutiveAlbums = (items: any[]): AlbumGroup[] => {
    if (!items || items.length === 0) return [];

    const grouped: AlbumGroup[] = [];
    let currentAlbumGroup: AlbumGroup | null = null;

    items.forEach((item) => {
      const track = item.track || item;
      const album = track.album;
      const albumId = album?.id;
      const hasAlbum = album != null;

      if (
        currentAlbumGroup &&
        currentAlbumGroup.albumId === albumId &&
        hasAlbum
      ) {
        currentAlbumGroup.tracks.push({
          id: track.id,
          spotifyId: track.spotify_id,
          name: track.name,
          artists: track.artists,
          played_at: item.played_at || item.playedAt,
        });
      } else {
        if (currentAlbumGroup) {
          grouped.push(currentAlbumGroup);
        }

        currentAlbumGroup = {
          type: "album-group",
          albumId: albumId || null,
          albumSpotifyId: album?.spotifyId || album?.spotify_id || null,
          albumName: album?.name || "Unknown Album",
          albumCover: album?.image_url || album?.images?.[0]?.url || "",
          artists: track.artists || [],
          tracks: [
            {
              id: track.id,
              spotifyId: track.spotify_id,
              name: track.name,
              artists: track.artists || [],
              played_at: item.played_at || item.playedAt,
            },
          ],
        };
      }
    });

    if (currentAlbumGroup) {
      grouped.push(currentAlbumGroup);
    }

    return grouped;
  };

  // === Event Handlers ===

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    const doRefresh = async () => {
      switch (activeTab) {
        case "history":
          await fetchRecentTracks(PAGE_SIZE, 0, true);
          break;
        case "playlists":
          await fetchPlaylists(true);
          break;
        case "liked":
          await fetchLikedTracks(PAGE_SIZE, 0, true);
          break;
      }
      setRefreshing(false);
    };
    doRefresh();
  }, [activeTab, fetchRecentTracks, fetchPlaylists, fetchLikedTracks]);

  const loadMore = useCallback(() => {
    switch (activeTab) {
      case "history":
        if (!contentLoading.tracks && pagination.recentTracks.hasMore) {
          fetchRecentTracks(PAGE_SIZE, recentTracks.length, false);
        }
        break;
      case "liked":
        if (!contentLoading.tracks && pagination.likedTracks.hasMore) {
          fetchLikedTracks(PAGE_SIZE, likedTracks.length, false);
        }
        break;
    }
  }, [
    activeTab,
    contentLoading.tracks,
    pagination.recentTracks.hasMore,
    pagination.likedTracks.hasMore,
    recentTracks.length,
    likedTracks.length,
    fetchRecentTracks,
    fetchLikedTracks,
  ]);

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { layoutMeasurement, contentOffset, contentSize } =
        event.nativeEvent;
      const paddingToBottom = 200;
      const isCloseToBottom =
        layoutMeasurement.height + contentOffset.y >=
        contentSize.height - paddingToBottom;

      if (isCloseToBottom) {
        loadMore();
      }
    },
    [loadMore],
  );

  const handleFollowChange = useCallback((isFollowing: boolean) => {
    setFollowCounts((prev) => ({
      ...prev,
      followers: isFollowing ? prev.followers + 1 : prev.followers - 1,
    }));
  }, []);

  // === Effects ===

  // Fetch profile data when screen is focused
  useFocusEffect(
    useCallback(() => {
      const fetchProfileData = async () => {
        if (!isAuthenticated) return;
        try {
          const data = await profileApi.getAppProfile(userId);
          setProfileData(data);
          setFollowCounts({
            followers: data.totalFollowers,
            following: data.totalFollowing,
          });
        } catch (error) {
          console.error("Failed to fetch profile:", error);
        }
      };

      fetchProfileData();
      fetchRecentTracks(PAGE_SIZE, 0, true).catch(() => { });
      fetchLikedTracks(PAGE_SIZE, 0, true).catch(() => { });
      fetchPlaylists(true).catch(() => { });
      fetchTopArtists(true).catch(() => { });
      fetchSotd().catch(() => { });
    }, [isAuthenticated, userId]),
  );

  // Reset data when userId changes
  useEffect(() => {
    setProfileData(null);
    setActiveTab("history");
    setFollowCounts({ followers: 0, following: 0 });
    resetPagination();
  }, [userId, resetPagination]);

  // Load data on tab change if not already loaded
  useEffect(() => {
    switch (activeTab) {
      case "history":
        if (!recentTracks || recentTracks.length === 0) {
          fetchRecentTracks(PAGE_SIZE, 0, true).catch(() => { });
        }
        break;
      case "playlists":
        if (!playlists || playlists.length === 0) {
          fetchPlaylists(true).catch(() => { });
        }
        break;
      case "liked":
        if (!likedTracks || likedTracks.length === 0) {
          fetchLikedTracks(PAGE_SIZE, 0, true).catch(() => { });
        }
        break;
    }
  }, [activeTab, isAuthenticated]);

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top },
        { backgroundColor: colors.background },
      ]}
    >
      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        bounces={true}
        onScroll={handleScroll}
        scrollEventThrottle={400}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.text}
            colors={["#538ce9ff"]}
          />
        }
      >
        <View style={styles.headerContainer}>
          <ProfileHeader
            profileData={profileData}
            isOwnProfile={isOwnProfile}
            sotd={sotd}
            userId={userId}
            onFollowChange={handleFollowChange}
          />

          <ProfileStats
            followCounts={followCounts}
            profileData={profileData}
            topArtists={topArtists}
            formatNumber={formatNumber}
          />
        </View>

        <ProfileContent
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          loading={false}
          contentLoading={contentLoading}
          recentTracks={recentTracks}
          likedTracks={likedTracks}
          playlists={playlists}
          isOwnProfile={isOwnProfile}
          spotifyId={profileData?.spotifyId}
          groupConsecutiveAlbums={groupConsecutiveAlbums}
          getStreak={getStreak}
        />

        {/* Footer spacer */}
        <View style={styles.footerSpacer} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  headerContainer: {
    paddingBottom: 24,
    alignItems: "center",
    gap: 8,
  },
  footerSpacer: {
    height: 168,
  },
});
