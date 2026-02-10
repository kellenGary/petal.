import { ThemedText } from '@/components/ui/themed-text';
import { Colors } from "@/constants/theme";
import { usePlayback } from "@/contexts/playbackContext";
import { useColorScheme } from "@/hooks/use-color-scheme";
import playbackApi from "@/services/playbackApi";
import AntDesign from "@expo/vector-icons/AntDesign";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Image } from "expo-image";
import { RelativePathString, router } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";
import EqualizerBar from "./equalizer-bar";

interface SongItemProps {
  id: string;
  spotifyId?: string; // Spotify ID for playback
  title: string;
  artist: string;
  cover: string;
  link: RelativePathString;
  streak?: number;
}

export default function SongItem({
  id,
  spotifyId,
  title,
  artist,
  cover,
  link,
  streak,
}: SongItemProps) {
  const colorScheme = useColorScheme();
  const { playbackState } = usePlayback();
  const isDark = colorScheme === "dark";
  const colors = Colors[isDark ? "dark" : "light"];

  const isActive =
    playbackState?.item?.name === title && playbackState?.isPlaying;

  const handlePress = () => {
    router.push(link);
  };

  const handlePlayPress = async () => {
    // Use spotifyId if provided, otherwise fall back to id (for backward compatibility)
    const playId = spotifyId || id;
    await playbackApi.playSong(playId);
  };

  return (
    <Pressable
      key={id}
      style={[
        styles.songItem,
      ]}
      onPress={handlePress}
    >
      <Image source={{ uri: cover }} style={styles.songCover} />
      <View style={styles.songInfo}>
        <ThemedText style={[styles.songTitle, { color: colors.text }]}>{title}</ThemedText>
        <ThemedText style={[styles.songArtist, { color: colors.text, opacity: 0.7 }]}>
          {artist}
        </ThemedText>
      </View>

      <View style={styles.leftSide}>
        {streak && streak > 1 ? (
          <View style={styles.streakContainer}>
            <AntDesign name="fire" size={24} color="#FF6B35" />
            <ThemedText style={[styles.streakText, { color: colors.background }]}>
              {streak}
            </ThemedText>
          </View>
        ) : null}
        {isActive ? (
          <View style={{ width: 28, paddingLeft: 6 }}>
            <EqualizerBar />
          </View>
        ) : (
          <Pressable onPress={handlePlayPress}>
            <MaterialIcons
              name="play-circle-outline"
              size={28}
              color={colors.icon}
            />
          </Pressable>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  songItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 16,
    gap: 12,
  },
  songCover: {
    width: 56,
    height: 56,
    borderRadius: 4,
  },
  songInfo: {
    flex: 1,
  },
  songTitle: {
    fontSize: 15,
    fontWeight: "600",
  },
  songArtist: {
    fontSize: 13,
    opacity: 0.7,
  },
  leftSide: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  streakContainer: {
    position: "relative",
    justifyContent: "center",
    alignItems: "center",
  },
  streakText: {
    position: "absolute",
    fontSize: 10,
    fontWeight: "bold",
    top: 8,
  },
});
