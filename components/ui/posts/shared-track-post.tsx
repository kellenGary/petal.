import { ThemedText } from '@/components/ui/themed-text';
import { Colors } from "@/constants/theme";
import { useAuth } from "@/contexts/AuthContext";
import { useColorScheme } from "@/hooks/use-color-scheme";
import feedApi, { FeedPost } from "@/services/feedApi";
import { Image } from "expo-image";
import { router } from "expo-router";
import React from "react";
import { Dimensions, Pressable, StyleSheet, View } from "react-native";
import PostHeader from "./post-header";

interface SharedTrackPostProps {
  item: FeedPost;
}

const SCREEN_WIDTH = Dimensions.get("window").width;

export default function SharedTrackPost({ item }: SharedTrackPostProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = Colors[isDark ? "dark" : "light"];
  const { user: currentUser } = useAuth();

  const timeAgo = feedApi.getTimeAgo(item.createdAt);
  const caption = feedApi.getCaption(item);
  const track = item.track;
  const user = item.user;

  if (!track) return null;

  const handlePress = () => {
    router.push(`/song/${track.id}`);
  };

  const handleProfilePress = () => {
    router.push(`/profile/${user.id === currentUser?.id ? "" : user.id}`);
  };

  return (
    <Pressable style={styles.container} onPress={handlePress}>
      <PostHeader user={item.user} timeAgo={timeAgo} />

      {caption && (
        <ThemedText style={[styles.caption, { color: colors.text }]}>{caption}</ThemedText>
      )}

      <View style={styles.centerContainer}>
        {/* The Card - Mimics StackedCard visual interaction */}
        <Pressable
          style={[styles.card, { backgroundColor: colors.card }]}
          onPress={handlePress}
        >
          {track.albumImageUrl && (
            <Image
              source={{ uri: track.albumImageUrl }}
              style={styles.cardImage}
              contentFit="cover"
            />
          )}
          <View style={[styles.cardContent, { backgroundColor: colors.card }]}>
            <ThemedText
              style={[styles.cardTrackName, { color: colors.text }]}
              numberOfLines={2}
            >
              {track.name || 'Unknown Track'}
            </ThemedText>
            <ThemedText
              style={[styles.cardArtistName, { color: colors.text }]}
              numberOfLines={1}
            >
              {track.artistNames.join(", ") || 'Unknown Artist'}
            </ThemedText>
          </View>
        </Pressable>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  caption: {
    fontSize: 15,
    marginBottom: 16,
    lineHeight: 20,
    paddingHorizontal: 4,
  },
  centerContainer: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  actionLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.2,
    opacity: 0.5,
    marginBottom: 12,
    alignSelf: 'center',
  },
  card: {
    width: "100%",
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  cardImage: {
    width: "100%",
    aspectRatio: 1,
  },
  cardContent: {
    padding: 16,
    justifyContent: "flex-end",
  },
  cardTrackName: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4,
  },
  cardArtistName: {
    fontSize: 14,
    opacity: 0.6,
  },
});
