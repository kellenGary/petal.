import { ThemedText } from "@/components/themed-text";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Image } from "expo-image";
import React, { useMemo, useState } from "react";
import { Dimensions, Pressable, StyleSheet, Text, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";
import Svg, { Line } from "react-native-svg";

interface User {
  id: number;
  displayName: string;
  handle: string;
  profileImageUrl?: string;
}

interface GraphViewProps {
  users: User[];
  currentUser: any;
  followStatus: Record<number, boolean>;
  onToggleFollow: (userId: number) => void;
  connections: { followerId: number; followeeId: number }[];
}

const SCREEN_WIDTH = Dimensions.get("window").width;
const SCREEN_HEIGHT = Dimensions.get("window").height;
const NODE_SIZE = 60;
const SPACING = 120; // Distance between nodes in spiral
const GRAPH_SIZE = 4000; // Large canvas for connections

export default function GraphView({
  users,
  currentUser,
  followStatus,
  onToggleFollow,
  connections = [],
}: GraphViewProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = Colors[isDark ? "dark" : "light"];

  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  // --- Animation State ---
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  const onLayout = (event: any) => {
    const { width, height } = event.nativeEvent.layout;
    setContainerSize({ width, height });
  };

  // --- Calculate Node Positions (Spiral) ---
  const nodePositions = useMemo(() => {
    // Current user is always at (0,0)
    // Other users spiral out
    const otherUsers = users.filter(u => !currentUser || u.id !== currentUser.id);
    return otherUsers.map((user, index) => {
      // Golden angle in radians
      const angle = index * 2.39996;
      // Radius depends on index (sqrt distributes area evenly)
      const radius = SPACING * Math.sqrt(index + 1);

      return {
        user,
        x: radius * Math.cos(angle),
        y: radius * Math.sin(angle),
      };
    });
  }, [users]);

  // --- Node Position Lookup ---
  const nodeMap = useMemo(() => {
    const map = new Map<number, { x: number; y: number }>();
    if (currentUser) {
      map.set(currentUser.id, { x: 0, y: 0 });
    }
    nodePositions.forEach((node) => {
      map.set(node.user.id, { x: node.x, y: node.y });
    });
    return map;
  }, [currentUser, nodePositions]);

  // --- Gestures ---
  const panGesture = Gesture.Pan()
    .onChange((e) => {
      translateX.value = savedTranslateX.value + e.translationX;
      translateY.value = savedTranslateY.value + e.translationY;
    })
    .onEnd((e) => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    });

  const pinchGesture = Gesture.Pinch()
    .onChange((e) => {
      scale.value = savedScale.value * e.scale;
    })
    .onEnd(() => {
      savedScale.value = scale.value;
    });

  const composedGesture = Gesture.Simultaneous(panGesture, pinchGesture);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  // Helper to render user avatar
  const renderUserNode = (
    user: User,
    x: number,
    y: number,
    isCenter: boolean = false,
  ) => {
    const isFollowing = followStatus[user.id];

    return (
      <View
        key={user.id || "me"}
        style={[
          styles.nodeContainer,
          {
            left: x - NODE_SIZE / 2,
            top: y - NODE_SIZE / 2,
            zIndex: isCenter ? 100 : 10,
          },
        ]}
      >
        <Pressable
          onPress={() => !isCenter && onToggleFollow(user.id)}
          style={[
            styles.avatarContainer,
            {
              borderColor: isCenter
                ? colors.tint
                : isFollowing
                  ? colors.primary
                  : colors.icon,
            },
          ]}
        >
          {user.profileImageUrl ? (
            <Image
              source={{ uri: user.profileImageUrl }}
              style={styles.avatarImage}
            />
          ) : (
            <View
              style={[
                styles.avatarPlaceholder,
                { backgroundColor: colors.muted },
              ]}
            >
              <ThemedText style={styles.avatarText}>
                {user.displayName?.[0]?.toUpperCase() || "?"}
              </ThemedText>
            </View>
          )}
        </Pressable>
        <ThemedText style={styles.nodeLabel} numberOfLines={1}>
          {isCenter ? "Me" : user.displayName}
        </ThemedText>
        {!isCenter && (
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: isFollowing ? colors.primary : colors.muted },
            ]}
          >
            <Text
              style={[
                styles.statusText,
                {
                  color: isFollowing
                    ? colors.primaryForeground
                    : colors.mutedForeground,
                },
              ]}
            >
              {isFollowing ? "Following" : "Follow"}
            </Text>
          </View>
        )}
      </View>
    );
  };

  if (containerSize.width === 0) {
    return <View style={styles.container} onLayout={onLayout} />;
  }

  // Center the graph initially by offsetting half the container size
  const centerOffsetX = containerSize.width / 2;
  const centerOffsetY = containerSize.height / 2;

  return (
    <View style={styles.container} onLayout={onLayout}>
      <GestureDetector gesture={composedGesture}>
        <Animated.View style={[styles.gestureArea, animatedStyle]}>
          {/* Connections Layer (SVG) */}
          <View
            style={[
              styles.svgContainer,
              {
                left: centerOffsetX - GRAPH_SIZE / 2,
                top: centerOffsetY - GRAPH_SIZE / 2,
              },
            ]}
            pointerEvents="none"
          >
            <Svg
              height={GRAPH_SIZE}
              width={GRAPH_SIZE}
              viewBox={`${-GRAPH_SIZE / 2} ${-GRAPH_SIZE / 2} ${GRAPH_SIZE} ${GRAPH_SIZE}`}
            >
              {/* 1. Solid lines from Me to Followed Users */}
              {nodePositions.map((node) => {
                const isFollowing = followStatus[node.user.id];
                if (!isFollowing) return null; // Only draw solid lines for actual follows

                return (
                  <Line
                    key={`me-${node.user.id}`}
                    x1={0}
                    y1={0}
                    x2={node.x}
                    y2={node.y}
                    stroke={colors.primary}
                    strokeWidth={2}
                    opacity={0.8}
                  />
                );
              })}

              {/* 2. Dotted lines for connections bewteen other users */}
              {connections.map((conn, idx) => {
                // Skip connections involving current user (handled above or ignored)
                if (currentUser && conn.followerId === currentUser.id) return null;

                const startNode = nodeMap.get(conn.followerId);
                const endNode = nodeMap.get(conn.followeeId);

                if (!startNode || !endNode) return null;

                return (
                  <Line
                    key={`conn-${idx}`}
                    x1={startNode.x}
                    y1={startNode.y}
                    x2={endNode.x}
                    y2={endNode.y}
                    stroke={colors.text}
                    strokeWidth={1}
                    strokeDasharray="5, 5"
                    opacity={0.4}
                  />
                );
              })}
            </Svg>
          </View>

          {/* Nodes Layer - positioned relative to center */}
          {currentUser &&
            renderUserNode(currentUser, centerOffsetX, centerOffsetY, true)}
          {nodePositions.map((node) =>
            renderUserNode(
              node.user,
              centerOffsetX + node.x,
              centerOffsetY + node.y,
            ),
          )}
        </Animated.View>
      </GestureDetector>
    </View>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: "hidden",
  },
  gestureArea: {
    flex: 1,
  },
  svgContainer: {
    position: "absolute",
    width: GRAPH_SIZE,
    height: GRAPH_SIZE,
  },
  nodeContainer: {
    position: "absolute",
    width: NODE_SIZE,
    height: NODE_SIZE + 40, // Extra space for text
    alignItems: "center",
    justifyContent: "flex-start",
  },
  avatarContainer: {
    width: NODE_SIZE,
    height: NODE_SIZE,
    borderRadius: NODE_SIZE / 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
    borderRadius: NODE_SIZE / 2,
  },
  avatarPlaceholder: {
    width: "100%",
    height: "100%",
    borderRadius: NODE_SIZE / 2,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    fontSize: 24,
    fontWeight: "bold",
  },
  nodeLabel: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowRadius: 2,
  },
  statusBadge: {
    marginTop: 2,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 8,
    fontWeight: "bold",
  },
});
