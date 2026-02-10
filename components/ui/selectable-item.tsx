import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Image } from "expo-image";
import { Pressable, StyleSheet, View } from "react-native";
import { ThemedText } from "./themed-text";

interface SelectableItemProps {
  id: string;
  title: string;
  subtitle: string;
  imageUrl: string | null;
  isSelected: boolean;
  onSelect: () => void;
}

export default function SelectableItem({
  id,
  title,
  subtitle,
  imageUrl,
  isSelected,
  onSelect,
}: SelectableItemProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = Colors[isDark ? "dark" : "light"];

  return (
    <Pressable
      style={[
        styles.container,
        { backgroundColor: isSelected ? Colors.primary + "20" : "transparent" },
        isSelected && { borderColor: Colors.primary, borderWidth: 1 },
      ]}
      onPress={onSelect}
    >
      <Image
        source={{ uri: imageUrl || undefined }}
        style={styles.image}
        placeholder={require("@/assets/images/icon.png")}
      />
      <View style={styles.info}>
        <ThemedText style={styles.title} numberOfLines={1}>
          {title}
        </ThemedText>
        <ThemedText style={styles.subtitle} numberOfLines={1}>
          {subtitle}
        </ThemedText>
      </View>
      {isSelected ? (
        <MaterialIcons name="check-circle" size={24} color={Colors.primary} />
      ) : (
        <MaterialIcons name="radio-button-unchecked" size={24} color={colors.icon} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "transparent",
  },
  image: {
    width: 56,
    height: 56,
    borderRadius: 4,
    backgroundColor: "#ccc",
  },
  info: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 13,
    opacity: 0.7,
  },
});
