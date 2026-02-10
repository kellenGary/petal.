import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { MaterialIcons } from "@expo/vector-icons";
import { Switch } from "react-native";
import { SettingsRow } from "./settings-row";

interface SettingsSwitchProps {
  icon?: keyof typeof MaterialIcons.glyphMap;
  iconColor?: string;
  label: string;
  sublabel?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
  isLast?: boolean;
}

export function SettingsSwitch({
  icon,
  iconColor,
  label,
  sublabel,
  value,
  onValueChange,
  disabled = false,
  isLast = false,
}: SettingsSwitchProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = Colors[isDark ? "dark" : "light"];

  return (
    <SettingsRow
      icon={icon}
      iconColor={iconColor}
      label={label}
      sublabel={sublabel}
      showChevron={false}
      disabled={disabled}
      isLast={isLast}
      rightElement={
        <Switch
          value={value}
          onValueChange={onValueChange}
          disabled={disabled}
          trackColor={{
            false: isDark ? "#39393D" : "#E9E9EB",
            true: Colors.primary,
          }}
          thumbColor="#fff"
          ios_backgroundColor={isDark ? "#39393D" : "#E9E9EB"}
        />
      }
    />
  );
}
