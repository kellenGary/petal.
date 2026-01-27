import { ThemedText } from '@/components/themed-text';
import UserCard from "@/components/user-card";
import { Colors, Fonts } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import dbApi from "@/services/dbApi";
import followApi from "@/services/followApi";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function ExploreScreen() {
  const [users, setUsers] = useState<any[]>([]);
  const [followStatus, setFollowStatus] = useState<Record<number, boolean>>({});
  const [loadingFollows, setLoadingFollows] = useState<Record<number, boolean>>(
    {},
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

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
        }
      } catch (error) {
        console.error("Error fetching users:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Filter users based on search query
  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return users;

    const query = searchQuery.toLowerCase();
    return users.filter(
      (user) =>
        user.displayName?.toLowerCase().includes(query) ||
        user.handle?.toLowerCase().includes(query),
    );
  }, [users, searchQuery]);

  const handleToggleFollow = useCallback(
    async (userId: number) => {
      if (loadingFollows[userId]) return;

      setLoadingFollows((prev) => ({ ...prev, [userId]: true }));

      try {
        const currentStatus = followStatus[userId] || false;
        const newStatus = await followApi.toggleFollow(userId, currentStatus);
        setFollowStatus((prev) => ({ ...prev, [userId]: newStatus }));
      } catch (error) {
        console.error("Error toggling follow:", error);
      } finally {
        setLoadingFollows((prev) => ({ ...prev, [userId]: false }));
      }
    },
    [followStatus, loadingFollows],
  );

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top },
        { backgroundColor: colors.background },
      ]}
    >
      {/* Header */}
      <View style={styles.header}>
        <ThemedText style={[styles.headerTitle, { color: colors.text }]}>
          Find People
        </ThemedText>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View
          style={[
            styles.searchBar,
            {
              backgroundColor: isDark
                ? "rgba(255,255,255,0.1)"
                : "rgba(0,0,0,0.05)",
            },
          ]}
        >
          <MaterialIcons
            name="search"
            size={22}
            color={colors.tabIconDefault}
          />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search by name or username..."
            placeholderTextColor={colors.tabIconDefault}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <MaterialIcons
              name="close"
              size={20}
              color={colors.tabIconDefault}
              onPress={() => setSearchQuery("")}
            />
          )}
        </View>
      </View>

      {/* User List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.tint} />
        </View>
      ) : (
        <ScrollView
          style={styles.scrollContainer}
          contentContainerStyle={styles.userList}
          showsVerticalScrollIndicator={false}
        >
          {filteredUsers.length === 0 ? (
            <View style={styles.emptyContainer}>
              <MaterialIcons
                name="person-search"
                size={48}
                color={colors.tabIconDefault}
              />
              <Text
                style={[styles.emptyText, { color: colors.tabIconDefault }]}
              >
                {searchQuery ? "No users found" : "No users to display"}
              </Text>
            </View>
          ) : (
            <View style={styles.userGrid}>
              {filteredUsers.map((user) => (
                <UserCard
                  key={user.id}
                  user={user}
                  isFollowing={followStatus[user.id] || false}
                  isLoading={loadingFollows[user.id] || false}
                  onToggleFollow={handleToggleFollow}
                />
              ))}
            </View>
          )}
          <View style={styles.spacer} />
        </ScrollView>
      )}
    </View>
  );
} 3

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: "800",
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    padding: 0,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  scrollContainer: {
    flex: 1,
  },
  userList: {
    paddingHorizontal: 16,
  },
  userGrid: {
    gap: 0,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
    gap: 12,
  },
  emptyText: {
    fontSize: 16,
  },
  spacer: {
    height: 100,
  },
});
