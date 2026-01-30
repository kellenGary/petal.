import FilterBubble from "@/components/filter-bubble";
import SearchBar from "@/components/search-bar";
import SelectableItem from "@/components/selectable-item";
import { ThemedText } from '@/components/themed-text';
import { Colors } from "@/constants/theme";
import { useAuth } from "@/contexts/AuthContext";
import { useColorScheme } from "@/hooks/use-color-scheme";
import useUserContent from "@/hooks/useUserContent";
import { SelectedContent } from "@/services/postApi";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const PAGE_SIZE = 50;

export default function PostScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = Colors[isDark ? "dark" : "light"];
  const { isAuthenticated } = useAuth();

  const filters = ["Recent Song", "Liked Song", "Album", "Playlist", "Artist"];
  const [activeFilter, setActiveFilter] = useState("Recent Song");
  const [searchQuery, setSearchQuery] = useState("");

  // Data provided by shared hook
  const {
    recentTracks,
    likedTracks,
    likedAlbums,
    playlists: userPlaylists,
    followedArtists,
    loading,
    fetchRecentTracks,
    fetchLikedTracks,
    fetchLikedAlbums,
    fetchPlaylists,
    fetchFollowedArtists,
    searchItems,
  } = useUserContent();

  // Selection state
  const [selectedContent, setSelectedContent] =
    useState<SelectedContent | null>(null);

  // combined loading flag
  const isLoading =
    loading.tracks || loading.albums || loading.playlists || loading.artists;

  // Fetch data when filter changes
  useMemo(() => {
    if (!isAuthenticated) return;
    setSelectedContent(null); // Clear selection when filter changes
    setSearchQuery(""); // Clear search

    switch (activeFilter) {
      case "Recent Song":
        fetchRecentTracks(PAGE_SIZE, 0);
        break;
      case "Liked Song":
        fetchLikedTracks(PAGE_SIZE, 0);
        break;
      case "Album":
        fetchLikedAlbums(PAGE_SIZE, 0);
        break;
      case "Playlist":
        fetchPlaylists();
        break;
      case "Artist":
        fetchFollowedArtists(PAGE_SIZE, 0);
        break;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFilter, isAuthenticated]);

  // Initial fetch
  useEffect(() => {
    if (!isAuthenticated) return;
    fetchLikedTracks(PAGE_SIZE, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  const handleSelect = (content: SelectedContent) => {
    if (
      selectedContent?.id === content.id &&
      selectedContent?.type === content.type
    ) {
      setSelectedContent(null);
    } else {
      setSelectedContent(content);
    }
  };

  const handleContinue = () => {
    if (!selectedContent) return;

    router.push({
      pathname: "/post-preview",
      params: {
        type: selectedContent.type,
        id: selectedContent.id,
        spotifyId: selectedContent.spotifyId,
        name: selectedContent.name,
        imageUrl: selectedContent.imageUrl || "",
        subtitle: selectedContent.subtitle,
      },
    });
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <ThemedText style={[styles.loadingText, { color: colors.text }]}>
            Loading your {activeFilter.toLowerCase()}s...
          </ThemedText>
        </View>
      );
    }

    switch (activeFilter) {
      case "Recent Song":
        const filteredSongs = searchItems(
          recentTracks,
          ["track.name", "track.artists"],
          searchQuery
        );
        return filteredSongs.length > 0 ? (
          filteredSongs.map((item: any, index: number) => {
            const track = item.track;
            const content: SelectedContent = {
              type: "song",
              id: track.id, // DB numeric id
              spotifyId: track.spotify_id || track.id, // Spotify ID string
              name: track.name,
              imageUrl: track.album?.image_url || null,
              subtitle:
                track.artists?.map((a: any) => a.name).join(", ") ||
                "Unknown Artist",
            };
            return (
              <SelectableItem
                key={`song-${track.id}-${index}`}
                id={track.id}
                title={track.name}
                subtitle={content.subtitle}
                imageUrl={content.imageUrl}
                isSelected={
                  selectedContent?.id === content.id &&
                  selectedContent?.type === "song"
                }
                onSelect={() => handleSelect(content)}
              />
            );
          })
        ) : (
          <ThemedText style={[styles.emptyText, { color: colors.text }]}>
            No recent songs found
          </ThemedText>
        );
      case "Liked Song":
        const filteredLikedSongs = searchItems(
          likedTracks,
          ["track.name", "track.artists"],
          searchQuery
        );
        return filteredLikedSongs.length > 0 ? (
          filteredLikedSongs.map((item: any, index: number) => {
            const track = item.track;
            const content: SelectedContent = {
              type: "song",
              id: track.id,
              spotifyId: track.spotify_id || track.spotifyId || track.id,
              name: track.name,
              imageUrl: track.album?.imageUrl || null,
              subtitle:
                track.artists?.map((a: any) => a.name).join(", ") ||
                "Unknown Artist",
            };
            return (
              <SelectableItem
                key={`liked-song-${track.id}-${index}`}
                id={track.id}
                title={track.name}
                subtitle={content.subtitle}
                imageUrl={content.imageUrl}
                isSelected={
                  selectedContent?.id === content.id &&
                  selectedContent?.type === "song"
                }
                onSelect={() => handleSelect(content)}
              />
            );
          })
        ) : (
          <ThemedText style={[styles.emptyText, { color: colors.text }]}>
            No liked songs found
          </ThemedText>
        );

      case "Album":
        const filteredAlbums = searchItems(
          likedAlbums,
          ["album.name"],
          searchQuery
        );
        return filteredAlbums.length > 0 ? (
          filteredAlbums.map((item: any, index: number) => {
            const album = item.album;
            const content: SelectedContent = {
              type: "album",
              id: album.id,
              spotifyId: album.id,
              name: album.name,
              imageUrl: album.imageUrl || null,
              subtitle: album.albumType
                ? `${album.albumType} • ${album.totalTracks || 0} tracks`
                : `${album.totalTracks || 0} tracks`,
            };
            return (
              <SelectableItem
                key={`album-${album.id}-${index}`}
                id={album.id}
                title={album.name}
                subtitle={content.subtitle}
                imageUrl={content.imageUrl}
                isSelected={
                  selectedContent?.id === content.id &&
                  selectedContent?.type === "album"
                }
                onSelect={() => handleSelect(content)}
              />
            );
          })
        ) : (
          <ThemedText style={[styles.emptyText, { color: colors.text }]}>
            No liked albums found
          </ThemedText>
        );

      case "Playlist":
        const filteredPlaylists = searchItems(
          userPlaylists,
          ["name"],
          searchQuery
        );
        return filteredPlaylists.length > 0 ? (
          filteredPlaylists.map((playlist: any, index: number) => {
            const content: SelectedContent = {
              type: "playlist",
              id: playlist.id,
              spotifyId: playlist.id,
              name: playlist.name,
              imageUrl: playlist.images?.[0]?.url || null,
              subtitle: `${playlist.tracks?.total || 0} songs`,
            };
            return (
              <SelectableItem
                key={`playlist-${playlist.id}-${index}`}
                id={playlist.id}
                title={playlist.name}
                subtitle={content.subtitle}
                imageUrl={content.imageUrl}
                isSelected={
                  selectedContent?.id === content.id &&
                  selectedContent?.type === "playlist"
                }
                onSelect={() => handleSelect(content)}
              />
            );
          })
        ) : (
          <ThemedText style={[styles.emptyText, { color: colors.text }]}>
            No playlists found
          </ThemedText>
        );

      case "Artist":
        const filteredArtists = searchItems(
          followedArtists,
          ["artist.name"],
          searchQuery
        );
        return filteredArtists.length > 0 ? (
          filteredArtists.map((item: any, index: number) => {
            const artist = item.artist;
            const content: SelectedContent = {
              type: "artist",
              id: artist.id,
              spotifyId: artist.id,
              name: artist.name,
              imageUrl: artist.imageUrl || null,
              subtitle: artist.popularity
                ? `Popularity: ${artist.popularity}`
                : "Artist",
            };
            return (
              <SelectableItem
                key={`artist-${artist.id}-${index}`}
                id={artist.id}
                title={artist.name}
                subtitle={content.subtitle}
                imageUrl={content.imageUrl}
                isSelected={
                  selectedContent?.id === content.id &&
                  selectedContent?.type === "artist"
                }
                onSelect={() => handleSelect(content)}
              />
            );
          })
        ) : (
          <ThemedText style={[styles.emptyText, { color: colors.text }]}>
            No followed artists found
          </ThemedText>
        );

      default:
        return null;
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <ThemedText type="title">Make a Post</ThemedText>
        {/* Continue Button */}
        {selectedContent && (
          <View style={[styles.bottomBar]}>
            <Pressable
              style={[
                styles.continueButton,
                { backgroundColor: colors.primary },
              ]}
              onPress={handleContinue}
            >
              <MaterialIcons name="arrow-forward" size={20} color="white" />
            </Pressable>
          </View>
        )}
      </View>
      
      {/* Search Bar */}
      <SearchBar
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholder={`Search ${activeFilter.toLowerCase()}s...`}
        containerStyle={{
          marginVertical: 12,
          marginHorizontal: 16,
        }}
      />

      {/* Filter Bubbles */}
      <View style={styles.filtersContainer}>
        {filters.map((filter) => (
          <FilterBubble
            key={filter}
            filterName={filter}
            activeFilter={activeFilter}
            setActiveFilter={setActiveFilter}
          />
        ))}
      </View>



      {/* Content List */}
      <ScrollView
        style={styles.listContainer}
        showsVerticalScrollIndicator={false}
      >
        {renderContent()}
        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 16,
    alignSelf: "flex-start",
  },
  filtersContainer: {
    width: "100%",
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 4,
  },

  listContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 60,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  emptyText: {
    textAlign: "center",
    marginTop: 40,
    fontSize: 16,
    opacity: 0.7,
  },
  bottomBar: {
    backgroundColor: "transparent",
  },
  continueButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 4,
    borderRadius: 50,
    gap: 8,
  },
  continueButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },
});
