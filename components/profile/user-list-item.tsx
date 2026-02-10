import { ThemedText } from "@/components/ui/themed-text";
import { Colors } from "@/constants/theme";
import { useAuth } from "@/contexts/AuthContext";
import { useColorScheme } from "@/hooks/use-color-scheme";
import followApi from "@/services/followApi";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { RelativePathString, router } from "expo-router";
import { useCallback, useState } from "react";
import {
    ActivityIndicator,
    Pressable,
    StyleSheet,
    View,
} from "react-native";

export interface FollowUserItem {
    id: number;
    displayName: string;
    handle: string;
    profileImageUrl: string | null;
    followedAt?: string;
}

interface UserListItemProps {
    user: FollowUserItem;
    /** Pre-loaded follow status map from batch check */
    isFollowing?: boolean;
    onFollowChange?: (userId: number, isFollowing: boolean) => void;
}

export default function UserListItem({
    user,
    isFollowing: initialFollowing = false,
    onFollowChange,
}: UserListItemProps) {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === "dark";
    const colors = Colors[isDark ? "dark" : "light"];
    const { user: currentUser } = useAuth();

    const [isFollowing, setIsFollowing] = useState(initialFollowing);
    const [loading, setLoading] = useState(false);

    const isOwnProfile = currentUser?.id === user.id;

    const handleToggleFollow = useCallback(async () => {
        if (loading) return;
        setLoading(true);
        try {
            const newStatus = await followApi.toggleFollow(user.id, isFollowing);
            setIsFollowing(newStatus);
            onFollowChange?.(user.id, newStatus);
        } catch (error) {
            console.error("Failed to toggle follow:", error);
        } finally {
            setLoading(false);
        }
    }, [user.id, isFollowing, loading, onFollowChange]);

    const handlePress = useCallback(() => {
        router.push(`/profile/${user.id}` as RelativePathString);
    }, [user.id]);

    return (
        <Pressable
            style={[styles.container, { borderBottomColor: colors.border || (isDark ? "#222" : "#eee") }]}
            onPress={handlePress}
        >
            {user.profileImageUrl ? (
                <Image
                    source={{ uri: user.profileImageUrl }}
                    style={[styles.avatar, { backgroundColor: colors.card }]}
                />
            ) : (
                <View style={[styles.avatar, styles.avatarPlaceholder, { backgroundColor: colors.card }]}>
                    <Ionicons name="person" size={24} color={colors.text} style={{ opacity: 0.5 }} />
                </View>
            )}

            <View style={styles.info}>
                <ThemedText type="defaultSemiBold" style={styles.displayName} numberOfLines={1}>
                    {user.displayName}
                </ThemedText>
                <ThemedText type="small" style={styles.handle} numberOfLines={1}>
                    @{user.handle}
                </ThemedText>
            </View>

            {!isOwnProfile && (
                <Pressable
                    style={[
                        styles.followButton,
                        {
                            backgroundColor: isFollowing ? (isDark ? "#333" : "#eee") : Colors.primary,
                        },
                    ]}
                    onPress={handleToggleFollow}
                    disabled={loading}
                    hitSlop={8}
                >
                    {loading ? (
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
                        >
                            {isFollowing ? "Following" : "Follow"}
                        </ThemedText>
                    )}
                </Pressable>
            )}
        </Pressable>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 10,
        paddingHorizontal: 16,
    },
    avatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
    },
    avatarPlaceholder: {
        alignItems: "center",
        justifyContent: "center",
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: "rgba(150, 150, 150, 0.3)",
    },
    info: {
        flex: 1,
        marginLeft: 12,
        justifyContent: "center",
        gap: 1,
    },
    displayName: {
        fontSize: 14,
        lineHeight: 20,
    },
    handle: {
        opacity: 0.6,
    },
    followButton: {
        paddingHorizontal: 16,
        paddingVertical: 6,
        borderRadius: 8,
        minWidth: 90,
        height: 32,
        alignItems: "center",
        justifyContent: "center",
    },
    followButtonText: {
        fontSize: 13,
        fontWeight: "600",
    },
});
