import { useAuth } from "@/contexts/AuthContext";
import feedApi, { FeedPost } from "@/services/feedApi";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/**
 * ForYou placeholder item to be injected into the feed.
 * The actual data is fetched lazily by the ForYouCard component.
 */
export interface ForYouItem {
  type: "ForYou";
  id: string; // Unique ID for this ForYou card instance
}

export type FeedItem = FeedPost | ForYouItem;

/**
 * Minimum number of posts between ForYou cards.
 */
const FOR_YOU_MIN_INTERVAL = 10;

/**
 * Maximum number of posts between ForYou cards.
 */
const FOR_YOU_MAX_INTERVAL = 20;

/**
 * Generates a random interval between FOR_YOU_MIN_INTERVAL and FOR_YOU_MAX_INTERVAL.
 */
function getRandomInterval(): number {
  return Math.floor(
    Math.random() * (FOR_YOU_MAX_INTERVAL - FOR_YOU_MIN_INTERVAL + 1) +
      FOR_YOU_MIN_INTERVAL,
  );
}

/**
 * Injects ForYou cards into the feed at random intervals.
 * Each ForYou card appears after 5-10 regular posts.
 */
function injectForYouCards(posts: FeedPost[]): FeedItem[] {
  if (posts.length === 0) return [];

  const result: FeedItem[] = [];
  let nextForYouAt = getRandomInterval();
  let forYouCount = 0;

  for (let i = 0; i < posts.length; i++) {
    result.push(posts[i]);

    // Check if we should insert a ForYou card after this post
    if (i + 1 === nextForYouAt) {
      result.push({
        type: "ForYou",
        id: `for-you-${forYouCount}-${Date.now()}`,
      });
      forYouCount++;
      nextForYouAt = i + 1 + getRandomInterval();
    }
  }

  return result;
}

export default function useFeed() {
  const { isAuthenticated } = useAuth();
  const [feedPosts, setFeedPosts] = useState<FeedPost[]>([]);
  const [feedLoading, setFeedLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [feedOffset, setFeedOffset] = useState(0);
  const [hasMorePosts, setHasMorePosts] = useState(true);

  // Keep stable ForYou card positions across re-renders
  const forYouSeedRef = useRef(Date.now());

  const fetchFeedPosts = useCallback(
    async (isRefresh = false) => {
      if (!isAuthenticated) return;

      try {
        const offset = isRefresh ? 0 : feedOffset;
        const response = await feedApi.getFeed(20, offset);

        const keyFor = (p: FeedPost) => `${p.type}-${p.id}-${p.createdAt}`;

        if (isRefresh) {
          setFeedPosts(response.items);
          setFeedOffset(response.items.length);
          setHasMorePosts(response.items.length < response.total);
          // Reset ForYou seed on refresh to get new random positions
          forYouSeedRef.current = Date.now();
        } else {
          setFeedPosts((prev) => {
            const map = new Map<string, FeedPost>();
            for (const p of prev) map.set(keyFor(p), p);
            for (const p of response.items) map.set(keyFor(p), p);
            return Array.from(map.values());
          });
          setFeedOffset((prev) => prev + response.items.length);
          setHasMorePosts(
            feedPosts.length + response.items.length < response.total,
          );
        }
      } catch (error) {
        console.error("Error fetching feed posts:", error);
      }
    },
    [isAuthenticated, feedOffset, feedPosts.length],
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchFeedPosts(true);
    setRefreshing(false);
  }, [fetchFeedPosts]);

  const handleLoadMore = useCallback(() => {
    if (!feedLoading && hasMorePosts) {
      setFeedLoading(true);
      fetchFeedPosts(false).finally(() => setFeedLoading(false));
    }
  }, [feedLoading, hasMorePosts, fetchFeedPosts]);

  useEffect(() => {
    fetchFeedPosts(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  // Memoize the feed with ForYou cards injected
  const feedWithForYou = useMemo(() => {
    return injectForYouCards(feedPosts);
  }, [feedPosts]);

  return {
    feedPosts: feedWithForYou,
    feedLoading,
    refreshing,
    handleRefresh,
    handleLoadMore,
    hasMorePosts,
  } as const;
}
