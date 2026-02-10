import api from "./api";

export type NotificationType = "Like" | "Repost" | "Follow";

export interface NotificationUser {
  id: number;
  displayName: string | null;
  handle: string | null;
  profileImageUrl: string | null;
}

export interface NotificationPost {
  id: number;
  type: string;
  trackName: string | null;
  albumName: string | null;
  artistName: string | null;
  playlistName: string | null;
  imageUrl: string | null;
}

export interface Notification {
  id: number;
  type: NotificationType;
  isRead: boolean;
  createdAt: string;
  actorUser: NotificationUser;
  post: NotificationPost | null;
}

export interface NotificationListResponse {
  items: Notification[];
  total: number;
  limit: number;
  offset: number;
}

class NotificationApiService {
  /**
   * Get paginated notifications for the current user
   */
  async getNotifications(
    limit: number = 20,
    offset: number = 0,
  ): Promise<NotificationListResponse> {
    const params = new URLSearchParams();
    params.append("limit", limit.toString());
    params.append("offset", offset.toString());

    const response = await api.makeAuthenticatedRequest(
      `/api/notification?${params.toString()}`,
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to fetch notifications");
    }

    return await response.json();
  }

  /**
   * Get unread notification count
   */
  async getUnreadCount(): Promise<number> {
    const response = await api.makeAuthenticatedRequest(
      "/api/notification/unread-count",
    );

    if (!response.ok) {
      throw new Error("Failed to fetch unread count");
    }

    const data = await response.json();
    return data.count;
  }

  /**
   * Mark a single notification as read
   */
  async markAsRead(notificationId: number): Promise<void> {
    const response = await api.makeAuthenticatedRequest(
      `/api/notification/${notificationId}/read`,
      { method: "PUT" },
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to mark notification as read");
    }
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(): Promise<void> {
    const response = await api.makeAuthenticatedRequest(
      "/api/notification/read-all",
      { method: "PUT" },
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(
        error.error || "Failed to mark all notifications as read",
      );
    }
  }

  /**
   * Get a human-readable message for a notification
   */
  getNotificationMessage(notification: Notification): string {
    const actorName =
      notification.actorUser.displayName ||
      notification.actorUser.handle ||
      "Someone";

    switch (notification.type) {
      case "Like":
        const postContent =
          notification.post?.trackName ||
          notification.post?.albumName ||
          notification.post?.artistName ||
          notification.post?.playlistName ||
          "your post";
        return `${actorName} liked ${postContent}`;
      case "Repost":
        const repostContent =
          notification.post?.trackName ||
          notification.post?.albumName ||
          notification.post?.artistName ||
          notification.post?.playlistName ||
          "your post";
        return `${actorName} reposted ${repostContent}`;
      case "Follow":
        return `${actorName} started following you`;
      default:
        return `${actorName} interacted with your content`;
    }
  }

  /**
   * Format time ago for notifications
   */
  getTimeAgo(createdAt: string): string {
    const now = new Date();
    const date = new Date(createdAt);
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;

    return date.toLocaleDateString();
  }
}

const notificationApi = new NotificationApiService();
export default notificationApi;
