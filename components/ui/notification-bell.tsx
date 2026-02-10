import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { MaterialIcons } from '@expo/vector-icons';
import React, { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
    Easing,
    cancelAnimation,
    useAnimatedStyle,
    useSharedValue,
    withDelay,
    withRepeat,
    withSequence,
    withTiming,
} from 'react-native-reanimated';
import { ThemedText } from './themed-text';

interface NotificationBellProps {
    count?: number;
    onPress: () => void;
}

export default function NotificationBell({ count = 0, onPress }: NotificationBellProps) {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const colors = Colors[isDark ? 'dark' : 'light'];

    const rotation = useSharedValue(0);

    useEffect(() => {
        if (count > 0) {
            // Start the shake animation loop
            const TRIGGER_INTERVAL_MS = 5000;

            const animate = () => {
                rotation.value = withSequence(
                    // Shake sequence
                    withTiming(-15, { duration: 50, easing: Easing.linear }),
                    withRepeat(
                        withTiming(15, { duration: 100, easing: Easing.linear }),
                        3,
                        true // reverse
                    ),
                    withTiming(0, { duration: 50, easing: Easing.linear }),
                    // Wait for the next interval
                    withDelay(
                        TRIGGER_INTERVAL_MS,
                        withTiming(0, { duration: 0 }, (finished) => {
                            if (finished) {
                                // The chain continues via the complexity of withDelay/withSequence? 
                                // Actually, recursion is tricky with reanimated. 
                                // Better approach: simple loop.
                            }
                        })
                    )
                );
            };

            // Since recursion inside worklets/animations can be tricky, let's use a simpler interval approach
            // but managed via Reanimated's withRepeat + withDelay combo which is more robust

            rotation.value = withRepeat(
                withSequence(
                    withTiming(-15, { duration: 50 }),
                    withRepeat(withTiming(15, { duration: 100 }), 3, true),
                    withTiming(0, { duration: 50 }),
                    withDelay(5000, withTiming(0, { duration: 0 })) // Wait 5s before repeating
                ),
                -1, // Infinite repeat
                false // Do not reverse the whole sequence
            );

        } else {
            cancelAnimation(rotation);
            rotation.value = 0;
        }
    }, [count]);

    const animatedStyle = useAnimatedStyle(() => {
        return {
            transform: [{ rotate: `${rotation.value}deg` }],
        };
    });

    return (
        <Pressable onPress={onPress} style={styles.container}>
            <Animated.View style={animatedStyle}>
                <MaterialIcons name="notifications" size={24} color={colors.text} />
            </Animated.View>
            {count > 0 && (
                <View style={styles.badgeContainer}>
                    <ThemedText style={styles.badgeText}>{count > 99 ? '99+' : count}</ThemedText>
                </View>
            )}
        </Pressable>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'relative',
        padding: 4, // Add touch area padding
    },
    badgeContainer: {
        position: 'absolute',
        top: 0,
        right: 0,
        backgroundColor: '#FF3B30', // Standard iOS red or similar alert color
        borderRadius: 8,
        minWidth: 16,
        height: 16,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: 'white', // Create separation from the icon/bg
        zIndex: 10,
        paddingHorizontal: 3,
    },
    badgeText: {
        color: 'white',
        fontSize: 10,
        fontWeight: 'bold',
        lineHeight: 12,
    },
});
