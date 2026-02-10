import { Region } from "react-native-maps";

/**
 * Represents a cluster of nearby map markers
 */
export interface ClusteredMarker<T> {
  id: string;
  latitude: number;
  longitude: number;
  count: number;
  items: T[];
}

/**
 * Interface for items that can be clustered on a map
 */
export interface ClusterableItem {
  id: number;
  latitude: number;
  longitude: number;
}

/**
 * Clusters nearby markers to reduce render count and improve map performance.
 * Adjusts clustering based on zoom level.
 *
 * @param items - Array of items with latitude/longitude to cluster
 * @param region - Current map region (for zoom level calculation)
 * @param clusterRadius - Minimum distance for items to be grouped (default: 0.002)
 * @returns Array of clustered markers
 */
export function clusterMarkers<T extends ClusterableItem>(
  items: T[],
  region: Region | null,
  clusterRadius: number = 0.002,
): ClusteredMarker<T>[] {
  if (!region || items.length === 0) return [];

  const clusters: ClusteredMarker<T>[] = [];
  const processed = new Set<number>();

  // Limit items based on zoom level for performance
  const zoomLevel = Math.log2(360 / region.latitudeDelta);
  const maxItems = zoomLevel > 14 ? 500 : zoomLevel > 12 ? 300 : 200;
  const limitedItems = items.slice(0, maxItems);

  for (const item of limitedItems) {
    if (processed.has(item.id)) continue;

    // Find nearby items to cluster
    const nearby = limitedItems.filter((other) => {
      if (processed.has(other.id)) return false;
      const latDiff = Math.abs(item.latitude - other.latitude);
      const lngDiff = Math.abs(item.longitude - other.longitude);
      return latDiff < clusterRadius && lngDiff < clusterRadius;
    });

    nearby.forEach((n) => processed.add(n.id));

    // Calculate cluster center
    const avgLat =
      nearby.reduce((sum, n) => sum + n.latitude, 0) / nearby.length;
    const avgLng =
      nearby.reduce((sum, n) => sum + n.longitude, 0) / nearby.length;

    clusters.push({
      id: `cluster-${item.id}`,
      latitude: avgLat,
      longitude: avgLng,
      count: nearby.length,
      items: nearby,
    });
  }

  return clusters;
}

/**
 * Calculates an appropriate cluster radius based on map zoom level
 * @param region - Current map region
 * @returns Calculated cluster radius
 */
export function getClusterRadius(region: Region): number {
  return Math.max(region.latitudeDelta * 0.03, 0.0005);
}
