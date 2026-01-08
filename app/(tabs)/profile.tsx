import api from "@/services/api";
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

type TabType = "history" | "playlists" | "liked";

export default function ProfileScreen() {
  const { isAuthenticated } = useAuth();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<TabType>("history");
  const [profileData, setProfileData] = useState<any>(null);
  const [historyData, setHistoryData] = useState<any>(null);
  const [playlistsData, setPlaylistsData] = useState<any>(null);
  const [likedSongsData, setLikedSongsData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const colors = Colors[isDark ? "dark" : "light"];

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
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
        return (
          <View style={styles.contentSection}>
            <Text style={styles.sectionTitle}>Recently Played</Text>
            {historyData?.items?.map((item: any, index: number) => (
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
      case "playlists":
        return (
          <View style={styles.contentSection}>
            <Text style={styles.sectionTitle}>Your Playlists</Text>
            {playlistsData?.items
              ?.filter((playlist: any) => playlist.owner.id === profileData?.spotifyId)
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
            <Text style={styles.sectionTitle}>Liked Songs</Text>
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
          const data = await api.getAppProfile();
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
      const data = await api.getRecentlyPlayed();
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
      const data = await api.getPlaylists();
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
      const data = await api.getLikedSongs();
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
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        bounces={true}
        contentContainerStyle={{ paddingTop: insets.top }}
      >
        <View style={styles.headerContainer}>
          {/* Settings Button */}
          <View style={styles.headerActions}>
            <View style={styles.spacer} />
            <Pressable
              style={styles.settingsButton}
              onPress={() => router.push("/(settings)")}
            >
              <MaterialIcons name="settings" size={24} color="#000000ff" />
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
            <Text style={styles.profileName} lightColor="#fff" darkColor="#fff">
              {profileData ? profileData.displayName : "Unknown"}
            </Text>
            <Text>{profileData ? profileData.handle : "unknown"}</Text>
          </View>
          {/* Stats Row */}
          <View style={styles.statsContainer}>
            <Pressable style={styles.statItem}>
              <Text
                style={styles.statNumber}
                lightColor="#fff"
                darkColor="#fff"
              >
                {formatNumber(0)}
              </Text>
              <Text
                style={styles.statLabel}
                lightColor="rgba(255,255,255,0.7)"
                darkColor="rgba(255,255,255,0.7)"
              >
                Followers
              </Text>
            </Pressable>
            <Pressable style={styles.statItem}>
              <Text
                style={styles.statNumber}
                lightColor="#fff"
                darkColor="#fff"
              >
                {formatNumber(0)}
              </Text>
              <Text
                style={styles.statLabel}
                lightColor="rgba(255,255,255,0.7)"
                darkColor="rgba(255,255,255,0.7)"
              >
                Following
              </Text>
            </Pressable>
            <Pressable style={styles.statItem}>
              <Text
                style={styles.statNumber}
                lightColor="#fff"
                darkColor="#fff"
              >
                {formatNumber(0)}
              </Text>
              <Text
                style={styles.statLabel}
                lightColor="rgba(255,255,255,0.7)"
                darkColor="rgba(255,255,255,0.7)"
              >
                Unique Songs
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Tab Navigation */}
        <View
          style={[styles.tabContainer, { backgroundColor: colors.background }]}
        >
          <Pressable
            style={[styles.tab, activeTab === "history" && styles.activeTab]}
            onPress={() => setActiveTab("history")}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === "history" && styles.activeTabText,
              ]}
            >
              History
            </Text>
          </Pressable>
          <Pressable
            style={[styles.tab, activeTab === "playlists" && styles.activeTab]}
            onPress={() => setActiveTab("playlists")}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === "playlists" && styles.activeTabText,
              ]}
            >
              Playlists
            </Text>
          </Pressable>
          <Pressable
            style={[styles.tab, activeTab === "liked" && styles.activeTab]}
            onPress={() => setActiveTab("liked")}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === "liked" && styles.activeTabText,
              ]}
            >
              Liked
            </Text>
          </Pressable>
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
    paddingTop: 16,
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
    color: "black",
  },
  username: {
    fontSize: 14,
    marginBottom: 20,
    color: "black",
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
    color: "black",
  },
  statLabel: {
    fontSize: 12,
    marginTop: 2,
    color: "black",
  },
  tabContainer: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(128,128,128,0.2)",
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    gap: 6,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: "#538ce9ff",
  },
  tabText: {
    fontSize: 13,
    fontWeight: "500",
  },
  activeTabText: {
    color: "#538ce9ff",
    fontWeight: "600",
  },
  contentContainer: {
    flex: 1,
    minHeight: 400,
  },
  contentSection: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    fontFamily: Fonts.rounded,
    marginBottom: 16,
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
