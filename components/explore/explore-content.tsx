import { ThemedText } from '@/components/ui/themed-text';
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

export default function ExploreContent() {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === "dark";
    const colors = Colors[isDark ? "dark" : "light"];

    const renderSection = (title: string) => (
        <View style={styles.section}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>{title}</ThemedText>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                {[1, 2, 3, 4, 5].map((item) => (
                    <View key={item} style={[styles.card, { backgroundColor: colors.card }]}>
                        <View style={[styles.placeholderImage, { backgroundColor: colors.muted }]} />
                        <ThemedText style={styles.cardTitle}>Item {item}</ThemedText>
                        <ThemedText style={styles.cardSubtitle}>Subtitle</ThemedText>
                    </View>
                ))}
            </ScrollView>
        </View>
    );

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
            {renderSection("Trending Songs")}
            {renderSection("Popular Artists")}
            {renderSection("Featured Playlists")}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    contentContainer: {
        paddingBottom: 20,
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        paddingHorizontal: 16,
        marginBottom: 12,
    },
    scrollContent: {
        paddingHorizontal: 16,
        gap: 12,
    },
    card: {
        width: 140,
        borderRadius: 12,
        padding: 10,
    },
    placeholderImage: {
        width: "100%",
        aspectRatio: 1,
        borderRadius: 8,
        marginBottom: 8,
    },
    cardTitle: {
        fontWeight: "600",
        fontSize: 14,
        marginBottom: 2,
    },
    cardSubtitle: {
        fontSize: 12,
        opacity: 0.7,
    },
});
