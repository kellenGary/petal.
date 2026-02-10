import { ThemedText } from "@/components/ui/themed-text";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import useUserContent from "@/hooks/useUserContent";
import { Image } from "expo-image";
import { Stack, router, useLocalSearchParams } from "expo-router";
import {
    ActivityIndicator,
    Dimensions,
    FlatList,
    Pressable,
    StyleSheet,
    View
} from "react-native";

const { width } = Dimensions.get("window");
// 3 columns
const COLUMNS = 3;
const SPACING = 12;
const ITEM_WIDTH = (width - (SPACING * (COLUMNS + 1))) / COLUMNS;

export default function FollowingPage() {
    const { userId } = useLocalSearchParams<{ userId: string }>();
    const parsedUserId = userId ? parseInt(userId, 10) : undefined;
    const colorScheme = useColorScheme();
    const isDark = colorScheme === "dark";
    const colors = Colors[isDark ? "dark" : "light"];

    const {
        followedArtists,
        loading,
        fetchFollowedArtists,
        pagination
    } = useUserContent(parsedUserId);

    // Initial fetch handled by hook, but we need load more for pagination
    const handleLoadMore = () => {
        if (!loading.artists && pagination.followedArtists.hasMore) {
            fetchFollowedArtists(50, followedArtists.length, false);
        }
    };

    const renderItem = ({ item }: { item: any }) => {
        const artist = item.artist || item;
        return (
            <Pressable
                style={styles.artistCard}
                onPress={() => router.push(`/artist/${artist.id}`)}
            >
                <Image
                    source={{ uri: artist.imageUrl || artist.image_url }}
                    style={[styles.artistImage, { backgroundColor: colors.card }]}
                />
                <ThemedText
                    style={[styles.artistName, { color: colors.text }]}
                    numberOfLines={1}
                >
                    {artist.name}
                </ThemedText>
            </Pressable>
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <Stack.Screen
                options={{
                    headerTitle: "Following",
                    headerStyle: { backgroundColor: colors.background },
                    headerTintColor: colors.text,
                    headerShadowVisible: false,
                }}
            />

            {loading.artists && followedArtists.length === 0 ? (
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color={Colors.primary} />
                </View>
            ) : (
                <FlatList
                    data={followedArtists}
                    renderItem={renderItem}
                    keyExtractor={(item) => (item.artist?.id || item.id).toString()}
                    numColumns={COLUMNS}
                    contentContainerStyle={styles.listContent}
                    columnWrapperStyle={styles.columnWrapper}
                    onEndReached={handleLoadMore}
                    onEndReachedThreshold={0.5}
                    ListEmptyComponent={
                        <View style={styles.centerContainer}>
                            <ThemedText style={{ color: colors.text, opacity: 0.6 }}>No followed artists</ThemedText>
                        </View>
                    }
                    ListFooterComponent={
                        loading.artists && followedArtists.length > 0 ? (
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
    centerContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    listContent: {
        padding: SPACING,
    },
    columnWrapper: {
        gap: SPACING,
        marginBottom: 20,
    },
    artistCard: {
        width: ITEM_WIDTH,
        alignItems: "center",
        gap: 8,
    },
    artistImage: {
        width: ITEM_WIDTH,
        height: ITEM_WIDTH,
        borderRadius: ITEM_WIDTH / 2,
    },
    artistName: {
        fontSize: 12,
        fontWeight: "600",
        textAlign: "center",
    },
    footerLoader: {
        paddingVertical: 20,
        alignItems: "center",
    },
});
