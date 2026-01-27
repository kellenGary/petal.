import { ThemedText } from '@/components/themed-text';
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import followApi from "@/services/followApi";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text } from "react-native";

interface FollowButtonProps {
  userId: number;
  onFollowChange?: (isFollowing: boolean) => void;
}

export default function FollowButton({
  userId,
  onFollowChange,
}: FollowButtonProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = Colors[isDark ? "dark" : "light"];

  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  // Fetch initial follow status when component mounts
  useEffect(() => {
    const fetchFollowStatus = async () => {
      if (!userId) return;
      try {
        const status = await followApi.getFollowStatus(userId);
        setIsFollowing(status);
      } catch (error) {
        console.error("Failed to fetch follow status:", error);
      }
    };
    fetchFollowStatus();
  }, [userId]);

  const handleToggleFollow = useCallback(async () => {
    if (!userId || followLoading) return;

    setFollowLoading(true);
    try {
      const newStatus = await followApi.toggleFollow(userId, isFollowing);
      setIsFollowing(newStatus);
      // Notify parent component if callback provided
      onFollowChange?.(newStatus);
    } catch (error) {
      console.error("Failed to toggle follow:", error);
    } finally {
      setFollowLoading(false);
    }
  }, [userId, isFollowing, followLoading, onFollowChange]);

  return (
    <Pressable
      style={[
        styles.profileFollowButton,
        {
          backgroundColor: isFollowing ? "transparent" : colors.primary,
          borderWidth: isFollowing ? 1 : 0,
          borderColor: colors.primary,
        },
      ]}
      onPress={handleToggleFollow}
      disabled={followLoading}
    >
      {followLoading ? (
        <ActivityIndicator
          size="small"
          color={isFollowing ? colors.text : "#fff"}
        />
      ) : (
        <ThemedText
          style={[
            styles.profileFollowButtonText,
            { color: isFollowing ? colors.text : "#fff" },
          ]}
        >
          {isFollowing ? "Following" : "Follow"}
        </ThemedText>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  profileFollowButton: {
    marginTop: 12,
    paddingHorizontal: 32,
    paddingVertical: 10,
    borderRadius: 20,
    minWidth: 120,
    alignItems: "center",
    justifyContent: "center",
  },
  profileFollowButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
});
