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
  GlobalLocationHistoryEntry,
} from "@/services/listeningHistoryApi";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Image } from "expo-image";
import * as Location from "expo-location";
import { router } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import MapView, { Region } from "react-native-maps";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Helper to get image URL from a history entry
const getImageUrl = (item: GlobalLocationHistoryEntry) =>
  item.track.album?.image_url;

export default function MapScreen() {
  const insets = useSafeAreaInsets();
  const { isAuthenticated } = useAuth();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = Colors[isDark ? "dark" : "light"];

  const [locationError, setLocationError] = useState<string | null>(null);
  const [region, setRegion] = useState<Region | null>(null);
  const [loading, setLoading] = useState(true);
  const [historyItems, setHistoryItems] = useState<
    GlobalLocationHistoryEntry[]
  >([]);
  const [selectedCluster, setSelectedCluster] =
    useState<ClusteredMarker<GlobalLocationHistoryEntry> | null>(null);

  // Get user's current location for initial map center
  useEffect(() => {
    async function getCurrentLocation() {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          setLocationError("Permission to access location was denied");
          setLoading(false);
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
        setLocationError("Could not get your location");
      } finally {
        setLoading(false);
      }
    }

    getCurrentLocation();
  }, []);

  // Fetch listening history with location data
  useEffect(() => {
    async function fetchLocationHistory() {
      if (!isAuthenticated) return;

      try {
        const data =
          await listeningHistoryApi.getAllListeningHistoryWithLocation(500, 0);
        setHistoryItems(data.items);

        // If we have history items but no user location, center on first item
        if (data.items.length > 0 && !region) {
          setRegion({
            latitude: data.items[0].latitude,
            longitude: data.items[0].longitude,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          });
        }
      } catch (error) {
        console.error("Failed to fetch location history:", error);
      }
    }

    fetchLocationHistory();
  }, [isAuthenticated]);

  // Memoize clustered markers based on region zoom level
  const clusteredMarkers = useMemo(() => {
    if (!region) return [];
    // Adjust cluster radius based on zoom level - smaller radius when zoomed in
    const clusterRadius = Math.max(region.latitudeDelta * 0.03, 0.0005);
    return clusterMarkers(historyItems, region, clusterRadius);
  }, [historyItems, region?.latitudeDelta]);

  const handleMarkerPress = useCallback(
    (cluster: ClusteredMarker<GlobalLocationHistoryEntry>) => {
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
          styles.centerContent,
          { backgroundColor: colors.background },
        ]}
      >
        <ActivityIndicator size="large" color={colors.tint} />
        <ThemedText style={[styles.loadingText, { color: colors.text }]}>
          Loading map...
        </ThemedText>
      </View>
    );
  }

  if (locationError && historyItems.length === 0) {
    return (
      <View
        style={[
          styles.container,
          styles.centerContent,
          { backgroundColor: colors.background, paddingTop: insets.top },
        ]}
      >
        <ThemedText style={[styles.errorText, { color: colors.text }]}>
          {locationError}
        </ThemedText>
        <ThemedText style={[styles.errorSubtext, { color: colors.text }]}>
          Enable location permissions to use the map
        </ThemedText>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {region && (
        <MapView
          style={styles.map}
          initialRegion={region}
          onRegionChangeComplete={handleRegionChange}
          showsUserLocation
          showsMyLocationButton
          showsPointsOfInterest={false}
          showsBuildings={false}
          userInterfaceStyle={isDark ? "dark" : "light"}
          moveOnMarkerPress={false}
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
  centerContent: {
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
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
  map: {
    flex: 1,
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
  trackImagePlaceholder: {
    backgroundColor: "#538ce9",
    justifyContent: "center",
    alignItems: "center",
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
