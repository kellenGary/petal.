import { ThemedText } from "@/components/ui/themed-text";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Image } from "expo-image";
import React, { useEffect, useMemo } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

interface Track {
  id: number;
  spotify_id: string;
  name: string;
  album?: {
    id: number;
    spotify_id: string;
    name: string;
    image_url: string;
    release_date: string;
  };
  artists?: Array<{
    id: number;
    spotify_id: string;
    name: string;
  }>;
}

interface RingCarouselProps {
  tracks: Track[];
  width: number;
  height: number;
}

const IMAGE_SIZE = 70;
const CENTER_ICON_SIZE = 100;
const SPIN_DURATION = 60000; // 20 seconds per rotation

interface TrackItemProps {
  track: Track;
  index: number;
  totalTracks: number;
  centerX: number;
  centerY: number;
  radiusX: number;
  radiusY: number;
  rotation: ReturnType<typeof useSharedValue<number>>;
}

function TrackItem({
  track,
  index,
  totalTracks,
  centerX,
  centerY,
  radiusX,
  radiusY,
  rotation,
}: TrackItemProps) {
  // Base angle for this track (evenly distributed)
  const baseAngle = (index / totalTracks) * Math.PI * 2;

  const animatedStyle = useAnimatedStyle(() => {
    // Current angle = base angle - rotation (counter-clockwise)
    const currentAngle = baseAngle - rotation.value;
    // Ring position
    const ringX = radiusX * Math.cos(currentAngle);
    const ringY = radiusY * Math.sin(currentAngle);
    // Scale based on Y position (depth effect)
    const sinValue = Math.sin(currentAngle);
    const depthScale = 0.5 + (sinValue + 1) * 0.25; // 0.5 to 1.0
    // Z-index based on depth
    const zIndex = Math.round((sinValue + 1) * 50);

    return {
      transform: [
        { translateX: ringX },
        { translateY: ringY },
        { scale: depthScale },
      ],
      zIndex,
    };
  });

  return (
    <Animated.View
      style={[
        styles.trackContainer,
        {
          left: centerX - IMAGE_SIZE / 2,
          top: centerY - IMAGE_SIZE / 2,
        },
        animatedStyle,
      ]}
    >
      <Image source={{ uri: track.album?.image_url }} style={styles.albumArt} />
    </Animated.View>
  );
}

export default function RingCarousel({
  tracks,
  width,
  height,
}: RingCarouselProps) {
  const rotation = useSharedValue(0);
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = Colors[isDark ? "dark" : "light"];
  const AppIcon = isDark
    ? require("@/assets/images/icon.png")
    : require("@/assets/images/black-icon.png");

  // Ring dimensions - elliptical shape
  const centerX = width / 2;
  const centerY = height / 2;
  const radiusX = width * 0.45;
  const radiusY = height * 0.2;

  // Filter tracks that have album art
  const tracksWithArt = useMemo(
    () => tracks.filter((t) => t.album?.image_url),
    [tracks],
  );

  // Start spinning animation - animate to a very large value for smooth infinite rotation
  // Using 1000 rotations which will last ~5.5 hours at current speed
  const TOTAL_ROTATIONS = 1000;
  useEffect(() => {
    if (tracksWithArt.length === 0) return;
    const startSpin = () => {
      rotation.value = withTiming(Math.PI * 2 * TOTAL_ROTATIONS, {
        duration: SPIN_DURATION * TOTAL_ROTATIONS,
        easing: Easing.linear,
      });
    };
    startSpin();
    return () => {
      cancelAnimation(rotation);
    };
  }, [tracksWithArt.length]);

  if (tracksWithArt.length === 0) {
    return null;
  }

  return (
    <View style={[styles.container, { width, height }]}>
      {/* Center icon */}
      <View
        style={[
          styles.centerIconContainer,
          {
            left: centerX - CENTER_ICON_SIZE + 70 / 2,
            top: centerY - CENTER_ICON_SIZE + 80 / 2,
          },
        ]}
      >
        <ThemedText type="title" style={{ color: colors.text }}>petal.</ThemedText>
        <ThemedText style={{ color: colors.text }}>Discover what the world is listening to, one song at a time.</ThemedText>
      </View>

      {/* Spinning track items */}
      {tracksWithArt.map((track, index) => (
        <TrackItem
          key={track.id}
          track={track}
          index={index}
          totalTracks={tracksWithArt.length}
          centerX={centerX}
          centerY={centerY}
          radiusX={radiusX}
          radiusY={radiusY}
          rotation={rotation}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: "auto",
    position: "relative",
  },
  centerIconContainer: {
    position: "absolute",
    width: CENTER_ICON_SIZE + 50,
    zIndex: 500, // Between front and back of the ring
  },
  centerIcon: {
    width: CENTER_ICON_SIZE,
    height: CENTER_ICON_SIZE,
    borderRadius: CENTER_ICON_SIZE / 2,
  },
  trackContainer: {
    position: "absolute",
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
  },
  albumArt: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
    borderRadius: 8,
  },
});
