import { ThemedText } from '@/components/themed-text';
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import feedApi, { FeedPost } from "@/services/feedApi";
import { Image } from "expo-image";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import PostHeader from "./PostHeader";

interface SharedPlaylistPostProps {
  item: FeedPost;
}

export default function SharedPlaylistPost({ item }: SharedPlaylistPostProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = Colors[isDark ? "dark" : "light"];

  const timeAgo = feedApi.getTimeAgo(item.createdAt);
  const caption = feedApi.getCaption(item);
  const playlist = item.playlist;

  if (!playlist) return null;

  return (
    <Pressable
      style={[
        styles.card,
      ]}
      onPress={() => {
        /* Navigate to playlist */
      }}
    >
      <PostHeader user={item.user} timeAgo={timeAgo} />

      {caption && (
        <ThemedText style={[styles.caption, { color: colors.text }]}>{caption}</ThemedText>
      )}

      <View
        style={[
          styles.playlistCard,
        ]}
      >
        <Image
          source={{ uri: playlist.imageUrl || "" }}
          style={styles.playlistImage}
        />
        <View style={styles.playlistInfo}>
          <ThemedText style={[styles.playlistLabel, { color: colors.text }]}>
            PLAYLIST
          </ThemedText>
          <ThemedText
            style={[styles.playlistName, { color: colors.text }]}
            numberOfLines={2}
          >
            {playlist.name}
          </ThemedText>
        </View>
        <View style={[styles.playIcon, { backgroundColor: colors.primary }]}>
          <ThemedText style={styles.playIconText}>▶</ThemedText>
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
  playlistCard: {
    flexDirection: "row",
    alignItems: "center",
    overflow: "hidden",
  },
  playlistImage: {
    width: 72,
    height: 72,
    borderRadius: 8,
  },
  playlistInfo: {
    flex: 1,
    marginLeft: 12,
  },
  playlistLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.2,
    opacity: 0.5,
    marginBottom: 4,
  },
  playlistName: {
    fontSize: 16,
    fontWeight: "600",
  },
  playIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  playIconText: {
    color: "#fff",
    fontSize: 14,
    marginLeft: 2,
  },
});
