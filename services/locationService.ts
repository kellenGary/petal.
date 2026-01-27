import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";
import { Platform } from "react-native";

// Background task name for location tracking
const BACKGROUND_LOCATION_TASK = "background-location-task";

// Store latest location in memory for quick access
let cachedLocation: Location.LocationObject | null = null;

// Callback for location updates (set by LocationContext)
let locationUpdateCallback:
  | ((location: Location.LocationObject) => void)
  | null = null;

/**
 * Define the background task that receives location updates.
 * This must be called at the top level (outside of components).
 */
TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
  if (error) {
    console.error("[LocationService] Background location error:", error);
    return;
  }

  if (data) {
    const { locations } = data as { locations: Location.LocationObject[] };
    if (locations && locations.length > 0) {
      const latestLocation = locations[locations.length - 1];
      cachedLocation = latestLocation;

      // Notify listeners
      if (locationUpdateCallback) {
        locationUpdateCallback(latestLocation);
      }

      console.log("[LocationService] Background location update:", {
        latitude: latestLocation.coords.latitude,
        longitude: latestLocation.coords.longitude,
      });
    }
  }
});

class LocationService {
  private isStarted = false;

  /**
   * Register a callback for location updates
   */
  setLocationUpdateCallback(
    callback: (location: Location.LocationObject) => void,
  ) {
    locationUpdateCallback = callback;
  }

  /**
   * Clear the location update callback
   */
  clearLocationUpdateCallback() {
    locationUpdateCallback = null;
  }

  /**
   * Get the cached location (most recent background update)
   */
  getCachedLocation(): Location.LocationObject | null {
    return cachedLocation;
  }

  /**
   * Request "always" location permission for background tracking.
   * Returns the permission status.
   */
  async requestBackgroundPermission(): Promise<Location.PermissionStatus> {
    // First request foreground permission
    const { status: foregroundStatus } =
      await Location.requestForegroundPermissionsAsync();

    if (foregroundStatus !== "granted") {
      console.warn("[LocationService] Foreground permission denied");
      return foregroundStatus;
    }

    // Then request background permission (required for "always" access)
    const { status: backgroundStatus } =
      await Location.requestBackgroundPermissionsAsync();

    if (backgroundStatus !== "granted") {
      console.warn("[LocationService] Background permission denied");
    }

    return backgroundStatus;
  }

  /**
   * Check if background location permission is granted
   */
  async hasBackgroundPermission(): Promise<boolean> {
    const { status } = await Location.getBackgroundPermissionsAsync();
    return status === "granted";
  }

  /**
   * Start background location updates.
   * Requires background location permission.
   */
  async startBackgroundUpdates(): Promise<boolean> {
    if (this.isStarted) {
      console.log("[LocationService] Background updates already started");
      return true;
    }

    try {
      // Check if already tracking
      const isTaskDefined = TaskManager.isTaskDefined(BACKGROUND_LOCATION_TASK);
      if (!isTaskDefined) {
        console.error("[LocationService] Background task not defined");
        return false;
      }

      const hasPermission = await this.hasBackgroundPermission();
      if (!hasPermission) {
        console.warn(
          "[LocationService] No background permission, requesting...",
        );
        const status = await this.requestBackgroundPermission();
        if (status !== "granted") {
          return false;
        }
      }

      // Check if already running
      const isRegistered = await Location.hasStartedLocationUpdatesAsync(
        BACKGROUND_LOCATION_TASK,
      );
      if (isRegistered) {
        console.log("[LocationService] Background updates already running");
        this.isStarted = true;
        return true;
      }

      // Start background location updates
      await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 60000, // Update every 60 seconds (minimum for iOS)
        distanceInterval: 100, // Or when user moves 100 meters
        deferredUpdatesInterval: 60000,
        showsBackgroundLocationIndicator: true, // iOS: show blue bar
        foregroundService: {
          notificationTitle: "Petal is tracking your listening location",
          notificationBody:
            "Your listening history will be saved with location data",
          notificationColor: "#FF5A5F",
        },
        pausesUpdatesAutomatically: false,
        activityType:
          Platform.OS === "ios" ? Location.ActivityType.Other : undefined,
      });

      this.isStarted = true;
      console.log("[LocationService] Started background location updates");
      return true;
    } catch (error) {
      console.error(
        "[LocationService] Failed to start background updates:",
        error,
      );
      return false;
    }
  }

  /**
   * Stop background location updates.
   */
  async stopBackgroundUpdates(): Promise<void> {
    try {
      const isRegistered = await Location.hasStartedLocationUpdatesAsync(
        BACKGROUND_LOCATION_TASK,
      );
      if (isRegistered) {
        await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
        console.log("[LocationService] Stopped background location updates");
      }
      this.isStarted = false;
    } catch (error) {
      console.error(
        "[LocationService] Failed to stop background updates:",
        error,
      );
    }
  }

  /**
   * Get current location (one-time, foreground only).
   * Use getCachedLocation() for background location.
   */
  async getCurrentLocation(): Promise<Location.LocationObject | null> {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status !== "granted") {
        console.warn(
          "[LocationService] No foreground permission for current location",
        );
        return cachedLocation;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      cachedLocation = location;
      return location;
    } catch (error) {
      console.error("[LocationService] Failed to get current location:", error);
      return cachedLocation;
    }
  }

  /**
   * Get current coordinates as a simple object.
   * Returns null if no location is available.
   */
  async getCoordinates(): Promise<{
    latitude: number;
    longitude: number;
  } | null> {
    // First try cached location
    if (cachedLocation) {
      return {
        latitude: cachedLocation.coords.latitude,
        longitude: cachedLocation.coords.longitude,
      };
    }

    // Fall back to getting current location
    const location = await this.getCurrentLocation();
    if (location) {
      return {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };
    }

    return null;
  }
}

export default new LocationService();
