import React, { useEffect, useRef } from "react";
import { Animated } from "react-native";
import Svg, { G, Path } from "react-native-svg";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";

const AnimatedPath = Animated.createAnimatedComponent(Path);

const LEAF_PATHS = [
  "M63.9839 98.0002C41.4947 66.2834 16.8803 35.5489 2.42186 54.4749C-12.0366 73.4008 63.9839 98.0002 63.9839 98.0002Z",
  "M63.9839 98.0002C59.7853 59.4207 53.8227 22.4108 31.3172 30.5079C8.81183 38.6049 62.0382 95.8347 63.9839 98.0002Z",
  "M63.9839 98.0002C82.6565 80.9673 115.357 39.4481 93.7423 29.2494C72.1279 19.0508 63.9839 98.0002 63.9839 98.0002Z",
  "M63.9839 98.0002C100.979 85.6282 135.351 72.4252 122.756 52.3104C110.16 32.1956 66.9692 96.0798 63.9839 98.0002Z",
  "M63.9839 98.0002C58.6199 54.3567 45.5626 25.59 63.2923 25.0093C81.022 24.4285 74.6495 51.1914 63.9839 98.0002Z"
];

export default function LeafLogoDraw() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = Colors[isDark ? "dark" : "light"];
  const progress = useRef(new Animated.Value(0)).current;
  const fillOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(progress, {
        toValue: 1,
        duration: 2200,
        useNativeDriver: false,
      }),
      Animated.timing(fillOpacity, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: false,
      }),
    ]).start();
  }, []);

  return (
    <Svg width={128} height={128} viewBox="0 0 128 128">
      <G>
        {LEAF_PATHS.map((d, i) => {
          const dashLength = 1000;

          const strokeDashoffset = progress.interpolate({
            inputRange: [0, 1],
            outputRange: [dashLength, 0],
          });

          return (
            <AnimatedPath
              key={i}
              d={d}
              fill={colors.text}
              fillOpacity={fillOpacity}
              stroke={colors.text}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray={dashLength}
              strokeDashoffset={strokeDashoffset}
            />
          );
        })}
      </G>
    </Svg>
  );
}
