import { ThemedText } from '@/components/ui/themed-text';
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { MaterialIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";

interface SettingsRowProps {
  icon?: keyof typeof MaterialIcons.glyphMap;
  iconColor?: string;
  label: string;
  sublabel?: string;
  onPress?: () => void;
  rightElement?: ReactNode;
  showChevron?: boolean;
  destructive?: boolean;
  disabled?: boolean;
  isLast?: boolean;
}

export function SettingsRow({
  icon,
  iconColor,
  label,
  sublabel,
  onPress,
  rightElement,
  showChevron = true,
  destructive = false,
  disabled = false,
  isLast = false,
}: SettingsRowProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = Colors[isDark ? "dark" : "light"];

  const handlePress = () => {
    if (disabled || !onPress) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  const textColor = destructive ? "#FF3B30" : colors.text;
  const computedIconColor =
    iconColor ?? (destructive ? "#FF3B30" : Colors.primary);

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled || !onPress}
      style={({ pressed }) => [
        styles.container,
        pressed &&
        !disabled && {
          opacity: 0.7,
          backgroundColor: isDark
            ? "rgba(255,255,255,0.05)"
            : "rgba(0,0,0,0.02)",
        },
        disabled && { opacity: 0.5 },
      ]}
    >
      <View style={styles.leftContent}>
        {icon && (
          <View
            style={[
              styles.iconContainer,
              { backgroundColor: computedIconColor },
            ]}
          >
            <MaterialIcons name={icon} size={18} color="#fff" />
          </View>
        )}
        <View style={styles.textContainer}>
          <ThemedText style={[styles.label, { color: textColor }]} numberOfLines={1}>
            {label}
          </ThemedText>
          {sublabel && (
            <ThemedText
              style={[styles.sublabel, { color: colors.icon }]}
              numberOfLines={1}
            >
              {sublabel}
            </ThemedText>
          )}
        </View>
      </View>

      <View style={styles.rightContent}>
        {rightElement}
        {showChevron && onPress && !rightElement && (
          <MaterialIcons name="chevron-right" size={22} color={colors.icon} />
        )}
      </View>

      {!isLast && (
        <View
          style={[
            styles.separator,
            {
              backgroundColor: isDark
                ? "rgba(255,255,255,0.08)"
                : "rgba(0,0,0,0.06)",
              left: icon ? 60 : 16,
            },
          ]}
        />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 16,
    minHeight: 52,
  },
  leftContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  iconContainer: {
    width: 30,
    height: 30,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  textContainer: {
    flex: 1,
  },
  label: {
    fontSize: 16,
    fontWeight: "400",
  },
  sublabel: {
    fontSize: 13,
    marginTop: 2,
  },
  rightContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  separator: {
    position: "absolute",
    bottom: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
  },
});
