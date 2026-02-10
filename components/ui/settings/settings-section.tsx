import { ThemedText } from '@/components/ui/themed-text';
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

interface SettingsSectionProps {
  title?: string;
  children: ReactNode;
  footer?: string;
}

export function SettingsSection({
  title,
  children,
  footer,
}: SettingsSectionProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = Colors[isDark ? "dark" : "light"];

  return (
    <View style={styles.container}>
      {title && (
        <ThemedText style={[styles.title, { color: colors.icon }]}>
          {title.toUpperCase()}
        </ThemedText>
      )}
      <View
        style={[
          styles.content,
          {
            backgroundColor: colors.card,
            borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
          },
        ]}
      >
        {children}
      </View>
      {footer && (
        <ThemedText style={[styles.footer, { color: colors.icon }]}>{footer}</ThemedText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  title: {
    fontSize: 13,
    fontWeight: "500",
    letterSpacing: 0.5,
    marginBottom: 8,
    marginLeft: 16,
  },
  content: {
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
  },
  footer: {
    fontSize: 12,
    marginTop: 8,
    marginLeft: 16,
    lineHeight: 16,
  },
});
