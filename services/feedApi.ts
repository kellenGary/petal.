import api from "./api";

export interface FeedUser {
  id: number;
  displayName: string | null;
  handle: string | null;
  profileImageUrl: string | null;
}

export interface FeedTrack {
  id: number;
  spotifyId: string;
  name: string;
  artistNames: string[];
  albumName: string | null;
  albumImageUrl: string | null;
  durationMs: number;
}

export interface FeedAlbum {
  id: number;
  spotifyId: string;
  name: string;
  imageUrl: string | null;
}

export interface FeedPlaylist {
  id: number;
  spotifyId: string;
  name: string;
  imageUrl: string | null;
}

export interface FeedArtist {
  id: number;
  spotifyId: string;
  name: string;
  imageUrl: string | null;
}

export interface ListeningSessionTrack {
  trackId: number;
  spotifyId: string | null;
  name: string | null;
  artistNames: string | null;
  albumImageUrl: string | null;
  durationMs: number;
  playedAt: string;
}

export interface ListeningSessionMetadata {
  tracks: ListeningSessionTrack[];
  totalDurationMs: number;
  trackCount: number;
}

export interface SharedPostMetadata {
  caption: string | null;
}

export interface FeedPost {
  id: number;
  type: PostType;
  createdAt: string;
  user: FeedUser;
  track: FeedTrack | null;
  album: FeedAlbum | null;
  playlist: FeedPlaylist | null;
  artist: FeedArtist | null;
  metadataJson: string | null;
  listeningSessionId: number | null;
  likeCount: number;
  repostCount: number;
  originalPostId: number | null;
  originalPostUser: FeedUser | null;
}

export interface FeedListeningSessionPost extends FeedPost {
  tracks: FeedTrack[];
}

export interface FeedResponse {
  items: FeedPost[];
  total: number;
  limit: number;
  offset: number;
}

export type PostType =
  | "Play"
  | "LikedTrack"
  | "LikedAlbum"
  | "PlaylistAdd"
  | "ListeningSession"
  | "LikedPlaylist"
  | "SharedTrack"
  | "SharedAlbum"
  | "SharedPlaylist"
  | "SharedArtist"
  | "Repost";

export type PostVisibility = "Public" | "Followers";

class FeedApiService {
  /**
   * Get the feed of posts from users the current user follows
   * @param limit - Number of posts to return (default 20)
   * @param offset - Number of posts to skip (default 0)
   * @param type - Optional filter by post type
   */
  async getFeed(
    limit: number = 20,
    offset: number = 0,
    type?: PostType,
  ): Promise<FeedResponse> {
    const params = new URLSearchParams();
    params.append("limit", limit.toString());
    params.append("offset", offset.toString());
    if (type) {
      params.append("type", type);
    }

    const response = await api.makeAuthenticatedRequest(
      `/api/feed?${params.toString()}`,
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to fetch feed");
    }

    return await response.json();
  }

  /**
   * Get posts from a specific user
   * @param userId - The ID of the user
   * @param limit - Number of posts to return (default 20)
   * @param offset - Number of posts to skip (default 0)
   * @param type - Optional filter by post type
   */
  async getUserPosts(
    userId: number,
    limit: number = 20,
    offset: number = 0,
    type?: PostType,
  ): Promise<FeedResponse> {
    const params = new URLSearchParams();
    params.append("limit", limit.toString());
    params.append("offset", offset.toString());
    if (type) {
      params.append("type", type);
    }

    const response = await api.makeAuthenticatedRequest(
      `/api/feed/user/${userId}?${params.toString()}`,
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to fetch user posts");
    }

    return await response.json();
  }

  /**
   * Helper to get a human-readable description of a post
   */
  getPostDescription(post: FeedPost): string {
    const userName = post.user.displayName || post.user.handle || "Someone";

    switch (post.type) {
      case "Play":
        return `${userName} listened to "${post.track?.name}"`;
      case "LikedTrack":
        return `${userName} liked "${post.track?.name}"`;
      case "LikedAlbum":
        return `${userName} liked the album "${post.album?.name}"`;
      case "LikedPlaylist":
        return `${userName} liked the playlist "${post.playlist?.name}"`;
      case "PlaylistAdd":
        return `${userName} added a track to "${post.playlist?.name}"`;
      case "ListeningSession":
        const metadata = this.parseListeningSessionMetadata(post);
        return `${userName} listened to ${
          metadata?.trackCount || "some"
        } tracks`;
      case "SharedTrack":
        return `${userName} shared "${post.track?.name}"`;
      case "SharedAlbum":
        return `${userName} shared the album "${post.album?.name}"`;
      case "SharedPlaylist":
        return `${userName} shared the playlist "${post.playlist?.name}"`;
      case "SharedArtist":
        return `${userName} shared ${post.artist?.name}`;
      default:
        return `${userName} shared something`;
    }
  }

