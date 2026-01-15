// Home / Feed screen for the app's main tab.
// - Displays a map hero, a "listening now" horizontal strip, and the user's feed.
// - Fetches feed items from `feedApi` and renders each post card.
// This file is written as a functional React component using hooks and React Native UI primitives.
import Feed from "@/components/Feed";
import { Colors } from "@/constants/theme";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "@/contexts/LocationContext";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
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
  const { isAuthenticated, user } = useAuth();
  const { location } = useLocation();

  // Feed is rendered by the `Feed` component; item rendering lives in `FeedItem`.

  const renderHeader = () => (
    <>
      {/* Hero */}
      <View style={styles.headerGradient}>
        {/* Hero Header */}
        <View style={styles.headerContainer}>
          <Image
            source={
              !isDark
                ? require("../../assets/images/black-icon.png")
                : require("../../assets/images/icon.png")
            }
            style={styles.headerImage}
          />
          <Text style={[styles.headerText, { color: colors.text }]}>
            Welcome {user?.displayName}
          </Text>
        </View>

        <View style={styles.headerContentContainer}>
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
                showsMyLocationButton
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
                <Text style={{ color: colors.text }}>Loading location...</Text>
              </View>
            )}
          </Pressable>

          {/* Live Listeners Section */}
          {/* <LiveListeners /> */}
        </View>
      </View>

      {/* Feed Header */}
      <View style={styles.feedHeaderContainer}>
        <Text style={[styles.activeHeaderText, { color: colors.text }]}>
          Your Feed
        </Text>
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
  headerGradient: {
    width: "100%",
    gap: 32,
  },
  headerContainer: {
    width: "100%",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 32,
  },
  headerImage: {
    width: 96,
    height: 96,
  },
  headerText: {
    fontSize: 24,
    fontWeight: "600",
    color: "black",
  },
  headerContentContainer: {
    flexDirection: "column",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
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
    marginBottom: 12,
  },
  sectionContainer: {
    paddingHorizontal: 16,
    marginTop: 24,
  },
  feedHeaderContainer: {
    paddingHorizontal: 16,
    marginTop: 24,
  },
});
