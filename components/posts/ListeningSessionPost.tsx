import { ThemedText } from '@/components/themed-text';
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import feedApi, { FeedPost } from "@/services/feedApi";
import { Image } from "expo-image";
import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import PostHeader from "./PostHeader";

interface ListeningSessionPostProps {
  item: FeedPost;
}

export default function ListeningSessionPost({
  item,
}: ListeningSessionPostProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = Colors[isDark ? "dark" : "light"];

  const timeAgo = feedApi.getTimeAgo(item.createdAt);
  const metadata = feedApi.parseListeningSessionMetadata(item);

  if (!metadata || !metadata.tracks) return null;

  const durationMins = Math.round(metadata.totalDurationMs / 60000);

  return (
    <View
      style={[
        styles.card,
      ]}
    >
      <PostHeader user={item.user} timeAgo={timeAgo} />

      <View
        style={[
          styles.sessionHeader,
        ]}
      >
        <View style={[styles.sessionIcon, { backgroundColor: colors.icon }]}>
          <ThemedText style={styles.sessionIconText}>🎧</ThemedText>
        </View>
        <View style={styles.sessionMeta}>
          <ThemedText style={[styles.sessionTitle, { color: colors.text }]}>
            Listening Session
          </ThemedText>
          <ThemedText style={[styles.sessionStats, { color: colors.text }]}>
            {metadata.trackCount} tracks • {durationMins} min
          </ThemedText>
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tracksScroll}
        contentContainerStyle={styles.tracksContent}
      >
        {metadata.tracks.map((track, index) => (
          <Pressable key={`${track.trackId}-${index}`} style={styles.trackItem}>
            {track.albumImageUrl && (
              <Image
                source={{ uri: track.albumImageUrl }}
                style={styles.trackImage}
              />
            )}
            <ThemedText
              style={[styles.trackName, { color: colors.text }]}
              numberOfLines={1}
            >
              {track.name}
            </ThemedText>
            <ThemedText
              style={[styles.trackArtist, { color: colors.text }]}
              numberOfLines={1}
            >
              {track.artistNames}
            </ThemedText>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 12,
  },
  sessionHeader: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  sessionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  sessionIconText: {
    fontSize: 20,
  },
  sessionMeta: {
    marginLeft: 12,
  },
  sessionTitle: {
    fontSize: 15,
    fontWeight: "600",
  },
  sessionStats: {
    fontSize: 12,
    opacity: 0.6,
    marginTop: 2,
  },
  tracksScroll: {
    marginHorizontal: -4,
  },
  tracksContent: {
    paddingHorizontal: 4,
    gap: 10,
  },
  trackItem: {
    width: 90,
  },
  trackImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginBottom: 6,
  },
  trackName: {
    fontSize: 12,
    fontWeight: "500",
  },
  trackArtist: {
    fontSize: 10,
    opacity: 0.6,
    marginTop: 2,
  },
  moreItem: {
    width: 80,
    height: 80,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  moreText: {
    fontSize: 16,
    fontWeight: "600",
  },
});
