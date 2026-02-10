import { RelativePathString } from "@/.expo/types/router";
import { ScrollView } from "react-native";
import { Colors } from "@/constants/theme";
import { useAuth } from "@/contexts/AuthContext";
import { useColorScheme } from "@/hooks/use-color-scheme.web";
import listeningHistoryApi from "@/services/listeningHistoryApi";
import { useCallback, useEffect, useState } from "react";
import SongItem from "../song-item";
const PAGE_SIZE = 50;

export default function RecentlyPlayedTracks() {
  const { isAuthenticated } = useAuth();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = Colors[isDark ? "dark" : "light"];
  const [historyData, setHistoryData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  // Pagination state for each tab
  const [historyOffset, setHistoryOffset] = useState(0);
  const [hasMoreHistory, setHasMoreHistory] = useState(true);

  const fetchHistory = useCallback(
    async (refresh = false) => {
      if (!isAuthenticated) return;

      const currentOffset = refresh ? 0 : historyOffset;
      if (refresh) {
        setRefreshing(true);
      } else if (currentOffset === 0) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      try {
        const data = await listeningHistoryApi.getEnrichedListeningHistory(
          PAGE_SIZE,
          currentOffset
        );
        if (refresh || currentOffset === 0) {
          setHistoryData(data);
          setHistoryOffset(PAGE_SIZE);
        } else {
          setHistoryData((prev: any) => ({
            ...data,
            items: [...(prev?.items || []), ...(data?.items || [])],
          }));
          setHistoryOffset(currentOffset + PAGE_SIZE);
        }
        setHasMoreHistory((data?.items?.length || 0) >= PAGE_SIZE);
      } catch (error) {
        console.error("Failed to fetch listening history:", error);
      } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [isAuthenticated, historyOffset]
  );

  useEffect(() => {
    fetchHistory(true);
  }, [fetchHistory]);

  return (
    <ScrollView style={{ flexDirection: "column", gap: 4, width: "100%" }} showsVerticalScrollIndicator={false}>
      {!historyData
        ? null
        : (historyData.items || []).map((group: any, index: number) => {
            const track = group.track;
            return (
              <SongItem
                key={`${track.id}-${index}`}
                id={track.id}
                title={track.name}
                artist={track.artists
                  .map((artist: any) => artist.name)
                  .join(", ")}
                cover={group.track.album.image_url}
                link={`/song/${track.id}` as RelativePathString}
              />
            );
          })}
    </ScrollView>
  );
}
