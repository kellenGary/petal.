import { Colors } from '@/constants/theme';
import { useAuth } from "@/contexts/AuthContext";
import { usePlayback } from "@/contexts/playbackContext";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
  Image,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import EqualizerBar from "./equalizer-bar";
import { ThemedText } from './themed-text';

export default function MiniPlayer() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { playbackState, currentProgressMs } = usePlayback();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = Colors[isDark ? "dark" : "light"];

  // Handle press to open full player
  const handlePress = () => {
    router.push('/player');
  };

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
    <View style={styles.wrapper}>
      <Pressable onPress={handlePress} style={styles.pressable}>
        <View style={[styles.container, { backgroundColor: colors.background }]}>
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

          <View style={styles.content}>
            {/* Album Art */}
            {albumArt ? (
              <View style={styles.albumArt}>
                <Image
                  source={{ uri: albumArt }}
                  style={{ width: '100%', height: '100%' }}
                  resizeMode="cover"
                />
              </View>
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
              <ThemedText
                style={[styles.trackName, { color: colors.text }]}
                numberOfLines={1}
              >
                {track.name}
              </ThemedText>
              <ThemedText
                style={[styles.artistName, { color: colors.text }]}
                numberOfLines={1}
              >
                {artistNames}
              </ThemedText>
            </View>

            {/* Playback Status Indicator */}
            <View style={styles.playbackIndicator}>
              {playbackState.isPlaying ? (
                <EqualizerBar />
              ) : (
                <Ionicons
                  name="pause"
                  size={20}
                  color={colors.text}
                />
              )}
            </View>
          </View>
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    alignSelf: 'center',
  },
  pressable: {
    width: '100%',
  },
  container: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    overflow: "hidden",
    borderWidth: 0.5,
    borderBottomWidth: 0,
    borderColor: "rgba(255, 255, 255, 0.2)",
    width: '100%',
    height: 64,
    justifyContent: 'center',
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 12,
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  albumArt: {
    width: 48,
    height: 48,
    borderRadius: 8,
    overflow: 'hidden',
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
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    zIndex: 20,
  },
  progressBar: {
    height: "100%",
    backgroundColor: "#538ce9ff",
  },
});
