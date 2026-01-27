import { ThemedText } from '@/components/themed-text';
import { Colors } from "@/constants/theme";
import { usePlayback } from "@/contexts/playbackContext";
import spotifyApi from "@/services/spotifyApi";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Pressable,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from "react-native";

const { width, height } = Dimensions.get("window");

export default function AudioPlayer() {
  const [isLiked, setIsLiked] = useState(false);
  const {
    playbackState,
    currentProgressMs,
    isLoading,
    togglePlay,
    skipNext,
    skipPrevious,
    toggleShuffle,
    toggleRepeat,
  } = usePlayback();

  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = Colors[isDark ? "dark" : "light"];

  const track = playbackState?.item;
  const imageUrl = track?.album?.images?.[0]?.url;
  const artistNames = track?.artists?.map((a: any) => a.name).join(", ");
  const duration = playbackState?.duration_ms || 1;
  const progressPercent = (currentProgressMs / duration) * 100;

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const handleLikePress = async (songId: string) => {
    if (isLiked) {
      await spotifyApi.unlikeSong(songId);
      setIsLiked(false);
    } else {
      await spotifyApi.likeSong(songId);
      setIsLiked(true);
    }
  };

  useEffect(() => {
    const checkIfLiked = async () => {
      if (!track?.id) return;
      try {
        const response = await spotifyApi.checkIfSongIsLiked(track.id);
        setIsLiked(response);
      } catch (error) {
        console.error("Error checking if song is liked:", error);
      }
    };

    checkIfLiked();
  }, [track?.id]);

  // Show loading spinner only when actively loading and no state yet
  if (isLoading && !playbackState) {
    return (
      <View
        style={[styles.container, styles.centerContent, { minHeight: height }]}
      >
        <ActivityIndicator size="large" color="#1DB954" />
      </View>
    );
  }

  // Show empty state when nothing is playing
  if (!playbackState || !playbackState.item) {
    return (
      <View
        style={[
          styles.container,
          styles.centerContent,
          { backgroundColor: colors.background },
        ]}
      >
        <Ionicons
          name="musical-notes-outline"
          size={64}
          color={colors.text}
          style={{ opacity: 0.5, marginBottom: 16 }}
        />
        <ThemedText style={[styles.emptyText, { color: colors.text }]}>
          Not currently playing anything
        </ThemedText>
      </View>
    );
  }

  return (
    <View style={[styles.container, { minHeight: height }]}>
      {/* Full-screen Album Art */}
      {imageUrl ? (
        <Image
          source={{ uri: imageUrl }}
          style={styles.fullscreenAlbumArt}
          contentFit="cover"
        />
      ) : (
        <View style={[styles.fullscreenAlbumArt, styles.placeholderArt]}>
          <Ionicons name="musical-notes" size={100} color="#666" />
        </View>
      )}

      {/* Gradient Overlay at Bottom */}
      <LinearGradient
        colors={["transparent", "rgba(0,0,0,0.7)", "rgba(0,0,0,0.95)"]}
        locations={[0, 0.4, 1]}
        style={styles.gradientOverlay}
      />

      {/* Gradient Overlay at Top */}
      <LinearGradient
        colors={["rgba(0,0,0,0.6)", "rgba(0,0,0,0.3)", "transparent"]}
        locations={[0, 0.5, 1]}
        style={styles.topGradientOverlay}
      />

      {/* Controls Overlay */}
      <View style={styles.controlsOverlay}>
        {/* Track Info */}
        <View style={styles.infoContainer}>
          <View style={styles.titleWrapper}>
            <ThemedText style={styles.title} numberOfLines={1}>
              {track?.name}
            </ThemedText>
            <ThemedText style={styles.artist} numberOfLines={1}>
              {artistNames}
            </ThemedText>
          </View>
          <Pressable
            onPress={() => track?.id && handleLikePress(track.id)}
            style={styles.likeButton}
          >
            <Ionicons
              name={isLiked ? "heart" : "heart-outline"}
              size={28}
              color={isLiked ? "#538ce9ff" : "#fff"}
            />
          </Pressable>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressSection}>
          <View style={styles.progressBarBg}>
            <View
              style={[styles.progressBarFill, { width: `${progressPercent}%` }]}
            />
          </View>
          <View style={styles.timeLabels}>
            <ThemedText style={styles.timeText}>{formatTime(currentProgressMs)}</ThemedText>
            <ThemedText style={styles.timeText}>{formatTime(duration)}</ThemedText>
          </View>
        </View>

        {/* Playback Controls */}
        <View style={styles.controlsContainer}>
          <Pressable onPress={toggleShuffle} style={styles.controlButton}>
            <Ionicons
              name="shuffle"
              size={24}
              color={
                playbackState.shuffle_state
                  ? "#538ce9ff"
                  : "rgba(255,255,255,0.7)"
              }
            />
          </Pressable>

          <Pressable onPress={skipPrevious} style={styles.controlButton}>
            <Ionicons name="play-back" size={32} color="#fff" />
          </Pressable>

          <Pressable onPress={togglePlay} style={styles.playButton}>
            <View style={styles.playButtonInner}>
              <Ionicons
                name={playbackState.isPlaying ? "pause" : "play"}
                size={36}
                color="#000"
                style={!playbackState.isPlaying && { marginLeft: 4 }}
              />
            </View>
          </Pressable>

          <Pressable onPress={skipNext} style={styles.controlButton}>
            <Ionicons name="play-forward" size={32} color="#fff" />
          </Pressable>

          <Pressable onPress={toggleRepeat} style={styles.controlButton}>
            <Ionicons
              name="repeat"
              size={24}
              color={
                playbackState.repeat_state !== "off"
                  ? "#538ce9ff"
                  : "rgba(255,255,255,0.7)"
              }
            />
            {playbackState.repeat_state === "track" && (
              <View style={styles.repeatBadge}>
                <ThemedText style={styles.repeatBadgeText}>1</ThemedText>
              </View>
            )}
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexGrow: 1,
    height: "100%",
    width: "100%",
    backgroundColor: "#000",
  },
  centerContent: {
    justifyContent: "center",
    alignItems: "center",
  },
  fullscreenAlbumArt: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
  },
  placeholderArt: {
    backgroundColor: "#1a1a1a",
    justifyContent: "center",
    alignItems: "center",
  },
  gradientOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: "55%",
  },
  topGradientOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 100,
  },
  controlsOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingBottom: 80,
  },
  infoContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
  },
  titleWrapper: {
    flex: 1,
    marginRight: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  artist: {
    fontSize: 16,
    color: "rgba(255,255,255,0.8)",
    marginTop: 4,
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  likeButton: {
    padding: 8,
  },
  progressSection: {
    marginBottom: 24,
  },
  progressBarBg: {
    height: 4,
    backgroundColor: "rgba(255,255,255,0.3)",
    borderRadius: 2,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: "#fff",
    borderRadius: 2,
  },
  timeLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  timeText: {
    fontSize: 12,
    color: "rgba(255,255,255,0.7)",
  },
  controlsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 8,
  },
  controlButton: {
    padding: 8,
  },
  playButton: {
    marginHorizontal: 16,
  },
  playButtonInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  repeatBadge: {
    position: "absolute",
    top: 2,
    right: 2,
    backgroundColor: "#538ce9ff",
    borderRadius: 6,
    width: 14,
    height: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  repeatBadgeText: {
    fontSize: 9,
    color: "#fff",
    fontWeight: "bold",
  },
  emptyText: {
    fontSize: 18,
    textAlign: "center",
    marginTop: 100,
  },
});
