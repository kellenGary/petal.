import spotifyApi from "@/services/spotifyApi";
import profileApi from "@/services/profileApi";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useFocusEffect } from "@react-navigation/native";
import { Image } from "expo-image";
import { RelativePathString, router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import PlaylistItem from "@/components/playlist-item";
import SongItem from "@/components/song-item";
import { Colors, Fonts } from "@/constants/theme";
import { useAuth } from "@/contexts/AuthContext";
import { useColorScheme } from "@/hooks/use-color-scheme";
import AlbumItem from "@/components/album-item";
import TabNavigation from "@/components/tab-navigation";

type TabType = string;

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();

  const { isAuthenticated } = useAuth();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = Colors[isDark ? "dark" : "light"];
  const [activeTab, setActiveTab] = useState<TabType>("history");
  const [profileData, setProfileData] = useState<any>(null);
  const [historyData, setHistoryData] = useState<any>(null);
  const [playlistsData, setPlaylistsData] = useState<any>(null);
  const [likedSongsData, setLikedSongsData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

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
      const albumId = item.track?.album?.id;

      if (currentAlbumGroup && currentAlbumGroup.albumId === albumId) {
        // Add track to current album group
        currentAlbumGroup.tracks.push({
          id: item.track.id,
          name: item.track.name,
          artists: item.track.artists,
          playedAt: item.played_at,
        });
      } else {
        // Finalize previous group if it exists
        if (currentAlbumGroup) {
          grouped.push(currentAlbumGroup);
        }

        // Start new group
        currentAlbumGroup = {
          type: "album-group",
          albumId: albumId,
          albumName: item.track.album.name,
          albumCover: item.track.album.images[0]?.url || "",
          artists: item.track.artists,
          tracks: [
            {
              id: item.track.id,
              name: item.track.name,
              artists: item.track.artists,
              playedAt: item.played_at,
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
        const groupedHistory = groupConsecutiveAlbums(historyData?.items || []);

        return (
          <View>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Recently Played
            </Text>
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
          </View>
        );
      case "playlists":
        return (
          <View style={styles.contentSection}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Your Playlists
            </Text>
            {playlistsData?.items
              ?.filter(
                (playlist: any) => playlist.owner.id === profileData?.spotifyId
              )
              .map((playlist: any) => (
                <PlaylistItem
                  key={playlist.id}
                  id={playlist.id}
                  name={playlist.name}
                  songCount={playlist.tracks.total}
                  cover={playlist.images[0]?.url || ""}
                  link={`/${"playlist"}/${playlist.id}` as RelativePathString}
                />
              ))}
          </View>
        );
      case "liked":
        return (
          <View style={styles.contentSection}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Liked Songs
            </Text>
            {likedSongsData?.items?.map((item: any, index: number) => (
              <SongItem
                key={`${item.track.id}-${index}`}
                id={item.track.id}
                title={item.track.name}
                artist={item.track.artists
                  .map((artist: any) => artist.name)
                  .join(", ")}
                cover={item.track.album.images[0]?.url || ""}
                link={`/${"song"}/${item.track.id}` as RelativePathString}
              />
            ))}
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
          const data = await profileApi.getAppProfile();
          setProfileData(data);
        } catch (error) {
          console.error("Failed to fetch profile:", error);
        }
      };

      fetchProfileData();
    }, [isAuthenticated])
  );

  const fetchHistory = async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    try {
      const data = await spotifyApi.getRecentlyPlayed();
      setHistoryData(data);
    } catch (error) {
      console.error("Failed to fetch listening history:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPlaylists = async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    try {
      const data = await spotifyApi.getPlaylists();
      setPlaylistsData(data);
    } catch (error) {
      console.error("Failed to fetch playlists:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLikedSongs = async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    try {
      const data = await spotifyApi.getLikedSongs();
      setLikedSongsData(data);
    } catch (error) {
      console.error("Failed to fetch liked songs:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    switch (activeTab) {
      case "history":
        fetchHistory();
        break;
      case "playlists":
        fetchPlaylists();
        break;
      case "liked":
        fetchLikedSongs();
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
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        bounces={true}
      >
        <View style={styles.headerContainer}>
          {/* Settings Button */}
          <View style={styles.headerActions}>
            <View style={styles.spacer} />
            <Pressable
              style={styles.settingsButton}
              onPress={() => router.push("/(settings)")}
            >
              <MaterialIcons name="settings" size={24} color={colors.icon} />
            </Pressable>
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
          </View>
          {/* Stats Row */}
          <View style={styles.statsContainer}>
            <Pressable style={styles.statItem}>
              <Text style={[styles.statNumber, { color: colors.text }]}>
                {formatNumber(0)}
              </Text>
              <Text
                style={[styles.statLabel, { color: colors.text, opacity: 0.7 }]}
              >
                Followers
              </Text>
            </Pressable>
            <Pressable style={styles.statItem}>
              <Text style={[styles.statNumber, { color: colors.text }]}>
                {formatNumber(0)}
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
  settingsButton: {
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
  contentSection: {
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    fontFamily: Fonts.rounded,
    marginBottom: 8,
    paddingTop: 16,
    paddingHorizontal: 16
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
});
