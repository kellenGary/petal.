import { ThemedText } from '@/components/themed-text';
import { Colors } from "@/constants/theme";
import { useAuth } from "@/contexts/AuthContext";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { FeedUser } from "@/services/feedApi";
import { Image } from "expo-image";
import { router } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

interface PostHeaderProps {
  user: FeedUser;
  timeAgo: string;
}

export default function PostHeader({ user, timeAgo }: PostHeaderProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = Colors[isDark ? "dark" : "light"];
  const { user: currentUser } = useAuth();

  return (
    <Pressable
      style={styles.container}
      onPress={() =>
        router.push(`/profile/${user.id === currentUser?.id ? "" : user.id}`)
      }
    >
      <Image
        source={{ uri: user.profileImageUrl || "https://i.pravatar.cc/100" }}
        style={styles.avatar}
      />
      <View style={styles.info}>
        <ThemedText style={[styles.name, { color: colors.text }]}>
          {user.displayName || user.handle}
        </ThemedText>
        <ThemedText style={[styles.time, { color: colors.text }]}>{timeAgo}</ThemedText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
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
});
