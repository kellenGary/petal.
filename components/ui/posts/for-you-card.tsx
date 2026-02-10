import { ThemedText } from "@/components/ui/themed-text";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import recommendationApi, { Recommendation } from "@/services/recommendationApi";
import { MaterialIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Dimensions,
    Pressable,
    ScrollView,
    StyleSheet,
    View,
} from "react-native";

const SCREEN_WIDTH = Dimensions.get("window").width;
const CARD_WIDTH = 140;
const CARD_GAP = 12;

interface ForYouCardProps {
    /** Optional callback when data is loaded */
    onLoad?: (recommendations: Recommendation[]) => void;
}

/**
 * A "For You" recommendations carousel that appears in the feed.
 * Shows 5 personalized song recommendations with "Why this?" labels.
 * Tracks dismissals (user viewed but didn't tap) as negative signal.
 */
export default function ForYouCard({ onLoad }: ForYouCardProps) {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === "dark";
    const colors = Colors[isDark ? "dark" : "light"];

    const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    // Track which songs the user has tapped (engaged with)
    const engagedTrackIds = useRef(new Set<number>());
    // Track if we've already sent dismissals for this card
    const dismissalsSent = useRef(false);

    useEffect(() => {
        loadRecommendations();
    }, []);

    // Send dismissals when component unmounts (user scrolled past without engaging)
    useEffect(() => {
        return () => {
            if (!dismissalsSent.current && recommendations.length > 0) {
                sendDismissals();
            }
        };
    }, [recommendations]);

    const loadRecommendations = async () => {
        try {
            setLoading(true);
            setError(false);
            const recs = await recommendationApi.getForYouRecommendations(5);
            setRecommendations(recs);
            onLoad?.(recs);
        } catch (err) {
            console.error("Failed to load recommendations:", err);
            setError(true);
        } finally {
            setLoading(false);
        }
    };

    const sendDismissals = useCallback(() => {
        if (dismissalsSent.current) return;
        dismissalsSent.current = true;

        // Send dismissal for any track the user didn't engage with
        recommendations.forEach((rec) => {
            if (!engagedTrackIds.current.has(rec.trackId)) {
                recommendationApi.dismissRecommendation(rec.trackId);
            }
        });
    }, [recommendations]);

    const handleTrackPress = useCallback((rec: Recommendation) => {
        // Mark this track as engaged (not a dismissal)
        engagedTrackIds.current.add(rec.trackId);
        // Navigate to song formsheet
        router.push(`/song/${rec.trackId}` as any);
    }, []);

    if (loading) {
        return (
            <View style={[styles.container, styles.loadingContainer, { backgroundColor: colors.card }]}>
                <ActivityIndicator size="small" color={Colors.primary} />
                <ThemedText style={[styles.loadingText, { color: colors.icon }]}>
                    Finding songs for you...
                </ThemedText>
            </View>
        );
    }

    if (error || recommendations.length === 0) {
        // Don't show anything if there's an error or no recommendations
        return null;
    }

    return (
        <View style={[styles.container, { backgroundColor: colors.card }]}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <LinearGradient
                        colors={[Colors.primary, "#8B5CF6"]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.iconGradient}
                    >
                        <MaterialIcons name="auto-awesome" size={16} color="#fff" />
                    </LinearGradient>
                    <ThemedText style={[styles.headerTitle, { color: colors.text }]}>
                        For You
                    </ThemedText>
                </View>
                <ThemedText style={[styles.headerSubtitle, { color: colors.icon }]}>
                    Personalized picks
                </ThemedText>
            </View>

            {/* Horizontal Carousel */}
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.carouselContent}
                decelerationRate="fast"
                snapToInterval={CARD_WIDTH + CARD_GAP}
            >
                {recommendations.map((rec) => (
                    <Pressable
                        key={rec.trackId}
                        style={[styles.trackCard, { backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)" }]}
                        onPress={() => handleTrackPress(rec)}
                    >
                        {/* Album Art */}
                        <View style={styles.imageContainer}>
                            {rec.albumImageUrl ? (
                                <Image
                                    source={{ uri: rec.albumImageUrl }}
                                    style={styles.albumImage}
                                    contentFit="cover"
                                />
                            ) : (
                                <View style={[styles.albumImage, styles.albumPlaceholder]}>
                                    <MaterialIcons name="music-note" size={32} color={colors.icon} />
                                </View>
                            )}
                        </View>

                        {/* Track Info */}
                        <View style={styles.trackInfo}>
                            <ThemedText
                                style={[styles.trackName, { color: colors.text }]}
                                numberOfLines={1}
                            >
                                {rec.name}
                            </ThemedText>
                            <ThemedText
                                style={[styles.artistName, { color: colors.icon }]}
                                numberOfLines={1}
                            >
                                {rec.artistNames.join(", ")}
                            </ThemedText>
                        </View>

                        {/* Why This Label */}
                        <View style={[styles.reasonContainer, { backgroundColor: Colors.primary + "15" }]}>
                            <ThemedText
                                style={[styles.reasonText, { color: Colors.primary }]}
                                numberOfLines={1}
                            >
                                {rec.reason}
                            </ThemedText>
                        </View>
                    </Pressable>
                ))}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        borderRadius: 16,
        paddingVertical: 16,
        marginBottom: 8,
    },
    loadingContainer: {
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 32,
        flexDirection: "row",
        gap: 12,
    },
    loadingText: {
        fontSize: 14,
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        marginBottom: 16,
    },
    headerLeft: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
    },
    iconGradient: {
        width: 28,
        height: 28,
        borderRadius: 8,
        alignItems: "center",
        justifyContent: "center",
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: "700",
    },
    headerSubtitle: {
        fontSize: 13,
    },
    carouselContent: {
        paddingHorizontal: 16,
        gap: CARD_GAP,
    },
    trackCard: {
        width: CARD_WIDTH,
        borderRadius: 12,
        overflow: "hidden",
    },
    imageContainer: {
        width: CARD_WIDTH,
        height: CARD_WIDTH,
    },
    albumImage: {
        width: "100%",
        height: "100%",
    },
    albumPlaceholder: {
        backgroundColor: "rgba(128,128,128,0.2)",
        alignItems: "center",
        justifyContent: "center",
    },
    trackInfo: {
        padding: 10,
        gap: 2,
    },
    trackName: {
        fontSize: 13,
        fontWeight: "600",
    },
    artistName: {
        fontSize: 11,
    },
    reasonContainer: {
        marginHorizontal: 10,
        marginBottom: 10,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    reasonText: {
        fontSize: 10,
        fontWeight: "500",
    },
});
