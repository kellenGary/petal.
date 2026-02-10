import { useAuth } from "@/contexts/AuthContext";
import feedApi, { FeedPost } from "@/services/feedApi";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React from "react";
import { Dimensions, Pressable, StyleSheet, Text, View } from "react-native";

interface SharedAlbumPostProps {
  item: FeedPost;
}

const SCREEN_WIDTH = Dimensions.get("window").width;

export default function SharedAlbumPost({ item }: SharedAlbumPostProps) {
  const { user: currentUser } = useAuth();

  const timeAgo = feedApi.getTimeAgo(item.createdAt);
  const album = item.album;
  const user = item.user;

  if (!album) return null;

  const handlePress = () => {
    // router.push(`/album/${album.id}`);
  };

  const handleProfilePress = () => {
    router.push(`/profile/${user.id === currentUser?.id ? "" : user.id}`);
  };

  return (
    <Pressable style={styles.container} onPress={handlePress}>
      {/* Blurred Background Layer */}
      <Image
        source={{ uri: album.imageUrl || "" }}
        style={styles.backgroundImage}
        contentFit="cover"
        blurRadius={50}
        transition={200}
      />

      {/* Dark Overlay for contrast */}
      <View style={styles.darkOverlay} />

      {/* Content Container */}
      <View style={styles.content}>
        {/* Custom Header */}
        <View style={styles.header}>
          <Pressable onPress={handleProfilePress} style={styles.headerRow}>
            <Image
              source={{ uri: user.profileImageUrl || "https://i.pravatar.cc/100" }}
              style={styles.avatar}
            />
            <View style={styles.userInfo}>
              <Text style={styles.userName}>
                {user.displayName || user.handle}
              </Text>
              <Text style={styles.timeAgo}>
                {timeAgo} • Shared an album
              </Text>
            </View>
          </Pressable>
        </View>

        {/* Centered Album Art */}
        <View style={styles.centerContainer}>
          <View style={styles.shadowContainer}>
            <Image
              source={{ uri: album.imageUrl || "" }}
              style={styles.mainImage}
              contentFit="cover"
              transition={200}
            />
          </View>
        </View>

        {/* Footer Info */}
        <View style={styles.footer}>
          <LinearGradient
            colors={["transparent", "rgba(0,0,0,0.8)"]}
            style={styles.textGradient}
          />
          <Text style={styles.label}>ALBUM</Text>
          <Text style={styles.albumName} numberOfLines={2}>
            {album.name}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    aspectRatio: 1, // Square for albums
    borderRadius: 24,
    overflow: "hidden",
    marginBottom: 24,
    backgroundColor: "#121212",
    position: "relative",
  },
  backgroundImage: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.6,
  },
  darkOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  content: {
    flex: 1,
    justifyContent: "space-between",
    padding: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    zIndex: 10,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.8)",
  },
  userInfo: {
    marginLeft: 10,
  },
  userName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  timeAgo: {
    fontSize: 12,
    color: "rgba(255,255,255,0.8)",
    marginTop: 2,
    fontWeight: "500",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    marginVertical: 10,
  },
  shadowContainer: {
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 12,
    },
    shadowOpacity: 0.58,
    shadowRadius: 16.0,
    elevation: 24,
    borderRadius: 8,
  },
  mainImage: {
    width: 200,
    height: 200,
    borderRadius: 8,
  },
  footer: {
    zIndex: 10,
  },
  textGradient: {
    position: 'absolute',
    left: -16,
    right: -16,
    bottom: -16,
    top: -40,
    zIndex: -1,
  },
  label: {
    fontSize: 11,
    fontWeight: "800",
    color: "rgba(255,255,255,0.7)",
    letterSpacing: 2,
    marginBottom: 4,
    textTransform: "uppercase",
  },
  albumName: {
    fontSize: 24,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -0.5,
    marginBottom: 2,
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  artistName: {
    fontSize: 16,
    fontWeight: "500",
    color: "rgba(255,255,255,0.9)",
  },
});
