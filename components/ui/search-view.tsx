import { ThemedText } from "@/components/ui/themed-text";
import { Colors } from "@/constants/theme";
import { useScrollContext } from "@/contexts/ScrollContext";
import { useColorScheme } from "@/hooks/use-color-scheme";
import searchApi, { SearchResults, SearchTrack, SearchUser } from "@/services/searchApi";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Pressable,
    ScrollView,
    StyleSheet,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface SearchViewProps {
    query: string;
}

export default function SearchView({ query }: SearchViewProps) {
    const router = useRouter();
    const colorScheme = useColorScheme();
    const isDark = colorScheme === "dark";
    const colors = Colors[isDark ? "dark" : "light"];
    const insets = useSafeAreaInsets();
    const { collapse } = useScrollContext();

    const [results, setResults] = useState<SearchResults>({ users: [], tracks: [] });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchResults = async () => {
            if (!query.trim()) {
                setResults({ users: [], tracks: [] });
                return;
            }

            setLoading(true);
            try {
                const data = await searchApi.search(query);
                setResults(data);
            } catch (error) {
                console.error("Search error:", error);
            } finally {
                setLoading(false);
            }
        };

        // Debounce search
        const timeoutId = setTimeout(fetchResults, 300);
        return () => clearTimeout(timeoutId);
    }, [query]);

    const formatDuration = (ms: number) => {
        const minutes = Math.floor(ms / 60000);
        const seconds = Math.floor((ms % 60000) / 1000);
        return `${minutes}:${seconds.toString().padStart(2, "0")}`;
    };

    const renderUserItem = (user: SearchUser) => (
        <Pressable
            key={`user-${user.id}`}
            style={[styles.itemContainer, { backgroundColor: colors.card }]}
            onPress={() => router.push(`/profile/${user.id}`)}
        >
            {user.profileImageUrl ? (
                <Image source={{ uri: user.profileImageUrl }} style={styles.avatar} />
            ) : (
                <View style={[styles.avatarPlaceholder, { backgroundColor: colors.muted }]}>
                    <ThemedText style={styles.avatarText}>
                        {user.displayName?.[0]?.toUpperCase() || "?"}
                    </ThemedText>
                </View>
            )}
            <View style={styles.itemInfo}>
                <ThemedText style={styles.itemTitle} numberOfLines={1}>
                    {user.displayName}
                </ThemedText>
                <ThemedText style={[styles.itemSubtitle, { color: colors.mutedForeground }]} numberOfLines={1}>
                    @{user.handle}
                </ThemedText>
            </View>
            <View style={[styles.typeBadge, { backgroundColor: Colors.primary }]}>
                <ThemedText style={[styles.typeBadgeText, { color: Colors.primaryForeground }]}>
                    User
                </ThemedText>
            </View>
        </Pressable>
    );

    const renderTrackItem = (track: SearchTrack) => (
        <Pressable
            key={`track-${track.id}`}
            style={[styles.itemContainer, { backgroundColor: colors.card }]}
            onPress={() => router.push(`/song/${track.spotifyId}`)}
        >
            {track.albumImageUrl ? (
                <Image source={{ uri: track.albumImageUrl }} style={styles.albumArt} />
            ) : (
                <View style={[styles.albumArtPlaceholder, { backgroundColor: colors.muted }]}>
                    <ThemedText style={styles.albumArtText}>♪</ThemedText>
                </View>
            )}
            <View style={styles.itemInfo}>
                <ThemedText style={styles.itemTitle} numberOfLines={1}>
                    {track.name}
                </ThemedText>
                <ThemedText style={[styles.itemSubtitle, { color: colors.mutedForeground }]} numberOfLines={1}>
                    {track.artistName || "Unknown Artist"} • {formatDuration(track.durationMs)}
                </ThemedText>
            </View>
            <View style={[styles.typeBadge, { backgroundColor: colors.muted }]}>
                <ThemedText style={[styles.typeBadgeText, { color: colors.mutedForeground }]}>
                    Song
                </ThemedText>
            </View>
        </Pressable>
    );

    if (loading) {
        return (
            <View style={[styles.loadingContainer, { paddingTop: insets.top + 140 }]}>
                <ActivityIndicator size="large" color={colors.tint} />
            </View>
        );
    }

    const hasResults = results.users.length > 0 || results.tracks.length > 0;

    return (
        <ScrollView
            style={[styles.container, { backgroundColor: colors.background }]}
            contentContainerStyle={[styles.content, { paddingTop: insets.top + 140 }]}
            onScrollBeginDrag={collapse}
        >
            {!hasResults && query.trim() && (
                <View style={styles.emptyContainer}>
                    <ThemedText style={[styles.emptyText, { color: colors.mutedForeground }]}>
                        No results found for "{query}"
                    </ThemedText>
                </View>
            )}

            {results.users.length > 0 && (
                <View style={styles.section}>
                    <ThemedText style={styles.sectionTitle}>Users</ThemedText>
                    {results.users.map(renderUserItem)}
                </View>
            )}

            {results.tracks.length > 0 && (
                <View style={styles.section}>
                    <ThemedText style={styles.sectionTitle}>Songs</ThemedText>
                    {results.tracks.map(renderTrackItem)}
                </View>
            )}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        paddingHorizontal: 16,
        paddingBottom: 100,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    emptyContainer: {
        alignItems: "center",
        paddingVertical: 40,
    },
    emptyText: {
        fontSize: 16,
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: "700",
        marginBottom: 12,
    },
    itemContainer: {
        flexDirection: "row",
        alignItems: "center",
        padding: 12,
        borderRadius: 12,
        marginBottom: 8,
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
    },
    avatarPlaceholder: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: "center",
        alignItems: "center",
    },
    avatarText: {
        fontSize: 20,
        fontWeight: "bold",
    },
    albumArt: {
        width: 48,
        height: 48,
        borderRadius: 8,
    },
    albumArtPlaceholder: {
        width: 48,
        height: 48,
        borderRadius: 8,
        justifyContent: "center",
        alignItems: "center",
    },
    albumArtText: {
        fontSize: 24,
    },
    itemInfo: {
        flex: 1,
        marginLeft: 12,
    },
    itemTitle: {
        fontSize: 16,
        fontWeight: "600",
    },
    itemSubtitle: {
        fontSize: 14,
        marginTop: 2,
    },
    typeBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    typeBadgeText: {
        fontSize: 12,
        fontWeight: "600",
    },
});
