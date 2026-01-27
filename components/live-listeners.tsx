import { ThemedText } from '@/components/themed-text';
import { ScrollView, Text, View, Image, StyleSheet } from "react-native";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";

export default function LiveListeners() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = Colors[isDark ? "dark" : "light"];

  return (
    <View style={styles.activeContainer}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.activeScrollView}
        contentContainerStyle={styles.activeScrollContent}
      >
        <View style={styles.listenerCard}>
          <View style={styles.songBubble}>
            <ThemedText
              style={[styles.songName, { color: Colors.light.text }]}
              numberOfLines={2}
            >
              songName
            </ThemedText>
          </View>
          <View style={styles.profileImageContainer}>
            <Image
              source={{ uri: "https://i.pravatar.cc/300?img=12" }}
              style={styles.profileImage}
            />
          </View>
          <ThemedText style={[styles.username, { color: colors.text }]}>Name</ThemedText>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
      activeContainer: {
    width: "100%",
  },
  activeScrollView: {
    width: "100%",
  },
  activeScrollContent: {
    gap: 16,
    paddingVertical: 8,
  },
  listenerCard: {
    alignItems: "center",
  },
  songBubble: {
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    maxWidth: 120,
    minHeight: 40,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: -12,
    zIndex: 1,
  },
  songName: {
    fontSize: 12,
    fontWeight: "600",
    color: "#000",
    textAlign: "center",
  },
  profileImageContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 3,
    borderColor: "#667eea",
    padding: 2,
  },
  profileImage: {
    width: "100%",
    height: "100%",
    borderRadius: 28,
  },
  username: {
    fontSize: 12,
    fontWeight: "500",
    color: "black",
    textAlign: "center",
    marginTop: 8,
  },
});
