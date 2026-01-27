import { ThemedText } from "@/components/themed-text";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { ProfileData } from "@/services/profileApi";
import { Image } from "expo-image";
import { RelativePathString, router } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";

interface ProfileStatsProps {
    followCounts: { followers: number; following: number };
    profileData: ProfileData | null;
    topArtists: any[];
    formatNumber: (num: number) => string;
}

export default function ProfileStats({
    followCounts,
    profileData,
    topArtists,
    formatNumber,
}: ProfileStatsProps) {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === "dark";
    const colors = Colors[isDark ? "dark" : "light"];

    return (
        <>
            {/* Stats Row */}
            <View style={styles.statsContainer}>
                <Pressable style={styles.statItem}>
                    <ThemedText type="defaultSemiBold" style={styles.statNumber}>
                        {formatNumber(followCounts.followers)}
                    </ThemedText>
                    <ThemedText type="small" style={styles.statLabel}>
                        Followers
                    </ThemedText>
                </Pressable>
                <Pressable style={styles.statItem}>
                    <ThemedText type="defaultSemiBold" style={styles.statNumber}>
                        {formatNumber(followCounts.following)}
                    </ThemedText>
                    <ThemedText type="small" style={styles.statLabel}>
                        Following
                    </ThemedText>
                </Pressable>
                <Pressable style={styles.statItem}>
                    <ThemedText type="defaultSemiBold" style={styles.statNumber}>
                        {formatNumber(profileData?.totalUniqueTracks || 0)}
                    </ThemedText>
                    <ThemedText type="small" style={styles.statLabel}>
                        Unique Songs
                    </ThemedText>
                </Pressable>
            </View>

            {/* Top Artists Section */}
            {topArtists && topArtists.length > 0 && (
                <View style={styles.topArtistsContainer}>
                    <ThemedText type="small" style={styles.topArtistsLabel}>
                        Top Artists
                    </ThemedText>
                    <View style={styles.topArtistsRow}>
                        {topArtists.slice(0, 3).map((artist: any, index: number) => (
                            <Pressable
                                key={artist.id || index}
                                style={styles.topArtistItem}
                                onPress={() =>
                                    router.push(`/artist/${artist.id}` as RelativePathString)
                                }
                            >
                                <Image
                                    source={{ uri: artist.images?.[0]?.url || "" }}
                                    style={styles.topArtistImage}
                                />
                                <ThemedText
                                    type="small"
                                    style={styles.topArtistName}
                                    numberOfLines={1}
                                >
                                    {artist.name}
                                </ThemedText>
                            </Pressable>
                        ))}
                    </View>
                </View>
            )}
        </>
    );
}

const styles = StyleSheet.create({
    statsContainer: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        width: "100%",
        paddingHorizontal: 20,
        gap: 12,
    },
    statItem: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 12,
    },
    statNumber: {
        fontSize: 20,
    },
    statLabel: {
        marginTop: 2,
        opacity: 0.7,
    },
    topArtistsContainer: {
        paddingHorizontal: 20,
        alignItems: "center",
    },
    topArtistsLabel: {
        marginBottom: 12,
        opacity: 0.7,
    },
    topArtistsRow: {
        flexDirection: "row",
        justifyContent: "center",
        gap: 20,
    },
    topArtistItem: {
        alignItems: "center",
        width: 70,
    },
    topArtistImage: {
        width: 60,
        height: 60,
        borderRadius: 30,
        borderWidth: 2,
        borderColor: "rgba(255,255,255,0.3)",
    },
    topArtistName: {
        marginTop: 6,
        textAlign: "center",
    },
});
