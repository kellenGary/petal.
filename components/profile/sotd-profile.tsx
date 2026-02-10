import { ThemedText } from '@/components/ui/themed-text';
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useEffect } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming
} from "react-native-reanimated";

interface Track {
  id: string;
  name: string;
  artists: string[];
  album: {
    id: string;
    name: string;
    image_url: string;
  };
}

interface SOTDProfileProps {
  track: Track | null;
  isOwnProfile?: boolean;
}

export default function SOTDProfile({
  track,
  isOwnProfile = false,
}: SOTDProfileProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = Colors[isDark ? "dark" : "light"];

  const translateY = useSharedValue(0);

  useEffect(() => {
    if (track) {
      translateY.value = withSequence(
        withTiming(-24, { duration: 600, easing: Easing.out(Easing.exp) }),
        withDelay(500, withTiming(0, { duration: 600, easing: Easing.inOut(Easing.cubic) }))
      );
    }
  }, [track]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const handlePress = () => {
    if (track) {
      router.push(`/song/${track.id}`);
    } else if (isOwnProfile) {
      router.push("/sotd");
    }
  };

  const content = track ? (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: colors.card,
          marginBottom: -24,
        },
        animatedStyle,
      ]}
    >
      <Image
        source={{ uri: track.album.image_url }}
        style={styles.albumImage}
      />
      <View style={styles.textContainer}>
        <ThemedText style={[styles.label, { color: colors.text }]} numberOfLines={1}>
          Song of the Day
        </ThemedText>
        <ThemedText
          style={[styles.trackName, { color: colors.text }]}
          numberOfLines={1}
        >
          {track.name}
        </ThemedText>
      </View>
      <MaterialIcons
        name="music-note"
        size={24}
        color={Colors.primary}
        style={styles.icon}
      />
    </Animated.View>
  ) : isOwnProfile ? (
    <View
      style={[
        styles.container,
        styles.fallbackContainer,
        { borderColor: isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.15)" },
      ]}
    >
      <MaterialIcons name="add" size={14} color={colors.text} />
      <ThemedText style={[styles.addText, { color: colors.text }]}>
        Add Song of the Day
      </ThemedText>
    </View>
  ) : null;

  if (!content) return null;

  if (track || isOwnProfile) {
    return <Pressable onPress={handlePress}>{content}</Pressable>;
  }

  return content;
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 2,
    paddingHorizontal: 10,
    borderRadius: 8,
    gap: 2,
    zIndex: 10,
  },
  albumImage: {
    width: 32,
    height: 32,
    borderRadius: 4,
  },
  textContainer: {
    flex: 1,
    maxWidth: 120,
  },
  label: {
    fontSize: 9,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    opacity: 0.6,
  },
  trackName: {
    fontSize: 12,
    fontWeight: "600",
  },
  icon: {
    opacity: 0.8,
  },
  fallbackContainer: {
    borderStyle: "dashed",
    borderWidth: 1,
    backgroundColor: "transparent",
  },
  addText: {
    fontSize: 11,
    opacity: 0.7,
  },
});
