import { ThemedText } from "@/components/ui/themed-text";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import listeningHistoryApi, { UniqueTrack } from "@/services/listeningHistoryApi";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    Pressable,
    StyleSheet,
    TextInput,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const PAGE_SIZE = 50;

export default function UniqueSongsScreen() {
    const { userId } = useLocalSearchParams<{ userId: string }>();
    const colorScheme = useColorScheme();
    const isDark = colorScheme === "dark";
    const colors = Colors[isDark ? "dark" : "light"];
    const insets = useSafeAreaInsets();

    const [tracks, setTracks] = useState<UniqueTrack[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [offset, setOffset] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [debouncedQuery, setDebouncedQuery] = useState("");

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedQuery(searchQuery);
        }, 500);

        return () => clearTimeout(timer);
    }, [searchQuery]);

    // Reset list when query changes
    useEffect(() => {
        setOffset(0);
        setTracks([]);
        setHasMore(true);
        setIsLoading(true);
        fetchTracks(0, debouncedQuery, true);
    }, [debouncedQuery, userId]);

    const fetchTracks = async (currentOffset: number, query: string, refresh: boolean = false) => {
        if (!userId) return;

        try {
            const data = await listeningHistoryApi.getUniqueTracks(
                parseInt(userId),
                PAGE_SIZE,
                currentOffset,
                query
            );

            if (refresh) {
                setTracks(data.items);
            } else {
                setTracks((prev) => [...prev, ...data.items]);
            }
            console.log(JSON.stringify(data.items[0]))
            setHasMore(data.items.length === PAGE_SIZE);
        } catch (error) {
            console.error("Error fetching unique tracks:", error);
        } finally {
            setIsLoading(false);
            setIsLoadingMore(false);
        }
    };

    const handleLoadMore = () => {
        if (!isLoadingMore && hasMore && !isLoading) {
            setIsLoadingMore(true);
            const nextOffset = offset + PAGE_SIZE;
            setOffset(nextOffset);
            fetchTracks(nextOffset, debouncedQuery);
        }
    };

    const renderItem = useCallback(({ item }: { item: UniqueTrack }) => {
        // Debug logging for image URL issue
        // console.log("Render Item:", JSON.stringify(item, null, 2)); 
        return (
            <View style={[styles.trackItem, { borderBottomColor: colors.border }]}>
                <Image
                    source={{ uri: item.album?.imageUrl }}
                    style={styles.albumArt}
                    contentFit="cover"
                    transition={200}
                />
                <View style={styles.trackInfo}>
                    <ThemedText style={styles.trackName} numberOfLines={1}>
                        {item.name}
                    </ThemedText>
                    <ThemedText style={styles.artistName} numberOfLines={1}>
                        {item.artists.map((a: any) => a.name).join(", ")}
                    </ThemedText>
                </View>
            </View>
        );
    }, [colors.border]);

    return (
        <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
            {/* Header */}
            <View
                style={[
                    styles.header,
                    {
                        borderBottomColor: isDark
                            ? "rgba(255,255,255,0.08)"
                            : "rgba(0,0,0,0.06)",
                    },
                ]}
            >
                <Pressable onPress={() => router.back()} style={styles.headerButton}>
                    <Ionicons name="arrow-back" size={24} color={colors.icon} />
                </Pressable>
                <ThemedText style={[styles.title, { color: colors.text }]}>Unique Songs</ThemedText>
                <View style={styles.headerRight} />
            </View>

            {/* Search Bar */}
            <View style={[styles.searchContainer, { backgroundColor: isDark ? "#1A1A1A" : "#F2F2F7" }]}>
                <Ionicons name="search" size={20} color={colors.icon} style={styles.searchIcon} />
                <TextInput
                    style={[styles.searchInput, { color: colors.text }]}
                    placeholder="Search songs..."
                    placeholderTextColor={colors.icon}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    autoCapitalize="none"
                    autoCorrect={false}
                />
                {searchQuery.length > 0 && (
                    <Pressable onPress={() => setSearchQuery("")}>
                        <Ionicons name="close-circle" size={18} color={colors.icon} />
                    </Pressable>
                )}
            </View>

            {isLoading && offset === 0 ? (
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color={colors.tint} />
                </View>
            ) : (
                <FlatList
                    data={tracks}
                    renderItem={renderItem}
                    keyExtractor={(item) => item.id.toString() + "_" + item.played_at} // unique key
                    onEndReached={handleLoadMore}
                    onEndReachedThreshold={0.5}
                    ListFooterComponent={
                        isLoadingMore ? (
                            <ActivityIndicator size="small" color={colors.tint} style={{ margin: 20 }} />
                        ) : null
                    }
                    ListEmptyComponent={
                        !isLoading ? (
                            <View style={styles.centerContainer}>
                                <ThemedText>No songs found</ThemedText>
                            </View>
                        ) : null
                    }
                    contentContainerStyle={{ paddingBottom: insets.bottom }}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        height: 56,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
    },
    headerButton: {
        width: 40,
        height: 40,
        alignItems: "flex-start",
        justifyContent: "center",
    },
    headerRight: {
        width: 40,
    },
    title: {
        fontSize: 18,
        fontWeight: "600",
    },
    searchContainer: {
        flexDirection: "row",
        alignItems: "center",
        margin: 16,
        paddingHorizontal: 12,
        height: 40,
        borderRadius: 10,
    },
    searchIcon: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        height: "100%",
    },
    centerContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    trackItem: {
        flexDirection: "row",
        alignItems: "center",
        padding: 12,
        paddingHorizontal: 16,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    albumArt: {
        width: 50,
        height: 50,
        borderRadius: 4,
        backgroundColor: "#E1E1E1",
    },
    trackInfo: {
        flex: 1,
        marginLeft: 12,
        justifyContent: "center",
    },
    trackName: {
        fontSize: 16,
        fontWeight: "600",
        marginBottom: 4,
    },
    artistName: {
        fontSize: 14,
        opacity: 0.7,
    },
});
