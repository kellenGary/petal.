import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Pressable, StyleSheet, Text, View } from "react-native";

interface AlbumCardProps {
  album: {
    title?: string;
    artist?: string;
  };
  onPress?: () => void;
}

export default function AlbumCard({ album, onPress }: AlbumCardProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = Colors[isDark ? "dark" : "light"];

  return (
    <Pressable
      style={[styles.gridCard, { backgroundColor: colors.card }]}
      onPress={onPress}
    >
      <View
        style={[styles.albumCover, { backgroundColor: colors.tabIconDefault }]}
      />
      <Text
        style={[styles.gridCardTitle, { color: colors.text }]}
        numberOfLines={2}
      >
        {album.title || "Unknown Album"}
      </Text>
      <Text
        style={[styles.gridCardSubtitle, { color: colors.tabIconDefault }]}
        numberOfLines={1}
      >
        {album.artist || "Unknown Artist"}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  gridCard: {
    borderRadius: 12,
    overflow: "hidden",
  },
  albumCover: {
    width: "100%",
    aspectRatio: 1,
    marginBottom: 8,
    borderRadius: 8,
  },
  gridCardTitle: {
    fontSize: 13,
    fontWeight: "600",
    paddingHorizontal: 8,
    marginBottom: 4,
  },
  gridCardSubtitle: {
    fontSize: 11,
    paddingHorizontal: 8,
    marginBottom: 8,
  },
});
