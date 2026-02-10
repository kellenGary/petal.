import { ThemedText } from '@/components/ui/themed-text';
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { FeedTrack } from "@/services/feedApi";
import { Image } from "expo-image";
import { router } from 'expo-router';
import React from "react";
import { Dimensions, Pressable, StyleSheet, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
    Extrapolation,
    interpolate,
    SharedValue,
    useAnimatedStyle,
    useDerivedValue,
    useSharedValue,
    withSpring
} from "react-native-reanimated";

// Card dimensions
const SCREEN_WIDTH = Dimensions.get("window").width;
const CARD_WIDTH = 280;
const CARD_HEIGHT = 350;
const CARD_OVERLAP = 50;

export interface TrackCarouselProps {
    tracks: FeedTrack[];
    /** Optional callback when a track is pressed. If not provided, navigates to /song/{id} */
    onTrackPress?: (track: FeedTrack, index: number) => void;
}

export default function TrackCarousel({ tracks, onTrackPress }: TrackCarouselProps) {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === "dark";
    const colors = Colors[isDark ? "dark" : "light"];

    const scrollOffset = useSharedValue(0);
    const savedOffset = useSharedValue(0);

    if (!tracks || tracks.length === 0) return null;

    const maxOffset = Math.max(0, (tracks.length - 1) * CARD_OVERLAP);

    const panGesture = Gesture.Pan()
        .activeOffsetX([-10, 10])
        .failOffsetY([-10, 10])
        .onUpdate((event) => {
            const newOffset = savedOffset.value - event.translationX;
            if (newOffset < 0) {
                scrollOffset.value = newOffset * 0.3;
            } else if (newOffset > maxOffset) {
                scrollOffset.value = maxOffset + (newOffset - maxOffset) * 0.3;
            } else {
                scrollOffset.value = newOffset;
            }
        })
        .onEnd((event) => {
            const velocity = -event.velocityX;
            const projectedOffset = scrollOffset.value + velocity * 0.1;
            const nearestCard = Math.round(projectedOffset / CARD_OVERLAP);
            const clampedCard = Math.max(0, Math.min(nearestCard, tracks.length - 1));
            const targetOffset = clampedCard * CARD_OVERLAP;

            scrollOffset.value = withSpring(targetOffset, {
                damping: 10000,
                stiffness: 500,
                velocity: velocity,
            });
            savedOffset.value = targetOffset;
        });

    const handleTrackPress = (track: FeedTrack, index: number) => {
        if (onTrackPress) {
            onTrackPress(track, index);
        } else {
            router.push(`/song/${track.id}`);
        }
    };

    return (
        <GestureDetector gesture={panGesture}>
            <View style={styles.carouselContainer}>
                <View style={styles.carouselTrack}>
                    {tracks.map((track, index) => (
                        <StackedCard
                            key={`${track.spotifyId}-${index}`}
                            track={track}
                            index={index}
                            totalCards={tracks.length}
                            scrollOffset={scrollOffset}
                            colors={colors}
                            onPress={() => handleTrackPress(track, index)}
                        />
                    ))}
                </View>
            </View>
        </GestureDetector>
    );
}

interface StackedCardProps {
    track: FeedTrack;
    index: number;
    totalCards: number;
    scrollOffset: SharedValue<number>;
    colors: typeof Colors.light;
    onPress: () => void;
}

function StackedCard({
    track,
    index,
    totalCards,
    scrollOffset,
    colors,
    onPress,
}: StackedCardProps) {
    const centerOffset = useDerivedValue(() => {
        const basePosition = index * CARD_OVERLAP;
        const relativePosition = basePosition - scrollOffset.value;
        return relativePosition / CARD_OVERLAP;
    });

    const animatedStyle = useAnimatedStyle(() => {
        const absoluteCenterOffset = Math.abs(centerOffset.value);

        const minWidth = 20;
        const width = interpolate(
            absoluteCenterOffset,
            [0, 1],
            [CARD_WIDTH, minWidth],
            Extrapolation.CLAMP
        );

        const translateX = interpolate(
            centerOffset.value,
            [-2, -1, 0, 1, 2],
            [
                -minWidth * 2,
                -minWidth,
                0,
                CARD_WIDTH,
                CARD_WIDTH + minWidth
            ],
            Extrapolation.EXTEND
        );

        const zIndex = totalCards - index;

        return {
            transform: [{ translateX }],
            width,
            zIndex,
        };
    });

    // Animated opacity for text - fades in when card is focused
    const textAnimatedStyle = useAnimatedStyle(() => {
        const absoluteCenterOffset = Math.abs(centerOffset.value);

        // Text is fully visible when centered (offset = 0), fades out as it moves away
        const opacity = interpolate(
            absoluteCenterOffset,
            [0, 0.3, 0.5],
            [1, 0.5, 0],
            Extrapolation.CLAMP
        );

        return {
            opacity,
        };
    });

    const isCentered = () => Math.abs(centerOffset.value) < 0.1;

    const handlePress = () => {
        if (isCentered()) {
            onPress();
        }
    };

    return (
        <Animated.View style={[styles.stackedCard, animatedStyle]}>
            <Pressable
                style={[styles.cardInner, { backgroundColor: colors.card }]}
                onPress={handlePress}
            >
                {track.albumImageUrl && (
                    <Image
                        source={{ uri: track.albumImageUrl }}
                        style={styles.cardImage}
                    />
                )}
                <View style={[styles.cardContent, { backgroundColor: colors.card }]}>
                    <Animated.View style={textAnimatedStyle}>
                        <ThemedText
                            style={[styles.cardTrackName, { color: colors.text }]}
                            numberOfLines={2}
                        >
                            {track.name || 'Unknown Track'}
                        </ThemedText>
                        <ThemedText
                            style={[styles.cardArtistName, { color: colors.text }]}
                            numberOfLines={1}
                        >
                            {track.artistNames?.join(', ') || 'Unknown Artist'}
                        </ThemedText>
                    </Animated.View>
                </View>
            </Pressable>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    carouselContainer: {
        height: CARD_HEIGHT + 40,
        overflow: "visible",
        paddingVertical: 20,
    },
    carouselTrack: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "flex-start",
        paddingLeft: (SCREEN_WIDTH - CARD_WIDTH) / 2,
        height: CARD_HEIGHT,
    },
    stackedCard: {
        position: "absolute",
        width: CARD_WIDTH,
        height: CARD_HEIGHT,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 3,
    },
    cardInner: {
        flex: 1,
        borderRadius: 16,
        overflow: "hidden",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    cardImage: {
        width: CARD_WIDTH,
        aspectRatio: 1,
        resizeMode: "cover",
    },
    cardContent: {
        padding: 12,
        justifyContent: "flex-end",
    },
    cardTrackName: {
        fontSize: 14,
        fontWeight: "700",
    },
    cardArtistName: {
        fontSize: 12,
        opacity: 0.6,
    },
});
