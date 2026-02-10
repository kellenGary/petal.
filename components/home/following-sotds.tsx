import { ThemedText } from '@/components/ui/themed-text';
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import sotdApi, { FollowingSotdItem } from "@/services/sotdApi";
import { BlurView } from "expo-blur";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    Pressable,
    ScrollView,
    StyleSheet,
    View,
} from "react-native";
import Animated, {
    FadeInRight,
    FadeInUp,
} from "react-native-reanimated";

export default function FollowingSotds() {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === "dark";
    const colors = Colors[isDark ? "dark" : "light"];

    const [sotds, setSotds] = useState<FollowingSotdItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchFollowingSotds = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await sotdApi.getFollowingSotds();
            setSotds(data);
        } catch (err) {
            console.error("Failed to fetch following SOTDs:", err);
            setError("Failed to load");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchFollowingSotds();
    }, [fetchFollowingSotds]);

    const handleCardPress = (trackId: string) => {
        router.push(`/song/${trackId}`);
    };

    const handleUserPress = (userId: number) => {
        router.push(`/profile/${userId}`);
    };

    // Don't render anything if loading, error, or no SOTDs
    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={Colors.primary} />
            </View>
        );
    }

    if (error || sotds.length === 0) {
        return null;
    }

    return (
        <Animated.View
            entering={FadeInUp.duration(400).delay(200)}
            style={styles.container}
        >
            <ThemedText style={[styles.sectionTitle, { color: colors.text }]}>
                Friends' Songs of the Day
            </ThemedText>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {sotds.map((item, index) => (
                    <Animated.View
                        key={`${item.user.id}-${item.track.id}`}
                        entering={FadeInRight.duration(400).delay(index * 100)}
                    >
                        <Pressable
                            style={styles.card}
                            onPress={() => handleCardPress(item.track.id)}
                        >
                            {/* Album Art Background */}
                            <Image
                                source={{ uri: item.track.album.image_url }}
                                style={styles.albumArt}
                                contentFit="cover"
                            />

                            {/* Gradient Overlay */}
                            <View style={styles.gradientOverlay} />

                            {/* Content Container */}
                            <View style={styles.cardContent}>
                                {/* User Info at Top */}
                                <Pressable
                                    style={styles.userRow}
                                    onPress={(e) => {
                                        e.stopPropagation();
                                        handleUserPress(item.user.id);
                                    }}
                                >
                                    <View style={styles.userAvatarContainer}>
                                        {item.user.profileImageUrl ? (
                                            <Image
                                                source={{ uri: item.user.profileImageUrl }}
                                                style={styles.userAvatar}
                                                contentFit="cover"
                                            />
                                        ) : (
                                            <View style={[styles.userAvatar, styles.avatarPlaceholder]}>
                                                <ThemedText style={styles.avatarText}>
                                                    {item.user.displayName?.[0]?.toUpperCase() || "?"}
                                                </ThemedText>
                                            </View>
                                        )}
                                    </View>
                                    <ThemedText style={styles.userName} numberOfLines={1}>
                                        {item.user.displayName}
                                    </ThemedText>
                                </Pressable>

                                {/* Song Info at Bottom */}
                                <BlurView intensity={60} tint={isDark ? "dark" : "light"} style={styles.songInfoContainer}>
                                    <ThemedText style={styles.songName} numberOfLines={1}>
                                        {item.track.name}
                                    </ThemedText>
                                    <ThemedText style={styles.artistName} numberOfLines={1}>
                                        {item.track.artists.join(", ")}
                                    </ThemedText>
                                </BlurView>
                            </View>
                        </Pressable>
                    </Animated.View>
                ))}
            </ScrollView>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        width: "100%",
        marginTop: 8,
    },
    loadingContainer: {
        height: 180,
        justifyContent: "center",
        alignItems: "center",
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: "600",
        marginBottom: 12,
    },
    scrollContent: {
        gap: 12,
        paddingRight: 16,
    },
    card: {
        width: 140,
        height: 180,
        borderRadius: 16,
        overflow: "hidden",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 5,
    },
    albumArt: {
        ...StyleSheet.absoluteFillObject,
        width: "100%",
        height: "100%",
    },
    gradientOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: "rgba(0,0,0,0.2)",
    },
    cardContent: {
        flex: 1,
        justifyContent: "space-between",
        padding: 10,
    },
    userRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
    },
    userAvatarContainer: {
        width: 28,
        height: 28,
        borderRadius: 14,
        borderWidth: 2,
        borderColor: "rgba(255,255,255,0.8)",
        overflow: "hidden",
    },
    userAvatar: {
        width: "100%",
        height: "100%",
        borderRadius: 12,
    },
    avatarPlaceholder: {
        backgroundColor: "rgba(255,255,255,0.3)",
        justifyContent: "center",
        alignItems: "center",
    },
    avatarText: {
        fontSize: 12,
        fontWeight: "700",
        color: "#fff",
    },
    userName: {
        fontSize: 12,
        fontWeight: "600",
        color: "#fff",
        flex: 1,
        textShadowColor: "rgba(0,0,0,0.5)",
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 3,
    },
    songInfoContainer: {
        borderRadius: 10,
        padding: 8,
        overflow: "hidden",
    },
    songName: {
        fontSize: 13,
        fontWeight: "700",
        color: "#fff",
        marginBottom: 2,
    },
    artistName: {
        fontSize: 11,
        fontWeight: "500",
        color: "rgba(255,255,255,0.85)",
    },
});
