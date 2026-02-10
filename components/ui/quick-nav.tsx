import { Colors } from '@/constants/theme'
import { useColorScheme } from '@/hooks/use-color-scheme'
import { MaterialIcons } from '@expo/vector-icons'
import { router } from 'expo-router'
import React from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import { ThemedText } from './themed-text'

const QuickNav = () => {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === "dark";
    const colors = Colors[isDark ? "dark" : "light"];

    const navItems = [
        { title: "Songs of the Week", icon: "music-note", route: "/songs-of-week", color: colors.chart1 },
        { title: "Analytics", icon: "bar-chart", route: "/analytics", color: colors.chart2 },
        { title: "Trending", icon: "whatshot", route: "/trending", color: colors.chart5 },
        { title: "Explore", icon: "explore", route: "/(tabs)/explore", color: colors.chart4 },
    ];

    const handlePress = (route: string | null) => {
        if (route) {
            router.push(route as any);
        }
    }

    return (
        <View style={styles.navContainer}>
            {navItems.map((item, index) => (
                <Pressable
                    key={index}
                    style={({ pressed }) => [
                        styles.navItem,
                        { backgroundColor: colors.card, opacity: pressed ? 0.7 : 1, borderColor: colors.border }
                    ]}
                    onPress={() => handlePress(item.route)}
                >
                    <MaterialIcons name={item.icon as any} size={24} color={item.color} />
                    <ThemedText style={styles.navText}>{item.title}</ThemedText>
                </Pressable>
            ))}
        </View>
    )
}

export default QuickNav

const styles = StyleSheet.create({
    navContainer: {
        width: "100%",
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 12,
    },
    navItem: {
        flexDirection: "row",
        width: "48%",
        paddingVertical: 12,
        borderRadius: 8,
        paddingHorizontal: 12,
        alignItems: "center",
        gap: 8,
        borderWidth: 1,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    navText: {
        fontSize: 12,
        fontWeight: "500",
        textAlign: "center",
    }
})