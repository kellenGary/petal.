import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Image } from "expo-image";
import { RelativePathString, router } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";
import { ThemedText } from "./themed-text";

interface PlaylistItemProps {
  id: string;
  name: string;
  songCount: number;
  cover: string;
  link: RelativePathString;
  onPress?: () => void;
}

export default function PlaylistItem({
  id,
  name,
  songCount,
  cover,
  onPress,
  link,
}: PlaylistItemProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = Colors[isDark ? "dark" : "light"];

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else if (link) {
      router.push(link);
    }
  };

  return (
    <Pressable key={id} style={styles.playlistItem} onPress={handlePress}>
      <Image source={{ uri: cover }} style={styles.playlistCover} />
      <View style={styles.playlistInfo}>
        <ThemedText style={styles.playlistName} numberOfLines={1}>
          {name}
        </ThemedText>
        <ThemedText style={styles.playlistCount}>{songCount} songs</ThemedText>
      </View>
      <MaterialIcons
        name="chevron-right"
        size={24}
        color={colors.icon}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  playlistItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    gap: 12,
  },
  playlistCover: {
    width: 56,
    height: 56,
    borderRadius: 8,
  },
  playlistInfo: {
    flex: 1,
  },
  playlistName: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 2,
  },
  playlistCount: {
    fontSize: 13,
    opacity: 0.7,
  },
});
