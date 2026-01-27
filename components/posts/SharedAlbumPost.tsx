import { ThemedText } from '@/components/themed-text';
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import feedApi, { FeedPost } from "@/services/feedApi";
import { Image } from "expo-image";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import PostHeader from "./PostHeader";

interface SharedAlbumPostProps {
  item: FeedPost;
}

export default function SharedAlbumPost({ item }: SharedAlbumPostProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = Colors[isDark ? "dark" : "light"];

  const timeAgo = feedApi.getTimeAgo(item.createdAt);
  const caption = feedApi.getCaption(item);
  const album = item.album;

  if (!album) return null;

  return (
    <Pressable
      style={[
        styles.card,
        {
          backgroundColor: isDark
            ? "rgba(255,255,255,0.03)"
            : "rgba(0,0,0,0.03)",
        },
      ]}
      onPress={() => {
        /* Navigate to album */
      }}
    >
      <PostHeader user={item.user} timeAgo={timeAgo} />

      {caption && (
        <ThemedText style={[styles.caption, { color: colors.text }]}>{caption}</ThemedText>
      )}

      <View style={styles.albumContainer}>
        <Image source={{ uri: album.imageUrl || "" }} style={styles.albumArt} />
        <View style={styles.albumOverlay}>
          <ThemedText style={styles.albumLabel}>ALBUM</ThemedText>
          <ThemedText style={styles.albumName} numberOfLines={2}>
            {album.name}
          </ThemedText>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    padding: 12,
  },
  caption: {
    fontSize: 15,
    marginBottom: 12,
    lineHeight: 20,
  },
  albumContainer: {
    borderRadius: 12,
    overflow: "hidden",
    position: "relative",
    aspectRatio: 1.5,
  },
  albumArt: {
    width: "100%",
    height: "100%",
  },
  albumOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  albumLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.2,
    color: "rgba(255,255,255,0.7)",
    marginBottom: 4,
  },
  albumName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
  },
});
