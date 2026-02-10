import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { FollowingSotdItem } from "@/services/sotdApi";
import { MaterialIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useEffect } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, {
    Easing,
    useAnimatedStyle,
    useSharedValue,
    withDelay,
    withRepeat,
    withSpring,
    withTiming,
} from "react-native-reanimated";
import { ThemedText } from "../themed-text";
import { BubblePosition } from "./utils";

interface FloatingBubbleProps {
    item: FollowingSotdItem;
    position: BubblePosition;
}

export function FloatingBubble({ item, position }: FloatingBubbleProps) {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === "dark";
    const colors = Colors[isDark ? "dark" : "light"];

    // Animation values
    const floatX = useSharedValue(0);
    const floatY = useSharedValue(0);
    const opacity = useSharedValue(0);
    const scale = useSharedValue(0.5);

    useEffect(() => {
        // Entry animation
        opacity.value = withDelay(position.delay, withTiming(1, { duration: 600 }));
        scale.value = withDelay(position.delay, withSpring(1, { damping: 12, stiffness: 100 }));

        // Continuous floating animation
        const floatDuration = 3000 + Math.random() * 2000;
        const floatAmplitudeX = 10 + Math.random() * 15;
        const floatAmplitudeY = 8 + Math.random() * 12;

        floatX.value = withDelay(
            position.delay,
            withRepeat(
                withTiming(floatAmplitudeX, { duration: floatDuration, easing: Easing.inOut(Easing.sin) }),
                -1,
                true
            )
        );

        floatY.value = withDelay(
            position.delay + 500,
            withRepeat(
                withTiming(floatAmplitudeY, { duration: floatDuration * 0.8, easing: Easing.inOut(Easing.sin) }),
                -1,
                true
            )
        );
    }, []);

    const animatedStyle = useAnimatedStyle(() => ({
        opacity: opacity.value,
        transform: [
            { translateX: floatX.value },
            { translateY: floatY.value },
            { scale: scale.value },
        ],
    }));

    const handlePress = () => router.push(`/song/${item.track.id}`);
    const handleUserPress = () => router.push(`/profile/${item.user.id}`);

    return (
        <Animated.View style={[styles.wrapper, { left: position.x, top: position.y }, animatedStyle]}>
            {/* SOTD Note Card */}
            <Pressable onPress={handlePress} style={[styles.noteCard, { backgroundColor: colors.card }]}>
                <Image
                    source={{ uri: item.track.album.image_url }}
                    style={styles.noteAlbumArt}
                    contentFit="cover"
                />
                <MaterialIcons name="music-note" size={24} color={Colors.primary} style={styles.icon} />
            </Pressable>

            {/* Profile Picture Bubble */}
            <Pressable onPress={handleUserPress} style={styles.bubblePressable}>
                <View style={[styles.bubble, { width: position.size, height: position.size, borderRadius: position.size / 2 }]}>
                    {item.user.profileImageUrl ? (
                        <Image
                            source={{ uri: item.user.profileImageUrl }}
                            style={[styles.bubbleImage, { borderRadius: position.size / 2 }]}
                            contentFit="cover"
                        />
                    ) : (
                        <View style={[styles.bubbleImage, styles.avatarPlaceholder, { borderRadius: position.size / 2 }]}>
                            <ThemedText style={styles.avatarText}>
                                {item.user.displayName?.[0]?.toUpperCase() || "?"}
                            </ThemedText>
                        </View>
                    )}
                </View>
                <ThemedText style={[styles.username, { color: colors.text }]} numberOfLines={1}>
                    {item.user.displayName?.split(' ')[0] || "User"}
                </ThemedText>
            </Pressable>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    wrapper: {
        position: "absolute",
        alignItems: "center",
    },
    noteCard: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        padding: 6,
        borderRadius: 8,
        marginBottom: -12,
        zIndex: 10,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
        elevation: 3,
    },
    noteAlbumArt: {
        width: 28,
        height: 28,
        borderRadius: 4,
    },
    icon: {
        opacity: 0.8,
    },
    bubble: {
        overflow: "hidden",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 5,
    },
    bubblePressable: {
        alignItems: "center",
    },
    bubbleImage: {
        width: "100%",
        height: "100%",
    },
    username: {
        fontSize: 11,
        fontWeight: "600",
        marginTop: 4,
        textAlign: "center",
        maxWidth: 80,
    },
    avatarPlaceholder: {
        backgroundColor: "rgba(120,120,120,0.5)",
        justifyContent: "center",
        alignItems: "center",
    },
    avatarText: {
        fontSize: 24,
        fontWeight: "700",
        color: "#fff",
    },
});
