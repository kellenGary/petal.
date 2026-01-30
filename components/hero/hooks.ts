import sotdApi, { FollowingSotdItem } from "@/services/sotdApi";
import { useCallback, useEffect, useState } from "react";

/**
 * Hook to fetch following users' songs of the day
 */
export function useFollowingSotds(limit: number = 10) {
  const [sotds, setSotds] = useState<FollowingSotdItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSotds = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await sotdApi.getFollowingSotds();
      setSotds(data.slice(0, limit));
    } catch (err) {
      console.error("Failed to fetch following SOTDs:", err);
      setError("Failed to load");
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    fetchSotds();
  }, [fetchSotds]);

  return { sotds, loading, error, refetch: fetchSotds };
}
