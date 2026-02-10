import { ThemedText } from '@/components/ui/themed-text';
import { Colors } from "@/constants/theme";
import { useAuth } from "@/contexts/AuthContext";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { FeedUser } from "@/services/feedApi";
import { MaterialIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, View } from "react-native";

interface PostHeaderProps {
  user: FeedUser;
  timeAgo: string;
}

export default function PostHeader({ user, timeAgo }: PostHeaderProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = Colors[isDark ? "dark" : "light"];
  const { user: currentUser } = useAuth();

  const handleProfilePress = () => {
    router.push(`/profile/${user.id === currentUser?.id ? "" : user.id}`);
  };

  return (
    <View style={styles.container}>
      <Pressable style={styles.userInfo} onPress={handleProfilePress}>
        <Image
          source={{ uri: user.profileImageUrl || "https://i.pravatar.cc/100" }}
          style={styles.avatar}
        />
        <View style={styles.info}>
          <ThemedText style={[styles.name, { color: colors.text }]}>
            {user.displayName || user.handle}
          </ThemedText>
          <ThemedText style={[styles.time, { color: colors.text }]}>
            {timeAgo}
          </ThemedText>
        </View>
      </Pressable>

      <View style={styles.actions}>
        <Pressable hitSlop={8} style={styles.iconButton}>
          <MaterialIcons name="favorite-border" size={22} color={colors.text} />
        </Pressable>
        <Pressable hitSlop={8} style={styles.iconButton}>
          <MaterialIcons name="repeat" size={22} color={colors.text} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  info: {
    marginLeft: 10,
    flex: 1,
  },
  name: {
    fontSize: 14,
    fontWeight: "600",
  },
  time: {
    fontSize: 12,
    opacity: 0.6,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    paddingLeft: 8,
  },
  iconButton: {
    opacity: 0.8,
  },
});
