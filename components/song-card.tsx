import { ThemedText } from '@/components/themed-text';
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Pressable, StyleSheet, Text, View } from "react-native";

interface SongCardProps {
  song: {
    title?: string;
    artist?: string;
  };
  onPress?: () => void;
}

export default function SongCard({ song, onPress }: SongCardProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = Colors[isDark ? "dark" : "light"];

  return (
    <Pressable
      style={[styles.itemCard, { backgroundColor: colors.card }]}
      onPress={onPress}
    >
      <View
        style={[styles.itemImage, { backgroundColor: colors.tabIconDefault }]}
      />
      <View style={styles.itemInfo}>
        <ThemedText
          style={[styles.itemTitle, { color: colors.text }]}
          numberOfLines={1}
        >
          {song.title || "Unknown Song"}
        </ThemedText>
        <ThemedText
          style={[styles.itemSubtitle, { color: colors.tabIconDefault }]}
          numberOfLines={1}
        >
          {song.artist || "Unknown Artist"}
        </ThemedText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  itemCard: {
    flexDirection: "row",
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 8,
    alignItems: "center",
  },
  itemImage: {
    width: 56,
    height: 56,
    borderRadius: 8,
    marginRight: 12,
  },
  itemInfo: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 4,
  },
  itemSubtitle: {
    fontSize: 12,
  },
});
