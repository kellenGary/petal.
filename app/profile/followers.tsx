import UserListItem, { FollowUserItem } from "@/components/profile/user-list-item";
import { ThemedText } from "@/components/ui/themed-text";
import { Colors } from "@/constants/theme";
import { useAuth } from "@/contexts/AuthContext";
import { useColorScheme } from "@/hooks/use-color-scheme";
import followApi from "@/services/followApi";
import { Ionicons } from "@expo/vector-icons";
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

const PAGE_SIZE = 30;

export default function FollowersScreen() {
    const { userId } = useLocalSearchParams<{ userId: string }>();
    const parsedUserId = userId ? parseInt(userId, 10) : undefined;
    const insets = useSafeAreaInsets();
    const colorScheme = useColorScheme();
    const isDark = colorScheme === "dark";
    const colors = Colors[isDark ? "dark" : "light"];
    const { user: currentUser } = useAuth();

    const [users, setUsers] = useState<FollowUserItem[]>([]);
    const [followStatusMap, setFollowStatusMap] = useState<Record<number, boolean>>({});
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [total, setTotal] = useState(0);
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
        setUsers([]);
        setHasMore(true);
        setLoading(true);
        fetchFollowers(0, true, debouncedQuery);
    }, [debouncedQuery, parsedUserId]);

    const fetchFollowers = useCallback(async (offset: number, isRefresh: boolean, query: string) => {
        if (!parsedUserId) return;

        if (isRefresh) setLoading(true);
        else setLoadingMore(true);

        try {
            const response = await followApi.getFollowers(parsedUserId, PAGE_SIZE, offset, query);
            const newUsers = isRefresh ? response.items : [...users, ...response.items];
            setUsers(newUsers);
            setTotal(response.total);
            setHasMore(newUsers.length < response.total);

            // Batch check follow statuses for new items (excluding self)
            const newUserIds = response.items
                .map((u) => u.id)
                .filter((id) => id !== currentUser?.id);

            if (newUserIds.length > 0) {
                const statuses = await followApi.getFollowStatusBatch(newUserIds);
                setFollowStatusMap((prev) =>
                    isRefresh ? statuses : { ...prev, ...statuses }
                );
            }
        } catch (error) {
            console.error("Failed to fetch followers:", error);
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    }, [parsedUserId, users, currentUser?.id]);

    const handleLoadMore = useCallback(() => {
        if (!loadingMore && hasMore) {
            fetchFollowers(users.length, false, debouncedQuery);
        }
    }, [loadingMore, hasMore, users.length, fetchFollowers, debouncedQuery]);

    const handleRefresh = useCallback(() => {
        fetchFollowers(0, true, debouncedQuery);
    }, [fetchFollowers, debouncedQuery]);

    const handleFollowChange = useCallback((userId: number, isFollowing: boolean) => {
        setFollowStatusMap((prev) => ({ ...prev, [userId]: isFollowing }));
    }, []);

    const renderItem = useCallback(({ item }: { item: FollowUserItem }) => (
        <UserListItem
            user={item}
            isFollowing={followStatusMap[item.id] ?? false}
            onFollowChange={handleFollowChange}
        />
    ), [followStatusMap, handleFollowChange]);

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
                <ThemedText style={[styles.title, { color: colors.text }]}>Followers</ThemedText>
                <View style={styles.headerRight} />
            </View>

            {/* Search Bar */}
            <View style={[styles.searchContainer, { backgroundColor: isDark ? "#1A1A1A" : "#F2F2F7" }]}>
                <Ionicons name="search" size={20} color={colors.icon} style={styles.searchIcon} />
                <TextInput
                    style={[styles.searchInput, { color: colors.text }]}
                    placeholder="Search followers..."
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

            {loading && users.length === 0 ? (
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color={Colors.primary} />
                </View>
            ) : (
                <FlatList
                    data={users}
                    renderItem={renderItem}
                    keyExtractor={(item) => item.id.toString()}
                    onEndReached={handleLoadMore}
                    onEndReachedThreshold={0.5}
                    refreshing={loading}
                    onRefresh={handleRefresh}
                    ItemSeparatorComponent={() => (
                        <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.border || (isDark ? "#222" : "#eee"), marginLeft: 72 }} />
                    )}
                    contentContainerStyle={{ paddingBottom: 40 }}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Ionicons
                                name="people-outline"
                                size={48}
                                color={colors.text}
                                style={{ opacity: 0.3 }}
                            />
                            <ThemedText style={[styles.emptyText, { color: colors.text }]}>
                                {debouncedQuery ? "No results found" : "No followers yet"}
                            </ThemedText>
                        </View>
                    }
                    ListFooterComponent={
                        loadingMore ? (
                            <View style={styles.footerLoader}>
                                <ActivityIndicator size="small" color={Colors.primary} />
                            </View>
                        ) : null
                    }
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
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderBottomWidth: 1,
    },
    headerButton: {
        width: 40,
        height: 40,
        alignItems: "center",
        justifyContent: "center",
    },
    title: {
        flex: 1,
        textAlign: "center",
        fontSize: 18,
        fontWeight: "600",
    },
    headerRight: {
        width: 40,
    },
    centerContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    emptyContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingTop: 80,
        gap: 12,
    },
    emptyText: {
        fontSize: 15,
        opacity: 0.5,
    },
    footerLoader: {
        paddingVertical: 20,
        alignItems: "center",
    },
    searchContainer: {
        flexDirection: "row",
        alignItems: "center",
        margin: 12,
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
});
