import FilterBubble from "@/components/ui/filter-bubble";
import { ThemedText } from "@/components/ui/themed-text";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import analyticsApi, {
    AnalyticsOverview,
    TopAlbum,
    TopArtist,
    TopTrack,
} from "@/services/analyticsApi";
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

type TimeFrame = "7" | "30" | "90" | "0";

export default function AnalyticsScreen() {
    const insets = useSafeAreaInsets();
    const colorScheme = useColorScheme();
    const isDark = colorScheme === "dark";
    const colors = Colors[isDark ? "dark" : "light"];

    const [timeFrame, setTimeFrame] = useState<TimeFrame>("7");
    const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
    const [topTracks, setTopTracks] = useState<TopTrack[]>([]);
    const [topArtists, setTopArtists] = useState<TopArtist[]>([]);
    const [topAlbums, setTopAlbums] = useState<TopAlbum[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const timeFrameOptions = [
        { label: "7 Days", value: "7" as TimeFrame },
        { label: "30 Days", value: "30" as TimeFrame },
        { label: "90 Days", value: "90" as TimeFrame },
        { label: "All Time", value: "0" as TimeFrame },
    ];

    const fetchData = useCallback(async () => {
        const days = parseInt(timeFrame);
        try {
            const [overviewData, tracksData, artistsData, albumsData] = await Promise.all([
                analyticsApi.getOverview(days),
                analyticsApi.getTopTracks(days, 5),
                analyticsApi.getTopArtists(days, 5),
                analyticsApi.getTopAlbums(days, 5),
            ]);
            setOverview(overviewData);
            setTopTracks(tracksData);
            setTopArtists(artistsData);
            setTopAlbums(albumsData);
        } catch (error) {
            console.error("Failed to fetch analytics:", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [timeFrame]);

    useEffect(() => {
        setLoading(true);
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
                <ThemedText style={styles.loadingText}>Loading analytics...</ThemedText>
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
                    <ThemedText style={styles.title}>Analytics</ThemedText>
                </View>

                {/* Time Frame Selector */}
                <View style={styles.filterContainer}>
                    {timeFrameOptions.map((option) => (
                        <FilterBubble
                            key={option.value}
                            filterName={option.label}
                            activeFilter={
                                timeFrameOptions.find((o) => o.value === timeFrame)?.label || ""
                            }
                            setActiveFilter={(label) => {
                                const selected = timeFrameOptions.find((o) => o.label === label);
                                if (selected) setTimeFrame(selected.value);
                            }}
                        />
                    ))}
                </View>

                {/* Overview Stats */}
                {overview && (
                    <View style={styles.statsGrid}>
                        <View style={[styles.statCard, { backgroundColor: colors.card }]}>
                            <MaterialIcons name="play-circle-filled" size={28} color={Colors.primary} />
                            <ThemedText style={styles.statValue}>{overview.totalPlays}</ThemedText>
                            <ThemedText style={[styles.statLabel, { color: colors.icon }]}>
                                Total Plays
                            </ThemedText>
                        </View>
                        <View style={[styles.statCard, { backgroundColor: colors.card }]}>
                            <MaterialIcons name="access-time" size={28} color={Colors.primary} />
                            <ThemedText style={styles.statValue}>
                                {Math.round(overview.totalMinutes)}
                            </ThemedText>
                            <ThemedText style={[styles.statLabel, { color: colors.icon }]}>
                                Minutes Listened
                            </ThemedText>
                        </View>
                        <View style={[styles.statCard, { backgroundColor: colors.card }]}>
                            <MaterialIcons name="library-music" size={28} color={Colors.primary} />
                            <ThemedText style={styles.statValue}>{overview.uniqueTracks}</ThemedText>
                            <ThemedText style={[styles.statLabel, { color: colors.icon }]}>
                                Unique Tracks
                            </ThemedText>
                        </View>
                    </View>
                )}

                {/* Top Tracks */}
                <View style={styles.section}>
                    <ThemedText style={styles.sectionTitle}>Top Tracks</ThemedText>
                    {topTracks.length === 0 ? (
                        <ThemedText style={[styles.emptyText, { color: colors.icon }]}>
                            No data for this period
                        </ThemedText>
                    ) : (
                        topTracks.map((track, index) => (
                            <Pressable
                                key={track.id}
                                style={[styles.listItem, { backgroundColor: colors.card }]}
                                onPress={() => router.push(`/song/${track.spotifyId}` as any)}
                            >
                                <ThemedText style={[styles.rank, { color: Colors.primary }]}>
                                    #{index + 1}
                                </ThemedText>
                                <Image
                                    source={{ uri: track.album?.image_url || "https://via.placeholder.com/48" }}
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
                                <View style={styles.playCount}>
                                    <ThemedText style={[styles.playCountText, { color: colors.icon }]}>
                                        {track.playCount} plays
                                    </ThemedText>
                                </View>
                            </Pressable>
                        ))
                    )}
                </View>

                {/* Top Artists */}
                <View style={styles.section}>
                    <ThemedText style={styles.sectionTitle}>Top Artists</ThemedText>
                    {topArtists.length === 0 ? (
                        <ThemedText style={[styles.emptyText, { color: colors.icon }]}>
                            No data for this period
                        </ThemedText>
                    ) : (
                        topArtists.map((artist, index) => (
                            <Pressable
                                key={artist.id}
                                style={[styles.listItem, { backgroundColor: colors.card }]}
                                onPress={() => router.push(`/artist/${artist.spotifyId}` as any)}
                            >
                                <ThemedText style={[styles.rank, { color: Colors.primary }]}>
                                    #{index + 1}
                                </ThemedText>
                                <Image
                                    source={{ uri: artist.imageUrl || "https://via.placeholder.com/48" }}
                                    style={[styles.itemImage, styles.artistImage]}
                                />
                                <View style={styles.itemInfo}>
                                    <ThemedText style={styles.itemName} numberOfLines={1}>
                                        {artist.name}
                                    </ThemedText>
                                </View>
                                <View style={styles.playCount}>
                                    <ThemedText style={[styles.playCountText, { color: colors.icon }]}>
                                        {artist.playCount} plays
                                    </ThemedText>
                                </View>
                            </Pressable>
                        ))
                    )}
                </View>

                {/* Top Albums */}
                <View style={styles.section}>
                    <ThemedText style={styles.sectionTitle}>Top Albums</ThemedText>
                    {topAlbums.length === 0 ? (
                        <ThemedText style={[styles.emptyText, { color: colors.icon }]}>
                            No data for this period
                        </ThemedText>
                    ) : (
                        topAlbums.map((album, index) => (
                            <Pressable
                                key={album.id}
                                style={[styles.listItem, { backgroundColor: colors.card }]}
                                onPress={() => router.push(`/album/${album.spotifyId}` as any)}
                            >
                                <ThemedText style={[styles.rank, { color: Colors.primary }]}>
                                    #{index + 1}
                                </ThemedText>
                                <Image
                                    source={{ uri: album.imageUrl || "https://via.placeholder.com/48" }}
                                    style={styles.itemImage}
                                />
                                <View style={styles.itemInfo}>
                                    <ThemedText style={styles.itemName} numberOfLines={1}>
                                        {album.name}
                                    </ThemedText>
                                </View>
                                <View style={styles.playCount}>
                                    <ThemedText style={[styles.playCountText, { color: colors.icon }]}>
                                        {album.playCount} plays
                                    </ThemedText>
                                </View>
                            </Pressable>
                        ))
                    )}
                </View>
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
    title: {
        fontSize: 28,
        fontWeight: "bold",
    },
    loadingText: {
        marginTop: 12,
        fontSize: 14,
    },
    filterContainer: {
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "center",
        paddingHorizontal: 16,
        paddingBottom: 16,
        gap: 8,
    },
    statsGrid: {
        flexDirection: "row",
        paddingHorizontal: 16,
        gap: 12,
        marginBottom: 24,
    },
    statCard: {
        flex: 1,
        alignItems: "center",
        padding: 16,
        borderRadius: 12,
    },
    statValue: {
        fontSize: 24,
        fontWeight: "bold",
        marginTop: 8,
    },
    statLabel: {
        fontSize: 11,
        marginTop: 4,
        textAlign: "center",
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: "700",
        paddingHorizontal: 16,
        marginBottom: 12,
    },
    emptyText: {
        paddingHorizontal: 16,
        fontSize: 14,
    },
    listItem: {
        flexDirection: "row",
        alignItems: "center",
        marginHorizontal: 16,
        marginBottom: 8,
        padding: 12,
        borderRadius: 12,
    },
    rank: {
        fontSize: 14,
        fontWeight: "bold",
        width: 32,
    },
    itemImage: {
        width: 48,
        height: 48,
        borderRadius: 6,
    },
    artistImage: {
        borderRadius: 24,
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
        marginTop: 2,
    },
    playCount: {
        marginLeft: 8,
    },
    playCountText: {
        fontSize: 12,
    },
});
