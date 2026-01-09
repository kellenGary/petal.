import { Colors } from "@/constants/theme";
import { usePlayback } from "@/contexts/playbackContext";
import spotifyApi from "@/services/spotifyApi";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Pressable,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from "react-native";
const { width } = Dimensions.get("window");
const ALBUM_ART_SIZE = width * 0.85;

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

  const track = playbackState.item;
  const imageUrl = track.album?.images?.[0]?.url;
  const artistNames = track.artists?.map((a: any) => a.name).join(", ");
  const duration = playbackState.duration_ms || 1;
  const progressPercent = (currentProgressMs / duration) * 100;

  useEffect(() => {
    const checkIfLiked = async () => {
      try {
        const response = await spotifyApi.checkIfSongIsLiked(track.id);
        setIsLiked(response);
      } catch (error) {
        console.error("Error checking if song is liked:", error);
      }
    };

    checkIfLiked();
  }, [track.id]);

  if (isLoading && !playbackState) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color="#1DB954" />
      </View>
    );
  }

  if (!playbackState || !playbackState.item) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.text, { color: colors.text }]}>
          Not currently playing anything
        </Text>
      </View>
    );
  }

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

  return (
    <View style={[styles.container]}>
      {/* Album Art */}
      <View style={styles.albumArtContainer}>
        {imageUrl ? (
          <Image
            source={{ uri: imageUrl }}
            style={styles.albumArt}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.albumArt, styles.placeholderArt, { backgroundColor: colors.background }]}>
            <Ionicons name="musical-notes" size={80} color="#666" />
          </View>
        )}
      </View>

      {/* Track Info */}
      <View style={styles.infoContainer}>
        <View style={styles.titleWrapper}>
          <Text
            style={[styles.title, isDark && styles.darkText]}
            numberOfLines={1}
          >
            {track.name}
          </Text>
          <Text
            style={[styles.artist, isDark && styles.darkSubText]}
            numberOfLines={1}
          >
            {artistNames}
          </Text>
        </View>
        <Pressable onPress={() => handleLikePress(track.id)}>
          <Ionicons
            name={isLiked ? "heart" : "heart-outline"}
            size={28}
            color={isLiked ? "#538ce9ff" : isDark ? "#fff" : "#000"}
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
          <Text style={[styles.timeText, isDark && styles.darkSubText]}>
            {formatTime(currentProgressMs)}
          </Text>
          <Text style={[styles.timeText, isDark && styles.darkSubText]}>
            {formatTime(duration)}
          </Text>
        </View>
      </View>

      {/* Controls */}
      <View style={styles.controlsContainer}>
        <Pressable onPress={toggleShuffle}>
          <Ionicons
            name="shuffle"
            size={28}
            color={
              playbackState.shuffle_state
                ? "#538ce9ff"
                : isDark
                ? "#aaa"
                : "#666"
            }
          />
        </Pressable>

        <Pressable onPress={skipPrevious}>
          <Ionicons
            name="play-back"
            size={36}
            color={isDark ? "#fff" : "#000"}
          />
        </Pressable>

        <Pressable onPress={togglePlay} style={styles.playButton}>
          <Ionicons
            name={playbackState.isPlaying ? "pause-circle" : "play-circle"}
            size={80}
            color={isDark ? "#fff" : "#000"}
          />
        </Pressable>

        <Pressable onPress={skipNext}>
          <Ionicons
            name="play-forward"
            size={36}
            color={isDark ? "#fff" : "#000"}
          />
        </Pressable>

        <Pressable onPress={toggleRepeat}>
          <Ionicons
            name={playbackState.repeat_state === "track" ? "repeat" : "repeat"}
            size={28}
            color={
              playbackState.repeat_state !== "off"
                ? "#538ce9ff"
                : isDark
                ? "#aaa"
                : "#666"
            }
          />
          {playbackState.repeat_state === "track" && (
            <View style={styles.repeatBadge}>
              <Text style={styles.repeatBadgeText}>1</Text>
            </View>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    flex: 1,
    paddingHorizontal: 25,
    paddingTop: 40,
    height: "100%",
    justifyContent: "flex-start",
    alignContent: "center",
  },
  albumArtContainer: {
    width: ALBUM_ART_SIZE,
    height: ALBUM_ART_SIZE,
    alignSelf: "center",
    marginTop: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 15,
  },
  albumArt: {
    width: "100%",
    height: "100%",
    borderRadius: 8,
  },
  placeholderArt: {
    backgroundColor: "#333",
    justifyContent: "center",
    alignItems: "center",
  },
  infoContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 40,
    marginBottom: 20,
  },
  titleWrapper: {
    flex: 1,
    marginRight: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#000",
  },
  artist: {
    fontSize: 18,
    color: "#666",
    marginTop: 4,
  },
  darkText: {
    color: "#fff",
  },
  darkSubText: {
    color: "#b3b3b3",
  },
  progressSection: {
    marginTop: 10,
  },
  progressBarBg: {
    height: 4,
    backgroundColor: "rgba(0,0,0,0.1)",
    borderRadius: 2,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: "#538ce9ff",
  },
  timeLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
  },
  timeText: {
    fontSize: 12,
    color: "#666",
  },
  controlsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 20,
  },
  playButton: {
    marginHorizontal: 10,
  },
  repeatBadge: {
    position: "absolute",
    top: -2,
    right: -2,
    backgroundColor: "#538ce9ff",
    borderRadius: 6,
    width: 12,
    height: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  repeatBadgeText: {
    fontSize: 8,
    color: "#fff",
    fontWeight: "bold",
  },
  footerControls: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: "auto",
    marginBottom: 40,
    paddingHorizontal: 10,
  },
  text: {
    fontSize: 18,
    color: "#333",
    textAlign: "center",
    marginTop: 100,
  },
});