  /**
   * Helper to get the image URL for a post
   */
  getPostImageUrl(post: FeedPost): string | null {
    if (post.track?.albumImageUrl) return post.track.albumImageUrl;
    if (post.album?.imageUrl) return post.album.imageUrl;
    if (post.playlist?.imageUrl) return post.playlist.imageUrl;
    if (post.artist?.imageUrl) return post.artist.imageUrl;
    return null;
  }

  /**
   * Parse the listening session metadata from a post
   */
  parseListeningSessionMetadata(
    post: FeedPost,
  ): ListeningSessionMetadata | null {
    if (post.type !== "ListeningSession" || !post.metadataJson) return null;
    try {
      const parsed = JSON.parse(post.metadataJson);
      if (!parsed) return null;

      // Handle PascalCase keys from backend
      const rawTracks = parsed.Tracks || parsed.tracks || [];
      const tracks: ListeningSessionTrack[] = rawTracks.map((t: any) => ({
        trackId: t.TrackId ?? t.trackId,
        spotifyId: t.SpotifyId ?? t.spotifyId ?? null,
        name: t.Name ?? t.name ?? null,
        artistNames: t.ArtistNames ?? t.artistNames ?? null,
        albumImageUrl: t.AlbumImageUrl ?? t.albumImageUrl ?? null,
        durationMs: t.DurationMs ?? t.durationMs ?? 0,
        playedAt: t.PlayedAt ?? t.playedAt ?? "",
      }));

      return {
        tracks,
        totalDurationMs: parsed.TotalDurationMs ?? parsed.totalDurationMs ?? 0,
        trackCount: parsed.TrackCount ?? parsed.trackCount ?? tracks.length,
      };
    } catch {
      return null;
    }
  }

  /**
   * Parse shared post metadata (caption) from a post
   */
  parseSharedPostMetadata(post: FeedPost): SharedPostMetadata | null {
    if (!post.metadataJson) return null;
    const sharedTypes: PostType[] = [
      "SharedTrack",
      "SharedAlbum",
      "SharedPlaylist",
      "SharedArtist",
    ];
    if (!sharedTypes.includes(post.type)) return null;
    try {
      const parsed = JSON.parse(post.metadataJson);
      if (!parsed) return null;

      // metadata may use different casing for the caption key (e.g. "Caption").
      // Find caption case-insensitively.
      let caption: string | null = null;
      if (typeof parsed === "string") {
        caption = parsed;
      } else if (typeof parsed === "object") {
        // direct property
        if (parsed.caption) caption = parsed.caption;
        else {
          for (const key of Object.keys(parsed)) {
            if (key.toLowerCase() === "caption") {
              caption = parsed[key];
              break;
            }
          }
        }
      }

      return { caption: caption ?? null };
    } catch {
      return null;
    }
  }

  /**
   * Get the caption for a shared post
   */
  getCaption(post: FeedPost): string | null {
    const metadata = this.parseSharedPostMetadata(post);
    return metadata?.caption || null;
  }

  /**
   * Check if a post type is a "shared" post
   */
  isSharedPost(type: PostType): boolean {
    return [
      "SharedTrack",
      "SharedAlbum",
      "SharedPlaylist",
      "SharedArtist",
    ].includes(type);
  }

  /**
   * Check if a post type is a "liked" post
   */
  isLikedPost(type: PostType): boolean {
    return ["LikedTrack", "LikedAlbum", "LikedPlaylist"].includes(type);
  }

  /**
   * Helper to format the time since a post was created
   */
  getTimeAgo(createdAt: string): string {
    const now = new Date();
    const postDate = new Date(createdAt);
    const diffMs = now.getTime() - postDate.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return postDate.toLocaleDateString();
  }

  /**
   * Share a track to the feed
   */
  async shareTrack(
    trackId?: number,
    spotifyId?: string,
    caption?: string,
    visibility: PostVisibility = "Public",
  ): Promise<{ message: string; postId: number }> {
    const response = await api.makeAuthenticatedRequest(
      "/api/post/share/track",
      {
        method: "POST",
        body: JSON.stringify({ trackId, spotifyId, caption, visibility }),
      },
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to share track");
    }

    return await response.json();
  }

  /**
   * Share an album to the feed
   */
  async shareAlbum(
    albumId?: number,
    spotifyId?: string,
    caption?: string,
    visibility: PostVisibility = "Public",
  ): Promise<{ message: string; postId: number }> {
    const response = await api.makeAuthenticatedRequest(
      "/api/post/share/album",
      {
        method: "POST",
        body: JSON.stringify({ albumId, spotifyId, caption, visibility }),
      },
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to share album");
    }

    return await response.json();
  }

