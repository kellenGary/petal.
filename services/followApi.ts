import api from "./api";

interface FollowUser {
  id: number;
  displayName: string;
  handle: string;
  profileImageUrl: string | null;
  followedAt: string;
}

interface FollowListResponse {
  items: FollowUser[];
  total: number;
  limit: number;
  offset: number;
}

interface FollowCounts {
  followers: number;
  following: number;
}

interface GraphConnection {
  followerId: number;
  followeeId: number;
}

class FollowApiService {
  /**
   * Follow a user
   * @param userId - The ID of the user to follow
   */
  async followUser(
    userId: number,
  ): Promise<{ message: string; isFollowing: boolean }> {
    const response = await api.makeAuthenticatedRequest(
      `/api/follow/${userId}`,
      {
        method: "POST",
      },
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to follow user");
    }

    return await response.json();
  }

  /**
   * Unfollow a user
   * @param userId - The ID of the user to unfollow
   */
  async unfollowUser(
    userId: number,
  ): Promise<{ message: string; isFollowing: boolean }> {
    const response = await api.makeAuthenticatedRequest(
      `/api/follow/${userId}`,
      {
        method: "DELETE",
      },
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to unfollow user");
    }

    return await response.json();
  }

  /**
   * Check if current user is following a specific user
   * @param userId - The ID of the user to check
   */
  async getFollowStatus(userId: number): Promise<boolean> {
    const response = await api.makeAuthenticatedRequest(
      `/api/follow/status/${userId}`,
    );

    if (!response.ok) {
      throw new Error("Failed to get follow status");
    }

    const data = await response.json();
    return data.isFollowing;
  }

  /**
   * Check follow status for multiple users at once
   * @param userIds - Array of user IDs to check
   * @returns Object mapping user IDs to their follow status
   */
  async getFollowStatusBatch(
    userIds: number[],
  ): Promise<Record<number, boolean>> {
    const response = await api.makeAuthenticatedRequest(
      "/api/follow/status/batch",
      {
        method: "POST",
        body: JSON.stringify(userIds),
      },
    );

    if (!response.ok) {
      throw new Error("Failed to get follow status batch");
    }

    return await response.json();
  }

  /**
   * Get all connections between a list of users
   * @param userIds - Array of user IDs to check connections between
   */
  async getGraphConnections(userIds: number[]): Promise<GraphConnection[]> {
    const response = await api.makeAuthenticatedRequest(
      "/api/follow/connections",
      {
        method: "POST",
        body: JSON.stringify(userIds),
      },
    );

    if (!response.ok) {
      throw new Error("Failed to get graph connections");
    }

    return await response.json();
  }

  /**
   * Get followers of a user
   * @param userId - The ID of the user
   * @param limit - Number of results to return (default 50)
   * @param offset - Number of results to skip (default 0)
   */
  async getFollowers(
    userId: number,
    limit: number = 50,
    offset: number = 0,
    query?: string,
  ): Promise<FollowListResponse> {
    const params = new URLSearchParams();
    params.append("limit", limit.toString());
    params.append("offset", offset.toString());
    if (query) {
      params.append("query", query);
    }

    const response = await api.makeAuthenticatedRequest(
      `/api/follow/followers/${userId}?${params.toString()}`,
    );

    if (!response.ok) {
      throw new Error("Failed to get followers");
    }

    return await response.json();
  }

  /**
   * Get users that a user is following
   * @param userId - The ID of the user
   * @param limit - Number of results to return (default 50)
   * @param offset - Number of results to skip (default 0)
   * @param query - Optional search query
   */
  async getFollowing(
    userId: number,
    limit: number = 50,
    offset: number = 0,
    query?: string,
  ): Promise<FollowListResponse> {
    const params = new URLSearchParams();
    params.append("limit", limit.toString());
    params.append("offset", offset.toString());
    if (query) {
      params.append("query", query);
    }

    const response = await api.makeAuthenticatedRequest(
      `/api/follow/following/${userId}?${params.toString()}`,
    );

    if (!response.ok) {
      throw new Error("Failed to get following");
    }

    return await response.json();
  }

  /**
   * Get follower and following counts for a user
   * @param userId - The ID of the user
   */
  async getFollowCounts(userId: number): Promise<FollowCounts> {
    const response = await api.makeAuthenticatedRequest(
      `/api/follow/counts/${userId}`,
    );

    if (!response.ok) {
      throw new Error("Failed to get follow counts");
    }

    return await response.json();
  }

  /**
   * Toggle follow status for a user
   * @param userId - The ID of the user
   * @param isCurrentlyFollowing - Current follow status
   * @returns New follow status
   */
  async toggleFollow(
    userId: number,
    isCurrentlyFollowing: boolean,
  ): Promise<boolean> {
    if (isCurrentlyFollowing) {
      await this.unfollowUser(userId);
      return false;
    } else {
      await this.followUser(userId);
      return true;
    }
  }
}

export default new FollowApiService();
