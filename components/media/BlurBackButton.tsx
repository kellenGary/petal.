import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import Entypo from "@expo/vector-icons/Entypo";
import { BlurView } from "expo-blur";
import { router } from "expo-router";
import { Pressable, StyleSheet } from "react-native";

interface BlurBackButtonProps {
  /** Custom navigation handler (defaults to router.back) */
  onPress?: () => void;
  /** Position style override */
  style?: object;
}

/**
 * Floating back button with blur effect.
 * Used in album, playlist, and song screens.
 */
export default function BlurBackButton({
  onPress,
  style,
}: BlurBackButtonProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = Colors[isDark ? "dark" : "light"];

  return (
    <Pressable
      onPress={onPress || (() => router.back())}
      style={({ pressed }) => [
        styles.button,
        style,
        { opacity: pressed ? 0.7 : 1 },
      ]}
    >
      <BlurView
        intensity={80}
        tint={isDark ? "dark" : "light"}
        style={styles.blurView}
      >
        <Entypo name="chevron-left" size={24} color={colors.text} />
      </BlurView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    position: "absolute",
    top: 50,
    left: 16,
    zIndex: 10,
  },
  blurView: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
  },
});
