import { ThemedText } from '@/components/ui/themed-text';
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Pressable, StyleSheet, Text, View } from "react-native";

interface SectionHeaderProps {
  title: string;
  onSeeAllPress?: () => void;
}

export default function SectionHeader({
  title,
  onSeeAllPress,
}: SectionHeaderProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = Colors[isDark ? "dark" : "light"];

  return (
    <View style={styles.sectionHeader}>
      <ThemedText style={[styles.sectionTitle, { color: colors.text }]}>{title}</ThemedText>
      <Pressable onPress={onSeeAllPress}>
        <ThemedText style={[styles.seeAll, { color: colors.tint }]}>See All</ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  seeAll: {
    fontSize: 13,
    fontWeight: "500",
  },
});
