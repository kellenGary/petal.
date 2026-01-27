import { ThemedText } from '@/components/themed-text';
import Ionicons from "@expo/vector-icons/Ionicons";
import { StyleSheet, Text, View } from "react-native";

interface StatsRowProps {
  /** Number of tracks */
  trackCount: number;
  /** Total duration in milliseconds */
  totalDurationMs: number;
  /** Text color */
  textColor?: string;
  /** Icon color */
  iconColor?: string;
}

/**
 * Track count and duration stats row.
 * Used in album and playlist screens.
 */
export default function StatsRow({
  trackCount,
  totalDurationMs,
  textColor = "#fff",
  iconColor,
}: StatsRowProps) {
  const totalMinutes = Math.floor(totalDurationMs / 60000);
  const totalHours = Math.floor(totalMinutes / 60);
  const remainingMinutes = totalMinutes % 60;

  const effectiveIconColor = iconColor || textColor;

  return (
    <View style={styles.container}>
      <View style={styles.statItem}>
        <Ionicons name="musical-notes" size={16} color={effectiveIconColor} />
        <ThemedText style={[styles.statText, { color: textColor }]}>
          {trackCount} tracks
        </ThemedText>
      </View>
      <View style={styles.divider} />
      <View style={styles.statItem}>
        <Ionicons name="time-outline" size={16} color={effectiveIconColor} />
        <ThemedText style={[styles.statText, { color: textColor }]}>
          {totalHours > 0
            ? `${totalHours}h ${remainingMinutes}m`
            : `${remainingMinutes} min`}
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    gap: 16,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statText: {
    fontSize: 13,
    fontWeight: "500",
  },
  divider: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.4)",
  },
});
