import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import notificationApi, { Notification } from '@/services/notificationApi';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { ThemedText } from '../ui/themed-text';

interface NotificationItemProps {
    notification: Notification;
    onPress?: () => void;
}

export default function NotificationItem({ notification, onPress }: NotificationItemProps) {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const colors = Colors[isDark ? 'dark' : 'light'];

    const handlePress = () => {
        if (onPress) {
            onPress();
        }
        // Navigate based on notification type
        if (notification.type === 'Follow') {
            router.push(`/profile/${notification.actorUser.id}`);
        } else if (notification.post) {
            // For like/repost, could navigate to post or user
            router.push(`/profile/${notification.actorUser.id}`);
        }
    };

    const getIcon = () => {
        switch (notification.type) {
            case 'Like':
                return <Ionicons name="heart" size={20} color="#FF3B30" />;
            case 'Repost':
                return <Ionicons name="repeat" size={20} color="#34C759" />;
            case 'Follow':
                return <Ionicons name="person-add" size={20} color="#007AFF" />;
            default:
                return <Ionicons name="notifications" size={20} color={colors.text} />;
        }
    };

    const message = notificationApi.getNotificationMessage(notification);
    const timeAgo = notificationApi.getTimeAgo(notification.createdAt);

    return (
        <Pressable
            onPress={handlePress}
            style={[
                styles.container,
                {
                    backgroundColor: notification.isRead
                        ? colors.background
                        : isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                },
            ]}
        >
            {/* Actor Avatar */}
            <View style={styles.avatarContainer}>
                {notification.actorUser.profileImageUrl ? (
                    <Image
                        source={{ uri: notification.actorUser.profileImageUrl }}
                        style={styles.avatar}
                    />
                ) : (
                    <View style={[styles.avatar, styles.avatarPlaceholder, { backgroundColor: colors.border }]}>
                        <Ionicons name="person" size={20} color={colors.text} />
                    </View>
                )}
                <View style={[styles.iconBadge, { backgroundColor: colors.background }]}>
                    {getIcon()}
                </View>
            </View>

            {/* Content */}
            <View style={styles.content}>
                <ThemedText style={styles.message} numberOfLines={2}>
                    {message}
                </ThemedText>
                <ThemedText style={[styles.time, { color: colors.mutedForeground }]}>
                    {timeAgo}
                </ThemedText>
            </View>

            {/* Post Image Thumbnail (if applicable) */}
            {notification.post?.imageUrl && (
                <Image
                    source={{ uri: notification.post.imageUrl }}
                    style={styles.postImage}
                />
            )}

            {/* Unread indicator */}
            {!notification.isRead && (
                <View style={styles.unreadDot} />
            )}
        </Pressable>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: 'rgba(128,128,128,0.2)',
    },
    avatarContainer: {
        position: 'relative',
        marginRight: 12,
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
    },
    avatarPlaceholder: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    iconBadge: {
        position: 'absolute',
        bottom: -2,
        right: -2,
        width: 24,
        height: 24,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: 'transparent',
    },
    content: {
        flex: 1,
        marginRight: 8,
    },
    message: {
        fontSize: 14,
        lineHeight: 20,
    },
    time: {
        fontSize: 12,
        marginTop: 2,
    },
    postImage: {
        width: 44,
        height: 44,
        borderRadius: 6,
    },
    unreadDot: {
        position: 'absolute',
        left: 8,
        top: '50%',
        marginTop: -4,
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#007AFF',
    },
});
