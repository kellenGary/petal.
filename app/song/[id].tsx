import { ThemedText } from '@/components/themed-text';
import LikeButton from "@/components/like-button";
import { Colors } from "@/constants/theme";
import { useAuth } from "@/contexts/AuthContext";
import api from "@/services/api";
import playbackApi from "@/services/playbackApi";
import spotifyApi from "@/services/spotifyApi";
import { MaterialIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface Fan {
  id: number;
  displayName: string | null;
  handle: string | null;
  profileImageUrl: string | null;
  isFollowing: boolean;
}

export default function SongModal() {
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [song, setSong] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [liked, setLiked] = useState<boolean | null>(null);
  const [likeLoading, setLikeLoading] = useState(false);
  const [fans, setFans] = useState<Fan[]>([]);
  const [fansLoading, setFansLoading] = useState(false);
  const [sharing, setSharing] = useState(false);

  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = Colors[isDark ? "dark" : "light"];

  // Fetch song data
  useEffect(() => {
    if (!id) return;
    async function fetchSong() {
      setLoading(true);
      try {
        const response = await api.makeAuthenticatedRequest(
          `/api/tracks/${id}`,
        );
        if (!response.ok) {
          const err = await response
            .json()
            .catch(() => ({ error: response.statusText }));
          console.error("Failed to fetch song from DB", err);
          setSong(null);
          return;
        }
        const data = await response.json();
        setSong(data.track);
      } catch (error) {
        console.error("Error fetching song:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchSong();
  }, [id]);

  // Fetch like state once we have the song's spotify_id
  useEffect(() => {
    if (!song?.spotify_id) return;
    async function fetchLikeState() {
      try {
        const isLiked = await spotifyApi.checkIfSongIsLiked(song.spotify_id);
        setLiked(isLiked);
      } catch (error) {
        console.error("Error checking like state:", error);
        setLiked(false);
      }
    }
    fetchLikeState();
  }, [song?.spotify_id]);

  // Fetch fans (users who liked this track)
  useEffect(() => {
    if (!id) return;
    async function fetchFans() {
      setFansLoading(true);
      try {
        const response = await api.makeAuthenticatedRequest(
          `/api/tracks/${id}/fans?limit=6`,
        );
        if (response.ok) {
          const data = await response.json();
          setFans(data.fans || []);
        }
      } catch (error) {
        console.error("Error fetching fans:", error);
      } finally {
        setFansLoading(false);
      }
    }
    fetchFans();
  }, [id]);

  const handleToggleLike = useCallback(async () => {
    if (!song?.spotify_id || liked === null || likeLoading) return;

    setLikeLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      if (liked) {
        await spotifyApi.unlikeSong(song.spotify_id);
        setLiked(false);
      } else {
        await spotifyApi.likeSong(song.spotify_id);
        setLiked(true);
      }
    } catch (error) {
      console.error("Error toggling like:", error);
      Alert.alert("Error", "Failed to update like status. Please try again.");
    } finally {
      setLikeLoading(false);
    }
  }, [song?.spotify_id, liked, likeLoading]);

  const handleAddToPlaylist = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert(
      "Add to Playlist",
      "Playlist picker coming soon! For now, you can add songs to playlists directly in Spotify.",
      [{ text: "OK" }],
    );
  }, []);

  const handleShareToFeed = useCallback(async () => {
    if (!song || sharing) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSharing(true);

    try {
      // Navigate to post preview with song data
      router.push({
        pathname: "/post-preview",
        params: {
          type: "song",
          id: song.id,
          spotifyId: song.spotify_id,
          name: song.name,
          imageUrl: song.album?.image_url || "",
          subtitle: song.artists?.map((a: any) => a.name).join(", ") || "",
        },
      });
    } catch (error) {
      console.error("Error navigating to share:", error);
      Alert.alert("Error", "Failed to open share dialog.");
    } finally {
      setSharing(false);
    }
  }, [song, sharing]);

  const handlePlaySong = useCallback(() => {
    if (!song?.spotify_id) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    playbackApi.playSong(song.spotify_id);
  }, [song?.spotify_id]);

  if (loading) {
    return (
      <View
        style={[
          styles.loadingContainer,
          { backgroundColor: colors.background },
        ]}
      >
        <ActivityIndicator size="large" color={colors.primary} />
        <ThemedText style={[styles.loadingText, { color: colors.text }]}>
          Loading song...
        </ThemedText>
      </View>
    );
  }

  if (!song) {
    return (
      <View
        style={[styles.errorContainer, { backgroundColor: colors.background }]}
      >
        <MaterialIcons name="music-off" size={48} color={colors.icon} />
        <ThemedText style={[styles.errorText, { color: colors.text }]}>
          Song not found
        </ThemedText>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
    >
      <Stack.Screen
        options={{ title: song?.name || "Song", headerShown: false }}
      />

      {/* Header with album art and song info */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: colors.background,
            borderBottomColor: isDark ? "#333" : "#eee",
          },
        ]}
      >
        <Image
          source={{ uri: song?.album?.image_url || "" }}
          style={styles.albumArt}
          contentFit="cover"
        />
        <View style={styles.songInfo}>
          <ThemedText
            style={[styles.songName, { color: colors.text }]}
            numberOfLines={2}
          >
            {song?.name}
          </ThemedText>
          <ThemedText
            style={[styles.artistName, { color: colors.text }]}
            numberOfLines={1}
          >
            {song?.artists?.map((artist: any) => artist.name).join(", ")}
          </ThemedText>
          {song?.album?.name && (
            <ThemedText
              style={[styles.albumName, { color: colors.icon }]}
              numberOfLines={1}
            >
              {song.album.name}
            </ThemedText>
          )}
          <Pressable
            style={[styles.playButton, { backgroundColor: colors.primary }]}
            onPress={handlePlaySong}
          >
            <MaterialIcons name="play-arrow" size={20} color="#fff" />
            <ThemedText style={styles.playButtonText}>Play</ThemedText>
          </Pressable>
        </View>
      </View>

      <View style={styles.sheetContent}>
        {/* Action Buttons */}
        <View style={styles.section}>
          <View style={styles.actionsRow}>
            {/* Like Button */}
            <LikeButton
              liked={liked}
              likeLoading={likeLoading}
              handleToggleLike={handleToggleLike}
            />

            {/* Playlist Button */}
            <Pressable
              style={[styles.actionButton, { backgroundColor: colors.card }]}
              onPress={handleAddToPlaylist}
            >
              <MaterialIcons
                name="playlist-add"
                size={18}
                color={colors.text}
              />
              <ThemedText style={[styles.actionText, { color: colors.text }]}>
                Playlist
              </ThemedText>
            </Pressable>

            <Pressable
              style={[styles.actionButton, { backgroundColor: colors.card }]}
              onPress={handleShareToFeed}
              disabled={sharing}
            >
              <MaterialIcons name="share" size={18} color={colors.text} />
              <ThemedText style={[styles.actionText, { color: colors.text }]}>
                Share
              </ThemedText>
            </Pressable>
          </View>
        </View>

        {/* Fans Section */}
        {(fans.length > 0 || fansLoading) && (
          <View style={styles.section}>
            <ThemedText style={[styles.sectionTitle, { color: colors.text }]}>
              {fans.some((f) => f.isFollowing)
                ? "Friends who liked this"
                : "People who liked this"}
            </ThemedText>
            {fansLoading ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.fansRow}>
                  {fans.map((fan) => (
                    <Pressable
                      key={fan.id}
                      style={styles.fanItem}
                      onPress={() => router.push(`/profile/${fan.id}` as any)}
                    >
                      {fan.profileImageUrl ? (
                        <Image
                          source={{ uri: fan.profileImageUrl }}
                          style={styles.fanAvatar}
                        />
                      ) : (
                        <View
                          style={[
                            styles.fanAvatar,
                            styles.fanAvatarPlaceholder,
                          ]}
                        >
                          <MaterialIcons
                            name="person"
                            size={24}
                            color={colors.icon}
                          />
                        </View>
                      )}
                      <ThemedText
                        style={[styles.fanName, { color: colors.text }]}
                        numberOfLines={1}
                      >
                        {fan.displayName || fan.handle || "User"}
                      </ThemedText>
                      {fan.isFollowing && (
                        <View style={styles.followingBadge}>
                          <MaterialIcons name="check" size={10} color="#fff" />
                        </View>
                      )}
                    </Pressable>
                  ))}
                </View>
              </ScrollView>
            )}
          </View>
        )}

        {/* Track Stats */}
        <View style={styles.section}>
          <ThemedText style={[styles.sectionTitle, { color: colors.text }]}>
            Track Info
          </ThemedText>
          <View style={[styles.statsCard, { backgroundColor: colors.card }]}>
            <View style={styles.statRow}>
              <MaterialIcons name="album" size={18} color={colors.icon} />
              <ThemedText style={[styles.statLabel, { color: colors.text }]}>
                Album
              </ThemedText>
              <ThemedText
                style={[styles.statValue, { color: colors.text }]}
                numberOfLines={1}
              >
                {song?.album?.name || "Unknown"}
              </ThemedText>
            </View>
            <View style={styles.statRow}>
              <MaterialIcons name="schedule" size={18} color={colors.icon} />
              <ThemedText style={[styles.statLabel, { color: colors.text }]}>
                Duration
              </ThemedText>
              <ThemedText style={[styles.statValue, { color: colors.text }]}>
                {formatDuration(song?.duration_ms)}
              </ThemedText>
            </View>
            {song?.album?.release_date && (
              <View style={styles.statRow}>
                <MaterialIcons name="event" size={18} color={colors.icon} />
                <ThemedText style={[styles.statLabel, { color: colors.text }]}>
                  Released
                </ThemedText>
                <ThemedText style={[styles.statValue, { color: colors.text }]}>
                  {formatReleaseDate(song.album.release_date)}
                </ThemedText>
              </View>
            )}
            {song?.popularity !== undefined && (
              <View style={styles.statRow}>
                <MaterialIcons
                  name="trending-up"
                  size={18}
                  color={colors.icon}
                />
                <ThemedText style={[styles.statLabel, { color: colors.text }]}>
                  Popularity
                </ThemedText>
                <View style={styles.popularityBar}>
                  <View
                    style={[
                      styles.popularityFill,
                      {
                        width: `${song.popularity}%`,
                        backgroundColor: colors.primary,
                      },
                    ]}
                  />
                </View>
                <ThemedText style={[styles.statValue, { color: colors.text }]}>
                  {song.popularity}
                </ThemedText>
              </View>
            )}
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

