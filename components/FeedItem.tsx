import { ThemedText } from '@/components/themed-text';
import { Colors } from "@/constants/theme";
import { useAuth } from "@/contexts/AuthContext";
import { useColorScheme } from "@/hooks/use-color-scheme";
import feedApi, { FeedPost } from "@/services/feedApi";
import { Image } from "expo-image";
import { router } from "expo-router";
import React, { useCallback } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

export default function FeedItem({ item }: { item: FeedPost }) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = Colors[isDark ? "dark" : "light"];
  const { user } = useAuth();

  const imageUrl = feedApi.getPostImageUrl(item);
  const timeAgo = feedApi.getTimeAgo(item.createdAt);
  const caption = feedApi.getCaption(item);
  const isSession = item.type === "ListeningSession";

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
      case "ListeningSession":
        return "Listening session";
      case "SharedTrack":
        return "Shared";
      case "SharedAlbum":
        return "Shared album";
      case "SharedPlaylist":
        return "Shared playlist";
      case "SharedArtist":
        return "Shared artist";
      default:
        return "Shared";
    }
  };

  const getContentName = (it: FeedPost) => {
    if (it.track) return it.track.name;
    if (it.album) return it.album.name;
    if (it.playlist) return it.playlist.name;
    if (it.artist) return it.artist.name;
    return "";
  };

  const getContentSubtitle = (it: FeedPost) => {
    if (it.track) return it.track.artistNames.join(", ");
    if (it.artist) return "Artist";
    return null;
  };

  const renderListeningSession = useCallback(() => {
    const metadata = feedApi.parseListeningSessionMetadata(item);
    if (!metadata || !metadata.tracks) return null;
    return (
      <View style={styles.sessionContainer}>
        <ThemedText style={[styles.sessionInfo, { color: colors.text }]}>
          {metadata.trackCount} tracks •{" "}
          {Math.round(metadata.totalDurationMs / 60000)} min
        </ThemedText>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.sessionTrackScroll}
          contentContainerStyle={styles.sessionTrackContent}
        >
          {metadata.tracks.slice(0, 6).map((track, index) => (
            <View
              key={`${track.trackId}-${index}`}
              style={styles.sessionTrackItem}
            >
              {track.albumImageUrl && (
                <Image
                  source={{ uri: track.albumImageUrl }}
                  style={styles.sessionTrackImage}
                />
              )}
              <ThemedText
                style={[styles.sessionTrackName, { color: colors.text }]}
                numberOfLines={1}
              >
                {track.name}
              </ThemedText>
            </View>
          ))}
          {metadata.tracks.length > 6 && (
            <View style={styles.sessionMoreItem}>
              <ThemedText style={[styles.sessionMoreText, { color: colors.text }]}>
                +{metadata.tracks.length - 6}
              </ThemedText>
            </View>
          )}
        </ScrollView>
      </View>
    );
  }, [item, colors.text]);

  return (
    <Pressable
      style={[
        styles.feedCard,
        {
          backgroundColor: isDark
            ? "rgba(255,255,255,0.03)"
            : "rgba(0,0,0,0.03)",
        },
      ]}
      onPress={() => {
        if (item.track) router.push(`/song/${item.track.id}`);
      }}
    >
      <Pressable
        style={styles.feedUserRow}
        onPress={() =>
          router.push(
            `/profile/${item.user.id === user?.id ? "" : item.user.id}`,
          )
        }
      >
        <Image
          source={{
            uri: item.user.profileImageUrl || "https://i.pravatar.cc/100",
          }}
          style={styles.feedUserImage}
        />
        <View style={styles.feedUserInfo}>
          <ThemedText style={[styles.feedUserName, { color: colors.text }]}>
            {item.user.displayName || item.user.handle}
          </ThemedText>
          <ThemedText style={[styles.feedTimeAgo, { color: colors.text }]}>
            {timeAgo}
          </ThemedText>
        </View>
      </Pressable>

      {caption && (
        <ThemedText style={[styles.feedCaption, { color: colors.text }]}>
          {caption}
        </ThemedText>
      )}

      {isSession ? (
        renderListeningSession()
      ) : (
        <View style={styles.feedContent}>
          {imageUrl && (
            <Image source={{ uri: imageUrl }} style={styles.feedContentImage} />
          )}
          <View style={styles.feedContentText}>
            <ThemedText style={[styles.feedAction, { color: colors.text }]}>
              {getActionText(item.type)}
            </ThemedText>
            <ThemedText
              style={[styles.feedTrackName, { color: colors.text }]}
              numberOfLines={1}
            >
              {getContentName(item)}
            </ThemedText>
            {getContentSubtitle(item) && (
              <ThemedText
                style={[styles.feedArtistName, { color: colors.text }]}
                numberOfLines={1}
              >
                {getContentSubtitle(item)}
              </ThemedText>
            )}
          </View>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  feedCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    padding: 12,
  },
  feedUserRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  feedUserImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  feedUserInfo: {
    marginLeft: 10,
    flex: 1,
  },
  feedUserName: {
    fontSize: 14,
    fontWeight: "600",
  },
  feedTimeAgo: {
    fontSize: 12,
    opacity: 0.6,
  },
  feedContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  feedContentImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  feedContentText: {
    flex: 1,
    marginLeft: 12,
  },
  feedAction: {
    fontSize: 12,
    opacity: 0.6,
    marginBottom: 2,
  },
  feedTrackName: {
    fontSize: 15,
    fontWeight: "600",
  },
  feedArtistName: {
    fontSize: 13,
    opacity: 0.7,
    marginTop: 2,
  },
  feedCaption: {
    fontSize: 14,
    marginBottom: 12,
    lineHeight: 20,
  },
  sessionContainer: {
    marginTop: 4,
  },
  sessionInfo: {
    fontSize: 12,
    opacity: 0.6,
    marginBottom: 8,
  },
  sessionTrackScroll: {
    marginHorizontal: -4,
  },
  sessionTrackContent: {
    paddingHorizontal: 4,
    gap: 8,
  },
  sessionTrackItem: {
    width: 80,
    alignItems: "center",
  },
  sessionTrackImage: {
    width: 64,
    height: 64,
    borderRadius: 6,
    marginBottom: 4,
  },
  sessionTrackName: {
    fontSize: 11,
    textAlign: "center",
  },
  sessionMoreItem: {
    width: 64,
    height: 64,
    borderRadius: 6,
    backgroundColor: "rgba(255,255,255,0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  sessionMoreText: {
    fontSize: 14,
    fontWeight: "600",
  },
});
