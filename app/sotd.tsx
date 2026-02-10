import FilterBubble from "@/components/ui/filter-bubble";
import SelectableItem from "@/components/ui/selectable-item";
import { ThemedText } from '@/components/ui/themed-text';
import { Colors } from "@/constants/theme";
import { useAuth } from "@/contexts/AuthContext";
import { useColorScheme } from "@/hooks/use-color-scheme";
import useUserContent from "@/hooks/useUserContent";
import sotdApi from "@/services/sotdApi";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const PAGE_SIZE = 50;

interface SelectedTrack {
  id: number;
  name: string;
  imageUrl: string | null;
  subtitle: string;
}

export default function SOTDSelectScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = Colors[isDark ? "dark" : "light"];
  const { isAuthenticated } = useAuth();

  const filters = ["Recent Song", "Liked Song"];
  const [activeFilter, setActiveFilter] = useState("Recent Song");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTrack, setSelectedTrack] = useState<SelectedTrack | null>(
    null,
  );
  const [saving, setSaving] = useState(false);

  const {
    recentTracks,
    likedTracks,
    loading,
    fetchRecentTracks,
    fetchLikedTracks,
    searchItems,
  } = useUserContent();

  const isLoading = loading.tracks;

  // Fetch data when filter changes
  useMemo(() => {
    if (!isAuthenticated) return;
    setSelectedTrack(null);
    setSearchQuery("");

    switch (activeFilter) {
      case "Recent Song":
        fetchRecentTracks(PAGE_SIZE, 0);
        break;
      case "Liked Song":
        fetchLikedTracks(PAGE_SIZE, 0);
        break;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFilter, isAuthenticated]);

  const handleSelect = (track: SelectedTrack) => {
    if (selectedTrack?.id === track.id) {
      setSelectedTrack(null);
    } else {
      setSelectedTrack(track);
    }
  };

  const handleConfirm = async () => {
    if (!selectedTrack) return;

    setSaving(true);
    try {
      await sotdApi.setSongOfTheDay(selectedTrack.id);
      router.back();
    } catch (error) {
      console.error("Failed to set SOTD:", error);
    } finally {
      setSaving(false);
    }
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <ThemedText style={[styles.loadingText, { color: colors.text }]}>
            Loading your {activeFilter.toLowerCase()}s...
          </ThemedText>
        </View>
      );
    }

    const tracks = activeFilter === "Recent Song" ? recentTracks : likedTracks;
    const searchFields =
      activeFilter === "Recent Song"
        ? ["track.name", "track.artists"]
        : ["track.name", "track.artists"];

    const filteredTracks = searchItems(tracks, searchFields, searchQuery);

    if (filteredTracks.length === 0) {
      return (
        <ThemedText style={[styles.emptyText, { color: colors.text }]}>
          No {activeFilter.toLowerCase()}s found
        </ThemedText>
      );
    }

    return (
      <>
        {filteredTracks.map((track: any, index: number) => {
          if (!track || !track.id) return null;

          const trackData: SelectedTrack = {
            id: track.id,
            name: track.name,
            imageUrl: track.albumImageUrl || track.album?.image_url || track.album?.imageUrl || null,
            subtitle:
              track.artistNames?.join(", ") ||
              track.artists?.map((a: any) => a.name).join(", ") ||
              "Unknown Artist",
          };

          return (
            <SelectableItem
              key={`track-${track.id}-${index}`}
              id={track.id}
              title={track.name}
              subtitle={trackData.subtitle}
              imageUrl={trackData.imageUrl}
              isSelected={selectedTrack?.id === track.id}
              onSelect={() => handleSelect(trackData)}
            />
          );
        })}
      </>
    );
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      stickyHeaderIndices={[0]}
      showsVerticalScrollIndicator={false}
    >
      <View
        style={[styles.headerContainer, { backgroundColor: colors.background }]}
      >
        <View style={styles.header}>
          <ThemedText style={[styles.title, { color: colors.text }]}>
            Song of the Day
          </ThemedText>
          {selectedTrack && (
            <Pressable
              style={[
                styles.confirmButton,
                { backgroundColor: Colors.primary },
                saving && styles.confirmButtonDisabled,
              ]}
              onPress={handleConfirm}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <MaterialIcons name="check" size={20} color="white" />
              )}
            </Pressable>
          )}
          {!selectedTrack && <View style={styles.placeholder} />}
        </View>

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

        {/* Search Bar */}
        <View
          style={[styles.searchContainer, { backgroundColor: colors.card }]}
        >
          <MaterialIcons name="search" size={20} color={colors.icon} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder={`Search ${activeFilter.toLowerCase()}s...`}
            placeholderTextColor={colors.icon}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery("")}>
              <MaterialIcons name="close" size={20} color={colors.icon} />
            </Pressable>
          )}
        </View>
      </View>

      {/* Content List */}
      {renderContent()}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  headerContainer: {
    paddingTop: 32,
    paddingBottom: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
  },
  confirmButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmButtonDisabled: {
    opacity: 0.6,
  },
  placeholder: {
    width: 36,
  },
  filtersContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 10,
    marginHorizontal: 10,
    gap: 8,
  },
  searchInput: {
    fontSize: 16,
  },
  listContainer: {},
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
});
