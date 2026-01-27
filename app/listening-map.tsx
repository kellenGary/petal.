import { ThemedText } from '@/components/themed-text';
import {
  ClusteredMapMarker,
  ClusteredMarker,
  clusterMarkers,
} from "@/components/map";
import { Colors, Fonts } from "@/constants/theme";
import { useAuth } from "@/contexts/AuthContext";
import { useColorScheme } from "@/hooks/use-color-scheme";
import listeningHistoryApi, {
  LocationHistoryEntry,
} from "@/services/listeningHistoryApi";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import * as Location from "expo-location";
import { router } from "expo-router";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import MapView, { Region } from "react-native-maps";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Helper to get image URL from a history entry
const getImageUrl = (item: LocationHistoryEntry) => item.track.album?.image_url;

export default function ListeningMapScreen() {
  const insets = useSafeAreaInsets();
  const { isAuthenticated } = useAuth();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = Colors[isDark ? "dark" : "light"];
  const mapRef = useRef<MapView>(null);

  const [locationError, setLocationError] = useState<string | null>(null);
  const [historyItems, setHistoryItems] = useState<LocationHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCluster, setSelectedCluster] =
    useState<ClusteredMarker<LocationHistoryEntry> | null>(null);
  const [region, setRegion] = useState<Region | null>(null);

  // Get user's current location for initial map center
  useEffect(() => {
    async function getCurrentLocation() {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          setLocationError("Permission to access location was denied");
          return;
        }

        const location = await Location.getCurrentPositionAsync({});
        setRegion({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        });
      } catch (error) {
        console.error("Failed to get location:", error);
      }
    }

    getCurrentLocation();
  }, []);

  // Fetch listening history with location data
  useEffect(() => {
    async function fetchLocationHistory() {
      if (!isAuthenticated) return;

      setLoading(true);
      try {
        const data = await listeningHistoryApi.getListeningHistoryWithLocation(
          200, // Reduced limit for better performance
          0,
        );
        setHistoryItems(data.items);

        // If we have history items but no user location, center on first item
        if (data.items.length > 0 && !region) {
          setRegion({
            latitude: data.items[0].latitude,
            longitude: data.items[0].longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          });
        }
      } catch (error) {
        console.error("Failed to fetch location history:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchLocationHistory();
  }, [isAuthenticated]);

  // Memoize clustered markers based on region zoom level
  const clusteredMarkers = useMemo(() => {
    if (!region) return [];
    // Adjust cluster radius based on zoom level
    const clusterRadius = Math.max(region.latitudeDelta * 0.03, 0.0005);
    return clusterMarkers(historyItems, region, clusterRadius);
  }, [historyItems, region?.latitudeDelta]);

  const handleMarkerPress = useCallback(
    (cluster: ClusteredMarker<LocationHistoryEntry>) => {
      setSelectedCluster(cluster);
    },
    [],
  );

  const handleRegionChange = useCallback((newRegion: Region) => {
    setRegion(newRegion);
  }, []);

  const formatDate = useCallback((dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }, []);

  if (loading && !region) {
    return (
      <View
        style={[
          styles.container,
          styles.loadingContainer,
          { backgroundColor: colors.background },
        ]}
      >
        <ActivityIndicator size="large" color={colors.tint} />
        <ThemedText style={[styles.loadingText, { color: colors.text }]}>
          Loading your listening map...
        </ThemedText>
      </View>
    );
  }

  if (locationError && historyItems.length === 0) {
    return (
      <View
        style={[
          styles.container,
          styles.errorContainer,
          { backgroundColor: colors.background, paddingTop: insets.top },
        ]}
      >
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color={colors.icon} />
        </Pressable>
        <ThemedText style={[styles.errorText, { color: colors.text }]}>
          {locationError}
        </ThemedText>
        <ThemedText style={[styles.errorSubtext, { color: colors.text }]}>
          Enable location permissions to see your listening map
        </ThemedText>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <LinearGradient
        colors={["rgba(0,0,0,0.4)", "rgba(0,0,0,0.2)", "transparent"]}
        style={[styles.header, { paddingTop: insets.top + 8 }]}
      >
        <Pressable
          style={[styles.backButton, { backgroundColor: "colors.icon" }]}
          onPress={() => router.back()}
        >
          <MaterialIcons name="arrow-back" size={24} color="#fff" />
        </Pressable>
        <ThemedText style={styles.headerTitle}>Listening Map</ThemedText>
        <View style={styles.headerSpacer} />
      </LinearGradient>

      {/* Map */}
      {region && (
        <MapView
          ref={mapRef}
          style={styles.map}
          initialRegion={region}
          onRegionChangeComplete={handleRegionChange}
          showsPointsOfInterest={false}
          showsBuildings={false}
          userInterfaceStyle={isDark ? "dark" : "light"}
          moveOnMarkerPress={false}
          {...(Platform.OS === "ios" ? { loadingEnabled: true } : {})}
        >
          {clusteredMarkers.map((cluster) => (
            <ClusteredMapMarker
              key={cluster.id}
              cluster={cluster}
              onPress={handleMarkerPress}
              getImageUrl={getImageUrl}
            />
          ))}
        </MapView>
      )}

      {/* Selected marker modal */}
      <Modal
        visible={selectedCluster !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedCluster(null)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setSelectedCluster(null)}
        >
          <View
            style={[
              styles.modalContent,
              {
                backgroundColor: colors.card,
                paddingBottom: insets.bottom + 16,
                maxHeight: "70%",
              },
            ]}
            onStartShouldSetResponder={() => true}
          >
            <View style={styles.modalHandle} />
            {selectedCluster && (
              <>
                <ThemedText style={[styles.clusterInfo, { color: colors.text }]}>
                  {selectedCluster.count === 1
                    ? "1 song at this location"
                    : `${selectedCluster.count} songs at this location`}
                </ThemedText>
                <FlatList
                  data={selectedCluster.items}
                  keyExtractor={(item) => `${item.id}-${item.played_at}`}
                  showsVerticalScrollIndicator={true}
                  style={styles.trackList}
                  contentContainerStyle={styles.trackListContent}
                  renderItem={({ item }) => (
                    <Pressable
                      style={styles.trackListItem}
                      onPress={() => {
                        setSelectedCluster(null);
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
                          style={[
                            styles.trackListImage,
                            styles.trackImagePlaceholder,
                          ]}
                        >
                          <MaterialIcons
                            name="music-note"
                            size={24}
                            color="#fff"
                          />
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
                          style={[
                            styles.trackListArtist,
                            { color: colors.text },
                          ]}
                          numberOfLines={1}
                        >
                          {item.track.artists.map((a) => a.name).join(", ")}
                        </ThemedText>
                        <ThemedText
                          style={[styles.trackListDate, { color: colors.text }]}
                        >
                          {formatDate(item.played_at)}
                        </ThemedText>
                      </View>
                      <MaterialIcons
                        name="chevron-right"
                        size={24}
                        color={colors.icon}
                      />
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
              </>
            )}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
  },
  errorContainer: {
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  errorText: {
    fontSize: 18,
    fontWeight: "600",
  },
  errorSubtext: {
    fontSize: 14,
    opacity: 0.7,
    textAlign: "center",
    paddingHorizontal: 32,
  },
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    fontFamily: Fonts.rounded,
    color: "#fff",
  },
  headerSpacer: {
    width: 40,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  map: {
    flex: 1,
  },
  statsOverlay: {
    position: "absolute",
    left: 16,
    right: 16,
  },
  statsCard: {
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  statsNumber: {
    fontSize: 24,
    fontWeight: "bold",
    fontFamily: Fonts.rounded,
  },
  statsLabel: {
    fontSize: 12,
    opacity: 0.7,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: "rgba(128,128,128,0.4)",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 20,
  },
  clusterInfo: {
    fontSize: 14,
    fontWeight: "600",
    opacity: 0.7,
    marginBottom: 12,
    textAlign: "center",
  },
  trackInfo: {
    flexDirection: "row",
    gap: 16,
  },
  trackImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  trackImagePlaceholder: {
    backgroundColor: "#538ce9",
    justifyContent: "center",
    alignItems: "center",
  },
  trackDetails: {
    flex: 1,
    justifyContent: "center",
    gap: 4,
  },
  trackName: {
    fontSize: 18,
    fontWeight: "600",
    fontFamily: Fonts.rounded,
  },
  trackArtist: {
    fontSize: 14,
    opacity: 0.8,
  },
  trackDate: {
    fontSize: 12,
    opacity: 0.6,
    marginTop: 4,
  },
  viewTrackButton: {
    marginTop: 20,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  viewTrackButtonText: {
    color: "#000",
    fontSize: 16,
    fontWeight: "600",
  },
  trackList: {
    maxHeight: 400,
  },
  trackListContent: {
    paddingBottom: 8,
  },
  trackListItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    gap: 12,
  },
  trackListImage: {
    width: 56,
    height: 56,
    borderRadius: 6,
  },
  trackListDetails: {
    flex: 1,
    gap: 2,
  },
  trackListName: {
    fontSize: 15,
    fontWeight: "600",
    fontFamily: Fonts.rounded,
  },
  trackListArtist: {
    fontSize: 13,
    opacity: 0.7,
  },
  trackListDate: {
    fontSize: 11,
    opacity: 0.5,
  },
  trackListSeparator: {
    height: 1,
    opacity: 0.15,
  },
});
