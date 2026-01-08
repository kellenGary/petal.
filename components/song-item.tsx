import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Image } from "expo-image";
import { Pressable, StyleSheet, View } from "react-native";
import { ThemedText } from "./themed-text";
import { RelativePathString, router } from "expo-router";

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
  const isDark = colorScheme === "dark";
  const colors = Colors[isDark ? "dark" : "light"];

  const handlePress = () => {
    router.push(link);
  };

  return (
    <Pressable key={id} style={styles.songItem} onPress={handlePress}>
      <Image source={{ uri: cover }} style={styles.songCover} />
      <View style={styles.songInfo}>
        <ThemedText style={styles.songTitle} numberOfLines={1}>
          {title}
        </ThemedText>
        <ThemedText style={styles.songArtist} numberOfLines={1}>
          {artist}
        </ThemedText>
      </View>
      <MaterialIcons
        name="play-circle-outline"
        size={28}
        color={colors.icon}
        onPress={() => router.push(link)}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  songItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
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
    marginBottom: 2,
  },
  songArtist: {
    fontSize: 13,
    opacity: 0.7,
  },
});
