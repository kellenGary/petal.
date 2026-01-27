import { BlurBackButton, StatsRow } from "@/components/media";
import SongItem from "@/components/song-item";
import ErrorScreen from "@/components/ui/ErrorScreen";
import LoadingScreen from "@/components/ui/LoadingScreen";
import { Colors } from "@/constants/theme";
import spotifyApi from "@/services/spotifyApi";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { RelativePathString, Stack, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from "react-native";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const HEADER_IMAGE_SIZE = SCREEN_WIDTH * 0.55;

export default function AlbumScreen() {
  const { id } = useLocalSearchParams();
  const [album, setAlbum] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [tracks, setTracks] = useState<any[]>([]);
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = Colors[isDark ? "dark" : "light"];

  useEffect(() => {
    if (!id) return;

    async function fetchAlbum() {
      setLoading(true);
      console.log("[AlbumScreen] Fetching album with id:", id);
      try {
        const fetchedAlbum = await spotifyApi.getAlbumWithTracks(id as string);
        console.log(
          "[AlbumScreen] Received album data:",
          JSON.stringify(fetchedAlbum, null, 2),
        );
        console.log("[AlbumScreen] Album tracks:", fetchedAlbum.tracks);
        setAlbum(fetchedAlbum);
        setTracks(fetchedAlbum.tracks?.items || []);
      } catch (error) {
        console.error("[AlbumScreen] Error fetching album:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchAlbum();
  }, [id]);

  // Calculate total duration
  const totalDuration = tracks.reduce((acc, track) => {
    return acc + (track?.duration_ms || 0);
  }, 0);

  if (loading) {
    return <LoadingScreen message="Loading album..." />;
  }

  if (!album) {
    return <ErrorScreen icon="disc-outline" message="Album not found" />;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Hero Section with Gradient */}
        <View style={styles.heroSection}>
          <LinearGradient
            colors={
              isDark
                ? ["#1a1a2e", "#16213e", colors.background]
                : ["#667eea", "#764ba2", colors.background]
            }
            style={styles.heroGradient}
          />

          {/* Back Button */}
          <BlurBackButton />

          {/* Album Cover */}
          <View style={styles.coverContainer}>
            <Image
              source={{ uri: album.images?.[0]?.url || "" }}
              style={styles.albumCover}
              contentFit="cover"
              transition={300}
            />
            <View
              style={[
                styles.coverShadow,
                { shadowColor: isDark ? "#000" : "#667eea" },
              ]}
            />
          </View>

          {/* Album Info */}
          <View style={styles.albumInfo}>
            <Text
              style={[styles.albumName, { color: "#fff" }]}
              numberOfLines={2}
            >
              {album.name}
            </Text>

            <Text
              style={[
                styles.artistName,
                {
                  color: isDark
                    ? "rgba(255,255,255,0.85)"
                    : "rgba(255,255,255,0.9)",
                },
              ]}
            >
              {album.artists?.map((a: any) => a.name).join(", ") ||
                "Unknown Artist"}
            </Text>

            <StatsRow
              trackCount={tracks.length}
              totalDurationMs={totalDuration}
              textColor={
                isDark ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.8)"
              }
            />

            {album.release_date && (
              <Text
                style={[
                  styles.releaseDate,
                  {
                    color: isDark
                      ? "rgba(255,255,255,0.5)"
                      : "rgba(255,255,255,0.7)",
                  },
                ]}
              >
                {new Date(album.release_date).getFullYear()}
              </Text>
            )}
          </View>
        </View>

        {/* Track List Section */}
        <View
          style={[
            styles.trackListSection,
            { backgroundColor: colors.background },
          ]}
        >
          <View style={styles.trackListHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Tracks
            </Text>
          </View>

          <View style={styles.trackList}>
            {tracks.map((track, index) => (
              <SongItem
                key={`${track?.trackId || track?.id || index}-${index}`}
                id={String(track?.trackId || "")}
                spotifyId={track?.id || ""}
                title={track?.name || "Unknown Track"}
                artist={
                  track?.artists
                    ?.map((artist: any) => artist.name)
                    .join(", ") || "Unknown Artist"
                }
                cover={album.images?.[0]?.url || ""}
                link={`/song/${track?.trackId}` as RelativePathString}
              />
            ))}
          </View>

          {/* Bottom Spacing */}
          <View style={styles.bottomSpacer} />
        </View>
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
  scrollContent: {
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loaderWrapper: {
    alignItems: "center",
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: "500",
    opacity: 0.8,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
    padding: 24,
  },
  errorText: {
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
  },
  backButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    marginTop: 8,
  },
  backButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 15,
  },
  heroSection: {
    alignItems: "center",
    paddingTop: 60,
    paddingBottom: 32,
    position: "relative",
  },
  heroGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 400,
  },
  floatingBackButton: {
    position: "absolute",
    top: 50,
    left: 16,
    zIndex: 10,
  },
  blurButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
  },
  coverContainer: {
    position: "relative",
    marginTop: 20,
  },
  albumCover: {
    width: HEADER_IMAGE_SIZE,
    height: HEADER_IMAGE_SIZE,
    borderRadius: 12,
  },
  coverShadow: {
    position: "absolute",
    top: 20,
    left: 10,
    right: 10,
    bottom: -10,
    borderRadius: 12,
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.4,
    shadowRadius: 30,
    zIndex: -1,
  },
  albumInfo: {
    alignItems: "center",
    paddingHorizontal: 24,
    marginTop: 24,
    gap: 8,
  },
  albumName: {
    fontSize: 26,
    fontWeight: "bold",
    textAlign: "center",
    letterSpacing: -0.5,
  },
  artistName: {
    fontSize: 16,
    fontWeight: "500",
    textAlign: "center",
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    gap: 16,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statText: {
    fontSize: 13,
    fontWeight: "500",
  },
  statDivider: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.4)",
  },
  releaseDate: {
    fontSize: 13,
    fontWeight: "500",
    marginTop: 4,
  },
  trackListSection: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -20,
    paddingTop: 24,
  },
  trackListHeader: {
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  trackList: {
    paddingHorizontal: 4,
  },
  bottomSpacer: {
    height: 100,
  },
});
