import SongItem from "@/components/song-item";
import { Colors } from "@/constants/theme";
import api from "@/services/api";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import Entypo from '@expo/vector-icons/Entypo';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  useColorScheme,
  View,
  Image,
  Pressable,
} from "react-native";

export default function PlaylistScreen() {
  const { id } = useLocalSearchParams();
  const [playlist, setPlaylist] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [tracks, setTracks] = useState<any[]>([]);
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = Colors[isDark ? "dark" : "light"];

  useEffect(() => {
    if (!id) return;

    async function fetchPlaylist() {
      setLoading(true);
      try {
        const fetchedPlaylist = await api.getPlaylistSongs(id as string);
        setPlaylist(fetchedPlaylist);
        setTracks(fetchedPlaylist.tracks.items);
      } catch (error) {
        console.error("Error fetching playlist:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchPlaylist();
  }, [id]);

  if (loading) {
    return (
      <View
        style={[
          styles.loadingContainer,
          { backgroundColor: colors.background },
        ]}
      >
        <ActivityIndicator size="large" color="#1DB954" />
        <Text style={[styles.loadingText, { color: colors.text }]}>
          Loading playlist...
        </Text>
      </View>
    );
  }

  if (!playlist) {
    return (
      <View
        style={[styles.errorContainer, { backgroundColor: colors.background }]}
      >
        <Text style={styles.errorText}>No playlist found.</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <Stack.Screen
        options={{
          title: playlist.name || "Playlist",
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
        }}
      />
      <Pressable onPress={() => router.back()} style={{ marginBottom: 16 }}>
        <Entypo name="chevron-left" size={24} color="black" />
      </Pressable>
      <View
        style={[
          styles.header,
          {
            backgroundColor: colors.background,
            borderBottomColor: isDark ? "#333" : "#eee",
          },
        ]}
      >
        <Image
          source={{ uri: playlist.images[0]?.url || "" }}
          style={{ width: 150, height: 150, borderRadius: 8, marginBottom: 12 }}
        />
        <View>
          <Text style={[styles.playlistName, { color: colors.text }]}>
            {playlist.name}
          </Text>
          <Text style={[styles.playlistStats, { color: colors.text }]}>
            {tracks.length} tracks
          </Text>
        </View>
      </View>
      <View style={styles.trackList}>
        {tracks.map((item, index) => (
          <SongItem
            key={`${item.track.id}-${index}`}
            id={item.track.id}
            title={item.track.name}
            artist={item.track.artists
              .map((artist: any) => artist.name)
              .join(", ")}
            cover={item.track.album.images[0]?.url || ""}
            link={item.track.external_urls.spotify}
          />
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 48,
    paddingHorizontal: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorText: {
    fontSize: 18,
    color: "#ff4444",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    gap: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  playlistName: {
    fontSize: 24,
    fontWeight: "bold",
  },
  playlistStats: {
    fontSize: 14,
    color: "#666",
    marginTop: 4,
  },
  trackList: {
  },
});
