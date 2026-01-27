import { ThemedText } from '@/components/themed-text';
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

interface LoadingScreenProps {
  /** Optional message to display below the spinner */
  message?: string;
}

/**
 * Full-screen centered loading indicator with optional message.
 * Automatically adapts to light/dark theme.
 */
export default function LoadingScreen({ message }: LoadingScreenProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = Colors[isDark ? "dark" : "light"];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <ActivityIndicator size="large" color={colors.primary} />
        {message && (
          <ThemedText style={[styles.message, { color: colors.text }]}>
            {message}
          </ThemedText>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    alignItems: "center",
    gap: 16,
  },
  message: {
    fontSize: 16,
    fontWeight: "500",
    opacity: 0.8,
  },
});
