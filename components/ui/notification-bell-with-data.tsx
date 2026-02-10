import notificationApi from '@/services/notificationApi';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import NotificationBell from './notification-bell';

interface NotificationBellWithDataProps {
    pollInterval?: number; // in milliseconds
}

/**
 * NotificationBell wrapper that fetches real unread count from the API.
 * Polls for updates periodically and navigates to notifications screen on press.
 */
export default function NotificationBellWithData({
    pollInterval = 60000 // Poll every minute by default
}: NotificationBellWithDataProps) {
    const [unreadCount, setUnreadCount] = useState(0);

    const fetchUnreadCount = useCallback(async () => {
        try {
            const count = await notificationApi.getUnreadCount();
            setUnreadCount(count);
        } catch (error) {
            // Silently fail - don't spam errors for notification count
            console.debug('Failed to fetch notification count:', error);
        }
    }, []);

    useEffect(() => {
        // Fetch immediately on mount
        fetchUnreadCount();

        // Set up polling interval
        const intervalId = setInterval(fetchUnreadCount, pollInterval);

        return () => clearInterval(intervalId);
    }, [fetchUnreadCount, pollInterval]);

    const handlePress = useCallback(() => {
        router.push('/notifications');
    }, []);

    return (
        <NotificationBell
            count={unreadCount}
            onPress={handlePress}
        />
    );
}
