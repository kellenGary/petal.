import { Colors } from "@/constants/theme";
import { usePlayback } from "@/contexts/playbackContext";
import { useColorScheme } from "@/hooks/use-color-scheme";
import playbackApi from "@/services/playbackApi";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Image } from "expo-image";
import { RelativePathString, router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import EqualizerBar from "./equalizer-bar";

interface SongItemProps {
  id: string;
  title: string;
  artist: string;
  cover: string;
  link: RelativePathString;
}

export default function SongItem({
  id,
  title,
  artist,
  cover,
  link,
}: SongItemProps) {
  const colorScheme = useColorScheme();
  const { playbackState } = usePlayback();
  const isDark = colorScheme === "dark";
  const colors = Colors[isDark ? "dark" : "light"];

  const isActive = playbackState?.item?.name === title && playbackState?.isPlaying;

  const handlePress = () => {
    router.push(link);
  };

  const handlePlayPress = async () => {
    await playbackApi.playSong(id);
  };

  return (
    <Pressable key={id} style={[styles.songItem, { backgroundColor: isActive ? colors.card : "transparent" }]} onPress={handlePress} >
      <Image source={{ uri: cover }} style={styles.songCover} />
      <View style={styles.songInfo}>
        <Text style={[styles.songTitle, { color: colors.text }]}>{title}</Text>
        <Text style={[styles.songArtist, { color: colors.text, opacity: 0.7 }]}>
          {artist}
        </Text>
      </View>

      {isActive ? (
        <EqualizerBar />
      ) : (
        <Pressable onPress={handlePlayPress}>
          <MaterialIcons
            name="play-circle-outline"
            size={28}
            color={colors.icon}
          />
        </Pressable>
      )}
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
});
