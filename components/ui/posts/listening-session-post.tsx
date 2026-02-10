import { ThemedText } from '@/components/ui/themed-text';
import TrackCarousel from '@/components/ui/track-carousel';
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import feedApi, { FeedPost, FeedTrack } from "@/services/feedApi";
import React from "react";
import { StyleSheet, View } from "react-native";
import PostHeader from "./post-header";

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

  // Convert ListeningSessionTrack[] to FeedTrack[] for the carousel
  const feedTracks: FeedTrack[] = metadata.tracks.map((track) => ({
    id: track.trackId,
    spotifyId: track.spotifyId ?? '',
    name: track.name ?? 'Unknown Track',
    artistNames: track.artistNames ? track.artistNames.split(', ') : [],
    albumName: null,
    albumImageUrl: track.albumImageUrl || null,
    durationMs: track.durationMs,
  }));

  return (
    <View style={styles.card}>
      <PostHeader user={item.user} timeAgo={timeAgo} />

      <View style={styles.sessionInfo}>
        <ThemedText style={[styles.actionLabel, { color: colors.text }]}>
          LISTENING SESSION
        </ThemedText>
        <View style={styles.statsRow}>
          <View style={styles.statBadge}>
            <ThemedText style={[styles.statValue, { color: colors.text }]}>
              {metadata.trackCount}
            </ThemedText>
            <ThemedText style={[styles.statLabel, { color: colors.text }]}>
              tracks
            </ThemedText>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.text }]} />
          <View style={styles.statBadge}>
            <ThemedText style={[styles.statValue, { color: colors.text }]}>
              {durationMins}
            </ThemedText>
            <ThemedText style={[styles.statLabel, { color: colors.text }]}>
              min
            </ThemedText>
          </View>
        </View>
      </View>

      <TrackCarousel tracks={feedTracks} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 16,
  },
  sessionInfo: {
    paddingHorizontal: 4,
    marginBottom: 8,
  },
  actionLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.5,
    opacity: 0.5,
    marginBottom: 8,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  statBadge: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
  },
  statValue: {
    fontSize: 24,
    fontWeight: "700",
  },
  statLabel: {
    fontSize: 13,
    opacity: 0.6,
  },
  statDivider: {
    width: 1,
    height: 20,
    opacity: 0.2,
  },
});
