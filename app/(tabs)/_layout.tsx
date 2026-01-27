import MiniPlayer from "@/components/mini-player";
import { Icon, Label, NativeTabs } from "expo-router/unstable-native-tabs";
import { DynamicColorIOS, StyleSheet, View } from "react-native";

export default function TabLayout() {
  return (
    <View style={styles.container}>
      <NativeTabs
        labelStyle={{
          color: DynamicColorIOS({
            dark: "white",
            light: "black",
          }),
        }}
        tintColor={DynamicColorIOS({
          dark: "white",
          light: "black",
        })}
      >
        <NativeTabs.Trigger name="index">
          <Label hidden />
          <Icon
            sf={{ default: "house", selected: "house.fill" }}
            drawable="custom_android_drawable"
          />
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="map">
          <Label hidden />
          <Icon
            sf={{ default: "map", selected: "map.fill" }}
            drawable="custom_settings_drawable"
          />
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="post">
          <Label hidden />
          <Icon
            sf={{ default: "plus.circle", selected: "plus.circle.fill" }}
            drawable="custom_settings_drawable"
          />
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="explore">
          <Label hidden />
          <Icon
            sf={{
              default: "magnifyingglass.circle",
              selected: "magnifyingglass.circle.fill",
            }}
            drawable="custom_settings_drawable"
          />
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="profile">
          <Label hidden />
          <Icon
            sf={{ default: "person", selected: "person.fill" }}
            drawable="custom_settings_drawable"
          />
        </NativeTabs.Trigger>
      </NativeTabs>
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
    bottom: 49 + 8 + 36, // Tab bar height (49) + padding (8) + spacing (36)
    left: 0,
    right: 0,
    zIndex: 20,
  },
});
