import CustomTabBar from "@/components/ui/custom-tab-bar";
import MiniPlayer from "@/components/ui/mini-player";
import { Tabs } from "expo-router";
import { StyleSheet, View } from "react-native";

export default function TabLayout() {
  return (
    <View style={styles.container}>
      <Tabs
        screenOptions={{
          headerShown: false,
        }}
        tabBar={(props) => <CustomTabBar {...props} />}
      >
        <Tabs.Screen name="index" />
        <Tabs.Screen name="map" />
        <Tabs.Screen name="post" />
        <Tabs.Screen name="explore" />
        <Tabs.Screen name="profile" />
      </Tabs>
      <View style={styles.miniPlayerWrapper} pointerEvents="box-none">
        <MiniPlayer />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    zIndex: 10,
  },
  miniPlayerWrapper: {
    position: "absolute",
    bottom: 80, // Tab bar height - positions mini-player directly on top
    left: 0,
    right: 0,
    zIndex: 20,
  },
});
