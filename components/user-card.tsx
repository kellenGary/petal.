import { ThemedText } from '@/components/themed-text';
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Image } from "expo-image";
import { RelativePathString, router } from "expo-router";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

interface UserCardProps {
  user: {
    id: number;
    spotifyId?: string;
    displayName?: string;
    handle?: string;
    bio?: string;
    email?: string;
    profileImageUrl?: string;
    hasCompletedProfile?: boolean;
    spotifyAccessToken?: string;
    spotifyRefreshToken?: string;
    tokenExpiresAt?: string;
    createdAt?: string;
    updatedAt?: string;
  };
  isFollowing: boolean;
  isLoading: boolean;
  onToggleFollow: (userId: number) => void;
}

export default function UserCard({
  user,
  isFollowing,
  isLoading,
  onToggleFollow,
}: UserCardProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = Colors[isDark ? "dark" : "light"];

  const handleOpenProfile = (userId: string) => {
    router.push(`/profile/${userId}` as RelativePathString);
  };

  return (
    <Pressable
      style={[styles.userCard, { borderColor: colors.tabIconDefault }]}
      onPress={() => handleOpenProfile(user.id.toString())}
    >
      <View
        style={[styles.userAvatar, { backgroundColor: colors.tabIconDefault }]}
      >
        {user?.profileImageUrl ? (
          <Image
            source={{ uri: user.profileImageUrl }}
            style={styles.userAvatarImage}
            contentFit="cover"
          />
        ) : (
          <ThemedText style={styles.avatarText}>
            {user?.displayName?.[0]?.toUpperCase() || "?"}
          </ThemedText>
        )}
      </View>
      <View style={styles.textContainer}>
        <ThemedText
          style={[styles.userName, { color: colors.text }]}
          numberOfLines={1}
        >
          {user.displayName}
        </ThemedText>
        {user.handle && (
          <ThemedText
            style={[styles.userHandle, { color: colors.tabIconDefault }]}
            numberOfLines={1}
          >
            @{user.handle}
          </ThemedText>
        )}
      </View>
      <Pressable
        style={[
          styles.followButton,
          {
            backgroundColor: isFollowing ? "transparent" : colors.primary,
            borderWidth: isFollowing ? 1 : 0,
            borderColor: colors.primary,
          },
        ]}
        onPress={(e) => {
          e.stopPropagation();
          onToggleFollow(user.id);
        }}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator
            size="small"
            color={isFollowing ? colors.text : "#fff"}
          />
        ) : (
          <ThemedText
            style={[
              styles.followButtonText,
              { color: isFollowing ? colors.text : "#fff" },
            ]}
            numberOfLines={1}
          >
            {isFollowing ? "Following" : "Follow"}
          </ThemedText>
        )}
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  userCard: {
    width: "100%",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 8,
    flexDirection: "row",
    gap: 12,
  },
  userAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
    backgroundColor: "#F0F0F0",
  },
  userAvatarImage: {
    width: "100%",
    height: "100%",
    borderRadius: 25,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: "700",
    color: "#fff",
  },
  textContainer: {
    flex: 1,
    justifyContent: "center",
    gap: 2,
  },
  userName: {
    fontSize: 15,
    fontWeight: "600",
    textAlign: "left",
  },
  userHandle: {
    fontSize: 13,
    fontWeight: "400",
    textAlign: "left",
  },
  followButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  followButtonText: {
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
  },
});
