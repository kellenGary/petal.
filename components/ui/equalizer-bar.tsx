import { Colors } from "@/constants/theme";
import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

interface AnimatedBarProps {
  delay: number;
  initialHeight: number;
}

function AnimatedBar({ delay, initialHeight }: AnimatedBarProps) {
  const height = useSharedValue(initialHeight);

  useEffect(() => {
    height.value = withRepeat(
      withSequence(
        withTiming(18, { duration: 400 + delay }),
        withTiming(6, { duration: 300 + delay / 2 })
      ),
      -1,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    height: height.value,
  }));

  return (
    <Animated.View
      style={[
        styles.equalizerBar,
        { backgroundColor: Colors.primary },
        animatedStyle,
      ]}
    />
  );
}

export default function EqualizerBar() {
  return (
    <View style={styles.equalizerContainer}>
      <AnimatedBar delay={100} initialHeight={12} />
      <AnimatedBar delay={0} initialHeight={18} />
      <AnimatedBar delay={200} initialHeight={8} />
    </View>
  );
}

const styles = StyleSheet.create({
  equalizerContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 2,
    height: 20,
  },
  equalizerBar: {
    width: 3,
    borderRadius: 1.5,
  },
});
