import { ThemedText } from '@/components/ui/themed-text';
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Pressable, StyleSheet } from "react-native";

export default function FilterBubble({
  filterName,
  activeFilter,
  setActiveFilter,
}: {
  filterName: string;
  activeFilter: string;
  setActiveFilter: (filter: string) => void;
}) {
  const isActive = filterName === activeFilter;
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = Colors[isDark ? "dark" : "light"];

  return (
    <Pressable
      onPress={() => setActiveFilter(filterName)}
      style={({ pressed }) => [
        styles.button,
        isActive ? styles.buttonActive : { backgroundColor: colors.card },
        pressed && styles.pressed,
      ]}
      accessibilityRole="button"
      accessibilityState={{ selected: isActive }}
    >
      <ThemedText
        style={[
          styles.text,
          isActive ? styles.textActive : { color: isDark ? Colors.dark.text : Colors.light.text },
        ]}
      >
        {filterName}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 8,
    marginRight: 8
  },
  buttonActive: {
    backgroundColor: "#007AFF",
    borderColor: "#007AFF",
  },
  pressed: {
    opacity: 0.85,
  },
  text: {
    fontSize: 14,
  },
  textActive: {
    color: "white",
  },
  textInactive: {
    color: "black",
  },
});
