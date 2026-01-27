import { ThemedText } from '@/components/themed-text';
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import feedApi, { FeedPost } from "@/services/feedApi";
import { Image } from "expo-image";
import { router } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import PostHeader from "./PostHeader";
import { LinearGradient } from "expo-linear-gradient";

interface SharedTrackPostProps {
  item: FeedPost;
}

export default function SharedTrackPost({ item }: SharedTrackPostProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = Colors[isDark ? "dark" : "light"];

  const timeAgo = feedApi.getTimeAgo(item.createdAt);
  const caption = feedApi.getCaption(item);
  const track = item.track;

  if (!track) return null;

  return (
    <Pressable
      style={[
        styles.card,
      ]}
      onPress={() => router.push(`/song/${track.id}`)}
    >
      <PostHeader user={item.user} timeAgo={timeAgo} />

      {caption && (
        <ThemedText style={[styles.caption, { color: colors.text }]}>{caption}</ThemedText>
      )}

      <View style={styles.trackContainer}>
        <Image
          source={{ uri: track.albumImageUrl || "" }}
          style={styles.albumArt}
        />
        <LinearGradient
          colors={["transparent", "rgba(0,0,0,0.5)", "rgba(0,0,0,0.7)"]}
          style={styles.gradient} />
        <View style={styles.trackInfo}>
          <ThemedText style={[styles.actionLabel, { color: colors.text }]}>
            SHARED
          </ThemedText>
          <ThemedText style={styles.trackName} numberOfLines={2}>
            {track.name}
          </ThemedText>
          <ThemedText style={styles.artistName} numberOfLines={1}>
            {track.artistNames.join(", ")}
          </ThemedText>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 12,
    overflow: "hidden",
  },
  caption: {
    fontSize: 15,
    marginBottom: 12,
    lineHeight: 20,
  },
  trackContainer: {
    borderRadius: 12,
    overflow: "hidden",
    position: "relative",
  },
  albumArt: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 12,
  },
  gradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: "50%",
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  trackInfo: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
  },
  actionLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.2,
    opacity: 0.7,
    marginBottom: 4,
  },
  trackName: {
    fontSize: 20,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 4,
  },
  artistName: {
    fontSize: 14,
    color: "rgba(255,255,255,0.8)",
  },
});
