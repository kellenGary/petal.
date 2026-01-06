import { Icon, Label, NativeTabs } from "expo-router/unstable-native-tabs";
import { DynamicColorIOS } from "react-native";

export default function TabLayout() {
  return (
    <NativeTabs
      labelStyle={{
        // For the text color
        color: DynamicColorIOS({
          dark: "white",
          light: "black",
        }),
      }}
      // For the selected icon color
      tintColor={DynamicColorIOS({
        dark: "white",
        light: "black",
      })}
    >
      <NativeTabs.Trigger name="index">
        <Label hidden />
        <Icon sf="house.fill" drawable="custom_android_drawable" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="map">
        <Label hidden />
        <Icon sf="map.fill" drawable="custom_settings_drawable" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="explore">
        <Label hidden />
        <Icon sf="magnifyingglass.circle.fill" drawable="custom_settings_drawable"/>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="profile">
        <Label hidden />
        <Icon sf="person.fill" drawable="custom_settings_drawable" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
