import AlbumItem from "@/components/album-item";
import PlaylistItem from "@/components/playlist-item";
import SongItem from "@/components/song-item";
import TabNavigation from "@/components/tab-navigation";
import { Colors, Fonts } from "@/constants/theme";
import { useAuth } from "@/contexts/AuthContext";
import { useColorScheme } from "@/hooks/use-color-scheme";
import useUserContent from "@/hooks/useUserContent";
import followApi from "@/services/followApi";
import profileApi from "@/services/profileApi";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useFocusEffect } from "@react-navigation/native";
import { Image } from "expo-image";
import { RelativePathString, router } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import FollowButton from "./follow-button";

type TabType = string;

const PAGE_SIZE = 50;

// Main user profile component
// If `userId` prop is provided, shows that user's profile; otherwise shows current user's profile
export default function UserProfile({ userId }: { userId?: number }) {
  const insets = useSafeAreaInsets();

  const { isAuthenticated } = useAuth();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = Colors[isDark ? "dark" : "light"];
  const [activeTab, setActiveTab] = useState<TabType>("history");
  const [profileData, setProfileData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Follow state
  const [followCounts, setFollowCounts] = useState<{
    followers: number;
    following: number;
  }>({ followers: 0, following: 0 });

  // Pagination state for each tab
  const [historyOffset, setHistoryOffset] = useState(0);
  const [likedOffset, setLikedOffset] = useState(0);

  const scrollViewRef = useRef<ScrollView>(null);

  const {
    recentTracks,
    likedTracks,
    playlists,
    loading: contentLoading,
    fetchRecentTracks,
    fetchLikedTracks,
    fetchPlaylists,
  } = useUserContent(userId);

  // Determine if viewing own profile or another user's profile
  const isOwnProfile = !userId;

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const groupConsecutiveAlbums = (items: any[]) => {
    if (!items || items.length === 0) return [];

    const grouped: any[] = [];
    let currentAlbumGroup: any = null;

    items.forEach((item, index) => {
      // Handle both enriched and non-enriched formats
      const track = item.track || item;
      const album = track.album;
      const albumId = album?.id;
      const hasAlbum = album != null;

      if (
        currentAlbumGroup &&
        currentAlbumGroup.albumId === albumId &&
        hasAlbum
      ) {
        // Add track to current album group
        currentAlbumGroup.tracks.push({
          id: track.id,
          name: track.name,
          artists: track.artists,
          played_at: item.played_at || item.playedAt,
        });
      } else {
        // Finalize previous group if it exists
        if (currentAlbumGroup) {
          grouped.push(currentAlbumGroup);
        }

        // Start new group
        currentAlbumGroup = {
          type: "album-group",
          albumId: albumId || null,
          albumName: album?.name || "Unknown Album",
          albumCover: album?.image_url || album?.images?.[0]?.url || "",
          artists: track.artists || [],
          tracks: [
            {
              id: track.id,
              name: track.name,
              artists: track.artists || [],
              played_at: item.played_at || item.playedAt,
            },
          ],
        };
      }
    });

    // Add final group
    if (currentAlbumGroup) {
      grouped.push(currentAlbumGroup);
    }

    return grouped;
  };

  const renderContent = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#538ce9ff" />
        </View>
      );
    }

    switch (activeTab) {
      case "history":
        const groupedHistory = groupConsecutiveAlbums(recentTracks || []);

        return (
          <View>
            {groupedHistory.map((group: any, index: number) => {
              if (group.tracks.length > 1) {
                // Multiple consecutive tracks from same album - show as album group
                return (
                  <AlbumItem
                    key={`album-group-${group.albumId}-${index}`}
                    group={group}
                  />
                );
              } else {
                // Single track - show as regular song item
                const track = group.tracks[0];
                return (
                  <SongItem
                    key={`${track.id}-${index}`}
                    id={track.id}
                    title={track.name}
                    artist={track.artists
                      .map((artist: any) => artist.name)
                      .join(", ")}
                    cover={group.albumCover}
                    link={`/song/${track.id}` as RelativePathString}
                  />
                );
              }
            })}
            {contentLoading.tracks && (
              <View style={styles.loadMoreContainer}>
                <ActivityIndicator size="small" color="#538ce9ff" />
              </View>
            )}
            {!contentLoading.tracks && recentTracks?.length === 0 && (
              <Text style={[styles.endOfListText, { color: colors.text }]}>
                No more history to load
              </Text>
            )}
          </View>
        );
      case "playlists":
        return (
          <View style={styles.contentSection}>
            {playlists
              ?.filter((playlist: any) =>
                isOwnProfile
                  ? playlist.owner.id === profileData?.spotifyId
                  : true
              )
              .map((playlist: any) => (
                <PlaylistItem
                  key={playlist.id}
                  id={playlist.id}
                  name={playlist.name}
                  songCount={playlist.tracks?.total || 0}
                  cover={playlist.images[0]?.url || ""}
                  link={`/${"playlist"}/${playlist.id}` as RelativePathString}
                />
              ))}
          </View>
        );
      case "liked":
        return (
          <View style={styles.contentSection}>
            {likedTracks?.map((item: any, index: number) => (
              <SongItem
                key={`${item.track.id}-${index}`}
                id={item.track.id}
                title={item.track.name}
                artist={item.track.artists
                  .map((artist: any) => artist.name)
                  .join(", ")}
                cover={item.track.album?.imageUrl || ""}
                link={`/song/${item.track.id}` as RelativePathString}
              />
            ))}
            {contentLoading.tracks && (
              <View style={styles.loadMoreContainer}>
                <ActivityIndicator size="small" color="#538ce9ff" />
              </View>
            )}
            {!contentLoading.tracks && likedTracks?.length === 0 && (
              <Text style={[styles.endOfListText, { color: colors.text }]}>
                No more liked songs to load
              </Text>
            )}
          </View>
        );
    }
  };

  // Fetch profile data only when screen is focused
  useFocusEffect(
    useCallback(() => {
      const fetchProfileData = async () => {
        if (!isAuthenticated) return;
        try {
          const data = await profileApi.getAppProfile(userId);
          setProfileData(data);

          // Fetch follow counts for this profile
          const profileUserId = userId || data.id;
          if (profileUserId) {
            const counts = await followApi.getFollowCounts(profileUserId);
            setFollowCounts(counts);
          }
        } catch (error) {
          console.error("Failed to fetch profile:", error);
        }
      };
      fetchProfileData();
      // prime hook-managed content for this profile
      fetchRecentTracks(PAGE_SIZE, 0, true).catch(() => {});
      fetchLikedTracks(PAGE_SIZE, 0, true).catch(() => {});
      fetchPlaylists(true).catch(() => {});
    }, [isAuthenticated, userId])
  );

  // recent tracks are loaded via the useUserContent hook

  // playlists are loaded via the useUserContent hook; wrapper kept for compatibility
  const loadPlaylists = useCallback(
    async (refresh = false) => {
      if (!isAuthenticated) return;
      setLoading(true);
      try {
        await fetchPlaylists(true);
      } catch (e) {
        console.error("Failed to fetch playlists:", e);
      } finally {
        setLoading(false);
      }
    },
    [isAuthenticated, fetchPlaylists]
  );

  // liked tracks are managed by the useUserContent hook

  const onRefresh = useCallback(() => {
    switch (activeTab) {
      case "history":
        fetchRecentTracks(PAGE_SIZE, 0, true);
        break;
      case "playlists":
        loadPlaylists(true);
        break;
      case "liked":
        fetchLikedTracks(PAGE_SIZE, 0, true);
        break;
    }
  }, [activeTab, fetchRecentTracks, loadPlaylists, fetchLikedTracks]);

  // pagination/load-more handled by hook or not supported here; no-op
  const loadMore = useCallback(() => {}, [activeTab]);

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { layoutMeasurement, contentOffset, contentSize } =
        event.nativeEvent;
      const paddingToBottom = 100;
      const isCloseToBottom =
        layoutMeasurement.height + contentOffset.y >=
        contentSize.height - paddingToBottom;
      // infinite scroll disabled when using hook-managed content
    },
    []
  );

  // Reset data when userId changes (navigating to different profile)
  useEffect(() => {
    setProfileData(null);
    setHistoryOffset(0);
    setLikedOffset(0);
    setActiveTab("history");
    setFollowCounts({ followers: 0, following: 0 });
    // refresh hook-managed content for the new profile
    fetchRecentTracks(PAGE_SIZE, 0, true).catch(() => {});
    fetchLikedTracks(PAGE_SIZE, 0, true).catch(() => {});
    fetchPlaylists(true).catch(() => {});
  }, [userId]);

  // Initial data load when tab changes (only if data not already loaded)
  useEffect(() => {
    switch (activeTab) {
      case "history":
        if (!recentTracks || recentTracks.length === 0) {
          setHistoryOffset(0);
          fetchRecentTracks(PAGE_SIZE, 0, true).catch(() => {});
        }
        break;
      case "playlists":
        if (!playlists || playlists.length === 0)
          fetchPlaylists(true).catch(() => {});
        break;
      case "liked":
        if (!likedTracks || likedTracks.length === 0) {
          setLikedOffset(0);
          fetchLikedTracks(PAGE_SIZE, 0, true).catch(() => {});
        }
        break;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
          {/* Header Actions */}
          <View style={styles.headerActions}>
            {/* Back button for other users' profiles */}
            {!isOwnProfile ? (
              <Pressable
                style={styles.backButton}
                onPress={() => router.back()}
              >
                <MaterialIcons
                  name="arrow-back"
                  size={24}
                  color={colors.icon}
                />
              </Pressable>
            ) : (
              <View style={styles.spacer} />
            )}
            {/* Settings button only for own profile */}
            {isOwnProfile ? (
              <>
                <Pressable
                  style={styles.mapButton}
                  onPress={() => router.push("/listening-map")}
                >
                  <MaterialIcons name="map" size={24} color={colors.icon} />
                </Pressable>
                <Pressable
                  style={styles.settingsButton}
                  onPress={() => router.push("/(settings)")}
                >
                  <MaterialIcons
                    name="settings"
                    size={24}
                    color={colors.icon}
                  />
                </Pressable>
              </>
            ) : (
              <View style={styles.spacer} />
            )}
          </View>

          {/* Profile Picture */}
          <View style={{ alignItems: "center" }}>
            <View style={styles.profileImageContainer}>
              <Image
                source={{ uri: profileData ? profileData.profileImageUrl : "" }}
                style={styles.profileImage}
              />
            </View>

            {/* Name & Username */}
            <Text style={[styles.profileName, { color: colors.text }]}>
              {profileData ? profileData.displayName : "Unknown"}
            </Text>
            <Text style={{ color: colors.text }}>
              {profileData ? profileData.handle : "unknown"}
            </Text>

            {/* Follow Button for other users' profiles */}
            {!isOwnProfile && (
              <FollowButton
                userId={userId}
                onFollowChange={(isFollowing) => {
                  // Update follower count when follow status changes
                  setFollowCounts((prev) => ({
                    ...prev,
                    followers: isFollowing
                      ? prev.followers + 1
                      : prev.followers - 1,
                  }));
                }}
              />
            )}
          </View>
          {/* Stats Row */}
          <View style={styles.statsContainer}>
            <Pressable style={styles.statItem}>
              <Text style={[styles.statNumber, { color: colors.text }]}>
                {formatNumber(followCounts.followers)}
              </Text>
              <Text
                style={[styles.statLabel, { color: colors.text, opacity: 0.7 }]}
              >
                Followers
              </Text>
            </Pressable>
            <Pressable style={styles.statItem}>
              <Text style={[styles.statNumber, { color: colors.text }]}>
                {formatNumber(followCounts.following)}
              </Text>
              <Text
                style={[styles.statLabel, { color: colors.text, opacity: 0.7 }]}
              >
                Following
              </Text>
            </Pressable>
            <Pressable style={styles.statItem}>
              <Text style={[styles.statNumber, { color: colors.text }]}>
                {formatNumber(0)}
              </Text>
              <Text
                style={[styles.statLabel, { color: colors.text, opacity: 0.7 }]}
              >
                Unique Songs
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Tab Navigation */}
        <View style={styles.tabContainer}>
          <TabNavigation
            tabs={["history", "playlists", "liked"]}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
          />
        </View>

        {/* Content Section */}
        <View style={styles.contentContainer}>{renderContent()}</View>
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
  headerActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    paddingHorizontal: 16,
  },
  spacer: {
    width: 40,
  },
  mapButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  settingsButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  profileImageContainer: {
    marginTop: 8,
    marginBottom: 12,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#fff",
  },
  profileName: {
    fontSize: 24,
    fontWeight: "bold",
    fontFamily: Fonts.rounded,
    marginBottom: 4,
  },
  username: {
    fontSize: 14,
    marginBottom: 20,
  },

  statsContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    paddingHorizontal: 20,
    gap: 12,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: "bold",
    fontFamily: Fonts.rounded,
  },
  statLabel: {
    fontSize: 12,
    marginTop: 2,
  },
  tabContainer: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(128,128,128,0.2)",
  },
  contentContainer: {
    flex: 1,
    minHeight: 400,
  },
  contentSection: {},
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    fontFamily: Fonts.rounded,
    marginBottom: 8,
    paddingTop: 16,
    paddingHorizontal: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    opacity: 0.7,
  },
  loadMoreContainer: {
    paddingVertical: 20,
    alignItems: "center",
  },
  endOfListText: {
    textAlign: "center",
    paddingVertical: 20,
    opacity: 0.5,
    fontSize: 14,
  },
});
