import AlbumItem from "@/components/album-item";
import PlaylistItem from "@/components/playlist-item";
import SongItem from "@/components/song-item";
import TabNavigation from "@/components/tab-navigation";
import { ThemedText } from "@/components/themed-text";
import { RelativePathString } from "expo-router";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { AlbumGroup, TabType } from "./user-profile";

interface ProfileContentProps {
    activeTab: TabType;
    setActiveTab: (tab: TabType) => void;
    loading: boolean;
    contentLoading: { tracks: boolean };
    recentTracks: any[];
    likedTracks: any[];
    playlists: any[];
    isOwnProfile: boolean;
    spotifyId?: string;
    groupConsecutiveAlbums: (items: any[]) => AlbumGroup[];
    getStreak: (spotifyId: string) => number | undefined;
}

export default function ProfileContent({
    activeTab,
    setActiveTab,
    loading,
    contentLoading,
    recentTracks,
    likedTracks,
    playlists,
    isOwnProfile,
    spotifyId,
    groupConsecutiveAlbums,
    getStreak,
}: ProfileContentProps) {
    const renderContent = () => {
        if (loading) {
            return (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#538ce9ff" />
                </View>
            );
        }

        switch (activeTab) {
            case "history":
                const groupedHistory = groupConsecutiveAlbums(recentTracks || []);

                return (
                    <View>
                        {groupedHistory.map((group: AlbumGroup, index: number) => {
                            if (group.tracks.length > 1) {
                                return (
                                    <AlbumItem
                                        key={`album-group-${group.albumId}-${index}`}
                                        group={group}
                                    />
                                );
                            } else {
                                const track = group.tracks[0];
                                return (
                                    <SongItem
                                        key={`${track.id}-${index}`}
                                        id={track.id}
                                        title={track.name}
                                        artist={track.artists
                                            .map((artist: any) => artist.name)
                                            .join(", ")}
                                        cover={group.albumCover}
                                        link={`/song/${track.id}` as RelativePathString}
                                        streak={
                                            track.spotifyId ? getStreak(track.spotifyId) : undefined
                                        }
                                    />
                                );
                            }
                        })}
                        {contentLoading.tracks && (
                            <View style={styles.loadMoreContainer}>
                                <ActivityIndicator size="small" color="#538ce9ff" />
                            </View>
                        )}
                        {!contentLoading.tracks && recentTracks?.length === 0 && (
                            <ThemedText type="small" style={styles.endOfListText}>
                                No more history to load
                            </ThemedText>
                        )}
                    </View>
                );

            case "playlists":
                return (
                    <View style={styles.contentSection}>
                        {playlists
                            ?.filter((playlist: any) =>
                                isOwnProfile ? playlist.owner.id === spotifyId : true,
                            )
                            .map((playlist: any) => (
                                <PlaylistItem
                                    key={playlist.id}
                                    id={playlist.id}
                                    name={playlist.name}
                                    songCount={playlist.tracks?.total || 0}
                                    cover={playlist.images[0]?.url || ""}
                                    link={`/playlist/${playlist.id}` as RelativePathString}
                                />
                            ))}
                    </View>
                );

            case "liked":
                return (
                    <View style={styles.contentSection}>
                        {likedTracks?.map((item: any, index: number) => (
                            <SongItem
                                key={`${item.track.id}-${index}`}
                                id={item.track.id}
                                title={item.track.name}
                                artist={item.track.artists
                                    .map((artist: any) => artist.name)
                                    .join(", ")}
                                cover={item.track.album?.imageUrl || ""}
                                link={`/song/${item.track.id}` as RelativePathString}
                            />
                        ))}
                        {contentLoading.tracks && (
                            <View style={styles.loadMoreContainer}>
                                <ActivityIndicator size="small" color="#538ce9ff" />
                            </View>
                        )}
                        {!contentLoading.tracks && likedTracks?.length === 0 && (
                            <ThemedText type="small" style={styles.endOfListText}>
                                No more liked songs to load
                            </ThemedText>
                        )}
                    </View>
                );
        }
    };

    return (
        <>
            {/* Tab Navigation */}
            <View style={styles.tabContainer}>
                <TabNavigation
                    tabs={["history", "playlists", "liked"]}
                    activeTab={activeTab}
                    setActiveTab={setActiveTab as (tab: string) => void}
                />
            </View>

            {/* Content Section */}
            <View style={styles.contentContainer}>{renderContent()}</View>
        </>
    );
}

const styles = StyleSheet.create({
    tabContainer: {
        flexDirection: "row",
        borderBottomWidth: 1,
        borderBottomColor: "rgba(128,128,128,0.2)",
    },
    contentContainer: {
        flex: 1,
        minHeight: 400,
    },
    contentSection: {},
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingVertical: 60,
        gap: 12,
    },
    loadMoreContainer: {
        paddingVertical: 20,
        alignItems: "center",
    },
    endOfListText: {
        textAlign: "center",
        paddingVertical: 20,
        opacity: 0.5,
    },
});
