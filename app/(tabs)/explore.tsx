import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import dbApi from "@/services/dbApi";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function ExploreScreen() {
  const [users, setUsers] = useState<any[]>([]);
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
        setUsers(usersData?.slice(0, 5) || []);

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

  const SectionHeader = ({ title }: { title: string }) => (
    <View style={styles.sectionHeader}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
      <Pressable>
        <Text style={[styles.seeAll, { color: colors.tint }]}>See All</Text>
      </Pressable>
    </View>
  );

  const UserCard = ({ user }: { user: any }) => (
    <Pressable
      style={[styles.userCard, { borderColor: colors.tabIconDefault }]}
    >
      <View
        style={[styles.userAvatar, { backgroundColor: colors.tabIconDefault }]}
      >
        <Text style={styles.avatarText}>
          {user.displayName?.[0]?.toUpperCase() || "?"}
        </Text>
      </View>
      <Text style={[styles.userName, { color: colors.text }]} numberOfLines={1}>
        {user.displayName}
      </Text>
      <Pressable
        style={[styles.followButton, { backgroundColor: colors.tint }]}
      >
        <Text style={styles.followButtonText}>Follow</Text>
      </Pressable>
    </Pressable>
  );

  const SongCard = ({ song }: { song: any }) => (
    <Pressable style={[styles.itemCard, { backgroundColor: colors.card }]}>
      <View
        style={[styles.itemImage, { backgroundColor: colors.tabIconDefault }]}
      />
      <View style={styles.itemInfo}>
        <Text
          style={[styles.itemTitle, { color: colors.text }]}
          numberOfLines={1}
        >
          {song.title || "Unknown Song"}
        </Text>
        <Text
          style={[styles.itemSubtitle, { color: colors.tabIconDefault }]}
          numberOfLines={1}
        >
          {song.artist || "Unknown Artist"}
        </Text>
      </View>
    </Pressable>
  );

  const AlbumCard = ({ album }: { album: any }) => (
    <Pressable style={[styles.gridCard, { backgroundColor: colors.card }]}>
      <View
        style={[styles.albumCover, { backgroundColor: colors.tabIconDefault }]}
      />
      <Text
        style={[styles.gridCardTitle, { color: colors.text }]}
        numberOfLines={2}
      >
        {album.title || "Unknown Album"}
      </Text>
      <Text
        style={[styles.gridCardSubtitle, { color: colors.tabIconDefault }]}
        numberOfLines={1}
      >
        {album.artist || "Unknown Artist"}
      </Text>
    </Pressable>
  );

  const PlaylistCard = ({ playlist }: { playlist: any }) => (
    <Pressable style={[styles.gridCard, { backgroundColor: colors.card }]}>
      <View
        style={[
          styles.playlistCover,
          { backgroundColor: colors.tabIconDefault },
        ]}
      />
      <Text
        style={[styles.gridCardTitle, { color: colors.text }]}
        numberOfLines={2}
      >
        {playlist.name || "Unknown Playlist"}
      </Text>
      <Text
        style={[styles.gridCardSubtitle, { color: colors.tabIconDefault }]}
        numberOfLines={1}
      >
        {playlist.trackCount || 0} songs
      </Text>
    </Pressable>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }, {backgroundColor: colors.background}]}>
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
                <UserCard user={user} />
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
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  seeAll: {
    fontSize: 13,
    fontWeight: "500",
  },
  horizontalScroll: {
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  userCardWrapper: {
    marginRight: 12,
  },
  userCard: {
    width: 100,
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  userAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: "700",
    color: "#fff",
  },
  userName: {
    fontSize: 13,
    fontWeight: "500",
    marginBottom: 8,
    textAlign: "center",
  },
  followButton: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 6,
    width: "100%",
  },
  followButtonText: {
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
  },
  itemCard: {
    flexDirection: "row",
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 8,
    alignItems: "center",
  },
  itemImage: {
    width: 56,
    height: 56,
    borderRadius: 8,
    marginRight: 12,
  },
  itemInfo: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 4,
  },
  itemSubtitle: {
    fontSize: 12,
  },
  gridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  gridItem: {
    width: "48%",
  },
  gridCard: {
    borderRadius: 12,
    overflow: "hidden",
  },
  albumCover: {
    width: "100%",
    aspectRatio: 1,
    marginBottom: 8,
    borderRadius: 8,
  },
  playlistCover: {
    width: "100%",
    aspectRatio: 1,
    marginBottom: 8,
    borderRadius: 8,
  },
  gridCardTitle: {
    fontSize: 13,
    fontWeight: "600",
    paddingHorizontal: 8,
    marginBottom: 4,
  },
  gridCardSubtitle: {
    fontSize: 11,
    paddingHorizontal: 8,
    marginBottom: 8,
  },
  spacer: {
    height: 100,
  },
});
