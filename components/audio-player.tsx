import { usePlayback } from "@/contexts/playbackContext";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
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
    toggleRepeat
  } = usePlayback();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  if (isLoading && !playbackState) {
    return (
      <View style={[styles.container, isDark && styles.darkContainer]}>
        <ActivityIndicator size="large" color="#1DB954" />
      </View>
    );
  }

  if (!playbackState || !playbackState.item) {
    return (
      <View style={[styles.container, isDark && styles.darkContainer]}>
        <Text style={[styles.text, isDark && styles.darkText]}>Not currently playing anything</Text>
      </View>
    );
  }

  const track = playbackState.item;
  const imageUrl = track.album?.images?.[0]?.url;
  const artistNames = track.artists?.map((a: any) => a.name).join(", ");

  const duration = playbackState.duration_ms || 1;
  const progressPercent = (currentProgressMs / duration) * 100;

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  return (
    <View style={[styles.container, isDark && styles.darkContainer]}>
      {/* Album Art */}
      <View style={styles.albumArtContainer}>
        {imageUrl ? (
          <Image
            source={{ uri: imageUrl }}
            style={styles.albumArt}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.albumArt, styles.placeholderArt]}>
            <Ionicons name="musical-notes" size={80} color="#666" />
          </View>
        )}
      </View>

      {/* Track Info */}
      <View style={styles.infoContainer}>
        <View style={styles.titleWrapper}>
          <Text style={[styles.title, isDark && styles.darkText]} numberOfLines={1}>
            {track.name}
          </Text>
          <Text style={[styles.artist, isDark && styles.darkSubText]} numberOfLines={1}>
            {artistNames}
          </Text>
        </View>
        <Pressable onPress={() => setIsLiked(!isLiked)}>
          <Ionicons name={isLiked ? "heart" : "heart-outline"} size={28} color={isLiked ? "#538ce9ff" : (isDark ? "#fff" : "#000")} />
        </Pressable>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressSection}>
        <View style={styles.progressBarBg}>
          <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
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
            color={playbackState.shuffle_state ? "#538ce9ff" : (isDark ? "#aaa" : "#666")}
          />
        </Pressable>

        <Pressable onPress={skipPrevious}>
          <Ionicons name="play-back" size={36} color={isDark ? "#fff" : "#000"} />
        </Pressable>

        <Pressable onPress={togglePlay} style={styles.playButton}>
          <Ionicons
            name={playbackState.isPlaying ? "pause-circle" : "play-circle"}
            size={80}
            color={isDark ? "#fff" : "#000"}
          />
        </Pressable>

        <Pressable onPress={skipNext}>
          <Ionicons name="play-forward" size={36} color={isDark ? "#fff" : "#000"} />
        </Pressable>

        <Pressable onPress={toggleRepeat}>
          <Ionicons
            name={playbackState.repeat_state === "track" ? "repeat" : "repeat"}
            size={28}
            color={playbackState.repeat_state !== "off" ? "#538ce9ff" : (isDark ? "#aaa" : "#666")}
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
    flex: 1,
    paddingHorizontal: 25,
    paddingTop: 40,
    height: "100%",
    justifyContent: "flex-start",
    alignContent: "center",
  },
  darkContainer: {
    backgroundColor: "#121212",
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
