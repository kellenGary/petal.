import { Colors } from "@/constants/theme";
import api from "@/services/api";
import playbackApi from "@/services/playbackApi";
import { Stack, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from "react-native";

export default function SongModal() {
  const { id } = useLocalSearchParams();
  const [song, setSong] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [liked, setLiked] = useState(false);
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = Colors[isDark ? "dark" : "light"];

  const friends = useMemo(
    () => [
      { id: "1", name: "Alex", avatar: "https://i.pravatar.cc/100?img=1" },
      { id: "2", name: "Riley", avatar: "https://i.pravatar.cc/100?img=2" },
      { id: "3", name: "Sam", avatar: "https://i.pravatar.cc/100?img=3" },
      { id: "4", name: "Jordan", avatar: "https://i.pravatar.cc/100?img=4" },
    ],
    []
  );

  const comments = useMemo(
    () => [
      {
        id: "c1",
        user: "Alex",
        avatar: "https://i.pravatar.cc/100?img=5",
        text: "This bridge live was insane",
        time: "2h",
      },
      {
        id: "c2",
        user: "Jamie",
        avatar: "https://i.pravatar.cc/100?img=6",
        text: "Put this on the road trip playlist",
        time: "4h",
      },
      {
        id: "c3",
        user: "Taylor",
        avatar: "https://i.pravatar.cc/100?img=7",
        text: "Heat at 1:42 hits different",
        time: "1d",
      },
    ],
    []
  );

  const heatmapStats = useMemo(
    () => ({
      topCountries: [
        { code: "US", value: 62 },
        { code: "GB", value: 14 },
        { code: "DE", value: 9 },
        { code: "BR", value: 8 },
        { code: "JP", value: 7 },
      ],
      liveNow: 231,
    }),
    []
  );

  useEffect(() => {
    if (!id) return;
    async function fetchSong() {
      setLoading(true);
      try {
        const response = await api.makeAuthenticatedRequest(`/api/tracks/${id}`);
        if (!response.ok) {
          const err = await response.json().catch(() => ({ error: response.statusText }));
          console.error("Failed to fetch song from DB", err);
          setSong(null);
          return;
        }
        const data = await response.json();
        // endpoint returns { track }
        setSong(data.track);
      } catch (error) {
        console.error("Error fetching song:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchSong();
  }, [id]);

  if (loading) {
    return (
      <View
        style={[
          styles.loadingContainer,
          { backgroundColor: colors.background },
        ]}
      >
        <ActivityIndicator size="large" color="#1DB954" />
        <Text style={[styles.loadingText, { color: colors.text }]}>
          Loading song...
        </Text>
      </View>
    );
  }

  if (!song) {
    return (
      <View
        style={[styles.errorContainer, { backgroundColor: colors.background }]}
      >
        <Text style={styles.errorText}>No song found.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.screen, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ title: `song/${id}`, headerShown: false }} />
      <View style={{ flex: 1, backgroundColor: colors.background }}>
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
            style={{
              width: 150,
              height: 150,
              borderRadius: 8,
              marginBottom: 12,
            }}
          />
          <View style={{ flex: 1, gap: 12 }}>
            <View>
              <Text style={[styles.songName, { color: colors.text }]}>
                {song?.name}
              </Text>
              <Text style={[styles.artistName, { color: colors.text }]}>
                {song?.artists?.map((artist: any) => artist.name).join(", ")}
              </Text>
            </View>
            <Pressable
              style={styles.playButton}
              onPress={() => playbackApi.playSong(song?.spotify_id || id as string)}
            >
              <Text style={{ color: "white" }}>Play</Text>
            </Pressable>
          </View>
        </View>
        <View style={styles.sheetContent}>
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Friends who liked this
            </Text>
            <View style={{ flexDirection: "row", gap: 16 }}>
              {friends.map((friend) => (
                <View key={friend.id} style={styles.avatarWrapper}>
                  <Image
                    source={{ uri: friend.avatar }}
                    style={styles.avatar}
                  />
                  <Text
                    style={[styles.avatarLabel, { color: colors.text }]}
                    numberOfLines={1}
                  >
                    {friend.name}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.actionsRow}>
              <Pressable
                style={[
                  styles.actionButton,
                  { backgroundColor: liked ? "#1DB954" : colors.card },
                ]}
                onPress={() => setLiked((prev) => !prev)}
              >
                <Text
                  style={[
                    styles.actionText,
                    { color: liked ? "white" : colors.text },
                  ]}
                >
                  {liked ? "Liked" : "Like"}
                </Text>
              </Pressable>
              <Pressable
                style={[styles.actionButton, { backgroundColor: colors.card }]}
              >
                <Text style={[styles.actionText, { color: colors.text }]}>
                  Add to playlist
                </Text>
              </Pressable>
              <Pressable
                style={[styles.actionButton, { backgroundColor: colors.card }]}
              >
                <Text style={[styles.actionText, { color: colors.text }]}>
                  Share to feed
                </Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Listening heat
            </Text>
            <View
              style={[styles.heatmapCard, { backgroundColor: colors.card }]}
            >
              <View style={styles.heatHeader}>
                <Text style={[styles.heatValue, { color: colors.text }]}>
                  {heatmapStats.liveNow} listening now
                </Text>
                <Text style={[styles.heatSub, { color: colors.text }]}>
                  Live map updates every 30s
                </Text>
              </View>
              <View style={styles.heatMapPlaceholder}>
                <Text
                  style={[styles.heatPlaceholderText, { color: colors.text }]}
                >
                  World heat map
                  {"\n"}based on play locations
                </Text>
              </View>
              <View style={styles.topCountries}>
                {heatmapStats.topCountries.map((c) => (
                  <View key={c.code} style={styles.countryRow}>
                    <Text style={[styles.countryCode, { color: colors.text }]}>
                      {c.code}
                    </Text>
                    <View style={styles.countryBarBackground}>
                      <View
                        style={[
                          styles.countryBarFill,
                          { width: `${c.value}%` },
                        ]}
                      />
                    </View>
                    <Text style={[styles.countryValue, { color: colors.text }]}>
                      {c.value}%
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Comments
            </Text>
            <View style={{ gap: 12 }}>
              {comments.map((comment) => (
                <View
                  key={comment.id}
                  style={[styles.commentRow, { backgroundColor: colors.card }]}
                >
                  <Image
                    source={{ uri: comment.avatar }}
                    style={styles.commentAvatar}
                  />
                  <View style={{ flex: 1 }}>
                    <View style={styles.commentHeader}>
                      <Text
                        style={[styles.commentUser, { color: colors.text }]}
                      >
                        {comment.user}
                      </Text>
                      <Text
                        style={[styles.commentTime, { color: colors.text }]}
                      >
                        {comment.time}
                      </Text>
                    </View>
                    <Text style={[styles.commentText, { color: colors.text }]}>
                      {comment.text}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingHorizontal: 12,
    paddingTop: 32,
  },
  container: {
    flex: 1,
    height: "100%",
    justifyContent: "flex-start",
    alignContent: "center",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorText: {
    fontSize: 18,
    color: "#ff4444",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    gap: 16,
    paddingBottom: 12,
    paddingHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  songName: {
    fontSize: 24,
    fontWeight: "bold",
  },
  artistName: {
    fontSize: 18,
  },
  playlistStats: {
    fontSize: 14,
    color: "#666",
    marginTop: 4,
  },
  sheetContent: {
    paddingHorizontal: 20,
    paddingBottom: 32,
    gap: 20,
    backgroundColor: "transparent",
  },
  section: {
    gap: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  avatarWrapper: {
    width: 68,
    alignItems: "center",
    gap: 6,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  avatarLabel: {
    fontSize: 12,
    textAlign: "center",
  },
  actionsRow: {
    flexDirection: "row",
    gap: 10,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  actionText: {
    fontSize: 12,
    fontWeight: "400",
  },
  captionHint: {
    fontSize: 12,
    opacity: 0.7,
  },
  heatmapCard: {
    borderRadius: 16,
    padding: 14,
    gap: 12,
  },
  heatHeader: {
    gap: 2,
  },
  heatValue: {
    fontSize: 16,
    fontWeight: "700",
  },
  heatSub: {
    fontSize: 12,
    opacity: 0.7,
  },
  heatMapPlaceholder: {
    height: 160,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(120,120,120,0.3)",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(120,120,120,0.08)",
  },
  heatPlaceholderText: {
    textAlign: "center",
    fontSize: 13,
    opacity: 0.8,
  },
  topCountries: {
    gap: 8,
  },
  countryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  countryCode: {
    width: 36,
    fontWeight: "700",
  },
  countryBarBackground: {
    flex: 1,
    height: 8,
    borderRadius: 999,
    backgroundColor: "rgba(120,120,120,0.2)",
    overflow: "hidden",
  },
  countryBarFill: {
    height: 8,
    borderRadius: 999,
    backgroundColor: "#1DB954",
  },
  countryValue: {
    width: 40,
    textAlign: "right",
    fontSize: 12,
  },
  commentRow: {
    flexDirection: "row",
    gap: 10,
    padding: 12,
    borderRadius: 12,
  },
  commentAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  commentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  commentUser: {
    fontWeight: "700",
  },
  commentTime: {
    fontSize: 12,
    opacity: 0.7,
  },
  commentText: {
    marginTop: 4,
    fontSize: 14,
  },
  trackList: {},
  playButton: {
    padding: 4,
    width: "60%",
    backgroundColor: "#538ce9ff",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
});
