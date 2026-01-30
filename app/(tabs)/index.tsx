import Feed from "@/components/Feed";
import FollowingSotds from "@/components/following-sotds";
import Hero from "@/components/hero";
import SotdSuggestionPopup from "@/components/sotd-suggestion-popup";
import { ThemedText } from '@/components/themed-text';
import { Colors } from "@/constants/theme";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "@/contexts/LocationContext";
import { useColorScheme } from "@/hooks/use-color-scheme";
import useUserContent from "@/hooks/useUserContent";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import MapView from "react-native-maps";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Main exported screen component for the Home / Feed tab.
// Responsibilities:
// - Manage feed pagination, refresh and loading state
// - Render feed items and the header hero
// - Provide lightweight UI glue (navigation, colors)
export default function HomeScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = Colors[isDark ? "dark" : "light"];
  const { user } = useAuth();
  const { location } = useLocation();
  const { sotd, fetchSotd, loading } = useUserContent();
  const [showSotdPopup, setShowSotdPopup] = useState(false);
  const insets = useSafeAreaInsets();

  // Check for SOTD on mount
  useEffect(() => {
    fetchSotd();
  }, []);

  // Show popup if SOTD is not set (and not loading)
  useEffect(() => {
    if (!loading.sotd && sotd === null) {
      // Delay slightly to be less jarring
      const timer = setTimeout(() => {
        setShowSotdPopup(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [loading.sotd, sotd]);

  // Feed is rendered by the `Feed` component; item rendering lives in `FeedItem`.
  const renderHeader = () => (
    <>
      {/* Hero */}
      <View style={styles.headerWrapper}>
        <Hero/>
        <View style={styles.headerContentContainer}>
          {/* Live Listeners Section */}
          {/* <LiveListeners /> */}

          {/* Following Songs of the Day Section */}
          <FollowingSotds />

          {/* Map Section */}
          <Pressable
            style={styles.map}
            onPress={() => router.push("/(tabs)/map")}
          >
            {location ? (
              <MapView
                style={styles.map}
                region={{
                  latitude: location.latitude,
                  longitude: location.longitude,
                  latitudeDelta: 0.01,
                  longitudeDelta: 0.01,
                }}
                showsUserLocation
                scrollEnabled={false}
                zoomEnabled={false}
                rotateEnabled={false}
                pitchEnabled={false}
                showsCompass={false}
                showsPointsOfInterest={false}
                showsBuildings={false}
              />
            ) : (
              <View
                style={[
                  styles.map,
                  {
                    backgroundColor: colors.background,
                    justifyContent: "center",
                    alignItems: "center",
                  },
                ]}
              >
                <ThemedText style={{ color: colors.text }}>Loading location...</ThemedText>
              </View>
            )}
          </Pressable>


        </View>
      </View>

      {/* Feed Header */}
      <View style={styles.feedHeaderContainer}>
        <ThemedText style={[styles.activeHeaderText, { color: colors.text }]}>
          Your Feed
        </ThemedText>
      </View>
    </>
  );

  // renderEmpty: shown when the feed has no items — encourages discovery by following users.

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <Feed ListHeaderComponent={renderHeader()} />

      <SotdSuggestionPopup
        visible={showSotdPopup}
        onDismiss={() => setShowSotdPopup(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  containerGradient: {
    flex: 1,
  },
  flatListContent: {
    paddingBottom: 100,
  },
  headerWrapper: {
    width: "100%",
    gap: 12,
  },
  headerContainer: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerImage: {
    width: 24,
    height: 24,
  },
  headerContentContainer: {
    flexDirection: "column",
    alignItems: "center",
    gap: 12,
  },
  map: {
    height: 240,
    width: "100%",
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  activeHeaderText: {
    fontSize: 16,
    fontWeight: "500",
    color: "black",
  },
  sectionContainer: {
    paddingHorizontal: 16,
    marginTop: 24,
  },
  feedHeaderContainer: {
    marginTop: 24,
  },
});
