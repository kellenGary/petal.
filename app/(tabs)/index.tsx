import Feed from "@/components/Feed";
import LiveListeners from '@/components/live-listeners';
import SotdSuggestionPopup from "@/components/sotd-suggestion-popup";
import { ThemedText } from '@/components/themed-text';
import { Colors } from "@/constants/theme";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "@/contexts/LocationContext";
import { useColorScheme } from "@/hooks/use-color-scheme";
import useUserContent from "@/hooks/useUserContent";
import { MaterialIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import MapView from "react-native-maps";

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
        <Pressable
          style={styles.notificationButton}
          onPress={() => router.push("/notifications")}
        >
          <MaterialIcons
            name="notifications-none"
            size={24}
            color={colors.text}
          />
        </Pressable>
        {/* Hero Header */}
        <View style={styles.headerContainer}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <ThemedText type='subtitle'>
              petal.
            </ThemedText>
            <Image
              source={require("../../assets/images/Frame 2.svg")}
              style={styles.headerImage}
            />
          </View>
          <ThemedText>
            Welcome {user?.displayName}
          </ThemedText>
        </View>

        <View style={styles.headerContentContainer}>
          {/* Live Listeners Section */}
          <LiveListeners />

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
    <View style={styles.container}>
      <LinearGradient
        colors={colors.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.containerGradient}
      >
        <Feed ListHeaderComponent={renderHeader()} />
      </LinearGradient>

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
  notificationButton: {
    position: "absolute",
    top: 4,
    right: 0,
    zIndex: 1,
  },
  headerContainer: {
    width: "100%",
    flexDirection: "column",
    paddingTop: 32,
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
