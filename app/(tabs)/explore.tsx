import ExploreContent from "@/components/explore-content";
import FilterBubble from "@/components/filter-bubble";
import GraphView from "@/components/graph-view";
import SearchBar from "@/components/search-bar";
import SearchView from "@/components/search-view";
import { ThemedText } from "@/components/themed-text";
import { Colors } from "@/constants/theme";
import { useAuth } from "@/contexts/AuthContext";
import { useColorScheme } from "@/hooks/use-color-scheme";
import dbApi from "@/services/dbApi";
import followApi from "@/services/followApi";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function ExploreScreen() {
  const { user } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [followStatus, setFollowStatus] = useState<Record<number, boolean>>({});
  const [loadingFollows, setLoadingFollows] = useState<Record<number, boolean>>({});
  const [connections, setConnections] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"users" | "content">("users");

  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = Colors[isDark ? "dark" : "light"];

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const usersData = await dbApi.getAllUsers();
        const usersList = usersData || [];
        setUsers(usersList);

        // Fetch follow status for all users
        if (usersList.length > 0) {
          const userIds = usersList.map((u: any) => u.id);
          const statuses = await followApi.getFollowStatusBatch(userIds);
          setFollowStatus(statuses);

          // Fetch connections between users
          const graphConnections = await followApi.getGraphConnections(userIds);
          setConnections(graphConnections);
        }
      } catch (error) {
        console.error("Error fetching users:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);



  const handleToggleFollow = useCallback(
    async (userId: number) => {
      // Prevent multiple taps while request is in flight?
      // With optimistic updates, we might want to allow it, but for now let's keep the guard
      // or we can remove the loading check since we update state immediately.
      // But keeping it prevents spamming the API.
      if (loadingFollows[userId]) return;

      const currentStatus = followStatus[userId] || false;
      const optimisticStatus = !currentStatus;

      // 1. Optimistically update UI
      setFollowStatus((prev) => ({ ...prev, [userId]: optimisticStatus }));
      setLoadingFollows((prev) => ({ ...prev, [userId]: true }));

      try {
        // 2. Make API call
        const confirmedStatus = await followApi.toggleFollow(
          userId,
          currentStatus,
        );

        // 3. Confirm with server response (should match optimistic)
        if (confirmedStatus !== optimisticStatus) {
          setFollowStatus((prev) => ({ ...prev, [userId]: confirmedStatus }));
        }
      } catch (error) {
        console.error("Error toggling follow:", error);
        // 4. Revert on error
        setFollowStatus((prev) => ({ ...prev, [userId]: currentStatus }));
      } finally {
        setLoadingFollows((prev) => ({ ...prev, [userId]: false }));
      }
    },
    [followStatus, loadingFollows],
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Graph Layer - lowest z-index, fills entire screen */}
      {activeTab === "users" && (
        <View style={styles.graphLayer}>
          {!loading && !searchQuery && (
            <GraphView
              users={users}
              currentUser={user}
              followStatus={followStatus}
              onToggleFollow={handleToggleFollow}
              connections={connections}
            />
          )}
          {loading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.tint} />
            </View>
          )}
        </View>
      )}

      {/* Header Overlay - positioned on top, only covers header area */}
      {!searchQuery && (
        <View
          style={[
            styles.headerOverlay,
            { paddingTop: insets.top },
          ]}
          pointerEvents="box-none"
        >
          <View pointerEvents="auto">
            <View style={styles.header}>
              <ThemedText type="title">Explore</ThemedText>
            </View>

            <View style={styles.searchContainer}>
              <SearchBar
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search by name or username..."
              />
            </View>

            <View style={styles.tabContainer}>
              <FilterBubble
                filterName="Users"
                activeFilter={activeTab === "users" ? "Users" : "Content"}
                setActiveFilter={(filter) =>
                  setActiveTab(filter === "Users" ? "users" : "content")
                }
              />
              <FilterBubble
                filterName="Content"
                activeFilter={activeTab === "users" ? "Users" : "Content"}
                setActiveFilter={(filter) =>
                  setActiveTab(filter === "Users" ? "users" : "content")
                }
              />
            </View>
          </View>
        </View>
      )}

      {/* Content tab - replaces graph when active, but only if no search query */}
      {!searchQuery && activeTab === "content" && (
        <View style={[styles.contentContainer, { paddingTop: insets.top + 140 }]}>
          <ExploreContent />
        </View>
      )}

      {/* Search View - renders when there is a query */}
      {!!searchQuery && (
        <View style={[styles.searchViewLayer, { paddingTop: insets.top, backgroundColor: colors.background }]}>
          <View style={styles.header}>
            <ThemedText type="title">Search</ThemedText>
          </View>

          <View style={styles.searchContainer}>
            <SearchBar
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search by name or song..."
              autoFocus
            />
          </View>

          <SearchView query={searchQuery} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  graphLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },
  headerOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  tabContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
  },
  contentContainer: {
    flex: 1,
  },
  searchViewLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 20,
  },
});
