import FeedItemRouter from "@/components/ui/posts/feed-item-router";
import { Colors } from "@/constants/theme";
import { useScrollContext } from "@/contexts/ScrollContext";
import { useColorScheme } from "@/hooks/use-color-scheme";
import useFeed from "@/hooks/useFeed";
import React, { useCallback } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  View,
} from "react-native";

type FeedProps = {
  ListHeaderComponent?: React.ReactNode | null;
};

export default function Feed({ ListHeaderComponent = null }: FeedProps) {
  const { feedPosts, feedLoading, refreshing, handleRefresh, handleLoadMore } =
    useFeed();
  const { collapse } = useScrollContext();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = Colors[isDark ? "dark" : "light"];

  const handleScrollBeginDrag = useCallback(() => {
    collapse();
  }, [collapse]);

  const renderFooter = () => {
    if (!feedLoading) return null;
    return (
      <View style={styles.footer}>
        <ActivityIndicator size="small" color={colors.text} />
      </View>
    );
  };

  const renderEmpty = () => (
    <View style={styles.empty}>
      {/* keep the message minimal; the parent screen can replace if needed */}
    </View>
  );

  return (
    <FlatList
      data={feedPosts}
      renderItem={({ item }) => <FeedItemRouter item={item} />}
      keyExtractor={(item: any) => `${item.type}-${item.id}-${item.createdAt}`}
      ListHeaderComponent={() => <>{ListHeaderComponent}</>}
      ListFooterComponent={renderFooter}
      ListEmptyComponent={renderEmpty}
      onEndReached={handleLoadMore}
      onEndReachedThreshold={0.5}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor={colors.text}
        />
      }
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.content}
      onScrollBeginDrag={handleScrollBeginDrag}
    />
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: 64,
    paddingHorizontal: 16,
    gap: 12,
  },
  footer: {
    paddingVertical: 20,
    alignItems: "center",
  },
  empty: {
    padding: 32,
    alignItems: "center",
  },
});
