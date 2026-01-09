import { useAuth } from "@/contexts/AuthContext";
import { usePlayback } from "@/contexts/playbackContext";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { useRouter } from "expo-router";
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from "react-native";
import EqualizerBar from "./equalizer-bar";


export default function MiniPlayer() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { playbackState, currentProgressMs } = usePlayback();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  // Don't render if not authenticated or nothing is playing
  if (!isAuthenticated || authLoading || !playbackState?.item) {
    return null;
  }

  const track = playbackState.item;
  const artistNames = track.artists.map((a: any) => a.name).join(", ");
  const albumArt = track.album.images[0]?.url;
  const duration = playbackState.duration_ms || 1;
  const progressPercent = (currentProgressMs / duration) * 100;

  return (
    <Pressable onPress={() => router.push('/player')} style={styles.pressable}>
      <View style={styles.wrapper}>
        <BlurView
          intensity={100}
          tint={isDark ? "dark" : "light"}
          style={styles.container}
        >
          <View style={styles.glassBg} />
          <View style={styles.content}>
            {/* Album Art */}
            {albumArt ? (
              <Image source={{ uri: albumArt }} style={styles.albumArt} />
            ) : (
              <View style={[styles.albumArt, styles.placeholderArt]}>
                <Ionicons
                  name="musical-notes"
                  size={24}
                  color={isDark ? "#888" : "#666"}
                />
              </View>
            )}

            {/* Track Info */}
            <View style={styles.trackInfo}>
              <Text
                style={[styles.trackName, { color: isDark ? "#fff" : "#000" }]}
                numberOfLines={1}
              >
                {track.name}
              </Text>
              <Text
                style={[styles.artistName, { color: isDark ? "#aaa" : "#666" }]}
                numberOfLines={1}
              >
                {artistNames}
              </Text>
            </View>

            {/* Playback Status Indicator */}
            <View style={styles.playbackIndicator}>
              {playbackState.isPlaying ? (
                <EqualizerBar />
              ) : (
                <Ionicons
                  name="pause"
                  size={20}
                  color={isDark ? "#aaa" : "#666"}
                />
              )}
            </View>
          </View>

          {/* Progress Bar */}
          <View
            style={[
              styles.progressContainer,
              {
                backgroundColor: isDark
                  ? "rgba(255,255,255,0.1)"
                  : "rgba(0,0,0,0.1)",
              },
            ]}
          >
            <View
              style={[styles.progressBar, { width: `${progressPercent}%` }]}
            />
          </View>
        </BlurView>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    zIndex: 1,
  },
  wrapper: {
    marginHorizontal: 16,
    // iOS-like shadow
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  container: {
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 0.5,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  glassBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
    gap: 12,
  },
  albumArt: {
    width: 48,
    height: 48,
    borderRadius: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  placeholderArt: {
    backgroundColor: "rgba(128,128,128,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  trackInfo: {
    flex: 1,
    justifyContent: "center",
  },
  trackName: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 2,
  },
  artistName: {
    fontSize: 12,
  },
  playbackIndicator: {
    width: 32,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
  },
  progressContainer: {
    height: 2,
    width: "100%",
  },
  progressBar: {
    height: "100%",
    backgroundColor: "#538ce9ff",
  },
});
