import { ThemedText } from "@/components/ui/themed-text";
import { Colors, Fonts } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { GlobalLocationHistoryEntry } from "@/services/listeningHistoryApi";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import React, { useMemo } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { FlatList } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function LocationHistoryScreen() {
    const { items, count } = useLocalSearchParams<{
        items: string;
        count: string;
    }>();
    const colorScheme = useColorScheme();
    const isDark = colorScheme === "dark";
    const colors = Colors[isDark ? "dark" : "light"];
    const insets = useSafeAreaInsets();

    const historyItems = useMemo(() => {
        try {
            return items ? (JSON.parse(items) as GlobalLocationHistoryEntry[]) : [];
        } catch (e) {
            console.error("Failed to parse history items", e);
            return [];
        }
    }, [items]);

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    return (
        <View style={[styles.container]}>
            {/* Gradient background behind the header */}
            <LinearGradient
                colors={[colors.background, "transparent"]}
                style={styles.headerBackgroundGradient}
                pointerEvents="none"
            />

            <View style={[
                styles.headerContainer,
                { paddingTop: 16 }
            ]}>
                <ThemedText style={[styles.headerTitle, { color: colors.text }]}>
                    Location History
                </ThemedText>
                <ThemedText style={[styles.headerSubtitle, { color: colors.text }]}>
                    {count} {Number(count) === 1 ? "Song" : "Songs"}
                </ThemedText>
            </View>

            <FlatList
                data={historyItems}
                keyExtractor={(item) => `${item.id}-${item.played_at}`}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={[
                    styles.trackListContent,
                    { paddingBottom: insets.bottom - 12 },
                ]}
                renderItem={({ item, index }) => (
                    <Pressable
                        style={[styles.trackListItem, { paddingTop: index === 0 ? insets.top + 24 : 0 }]}
                        onPress={() => {
                            router.push(`/song/${item.track.id}` as any);
                        }}
                    >
                        {item.track.album?.image_url ? (
                            <Image
                                source={{ uri: item.track.album.image_url }}
                                style={styles.trackListImage}
                                cachePolicy="memory-disk"
                            />
                        ) : (
                            <View
                                style={[styles.trackListImage, styles.trackImagePlaceholder]}
                            >
                                <MaterialIcons name="music-note" size={24} color="#fff" />
                            </View>
                        )}
                        <View style={styles.trackListDetails}>
                            <ThemedText
                                style={[styles.trackListName, { color: colors.text }]}
                                numberOfLines={1}
                            >
                                {item.track.name}
                            </ThemedText>
                            <ThemedText
                                style={[styles.trackListArtist, { color: colors.text }]}
                                numberOfLines={1}
                            >
                                {item.track.artists.map((a) => a.name).join(", ")}
                            </ThemedText>
                        </View>
                        <MaterialIcons name="chevron-right" size={24} color={colors.icon} />
                    </Pressable>
                )}
                ItemSeparatorComponent={() => (
                    <View
                        style={[
                            styles.trackListSeparator,
                            { backgroundColor: colors.text },
                        ]}
                    />
                )}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        position: "relative",
    },
    headerContainer: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        alignItems: "center",
        zIndex: 10,
    },
    headerBackgroundGradient: {
        position: "absolute",
        top: -20,
        left: 0,
        right: 0,
        height: 96,
        zIndex: 1,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: "700",
        fontFamily: Fonts.rounded,
        marginBottom: 4,
    },
    headerSubtitle: {
        fontSize: 14,
        opacity: 0.6,
        fontWeight: "500",
    },
    trackListContent: {
        // Padding top handled dynamically
    },
    trackListItem: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 12,
        paddingHorizontal: 16,
        gap: 16,
    },
    trackListImage: {
        width: 56,
        height: 56,
        borderRadius: 8,
    },
    trackImagePlaceholder: {
        backgroundColor: "#538ce9",
        justifyContent: "center",
        alignItems: "center",
        borderRadius: 8,
    },
    trackListDetails: {
        flex: 1,
        gap: 2,
        justifyContent: "center",
    },
    trackListName: {
        fontSize: 16,
        fontWeight: "600",
        fontFamily: Fonts.rounded,
    },
    trackListArtist: {
        fontSize: 14,
        opacity: 0.7,
        fontWeight: "500",
    },
    trackListDate: {
        fontSize: 12,
        opacity: 0.5,
    },
    trackListSeparator: {
        height: 1,
        opacity: 0.08,
        marginLeft: 88, // 16 (pad) + 56 (img) + 16 (gap) = 88
    },

});
