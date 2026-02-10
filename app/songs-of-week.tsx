import { ThemedText } from "@/components/ui/themed-text";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import sotdApi, { WeeklySotdDay } from "@/services/sotdApi";
import { MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Image,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function SongsOfWeekScreen() {
    const insets = useSafeAreaInsets();
    const colorScheme = useColorScheme();
    const isDark = colorScheme === "dark";
    const colors = Colors[isDark ? "dark" : "light"];

    const [weeklyData, setWeeklyData] = useState<WeeklySotdDay[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [creating, setCreating] = useState(false);

    const fetchData = useCallback(async () => {
        try {
            const data = await sotdApi.getWeeklySotds();
            setWeeklyData(data);
        } catch (error) {
            console.error("Failed to fetch weekly SOTD:", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleRefresh = () => {
        setRefreshing(true);
        fetchData();
    };

    const handleCreatePlaylist = async () => {
        if (creating) return;

        setCreating(true);
        try {
            const result = await sotdApi.createPlaylistFromWeekly();
            Alert.alert(
                "Playlist Created! 🎉",
                `"${result.playlistName}" has been added to your Spotify with ${result.tracksAdded} tracks.`,
                [{ text: "Awesome!", style: "default" }]
            );
        } catch (error) {
            console.error("Failed to create playlist:", error);
            Alert.alert(
                "Error",
                "Failed to create playlist. Please try again.",
                [{ text: "OK" }]
            );
        } finally {
            setCreating(false);
        }
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        if (date.toDateString() === today.toDateString()) {
            return "Today";
        } else if (date.toDateString() === yesterday.toDateString()) {
            return "Yesterday";
        } else {
            return date.toLocaleDateString("en-US", {
                weekday: "long",
                month: "short",
                day: "numeric",
            });
        }
    };

    const totalSongs = weeklyData.reduce((acc, day) => acc + day.songs.length, 0);

    if (loading) {
        return (
            <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
                <ActivityIndicator size="large" color={Colors.primary} />
                <ThemedText style={styles.loadingText}>Loading songs...</ThemedText>
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
                }
                showsVerticalScrollIndicator={false}
            >
                {/* Header */}
                <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
                    <Pressable onPress={() => router.back()} style={styles.backButton}>
                        <MaterialIcons name="arrow-back" size={24} color={colors.text} />
                    </Pressable>
                    <View style={styles.headerContent}>
                        <ThemedText style={styles.title}>Songs of the Week</ThemedText>
                        <ThemedText style={[styles.subtitle, { color: colors.icon }]}>
                            {totalSongs} songs from you and your friends
                        </ThemedText>
                    </View>
                </View>

                {/* Create Playlist Button */}
                {totalSongs > 0 && (
                    <Pressable
                        style={[styles.createButton, { backgroundColor: Colors.primary }]}
                        onPress={handleCreatePlaylist}
                        disabled={creating}
                    >
                        {creating ? (
                            <ActivityIndicator size="small" color="white" />
                        ) : (
                            <>
                                <MaterialIcons name="playlist-add" size={20} color="white" />
                                <ThemedText style={styles.createButtonText}>
                                    Save to Spotify
                                </ThemedText>
                            </>
                        )}
                    </Pressable>
                )}

                {/* Empty State */}
                {weeklyData.length === 0 && (
                    <View style={styles.emptyState}>
                        <MaterialIcons name="music-off" size={48} color={colors.icon} />
                        <ThemedText style={[styles.emptyText, { color: colors.icon }]}>
                            No songs of the day this week
                        </ThemedText>
                        <ThemedText style={[styles.emptySubtext, { color: colors.icon }]}>
                            Set your song of the day or follow friends to see theirs
                        </ThemedText>
                    </View>
                )}

                {/* Daily Groups */}
                {weeklyData.map((day) => (
                    <View key={day.date} style={styles.daySection}>
                        <ThemedText style={[styles.dateHeader, { color: colors.text }]}>
                            {formatDate(day.date)}
                        </ThemedText>
                        {day.songs.map((song, index) => (
                            <Pressable
                                key={`${day.date}-${song.track.id}-${index}`}
                                style={[styles.songCard, { backgroundColor: colors.card }]}
                                onPress={() => router.push(`/song/${song.track.spotifyId}` as any)}
                            >
                                <Image
                                    source={{
                                        uri: song.track.album.image_url ||
                                            "https://via.placeholder.com/60"
                                    }}
                                    style={styles.albumArt}
                                />
                                <View style={styles.songInfo}>
                                    <ThemedText style={styles.songName} numberOfLines={1}>
                                        {song.track.name}
                                    </ThemedText>
                                    <ThemedText
                                        style={[styles.artistName, { color: colors.icon }]}
                                        numberOfLines={1}
                                    >
                                        {song.track.artists.join(", ")}
                                    </ThemedText>
                                    <View style={styles.userBadge}>
                                        <MaterialIcons name="person" size={12} color={Colors.primary} />
                                        <ThemedText style={[styles.userName, { color: Colors.primary }]}>
                                            {song.user.displayName}'s pick
                                        </ThemedText>
                                    </View>
                                </View>
                            </Pressable>
                        ))}
                    </View>
                ))}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    centered: {
        justifyContent: "center",
        alignItems: "center",
    },
    scrollView: {
        flex: 1,
    },
    header: {
        paddingHorizontal: 16,
        paddingBottom: 16,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    backButton: {
        padding: 8,
        marginLeft: -8,
    },
    headerContent: {
        flex: 1,
    },
    title: {
        fontSize: 28,
        fontWeight: "bold",
    },
    subtitle: {
        fontSize: 14,
        marginTop: 4,
    },
    loadingText: {
        marginTop: 12,
        fontSize: 14,
    },
    createButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        marginHorizontal: 16,
        marginBottom: 20,
        paddingVertical: 14,
        borderRadius: 12,
    },
    createButtonText: {
        color: "white",
        fontSize: 16,
        fontWeight: "600",
    },
    emptyState: {
        alignItems: "center",
        paddingTop: 80,
        paddingHorizontal: 32,
    },
    emptyText: {
        fontSize: 18,
        fontWeight: "600",
        marginTop: 16,
    },
    emptySubtext: {
        fontSize: 14,
        textAlign: "center",
        marginTop: 8,
    },
    daySection: {
        marginBottom: 24,
    },
    dateHeader: {
        fontSize: 18,
        fontWeight: "700",
        paddingHorizontal: 16,
        marginBottom: 12,
    },
    songCard: {
        flexDirection: "row",
        alignItems: "center",
        marginHorizontal: 16,
        marginBottom: 10,
        padding: 12,
        borderRadius: 12,
    },
    albumArt: {
        width: 56,
        height: 56,
        borderRadius: 8,
    },
    songInfo: {
        flex: 1,
        marginLeft: 12,
    },
    songName: {
        fontSize: 16,
        fontWeight: "600",
    },
    artistName: {
        fontSize: 13,
        marginTop: 2,
    },
    userBadge: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        marginTop: 6,
    },
    userName: {
        fontSize: 12,
        fontWeight: "500",
    },
});
