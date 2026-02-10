import NotificationBellWithData from "@/components/ui/notification-bell-with-data";
import { Colors } from "@/constants/theme";
import { useAuth } from "@/contexts/AuthContext";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useEffect, useMemo } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
    Easing,
    interpolate,
    useAnimatedStyle,
    useSharedValue,
    withDelay,
    withSpring,
    withTiming,
} from "react-native-reanimated";
import LeafLogoDraw from "../animated-logo";
import { ThemedText } from "../themed-text";
import { useFollowingSotds } from "./hooks";
import { generateBubblePositions, SCREEN_HEIGHT } from "./utils";

export default function Hero() {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === "dark";
    const colors = Colors[isDark ? "dark" : "light"];
    const { user } = useAuth();

    // Fetch SOTD data
    const { sotds, loading } = useFollowingSotds(10);

    // Generate bubble positions
    const bubblePositions = useMemo(
        () => generateBubblePositions(sotds.length),
        [sotds.length]
    );

    // Animation values

    const titleProgress = useSharedValue(0);
    const subtitleProgress = useSharedValue(0);
    const bellProgress = useSharedValue(0);
    const decorProgress = useSharedValue(0);

    useEffect(() => {

        titleProgress.value = withDelay(400, withTiming(1, { duration: 600, easing: Easing.out(Easing.cubic) }));
        subtitleProgress.value = withDelay(600, withTiming(1, { duration: 600, easing: Easing.out(Easing.cubic) }));
        bellProgress.value = withDelay(800, withSpring(1, { damping: 15, stiffness: 120 }));
        decorProgress.value = withDelay(300, withTiming(1, { duration: 1000, easing: Easing.out(Easing.cubic) }));
    }, []);



    const titleAnimatedStyle = useAnimatedStyle(() => ({
        opacity: titleProgress.value,
        transform: [{ translateY: interpolate(titleProgress.value, [0, 1], [30, 0]) }],
    }));

    const subtitleAnimatedStyle = useAnimatedStyle(() => ({
        opacity: subtitleProgress.value,
        transform: [{ translateY: interpolate(subtitleProgress.value, [0, 1], [20, 0]) }],
    }));

    const bellAnimatedStyle = useAnimatedStyle(() => ({
        opacity: bellProgress.value,
        transform: [
            { scale: interpolate(bellProgress.value, [0, 1], [0.8, 1]) },
            { translateX: interpolate(bellProgress.value, [0, 1], [20, 0]) },
        ],
    }));

    const decorAnimatedStyle = useAnimatedStyle(() => ({
        opacity: interpolate(decorProgress.value, [0, 1], [0, 0.1]),
        transform: [{ scale: interpolate(decorProgress.value, [0, 1], [0.8, 1]) }],
    }));

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Decorative circles */}
            <Animated.View style={[styles.decorCircle, styles.decorCircle1, decorAnimatedStyle, { borderColor: colors.tint }]} />
            <Animated.View style={[styles.decorCircle, styles.decorCircle2, decorAnimatedStyle, { borderColor: colors.tint }]} />

            {/* Floating SOTD Bubbles
            {!loading && sotds.map((item, index) => (
                <FloatingBubble
                    key={`${item.user.id}-${item.track.id}`}
                    item={item}
                    position={bubblePositions[index]}
                />
            ))} */}

            {/* Main content */}
            <View style={styles.content}>
                <View style={styles.brandContainer}>
                    <View style={styles.logoContainer}>
                        <LeafLogoDraw />

                        {/* <Image
                            source={!isDark ? require("../../assets/images/black-icon.svg") : require("../../assets/images/white-icon.svg")}
                            style={styles.headerImage}
                        /> */}
                    </View>

                    <Animated.View style={titleAnimatedStyle}>
                        <ThemedText type="title" style={styles.brandText}>petal.</ThemedText>
                    </Animated.View>
                </View>

                <Animated.View style={[styles.welcomeContainer, subtitleAnimatedStyle]}>
                    <ThemedText style={styles.welcomeText}>Welcome back,</ThemedText>
                    <ThemedText type="subtitle" style={styles.userName}>
                        {user?.displayName || "friend"}
                    </ThemedText>
                </Animated.View>

                <Animated.View style={[styles.bellContainer, bellAnimatedStyle]}>
                    <NotificationBellWithData />
                </Animated.View>
            </View>

            {/* Scroll indicator */}
            <Animated.View style={[styles.scrollIndicator, subtitleAnimatedStyle]}>
                <View style={[styles.scrollDot, { backgroundColor: colors.text }]} />
                <View style={[styles.scrollLine, { backgroundColor: colors.text }]} />
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        width: "100%",
        height: SCREEN_HEIGHT,
        justifyContent: "center",
        alignItems: "center",
        position: "relative",
        overflow: "hidden",
    },
    content: {
        flex: 1,
        width: "100%",
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 24,
        zIndex: 10,
    },
    brandContainer: {
        alignItems: "center",
        marginBottom: 32,
    },
    logoContainer: {
        marginBottom: 16,
    },
    headerImage: {
        width: 80,
        height: 80,
    },
    brandText: {
        fontWeight: "700",
        letterSpacing: -1,
    },
    welcomeContainer: {
        alignItems: "center",
        marginBottom: 24,
    },
    welcomeText: {
        fontSize: 18,
        opacity: 0.7,
        marginBottom: 4,
    },
    userName: {
        fontSize: 24,
        fontWeight: "600",
    },
    bellContainer: {
        position: "absolute",
        top: 60,
        right: 24,
    },
    decorCircle: {
        position: "absolute",
        borderRadius: 999,
        borderWidth: 1,
    },
    decorCircle1: {
        width: 300,
        height: 300,
        top: -50,
        right: -100,
    },
    decorCircle2: {
        width: 200,
        height: 200,
        bottom: 100,
        left: -80,
    },
    scrollIndicator: {
        position: "absolute",
        bottom: 40,
        alignItems: "center",
    },
    scrollDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginBottom: 8,
    },
    scrollLine: {
        width: 2,
        height: 40,
        opacity: 0.3,
    },
});
