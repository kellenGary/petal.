import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Pressable, StyleSheet, Text, View } from "react-native";

interface PlaylistCardProps {
  playlist: {
    name?: string;
    trackCount?: number;
  };
  onPress?: () => void;
}

export default function PlaylistCard({ playlist, onPress }: PlaylistCardProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = Colors[isDark ? "dark" : "light"];

  return (
    <Pressable
      style={[styles.gridCard, { backgroundColor: colors.card }]}
      onPress={onPress}
    >
      <View
        style={[
          styles.playlistCover,
          { backgroundColor: colors.tabIconDefault },
        ]}
      />
      <Text
        style={[styles.gridCardTitle, { color: colors.text }]}
        numberOfLines={2}
      >
        {playlist.name || "Unknown Playlist"}
      </Text>
      <Text
        style={[styles.gridCardSubtitle, { color: colors.tabIconDefault }]}
        numberOfLines={1}
      >
        {playlist.trackCount || 0} songs
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  gridCard: {
    borderRadius: 12,
    overflow: "hidden",
  },
  playlistCover: {
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
