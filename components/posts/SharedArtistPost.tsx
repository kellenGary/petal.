import { ThemedText } from '@/components/themed-text';
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import feedApi, { FeedPost } from "@/services/feedApi";
import { Image } from "expo-image";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import PostHeader from "./PostHeader";

interface SharedArtistPostProps {
  item: FeedPost;
}

export default function SharedArtistPost({ item }: SharedArtistPostProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = Colors[isDark ? "dark" : "light"];

  const timeAgo = feedApi.getTimeAgo(item.createdAt);
  const caption = feedApi.getCaption(item);
  const artist = item.artist;

  if (!artist) return null;

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
        /* Navigate to artist */
      }}
    >
      <PostHeader user={item.user} timeAgo={timeAgo} />

      {caption && (
        <ThemedText style={[styles.caption, { color: colors.text }]}>{caption}</ThemedText>
      )}

      <View
        style={[
          styles.artistCard,
          {
            backgroundColor: isDark
              ? "rgba(255,255,255,0.05)"
              : "rgba(0,0,0,0.05)",
          },
        ]}
      >
        <Image
          source={{ uri: artist.imageUrl || "" }}
          style={styles.artistImage}
        />
        <View style={styles.artistInfo}>
          <ThemedText style={[styles.artistLabel, { color: colors.text }]}>
            ARTIST
          </ThemedText>
          <ThemedText
            style={[styles.artistName, { color: colors.text }]}
            numberOfLines={1}
          >
            {artist.name}
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
  artistCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    padding: 16,
  },
  artistImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  artistInfo: {
    flex: 1,
    marginLeft: 16,
  },
  artistLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.2,
    opacity: 0.5,
    marginBottom: 4,
  },
  artistName: {
    fontSize: 20,
    fontWeight: "700",
  },
});
