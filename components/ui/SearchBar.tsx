import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { StyleSheet, TextInput, View } from "react-native";

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  onClear?: () => void;
}

/**
 * Reusable search bar component with clear button.
 * Automatically adapts to light/dark theme.
 */
export default function SearchBar({
  value,
  onChangeText,
  placeholder = "Search...",
  onClear,
}: SearchBarProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = Colors[isDark ? "dark" : "light"];

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: isDark
            ? "rgba(255,255,255,0.1)"
            : "rgba(0,0,0,0.05)",
        },
      ]}
    >
      <MaterialIcons name="search" size={22} color={colors.tabIconDefault} />
      <TextInput
        style={[styles.input, { color: colors.text }]}
        placeholder={placeholder}
        placeholderTextColor={colors.tabIconDefault}
        value={value}
        onChangeText={onChangeText}
        autoCapitalize="none"
        autoCorrect={false}
      />
      {value.length > 0 && (
        <MaterialIcons
          name="close"
          size={20}
          color={colors.tabIconDefault}
          onPress={onClear || (() => onChangeText(""))}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
    padding: 0,
  },
});