  /**
   * Share a playlist to the feed
   */
  async sharePlaylist(
    playlistId?: number,
    spotifyId?: string,
    caption?: string,
    visibility: PostVisibility = "Public",
  ): Promise<{ message: string; postId: number }> {
    const response = await api.makeAuthenticatedRequest(
      "/api/post/share/playlist",
      {
        method: "POST",
        body: JSON.stringify({ playlistId, spotifyId, caption, visibility }),
      },
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to share playlist");
    }

    return await response.json();
  }

  /**
   * Share an artist to the feed
   */
  async shareArtist(
    artistId?: number,
    spotifyId?: string,
    caption?: string,
    visibility: PostVisibility = "Public",
  ): Promise<{ message: string; postId: number }> {
    const response = await api.makeAuthenticatedRequest(
      "/api/post/share/artist",
      {
        method: "POST",
        body: JSON.stringify({ artistId, spotifyId, caption, visibility }),
      },
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to share artist");
    }

    return await response.json();
  }

  /**
   * Delete a post
   */
  async deletePost(postId: number): Promise<{ message: string }> {
    const response = await api.makeAuthenticatedRequest(`/api/post/${postId}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to delete post");
    }

    return await response.json();
  }

  /**
   * Seed dummy posts for testing
   */
  async seedPosts(): Promise<{ message: string }> {
    const response = await api.makeAuthenticatedRequest("/api/post/seed", {
      method: "POST",
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to seed posts");
    }

    return await response.json();
  }

  /**
   * Like a post
   */
  async likePost(
    postId: number,
  ): Promise<{ isLiked: boolean; likeCount: number }> {
    const response = await api.makeAuthenticatedRequest(
      `/api/post/${postId}/like`,
      {
        method: "POST",
      },
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to like post");
    }

    return await response.json();
  }

  /**
   * Unlike a post
   */
  async unlikePost(
    postId: number,
  ): Promise<{ isLiked: boolean; likeCount: number }> {
    const response = await api.makeAuthenticatedRequest(
      `/api/post/${postId}/like`,
      {
        method: "DELETE",
      },
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to unlike post");
    }

    return await response.json();
  }

  /**
   * Get like status for a post
   */
  async getLikeStatus(
    postId: number,
  ): Promise<{ isLiked: boolean; likeCount: number }> {
    const response = await api.makeAuthenticatedRequest(
      `/api/post/${postId}/like/status`,
    );

    if (!response.ok) {
      throw new Error("Failed to get like status");
    }

    return await response.json();
  }

  /**
   * Get like status for multiple posts
   */
  async getLikeStatusBatch(
    postIds: number[],
  ): Promise<Record<number, { isLiked: boolean; likeCount: number }>> {
    const response = await api.makeAuthenticatedRequest(
      "/api/post/likes/status/batch",
      {
        method: "POST",
        body: JSON.stringify(postIds),
      },
    );

    if (!response.ok) {
      throw new Error("Failed to get like status batch");
    }

    return await response.json();
  }

  /**
   * Repost a post
   */
  async repostPost(postId: number): Promise<{
    isReposted: boolean;
    repostCount: number;
    repostPostId: number;
  }> {
    const response = await api.makeAuthenticatedRequest(
      `/api/post/${postId}/repost`,
      {
        method: "POST",
      },
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to repost");
    }

    return await response.json();
  }

  /**
   * Remove a repost
   */
  async removeRepost(
    postId: number,
  ): Promise<{ isReposted: boolean; repostCount: number }> {
    const response = await api.makeAuthenticatedRequest(
      `/api/post/${postId}/repost`,
      {
        method: "DELETE",
      },
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to remove repost");
    }

    return await response.json();
  }

  /**
   * Get repost status for a post
   */
  async getRepostStatus(
    postId: number,
  ): Promise<{ isReposted: boolean; repostCount: number }> {
    const response = await api.makeAuthenticatedRequest(
      `/api/post/${postId}/repost/status`,
    );

    if (!response.ok) {
      throw new Error("Failed to get repost status");
    }

    return await response.json();
  }

  /**
   * Get repost status for multiple posts
   */
  async getRepostStatusBatch(
    postIds: number[],
  ): Promise<Record<number, { isReposted: boolean; repostCount: number }>> {
    const response = await api.makeAuthenticatedRequest(
      "/api/post/reposts/status/batch",
      {
        method: "POST",
        body: JSON.stringify(postIds),
      },
    );

    if (!response.ok) {
      throw new Error("Failed to get repost status batch");
    }

    return await response.json();
  }

  /**
   * Check if a post is a repost
   */
  isRepost(post: FeedPost): boolean {
    return post.type === "Repost" && post.originalPostId !== null;
  }
}

const feedApi = new FeedApiService();
export default feedApi;
