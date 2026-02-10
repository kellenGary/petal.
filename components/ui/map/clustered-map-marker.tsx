import { ThemedText } from '@/components/ui/themed-text';
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Image } from "expo-image";
import React, { memo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Marker } from "react-native-maps";
import { ClusteredMarker } from "./cluster-markers";

export interface ClusteredMapMarkerProps<T> {
  cluster: ClusteredMarker<T>;
  onPress: (cluster: ClusteredMarker<T>) => void;
  /** Function to extract the image URL from the first item in the cluster */
  getImageUrl: (item: T) => string | undefined | null;
}

/**
 * Memoized marker component for displaying clustered items on a map.
 * Shows album art for the first item and a badge if multiple items are clustered.
 */
function ClusteredMapMarkerComponent<T>({
  cluster,
  onPress,
  getImageUrl,
}: ClusteredMapMarkerProps<T>) {
  const firstItem = cluster.items[0];
  const imageUrl = firstItem ? getImageUrl(firstItem) : undefined;

  return (
    <Marker
      coordinate={{
        latitude: cluster.latitude,
        longitude: cluster.longitude,
      }}
      onPress={() => onPress(cluster)}
      tracksViewChanges={false}
    >
      <View style={styles.markerWrapper}>
        <View style={styles.markerContainer}>
          {imageUrl ? (
            <Image
              source={{ uri: imageUrl }}
              style={styles.markerImage}
              cachePolicy="memory-disk"
            />
          ) : (
            <View style={styles.markerPlaceholder}>
              <MaterialIcons name="music-note" size={24} color="#fff" />
            </View>
          )}
        </View>
        {cluster.count > 1 && (
          <View style={styles.clusterBadge}>
            <ThemedText style={styles.clusterBadgeText}>
              {cluster.count > 99 ? "99+" : cluster.count}
            </ThemedText>
          </View>
        )}
      </View>
    </Marker>
  );
}

// Export as memoized component
export const ClusteredMapMarker = memo(
  ClusteredMapMarkerComponent,
) as typeof ClusteredMapMarkerComponent;

const styles = StyleSheet.create({
  markerWrapper: {
    alignItems: "center",
    justifyContent: "center",
  },
  markerContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: "hidden",
    backgroundColor: "#538ce9",
    borderWidth: 2,
    borderColor: "#fff",
  },
  markerImage: {
    width: "100%",
    height: "100%",
  },
  markerPlaceholder: {
    width: "100%",
    height: "100%",
    backgroundColor: "#538ce9",
    justifyContent: "center",
    alignItems: "center",
  },
  clusterBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: "#ff4444",
    borderRadius: 12,
    minWidth: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  clusterBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "bold",
  },
});
