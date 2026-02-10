import { ThemedText } from '@/components/ui/themed-text';
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import artistApi, { Album, Artist, Track } from "@/services/artistApi";
import playbackApi from "@/services/playbackApi";
import { MaterialIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function ArtistScreen() {
  const { id } = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const [artist, setArtist] = useState<Artist | null>(null);
  const [topTracks, setTopTracks] = useState<Track[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = Colors[isDark ? "dark" : "light"];
  useEffect(() => {
    if (!id) return;

    async function fetchArtistData() {
      setLoading(true);
      setError(null);
      try {
        const [artistData, tracksData, albumsData] = await Promise.all([
          artistApi.getArtist(id as string),
          artistApi.getArtistTopTracks(id as string),
          artistApi.getArtistAlbums(id as string),
        ]);
        setArtist(artistData);
        setTopTracks(tracksData.tracks || []);
        setAlbums(albumsData.items || []);
      } catch (err) {
        console.error("Error fetching artist data:", err);
        setError("Failed to load artist");
      } finally {
        setLoading(false);
      }
    }

    fetchArtistData();
  }, [id]);

  const handlePlayTrack = useCallback((trackId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    playbackApi.playSong(trackId);
  }, []);

  const handleTrackPress = useCallback((trackId: string) => {
    router.push(`/song/${trackId}` as any);
  }, []);

  const handleAlbumPress = useCallback((albumId: string) => {
    // Could navigate to album page if we add one
    router.push(`/playlist/${albumId}` as any);
  }, []);

  const formatFollowers = (count: number): string => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    }
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  };

  const formatDuration = (ms: number): string => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  if (loading) {
    return (
      <View
        style={[
          styles.loadingContainer,
          { backgroundColor: colors.background },
        ]}
      />
    );
  }

  if (error || !artist) {
    return (
      <View
        style={[styles.errorContainer, { backgroundColor: colors.background }]}
      >
        <MaterialIcons name="person-off" size={48} color={colors.icon} />
        <ThemedText style={[styles.errorText, { color: colors.text }]}>
          {error || "Artist not found"}
        </ThemedText>
      </View>
    );
  }

  const artistImage = artist.images?.[0]?.url;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
      showsVerticalScrollIndicator={false}
    >
      <Stack.Screen options={{ title: artist.name, headerShown: false }} />

      {/* Artist Header */}
      <View style={styles.header}>
        <Image
          source={{ uri: artistImage || "" }}
          style={styles.artistImage}
          contentFit="cover"
        />
        <ThemedText style={[styles.artistName, { color: colors.text }]}>
          {artist.name}
        </ThemedText>
        {artist.genres?.length > 0 && (
          <ThemedText style={[styles.genres, { color: colors.icon }]}>
            {artist.genres.slice(0, 3).join(" • ")}
          </ThemedText>
        )}
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <ThemedText style={[styles.statValue, { color: colors.text }]}>
              {formatFollowers(artist.followers?.total || 0)}
            </ThemedText>
            <ThemedText style={[styles.statLabel, { color: colors.icon }]}>
              Followers
            </ThemedText>
          </View>
          <View style={styles.stat}>
            <ThemedText style={[styles.statValue, { color: colors.text }]}>
              {artist.popularity}
            </ThemedText>
            <ThemedText style={[styles.statLabel, { color: colors.icon }]}>
              Popularity
            </ThemedText>
          </View>
        </View>
      </View>

      {/* Top Tracks Section */}
      {topTracks.length > 0 && (
        <View style={styles.section}>
          <ThemedText style={[styles.sectionTitle, { color: colors.text }]}>
            Top Tracks
          </ThemedText>
          <View style={[styles.trackList, { backgroundColor: colors.card }]}>
            {topTracks.slice(0, 5).map((track, index) => (
              <Pressable
                key={track.id}
                style={styles.trackItem}
                onPress={() => handleTrackPress(track.id)}
              >
                <ThemedText style={[styles.trackIndex, { color: colors.icon }]}>
                  {index + 1}
                </ThemedText>
                <Image
                  source={{
                    uri:
                      track.album?.images?.[2]?.url ||
                      track.album?.images?.[0]?.url ||
                      "",
                  }}
                  style={styles.trackAlbumArt}
                />
                <View style={styles.trackInfo}>
                  <ThemedText
                    style={[styles.trackName, { color: colors.text }]}
                    numberOfLines={1}
                  >
                    {track.name}
                  </ThemedText>
                  <ThemedText
                    style={[styles.trackAlbum, { color: colors.icon }]}
                    numberOfLines={1}
                  >
                    {track.album?.name}
                  </ThemedText>
                </View>
                <ThemedText style={[styles.trackDuration, { color: colors.icon }]}>
                  {formatDuration(track.duration_ms)}
                </ThemedText>
                <Pressable
                  style={styles.playButton}
                  onPress={() => handlePlayTrack(track.id)}
                  hitSlop={8}
                >
                  <MaterialIcons
                    name="play-circle-filled"
                    size={28}
                    color={Colors.primary}
                  />
                </Pressable>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      {/* Albums Section */}
      {albums.length > 0 && (
        <View style={styles.section}>
          <ThemedText style={[styles.sectionTitle, { color: colors.text }]}>
            Albums & Singles
          </ThemedText>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.albumsScroll}
          >
            {albums.map((album) => (
              <Pressable
                key={album.id}
                style={styles.albumCard}
                onPress={() => handleAlbumPress(album.id)}
              >
                <Image
                  source={{
                    uri: album.images?.[1]?.url || album.images?.[0]?.url || "",
                  }}
                  style={styles.albumImage}
                />
                <ThemedText
                  style={[styles.albumName, { color: colors.text }]}
                  numberOfLines={2}
                >
                  {album.name}
                </ThemedText>
                <ThemedText style={[styles.albumYear, { color: colors.icon }]}>
                  {album.release_date?.split("-")[0]} • {album.album_type}
                </ThemedText>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 48,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  errorText: {
    fontSize: 18,
    fontWeight: "600",
  },
  header: {
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  artistImage: {
    width: 180,
    height: 180,
    borderRadius: 90,
    marginBottom: 16,
  },
  artistName: {
    fontSize: 28,
    fontWeight: "bold",
    textAlign: "center",
  },
  genres: {
    fontSize: 14,
    marginTop: 8,
    textAlign: "center",
  },
  statsRow: {
    flexDirection: "row",
    gap: 40,
    marginTop: 20,
  },
  stat: {
    alignItems: "center",
  },
  statValue: {
    fontSize: 20,
    fontWeight: "700",
  },
  statLabel: {
    fontSize: 12,
    marginTop: 2,
  },
  section: {
    paddingHorizontal: 20,
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 12,
  },
  trackList: {
    borderRadius: 12,
    overflow: "hidden",
  },
  trackItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 10,
  },
  trackIndex: {
    width: 20,
    fontSize: 14,
    textAlign: "center",
  },
  trackAlbumArt: {
    width: 44,
    height: 44,
    borderRadius: 4,
  },
  trackInfo: {
    flex: 1,
    gap: 2,
  },
  trackName: {
    fontSize: 15,
    fontWeight: "500",
  },
  trackAlbum: {
    fontSize: 13,
  },
  trackDuration: {
    fontSize: 13,
    marginRight: 4,
  },
  playButton: {
    padding: 4,
  },
  albumsScroll: {
    gap: 14,
  },
  albumCard: {
    width: 140,
  },
  albumImage: {
    width: 140,
    height: 140,
    borderRadius: 8,
    marginBottom: 8,
  },
  albumName: {
    fontSize: 14,
    fontWeight: "600",
  },
  albumYear: {
    fontSize: 12,
    marginTop: 2,
  },
});
