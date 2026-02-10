import { ThemedText } from "@/components/ui/themed-text";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import {
  forceCenter,
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  SimulationLinkDatum,
  SimulationNodeDatum,
} from "d3-force";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
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

interface SimNode extends SimulationNodeDatum {
  id: number;
  user: User;
  isCenter: boolean;
}

interface SimLink extends SimulationLinkDatum<SimNode> {
  isDirect: boolean;
}

const SCREEN_WIDTH = Dimensions.get("window").width;
const SCREEN_HEIGHT = Dimensions.get("window").height;
const NODE_SIZE = 60;
const NODE_RADIUS = NODE_SIZE / 2 + 20;
const GRAPH_SIZE = 4000;

// --- Memoized User Node Component ---
const UserNode = React.memo(
  ({
    user,
    x,
    y,
    isCenter,
    isFollowing,
    colors,
    onToggleFollow,
  }: {
    user: User;
    x: number;
    y: number;
    isCenter: boolean;
    isFollowing?: boolean;
    colors: any;
    onToggleFollow: (id: number) => void;
  }) => {
    const router = useRouter();

    return (
      <View
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
          onPress={() => {
            if (isCenter) {
              router.push("/profile");
            } else {
              router.push(`/profile/${user.id}`);
            }
          }}
          onLongPress={() => !isCenter && onToggleFollow(user.id)}
          delayLongPress={300}
          style={[
            styles.avatarContainer,
            {
              borderColor: isCenter
                ? colors.tint
                : isFollowing
                  ? Colors.primary
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
              { backgroundColor: isFollowing ? Colors.primary : colors.muted },
            ]}
          >
            <Text
              style={[
                styles.statusText,
                {
                  color: isFollowing
                    ? Colors.primaryForeground
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
  },
  (prev, next) => {
    return (
      prev.user.id === next.user.id &&
      prev.x === next.x &&
      prev.y === next.y &&
      prev.isCenter === next.isCenter &&
      prev.isFollowing === next.isFollowing &&
      prev.colors === next.colors
    );
  }
);

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
  const [nodePositions, setNodePositions] = useState<Map<number, { x: number; y: number }>>(new Map());

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

  // --- Build nodes and links for simulation ---
  const { nodes, links } = useMemo(() => {
    const nodeList: SimNode[] = [];
    const linkList: SimLink[] = [];
    const nodeIdSet = new Set<number>();

    // Add current user as center node (fixed position)
    if (currentUser) {
      nodeList.push({
        id: currentUser.id,
        user: currentUser,
        isCenter: true,
        fx: 0,
        fy: 0,
        x: 0,
        y: 0,
      });
      nodeIdSet.add(currentUser.id);
    }

    // Add other users
    users.forEach((user, index) => {
      if (currentUser && user.id === currentUser.id) return;
      if (nodeIdSet.has(user.id)) return;

      const angle = (index / users.length) * Math.PI * 2;
      const radius = 150 + Math.random() * 100;

      nodeList.push({
        id: user.id,
        user,
        isCenter: false,
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
      });
      nodeIdSet.add(user.id);
    });

    // Add links
    if (currentUser) {
      Object.entries(followStatus).forEach(([userId, isFollowing]) => {
        if (isFollowing && nodeIdSet.has(Number(userId))) {
          linkList.push({
            source: currentUser.id,
            target: Number(userId),
            isDirect: true,
          });
        }
      });
    }

    connections.forEach((conn) => {
      if (!nodeIdSet.has(conn.followerId) || !nodeIdSet.has(conn.followeeId)) return;
      if (currentUser && conn.followerId === currentUser.id) return;

      linkList.push({
        source: conn.followerId,
        target: conn.followeeId,
        isDirect: false,
      });
    });

    return { nodes: nodeList, links: linkList };
    // Dependency array includes logic that changes structure suitable for simulation reset
  }, [users.length, connections.length, currentUser?.id]);

  // --- Run force simulation synchronously only when structure changes ---
  useEffect(() => {
    if (nodes.length === 0) return;

    const simulation = forceSimulation(nodes)
      .force(
        "link",
        forceLink<SimNode, SimLink>(links)
          .id((d) => d.id)
          .distance(300)
          .strength(0.3)
      )
      .force(
        "charge",
        forceManyBody()
          .strength(-150)
          .distanceMax(250)
      )
      .force(
        "collide",
        forceCollide<SimNode>()
          .radius(NODE_RADIUS)
          .strength(1)
          .iterations(2)
      )
      .force("center", forceCenter(0, 0).strength(0.05));

    // Pre-calculate ~300 ticks to stabilize the graph
    // This happens synchronously, blocking render for a fraction of a second
    // but preventing 300+ re-renders
    simulation.tick(300);
    simulation.stop();

    const newPositions = new Map<number, { x: number; y: number }>();
    nodes.forEach((node) => {
      newPositions.set(node.id, { x: node.x || 0, y: node.y || 0 });
    });
    setNodePositions(new Map(newPositions));

  }, [nodes, links]); // Re-run if graph topology changes

  // --- Gestures ---
  const panGesture = Gesture.Pan()
    .onChange((e) => {
      translateX.value = savedTranslateX.value + e.translationX;
      translateY.value = savedTranslateY.value + e.translationY;
    })
    .onEnd(() => {
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

  if (containerSize.width === 0) {
    return <View style={styles.container} onLayout={onLayout} />;
  }

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
              {links.map((link, idx) => {
                const sourceId = typeof link.source === "object" ? link.source.id : link.source;
                const targetId = typeof link.target === "object" ? link.target.id : link.target;

                // Use positions from map instead of node object to ensure sync with render
                const sourcePos = nodePositions.get(Number(sourceId));
                const targetPos = nodePositions.get(Number(targetId));

                if (!sourcePos || !targetPos) return null;

                const isFollowedConnection = !link.isDirect && (
                  followStatus[Number(sourceId)] || followStatus[Number(targetId)]
                );
                const isSolid = link.isDirect || isFollowedConnection;

                return (
                  <Line
                    key={`link-${idx}`}
                    x1={sourcePos.x}
                    y1={sourcePos.y}
                    x2={targetPos.x}
                    y2={targetPos.y}
                    stroke={link.isDirect ? Colors.primary : "#FFFFFF"}
                    strokeWidth={isSolid ? 0.5 : 1}
                    strokeDasharray={isSolid ? undefined : "5, 5"}
                    opacity={link.isDirect ? 0.8 : (isFollowedConnection ? 0.6 : 0.4)}
                  />
                );
              })}
            </Svg>
          </View>

          {/* Nodes Layer */}
          {nodes.map((node) => {
            const pos = nodePositions.get(node.id);
            if (!pos) return null;

            return (
              <UserNode
                key={node.id}
                user={node.user}
                x={centerOffsetX + pos.x}
                y={centerOffsetY + pos.y}
                isCenter={node.isCenter}
                isFollowing={followStatus[node.id]}
                colors={colors}
                onToggleFollow={onToggleFollow}
              />
            );
          })}
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
    height: NODE_SIZE + 40,
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
    borderWidth: 2, // Added border width to make borderColor visible
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
