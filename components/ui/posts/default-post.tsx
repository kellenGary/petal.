import { ThemedText } from '@/components/ui/themed-text';
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import feedApi, { FeedPost } from "@/services/feedApi";
import { Image } from "expo-image";
import { router } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import PostHeader from "./post-header";

interface DefaultPostProps {
  item: FeedPost;
}

export default function DefaultPost({ item }: DefaultPostProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = Colors[isDark ? "dark" : "light"];

  const imageUrl = feedApi.getPostImageUrl(item);
  const timeAgo = feedApi.getTimeAgo(item.createdAt);

  const getActionText = (type: FeedPost["type"]) => {
    switch (type) {
      case "Play":
        return "Listened to";
      case "LikedTrack":
        return "Liked";
      case "LikedAlbum":
        return "Liked album";
      case "LikedPlaylist":
        return "Liked playlist";
      case "PlaylistAdd":
        return "Added to playlist";
      default:
        return "Shared";
    }
  };

  const getContentName = () => {
    if (item.track) return item.track.name;
    if (item.album) return item.album.name;
    if (item.playlist) return item.playlist.name;
    if (item.artist) return item.artist.name;
    return "";
  };

  const getContentSubtitle = () => {
    if (item.track) return item.track.artistNames.join(", ");
    if (item.artist) return "Artist";
    return null;
  };

  const handlePress = () => {
    if (item.track) router.push(`/song/${item.track.id}`);
  };

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
      onPress={handlePress}
    >
      <PostHeader user={item.user} timeAgo={timeAgo} />

      <View style={styles.content}>
        {imageUrl && (
          <Image source={{ uri: imageUrl }} style={styles.contentImage} />
        )}
        <View style={styles.contentText}>
          <ThemedText style={[styles.action, { color: colors.text }]}>
            {getActionText(item.type)}
          </ThemedText>
          <ThemedText style={[styles.name, { color: colors.text }]} numberOfLines={1}>
            {getContentName()}
          </ThemedText>
          {getContentSubtitle() && (
            <ThemedText
              style={[styles.subtitle, { color: colors.text }]}
              numberOfLines={1}
            >
              {getContentSubtitle()}
            </ThemedText>
          )}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 12,
    borderRadius: 12,
    padding: 12,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
  },
  contentImage: {
    width: 56,
    height: 56,
    borderRadius: 8,
  },
  contentText: {
    flex: 1,
    marginLeft: 12,
  },
  action: {
    fontSize: 11,
    opacity: 0.6,
    marginBottom: 2,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  name: {
    fontSize: 15,
    fontWeight: "600",
  },
  subtitle: {
    fontSize: 13,
    opacity: 0.7,
    marginTop: 2,
  },
});
