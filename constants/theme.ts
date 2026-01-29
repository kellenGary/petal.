/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * Converted from OKLCH values provided.
 */

import { Platform } from "react-native";

const tintColorLight = "#262626"; // primary
const tintColorDark = "#FCFCFC"; // primary-foreground

export const Colors = {
  light: {
    // Standard Expo/React Native references
    text: "#262626", // foreground
    background: "#fcf8f2ff", // background
    tint: tintColorLight,
    icon: "#737373", // muted-foreground
    tabIconDefault: "#737373",
    tabIconSelected: tintColorLight,

    // Custom Palette
    foreground: "#262626",
    card: "#FFFFFF",
    cardForeground: "#262626",
    popover: "#FFFFFF",
    popoverForeground: "#262626",
    primary: "#262626",
    primaryForeground: "#FCFCFC",
    secondary: "#F5F5F5",
    secondaryForeground: "#262626",
    muted: "#F0F0F0",
    mutedForeground: "#737373",
    accent: "#9D4B3B", // oklch(0.55 0.15 25)
    accentForeground: "#FFFFFF",
    destructive: "#DC2626", // oklch(0.577 0.245 27.325)
    destructiveForeground: "#FFFFFF",
    border: "#E5E5E5",
    input: "#F0F0F0",
    ring: "#262626",

    // Charts
    chart1: "#9D4B3B",
    chart2: "#2B908F", // oklch(0.6 0.118 184.704) - Teal
    chart3: "#455A64", // oklch(0.398 0.07 227.392) - Blue Grey
    chart4: "#FAD02E", // oklch(0.828 0.189 84.429) - Yellow
    chart5: "#F28C28", // oklch(0.769 0.188 70.08) - Orange

    likeButton: {
      liked: "#DC2626",
      unliked: "#F5F5F5",
    },
    // Gradient for cards/backgrounds if needed
    gradient: ["#FCFCFCff", "#FCFCFCff", "#F0F0F0ff", "#FCFCFCff"],
  },
  dark: {
    // Standard Expo/React Native references
    text: "#FCFCFC", // foreground
    background: "#18181B", // Darker background for dark mode (Zinc 900 approx)
    tint: tintColorDark,
    icon: "#A1A1AA", // muted-foreground
    tabIconDefault: "#A1A1AA",
    tabIconSelected: tintColorDark,

    // Custom Palette (Inverted/Adapted for Dark Mode)
    foreground: "#FCFCFC",
    card: "#27272A", // Zinc 800
    cardForeground: "#FCFCFC",
    popover: "#27272A",
    popoverForeground: "#FCFCFC",
    primary: "#FCFCFC",
    primaryForeground: "#18181B",
    secondary: "#27272A",
    secondaryForeground: "#FCFCFC",
    muted: "#27272A",
    mutedForeground: "#A1A1AA",
    accent: "#9D4B3B", // Keep accent color or slightly adjust? Keeping for brand consistency.
    accentForeground: "#FCFCFC",
    destructive: "#7F1D1D", // Darker red
    destructiveForeground: "#FCFCFC",
    border: "#27272A",
    input: "#27272A",
    ring: "#D4D4D8", // Light gray ring

    // Charts (Keep same or adjust brightness?)
    chart1: "#9D4B3B",
    chart2: "#2B908F",
    chart3: "#455A64",
    chart4: "#FAD02E",
    chart5: "#F28C28",

    likeButton: {
      liked: "#DC2626",
      unliked: "#27272A",
    },
    gradient: ["#18181Bff", "#18181Bff", "#27272Aff", "#18181Bff"],
  },
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: "system-ui",
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: "ui-serif",
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: "ui-rounded",
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: "ui-monospace",
  },
  default: {
    sans: "normal",
    serif: "serif",
    rounded: "normal",
    mono: "monospace",
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded:
      "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
