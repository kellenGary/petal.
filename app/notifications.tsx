import NotificationItem from '@/components/notifications/notification-item';
import { ThemedText } from '@/components/ui/themed-text';
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import notificationApi, { Notification } from '@/services/notificationApi';
import { Ionicons } from '@expo/vector-icons';
import { router, Stack } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function NotificationsScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = Colors[isDark ? "dark" : "light"];
  const insets = useSafeAreaInsets();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const offsetRef = useRef(0);
  const hasMoreRef = useRef(true);
  const isFetchingRef = useRef(false);
  const initialLoadDoneRef = useRef(false);
  const LIMIT = 20;

  const fetchNotifications = useCallback(async (reset: boolean = false) => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    try {
      const currentOffset = reset ? 0 : offsetRef.current;
      const response = await notificationApi.getNotifications(LIMIT, currentOffset);

      if (reset) {
        setNotifications(response.items);
        offsetRef.current = LIMIT;
      } else {
        setNotifications(prev => [...prev, ...response.items]);
        offsetRef.current += LIMIT;
      }

      hasMoreRef.current = response.items.length === LIMIT && currentOffset + LIMIT < response.total;
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      isFetchingRef.current = false;
    }
  }, []);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchNotifications(true);
    setRefreshing(false);
  }, [fetchNotifications]);

  const handleLoadMore = useCallback(() => {
    if (!initialLoadDoneRef.current || isFetchingRef.current || !hasMoreRef.current || loadingMore) return;
    setLoadingMore(true);

    fetchNotifications(false).finally(() => {
      setLoadingMore(false);
    });
  }, [fetchNotifications, loadingMore]);

  const handleMarkAllRead = useCallback(async () => {
    try {
      await notificationApi.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  }, []);

  const handleNotificationPress = useCallback(async (notification: Notification) => {
    if (!notification.isRead) {
      try {
        await notificationApi.markAsRead(notification.id);
        setNotifications(prev =>
          prev.map(n => n.id === notification.id ? { ...n, isRead: true } : n)
        );
      } catch (error) {
        console.error('Failed to mark notification as read:', error);
      }
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await fetchNotifications(true);
      } finally {
        if (!cancelled) {
          setLoading(false);
          initialLoadDoneRef.current = true;
        }
      }
    })();
    return () => { cancelled = true; };
  }, [fetchNotifications]);

  const renderNotification = useCallback(({ item }: { item: Notification }) => (
    <NotificationItem
      notification={item}
      onPress={() => handleNotificationPress(item)}
    />
  ), [handleNotificationPress]);

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="notifications-outline" size={64} color={colors.mutedForeground} />
      <ThemedText style={[styles.emptyText, { color: colors.mutedForeground }]}>
        No notifications yet
      </ThemedText>
      <ThemedText style={[styles.emptySubtext, { color: colors.mutedForeground }]}>
        When someone likes, reposts your posts,{'\n'}or follows you, you'll see it here.
      </ThemedText>
    </View>
  );

  const renderFooter = () => {
    if (!loadingMore) return <View style={{ height: 100 }} />;
    return (
      <View style={styles.footer}>
        <ActivityIndicator size="small" color={colors.text} />
      </View>
    );
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: "Notifications",
          headerLeft: () => (
            <Pressable onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="chevron-back" size={24} color={colors.text} />
            </Pressable>
          ),
          headerRight: () => unreadCount > 0 ? (
            <Pressable onPress={handleMarkAllRead} style={styles.markReadButton}>
              <ThemedText style={[styles.markReadText, { color: Colors.primary }]}>
                Mark all read
              </ThemedText>
            </Pressable>
          ) : null,
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          headerShadowVisible: false,
        }}
      />

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.text} />
        </View>
      ) : (
        <FlatList
          data={notifications}
          renderItem={renderNotification}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={[
            styles.listContent,
            notifications.length === 0 && styles.emptyList,
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.text}
              colors={[Colors.primary || '#007AFF']}
            />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
          ListEmptyComponent={renderEmpty}
          ListFooterComponent={renderFooter}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    flexGrow: 1,
  },
  emptyList: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  footer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  markReadButton: {
    padding: 8,
    marginRight: -8,
  },
  markReadText: {
    fontSize: 14,
    fontWeight: '500',
  },
});