import { ThemedText } from '@/components/themed-text';
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Text, View, StyleSheet } from "react-native";

export default function NotificationsScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = Colors[isDark ? "dark" : "light"];
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ThemedText style={[styles.text, { color: colors.text }]}>Notifications</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 32,
  },
  text: {
    fontSize: 24,
    fontWeight: "600",
  },
});