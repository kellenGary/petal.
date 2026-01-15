import AlbumCard from "@/components/album-card";
import PlaylistCard from "@/components/playlist-card";
import SectionHeader from "@/components/section-header";
import SongCard from "@/components/song-card";
import UserCard from "@/components/user-card";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import dbApi from "@/services/dbApi";
import followApi from "@/services/followApi";
import { useCallback, useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function ExploreScreen() {
  const [users, setUsers] = useState<any[]>([]);
  const [followStatus, setFollowStatus] = useState<Record<number, boolean>>({});
  const [loadingFollows, setLoadingFollows] = useState<Record<number, boolean>>(
    {}
  );
  const [trendingSongs, setTrendingSongs] = useState<any[]>([]);
  const [trendingAlbums, setTrendingAlbums] = useState<any[]>([]);
  const [trendingPlaylists, setTrendingPlaylists] = useState<any[]>([]);

  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = Colors[isDark ? "dark" : "light"];

  useEffect(() => {
    const fetchData = async () => {
      try {
        const usersData = await dbApi.getAllUsers();
        const usersList = usersData?.slice(0, 5) || [];
        setUsers(usersList);

        // Fetch follow status for all users
        if (usersList.length > 0) {
          const userIds = usersList.map((u: any) => u.id);
          const statuses = await followApi.getFollowStatusBatch(userIds);
          setFollowStatus(statuses);
        }

        // TODO: Add API endpoints for trending data
        // const songs = await dbApi.getTrendingSongs();
        // const albums = await dbApi.getTrendingAlbums();
        // const playlists = await dbApi.getTrendingPlaylists();
      } catch (error) {
        console.error("Error fetching explore data:", error);
      }
    };
    fetchData();
  }, []);

  const handleToggleFollow = useCallback(
    async (userId: number) => {
      // Prevent multiple simultaneous requests for the same user
      if (loadingFollows[userId]) return;

      setLoadingFollows((prev) => ({ ...prev, [userId]: true }));

      try {
        const currentStatus = followStatus[userId] || false;
        const newStatus = await followApi.toggleFollow(userId, currentStatus);
        setFollowStatus((prev) => ({ ...prev, [userId]: newStatus }));
      } catch (error) {
        console.error("Error toggling follow:", error);
      } finally {
        setLoadingFollows((prev) => ({ ...prev, [userId]: false }));
      }
    },
    [followStatus, loadingFollows]
  );

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top },
        { backgroundColor: colors.background },
      ]}
    >
      <ScrollView
        style={[styles.scrollContainer]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            Explore
          </Text>
          <Text
            style={[styles.headerSubtitle, { color: colors.tabIconDefault }]}
          >
            Discover new music and creators
          </Text>
        </View>

        {/* Recommended Accounts Section */}
        <View style={styles.section}>
          <SectionHeader title="Recommended Accounts" />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.horizontalScroll}
          >
            {users.map((user) => (
              <View key={user.id} style={styles.userCardWrapper}>
                <UserCard
                  user={user}
                  isFollowing={followStatus[user.id] || false}
                  isLoading={loadingFollows[user.id] || false}
                  onToggleFollow={handleToggleFollow}
                />
              </View>
            ))}
          </ScrollView>
        </View>

        {/* Trending Songs Section */}
        <View style={styles.section}>
          <SectionHeader title="Trending Songs" />
          <View>
            {[1, 2, 3].map((index) => (
              <SongCard
                key={index}
                song={{
                  title: `Trending Song ${index}`,
                  artist: "Artist Name",
                }}
              />
            ))}
          </View>
        </View>

        {/* Trending Albums Section */}
        <View style={styles.section}>
          <SectionHeader title="Trending Albums" />
          <View style={styles.gridContainer}>
            {[1, 2, 3, 4].map((index) => (
              <View key={index} style={styles.gridItem}>
                <AlbumCard
                  album={{ title: `Album ${index}`, artist: "Artist Name" }}
                />
              </View>
            ))}
          </View>
        </View>

        {/* Trending Playlists Section */}
        <View style={styles.section}>
          <SectionHeader title="Trending Playlists" />
          <View style={styles.gridContainer}>
            {[1, 2, 3, 4].map((index) => (
              <View key={index} style={styles.gridItem}>
                <PlaylistCard
                  playlist={{
                    name: `Playlist ${index}`,
                    trackCount: Math.floor(Math.random() * 50) + 10,
                  }}
                />
              </View>
            ))}
          </View>
        </View>

        <View style={styles.spacer} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: "800",
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
  },
  section: {
    marginBottom: 32,
    paddingHorizontal: 16,
  },
  horizontalScroll: {
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  userCardWrapper: {
    marginRight: 12,
  },
  gridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  gridItem: {
    width: "48%",
  },
  spacer: {
    height: 100,
  },
});
