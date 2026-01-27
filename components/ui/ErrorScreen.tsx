import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

interface ErrorScreenProps {
  /** Icon name from Ionicons (default: "alert-circle-outline") */
  icon?: keyof typeof Ionicons.glyphMap;
  /** Main error message to display */
  message: string;
  /** Optional secondary message */
  subMessage?: string;
  /** Custom back button handler (defaults to router.back) */
  onBack?: () => void;
}

/**
 * Full-screen error state with icon, message, and back button.
 * Automatically adapts to light/dark theme.
 */
export default function ErrorScreen({
  icon = "alert-circle-outline",
  message,
  subMessage,
  onBack,
}: ErrorScreenProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = Colors[isDark ? "dark" : "light"];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Ionicons name={icon} size={64} color={colors.icon} />
      <Text style={[styles.message, { color: colors.text }]}>{message}</Text>
      {subMessage && (
        <Text style={[styles.subMessage, { color: colors.text }]}>
          {subMessage}
        </Text>
      )}
      <Pressable
        style={[styles.backButton, { backgroundColor: colors.primary }]}
        onPress={onBack || (() => router.back())}
      >
        <Text style={styles.backButtonText}>Go Back</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
    padding: 24,
  },
  message: {
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
  },
  subMessage: {
    fontSize: 14,
    opacity: 0.7,
    textAlign: "center",
    paddingHorizontal: 16,
  },
  backButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    marginTop: 8,
  },
  backButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 15,
  },
});
