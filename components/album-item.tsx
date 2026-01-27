import { ThemedText } from '@/components/themed-text';
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { RelativePathString, router } from "expo-router";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

export default function AlbumItem({ group }: { group: any }) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = Colors[isDark ? "dark" : "light"];

  return (
    <View style={styles.albumGroup}>
      <View style={styles.albumHeader}>
        <Image
          source={{ uri: group.albumCover }}
          style={styles.albumGroupCover}
        />
        <View style={styles.albumGroupInfo}>
          <ThemedText style={[styles.albumGroupName, { color: colors.text }]}>
            {group.albumName}
          </ThemedText>
          <ThemedText
            style={[
              styles.albumGroupArtist,
              { color: colors.text, opacity: 0.7 },
            ]}
          >
            {group.artists.map((a: any) => a.name).join(", ")}
          </ThemedText>
          <ThemedText
            style={[
              styles.albumGroupCount,
              { color: colors.text, opacity: 0.4 },
            ]}
          >
            {group.tracks.length} tracks played
          </ThemedText>
        </View>
        <MaterialIcons
          name="chevron-right"
          size={28}
          color={colors.icon}
          onPress={() =>
            router.push(
              `/album/${group.albumSpotifyId || group.albumId}` as RelativePathString,
            )
          }
        />
      </View>
      <View style={styles.albumTracks}>
        <View style={styles.verticalLine} />
        {group.tracks.reverse().map((track: any, trackIndex: number) => (
          <View key={`${track.id}-${trackIndex}`} style={styles.albumTrackRow}>
            <View style={styles.connectorHorizontal} />
            <Pressable
              style={styles.albumTrackItem}
              onPress={() =>
                router.push(`/song/${track.id}` as RelativePathString)
              }
            >
              <ThemedText style={[styles.albumTrackName, { color: colors.text }]}>
                {track.name}
              </ThemedText>
            </Pressable>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  albumGroup: {
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  albumHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    gap: 12,
  },
  albumGroupCover: {
    width: 56,
    height: 56,
    borderRadius: 4,
  },
  albumGroupInfo: {
    flex: 1,
  },
  albumGroupName: {
    fontSize: 15,
    fontWeight: "600",
  },
  albumGroupArtist: {
    fontSize: 13,
    opacity: 0.7,
  },
  albumGroupCount: {
    fontSize: 10,
    opacity: 0.4,
    fontStyle: "italic",
  },
  albumTracks: {
    gap: 4,
    paddingLeft: 28,
    position: "relative",
  },
  verticalLine: {
    position: "absolute",
    left: 28,
    top: 0,
    bottom: 0,
    width: 2,
    marginBottom: 16,
    backgroundColor: "rgba(128,128,128,0.5)",
  },
  albumTrackRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  connectorHorizontal: {
    width: 16,
    height: 2,
    backgroundColor: "rgba(128,128,128,0.5)",
    marginRight: 14,
  },
  albumTrackItem: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  albumTrackName: {
    fontSize: 14,
  },
});
