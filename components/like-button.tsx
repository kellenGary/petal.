import { Colors } from "@/constants/theme";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useEffect } from "react";
import { Pressable, StyleSheet, Text, useColorScheme } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
} from "react-native-reanimated";

interface LikeButtonProps {
  liked: boolean | null;
  likeLoading: boolean;
  handleToggleLike: () => void;
}

const AnimatedIcon = Animated.createAnimatedComponent(MaterialIcons);
const AnimatedText = Animated.createAnimatedComponent(Text);

export default function LikeButton({
  liked,
  likeLoading,
  handleToggleLike,
}: LikeButtonProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = Colors[isDark ? "dark" : "light"];

  const scale = useSharedValue(1);
  const textTranslateX = useSharedValue(0);

  const animatedIconStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
    };
  });

  const animatedTextStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: textTranslateX.value }],
    };
  });

  useEffect(() => {
    if (liked) {
      scale.value = withSequence(withSpring(1.2), withSpring(1));
      textTranslateX.value = withSequence(withSpring(5), withSpring(0));
    }
  }, [liked]);

  const onPress = () => {
    handleToggleLike();
  };

  return (
    <Pressable
      style={[
        styles.actionButton,
        {
          backgroundColor: liked ? colors.likeButton.liked : colors.card,
          opacity: likeLoading ? 0.7 : 1,
        },
      ]}
      onPress={onPress}
      disabled={likeLoading || liked === null}
    >
      <AnimatedIcon
        name={liked ? "favorite" : "favorite-border"}
        size={18}
        color={liked ? "#fff" : colors.text}
        style={animatedIconStyle}
      />
      <AnimatedText
        style={[
          styles.actionText,
          { color: liked ? "#fff" : colors.text },
          animatedTextStyle,
        ]}
      >
        {liked === null ? "..." : liked ? "Liked" : "Like"}
      </AnimatedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
  },
  actionText: {
    fontSize: 13,
    fontWeight: "500",
    width: 40, // Fixed width to prevent layout shift
    textAlign: "left",
  },
});
