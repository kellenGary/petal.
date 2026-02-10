import {
  ClusteredMapMarker,
  ClusteredMarker,
  clusterMarkers,
} from "@/components/ui/map";
import { ThemedText } from '@/components/ui/themed-text';
import { Colors } from "@/constants/theme";
import { useAuth } from "@/contexts/AuthContext";
import { useColorScheme } from "@/hooks/use-color-scheme";
import listeningHistoryApi, {
  GlobalLocationHistoryEntry,
} from "@/services/listeningHistoryApi";
import * as Location from "expo-location";
import { router } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  View
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

  const mapRef = React.useRef<MapView>(null);
  const handleMarkerPress = useCallback(
    (cluster: ClusteredMarker<GlobalLocationHistoryEntry>) => {
      setSelectedCluster(cluster);

      // Animate to the cluster location with a close-up zoom
      mapRef.current?.animateToRegion({
        latitude: cluster.latitude,
        longitude: cluster.longitude,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      }, 500); // 500ms animation duration

      // Navigate to location history sheet
      router.push({
        pathname: "/location-history",
        params: {
          items: JSON.stringify(cluster.items),
          count: cluster.count.toString(),
        },
      } as any);
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
          ref={mapRef}
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
});