function formatDuration(ms: number | undefined): string {
  if (!ms) return "--:--";
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function formatReleaseDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return dateStr;
  }
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingTop: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  errorText: {
    fontSize: 18,
    fontWeight: "600",
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 16,
    paddingBottom: 16,
    paddingHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  albumArt: {
    width: 140,
    height: 140,
    borderRadius: 8,
  },
  songInfo: {
    flex: 1,
    gap: 4,
  },
  songName: {
    fontSize: 22,
    fontWeight: "bold",
  },
  artistName: {
    fontSize: 16,
    opacity: 0.9,
  },
  albumName: {
    fontSize: 14,
    marginTop: 2,
  },
  playButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 24,
    alignSelf: "flex-start",
  },
  playButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 15,
  },
  sheetContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    gap: 24,
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  actionsRow: {
    flexDirection: "row",
    gap: 10,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
  },
  actionText: {
    fontSize: 13,
    fontWeight: "500",
  },
  fansRow: {
    flexDirection: "row",
    gap: 16,
  },
  fanItem: {
    alignItems: "center",
    width: 68,
  },
  fanAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  fanAvatarPlaceholder: {
    backgroundColor: "rgba(128,128,128,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  fanName: {
    fontSize: 12,
    textAlign: "center",
    marginTop: 6,
  },
  followingBadge: {
    position: "absolute",
    top: 0,
    right: 8,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#1DB954",
    justifyContent: "center",
    alignItems: "center",
  },
  statsCard: {
    borderRadius: 12,
    padding: 14,
    gap: 12,
  },
  statRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  statLabel: {
    fontSize: 14,
    opacity: 0.7,
    width: 80,
  },
  statValue: {
    fontSize: 14,
    fontWeight: "500",
    flex: 1,
    textAlign: "right",
  },
  popularityBar: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(128,128,128,0.2)",
    overflow: "hidden",
  },
  popularityFill: {
    height: 6,
    borderRadius: 3,
  },
});
