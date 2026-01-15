import locationService from "@/services/locationService";
import * as Location from "expo-location";
import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { AppState, AppStateStatus } from "react-native";

interface LocationContextType {
  /** Current location coordinates, if available */
  location: { latitude: number; longitude: number } | null;
  /** Whether location permission is granted */
  hasPermission: boolean;
  /** Whether background location is active */
  isBackgroundActive: boolean;
  /** Request location permissions and start tracking */
  requestAndStartTracking: () => Promise<boolean>;
  /** Get fresh current location */
  refreshLocation: () => Promise<void>;
}

const LocationContext = createContext<LocationContextType | undefined>(
  undefined
);

export function LocationProvider({ children }: { children: ReactNode }) {
  const [location, setLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [hasPermission, setHasPermission] = useState(false);
  const [isBackgroundActive, setIsBackgroundActive] = useState(false);

  // Handle location updates from background service
  useEffect(() => {
    locationService.setLocationUpdateCallback(
      (loc: Location.LocationObject) => {
        setLocation({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        });
      }
    );

    return () => {
      locationService.clearLocationUpdateCallback();
    };
  }, []);

  // Check permissions and start tracking on mount
  useEffect(() => {
    const initialize = async () => {
      // Check if we already have background permission
      const hasBgPerm = await locationService.hasBackgroundPermission();
      setHasPermission(hasBgPerm);

      if (hasBgPerm) {
        // Start background tracking automatically if permitted
        const started = await locationService.startBackgroundUpdates();
        setIsBackgroundActive(started);

        // Get initial location
        const coords = await locationService.getCoordinates();
        if (coords) {
          setLocation(coords);
        }
      }
    };

    initialize();
  }, []);

  // Re-check location when app comes to foreground
  useEffect(() => {
    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      if (nextAppState === "active" && hasPermission) {
        const coords = await locationService.getCoordinates();
        if (coords) {
          setLocation(coords);
        }
      }
    };

    const subscription = AppState.addEventListener(
      "change",
      handleAppStateChange
    );

    return () => {
      subscription.remove();
    };
  }, [hasPermission]);

  const requestAndStartTracking = useCallback(async (): Promise<boolean> => {
    try {
      const status = await locationService.requestBackgroundPermission();
      const granted = status === "granted";
      setHasPermission(granted);

      if (granted) {
        const started = await locationService.startBackgroundUpdates();
        setIsBackgroundActive(started);

        // Get initial location
        const coords = await locationService.getCoordinates();
        if (coords) {
          setLocation(coords);
        }

        return started;
      }

      return false;
    } catch (error) {
      console.error("[LocationContext] Failed to start tracking:", error);
      return false;
    }
  }, []);

  const refreshLocation = useCallback(async (): Promise<void> => {
    const coords = await locationService.getCoordinates();
    if (coords) {
      setLocation(coords);
    }
  }, []);

  useEffect(() => {
    async function getCurrentLocation() {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        return;
      }

      let location = await Location.getCurrentPositionAsync({});
      setLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
    }

    getCurrentLocation();
  }, []);

  return (
    <LocationContext.Provider
      value={{
        location,
        hasPermission,
        isBackgroundActive,
        requestAndStartTracking,
        refreshLocation,
      }}
    >
      {children}
    </LocationContext.Provider>
  );
}

export function useLocation() {
  const context = useContext(LocationContext);
  if (context === undefined) {
    throw new Error("useLocation must be used within a LocationProvider");
  }
  return context;
}
