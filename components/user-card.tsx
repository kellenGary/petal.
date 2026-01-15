import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { RelativePathString, router } from "expo-router";
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

interface UserCardProps {
  user: {
    id: number;
    displayName?: string;
    profileImageUrl?: string;
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
            resizeMode="cover"
          />
        ) : (
          <Text style={styles.avatarText}>
            {user?.displayName?.[0]?.toUpperCase() || "?"}
          </Text>
        )}
      </View>
      <Text style={[styles.userName, { color: colors.text }]} numberOfLines={1}>
        {user.displayName}
      </Text>
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
          <Text
            style={[
              styles.followButtonText,
              { color: isFollowing ? colors.text : "#fff" },
            ]}
            numberOfLines={1}
          >
            {isFollowing ? "Following" : "Follow"}
          </Text>
        )}
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  userCard: {
    width: 100,
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  userAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  userAvatarImage: {
    width: "100%",
    height: "100%",
    borderRadius: 30,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: "700",
    color: "#fff",
  },
  userName: {
    fontSize: 13,
    fontWeight: "500",
    marginBottom: 8,
    textAlign: "center",
  },
  followButton: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 6,
    width: "100%",
  },
  followButtonText: {
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
  },
});
