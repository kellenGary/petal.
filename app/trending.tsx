import { ThemedText } from "@/components/ui/themed-text";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import trendingApi, {
    TrendingAlbum,
    TrendingArtist,
    TrendingTrack,
} from "@/services/trendingApi";
import { MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    Image,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function TrendingScreen() {
    const insets = useSafeAreaInsets();
    const colorScheme = useColorScheme();
    const isDark = colorScheme === "dark";
    const colors = Colors[isDark ? "dark" : "light"];

    const [trendingTracks, setTrendingTracks] = useState<TrendingTrack[]>([]);
    const [trendingArtists, setTrendingArtists] = useState<TrendingArtist[]>([]);
    const [trendingAlbums, setTrendingAlbums] = useState<TrendingAlbum[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchData = useCallback(async () => {
        try {
            const [tracks, artists, albums] = await Promise.all([
                trendingApi.getTrendingTracks(10, 7),
                trendingApi.getTrendingArtists(10, 7),
                trendingApi.getTrendingAlbums(10, 7),
            ]);
            setTrendingTracks(tracks);
            setTrendingArtists(artists);
            setTrendingAlbums(albums);
        } catch (error) {
            console.error("Failed to fetch trending:", error);
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

    if (loading) {
        return (
            <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
                <ActivityIndicator size="large" color={Colors.primary} />
                <ThemedText style={styles.loadingText}>Loading trending...</ThemedText>
            </View>
        );
    }

    const hasNoData =
        trendingTracks.length === 0 &&
        trendingArtists.length === 0 &&
        trendingAlbums.length === 0;

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
                        <ThemedText style={styles.title}>Trending</ThemedText>
                        <ThemedText style={[styles.subtitle, { color: colors.icon }]}>
                            What everyone's listening to
                        </ThemedText>
                    </View>
                </View>

                {/* Empty State */}
                {hasNoData && (
                    <View style={styles.emptyState}>
                        <MaterialIcons name="trending-up" size={48} color={colors.icon} />
                        <ThemedText style={[styles.emptyText, { color: colors.icon }]}>
                            No trending data yet
                        </ThemedText>
                        <ThemedText style={[styles.emptySubtext, { color: colors.icon }]}>
                            Start listening to contribute to the trends!
                        </ThemedText>
                    </View>
                )}

                {/* Trending Tracks */}
                {trendingTracks.length > 0 && (
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <MaterialIcons name="music-note" size={22} color={Colors.primary} />
                            <ThemedText style={styles.sectionTitle}>Hot Tracks</ThemedText>
                        </View>
                        {trendingTracks.map((track, index) => (
                            <Pressable
                                key={track.id}
                                style={[styles.listItem, { backgroundColor: colors.card }]}
                                onPress={() => router.push(`/song/${track.spotifyId}` as any)}
                            >
                                <View style={[styles.rankBadge, { backgroundColor: Colors.primary + "20" }]}>
                                    <ThemedText style={[styles.rank, { color: Colors.primary }]}>
                                        {index + 1}
                                    </ThemedText>
                                </View>
                                <Image
                                    source={{ uri: track.album?.image_url || "https://via.placeholder.com/52" }}
                                    style={styles.itemImage}
                                />
                                <View style={styles.itemInfo}>
                                    <ThemedText style={styles.itemName} numberOfLines={1}>
                                        {track.name}
                                    </ThemedText>
                                    <ThemedText style={[styles.itemSubtitle, { color: colors.icon }]} numberOfLines={1}>
                                        {track.artists.join(", ")}
                                    </ThemedText>
                                </View>
                                <View style={styles.statsContainer}>
                                    <View style={styles.stat}>
                                        <MaterialIcons name="people" size={14} color={colors.icon} />
                                        <ThemedText style={[styles.statText, { color: colors.icon }]}>
                                            {track.uniqueListeners}
                                        </ThemedText>
                                    </View>
                                </View>
                            </Pressable>
                        ))}
                    </View>
                )}

                {/* Trending Artists */}
                {trendingArtists.length > 0 && (
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <MaterialIcons name="mic" size={22} color={Colors.primary} />
                            <ThemedText style={styles.sectionTitle}>Popular Artists</ThemedText>
                        </View>
                        {trendingArtists.map((artist, index) => (
                            <Pressable
                                key={artist.id}
                                style={[styles.listItem, { backgroundColor: colors.card }]}
                                onPress={() => router.push(`/artist/${artist.spotifyId}` as any)}
                            >
                                <View style={[styles.rankBadge, { backgroundColor: Colors.primary + "20" }]}>
                                    <ThemedText style={[styles.rank, { color: Colors.primary }]}>
                                        {index + 1}
                                    </ThemedText>
                                </View>
                                <Image
                                    source={{ uri: artist.imageUrl || "https://via.placeholder.com/52" }}
                                    style={[styles.itemImage, styles.artistImage]}
                                />
                                <View style={styles.itemInfo}>
                                    <ThemedText style={styles.itemName} numberOfLines={1}>
                                        {artist.name}
                                    </ThemedText>
                                </View>
                                <View style={styles.statsContainer}>
                                    <View style={styles.stat}>
                                        <MaterialIcons name="people" size={14} color={colors.icon} />
                                        <ThemedText style={[styles.statText, { color: colors.icon }]}>
                                            {artist.uniqueListeners}
                                        </ThemedText>
                                    </View>
                                </View>
                            </Pressable>
                        ))}
                    </View>
                )}

                {/* Trending Albums */}
                {trendingAlbums.length > 0 && (
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <MaterialIcons name="album" size={22} color={Colors.primary} />
                            <ThemedText style={styles.sectionTitle}>Top Albums</ThemedText>
                        </View>
                        {trendingAlbums.map((album, index) => (
                            <Pressable
                                key={album.id}
                                style={[styles.listItem, { backgroundColor: colors.card }]}
                                onPress={() => router.push(`/album/${album.spotifyId}` as any)}
                            >
                                <View style={[styles.rankBadge, { backgroundColor: Colors.primary + "20" }]}>
                                    <ThemedText style={[styles.rank, { color: Colors.primary }]}>
                                        {index + 1}
                                    </ThemedText>
                                </View>
                                <Image
                                    source={{ uri: album.imageUrl || "https://via.placeholder.com/52" }}
                                    style={styles.itemImage}
                                />
                                <View style={styles.itemInfo}>
                                    <ThemedText style={styles.itemName} numberOfLines={1}>
                                        {album.name}
                                    </ThemedText>
                                </View>
                                <View style={styles.statsContainer}>
                                    <View style={styles.stat}>
                                        <MaterialIcons name="people" size={14} color={colors.icon} />
                                        <ThemedText style={[styles.statText, { color: colors.icon }]}>
                                            {album.uniqueListeners}
                                        </ThemedText>
                                    </View>
                                </View>
                            </Pressable>
                        ))}
                    </View>
                )}
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
        paddingBottom: 20,
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
        marginTop: 2,
    },
    loadingText: {
        marginTop: 12,
        fontSize: 14,
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
    section: {
        marginBottom: 28,
    },
    sectionHeader: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingHorizontal: 16,
        marginBottom: 14,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: "700",
    },
    listItem: {
        flexDirection: "row",
        alignItems: "center",
        marginHorizontal: 16,
        marginBottom: 10,
        padding: 12,
        borderRadius: 14,
    },
    rankBadge: {
        width: 28,
        height: 28,
        borderRadius: 14,
        alignItems: "center",
        justifyContent: "center",
        marginRight: 10,
    },
    rank: {
        fontSize: 13,
        fontWeight: "bold",
    },
    itemImage: {
        width: 52,
        height: 52,
        borderRadius: 8,
    },
    artistImage: {
        borderRadius: 26,
    },
    itemInfo: {
        flex: 1,
        marginLeft: 12,
    },
    itemName: {
        fontSize: 15,
        fontWeight: "600",
    },
    itemSubtitle: {
        fontSize: 13,
        marginTop: 3,
    },
    statsContainer: {
        marginLeft: 8,
        alignItems: "flex-end",
    },
    stat: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
    },
    statText: {
        fontSize: 13,
    },
});
