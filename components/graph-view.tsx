import { ThemedText } from "@/components/themed-text";
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
import React, { useEffect, useMemo, useRef, useState } from "react";
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
  isDirect: boolean; // true = from current user (solid), false = between others (dotted)
}

const SCREEN_WIDTH = Dimensions.get("window").width;
const SCREEN_HEIGHT = Dimensions.get("window").height;
const NODE_SIZE = 60;
const NODE_RADIUS = NODE_SIZE / 2 + 20; // Radius for collision detection with padding
const GRAPH_SIZE = 4000;

export default function GraphView({
  users,
  currentUser,
  followStatus,
  onToggleFollow,
  connections = [],
}: GraphViewProps) {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = Colors[isDark ? "dark" : "light"];

  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [nodePositions, setNodePositions] = useState<Map<number, { x: number; y: number }>>(new Map());
  const [isSimulating, setIsSimulating] = useState(true);
  const simulationRef = useRef<any>(null);

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
        fx: 0, // Fixed x position
        fy: 0, // Fixed y position
        x: 0,
        y: 0,
      });
      nodeIdSet.add(currentUser.id);
    }

    // Add other users
    users.forEach((user, index) => {
      if (currentUser && user.id === currentUser.id) return;
      if (nodeIdSet.has(user.id)) return;

      // Initial random positions in a circle around center
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

    // Add links for users that current user follows (direct connections)
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

    // Add links for connections between other users (friends of friends)
    connections.forEach((conn) => {
      // Skip if either node doesn't exist
      if (!nodeIdSet.has(conn.followerId) || !nodeIdSet.has(conn.followeeId)) return;
      // Skip connections from current user (already handled above)
      if (currentUser && conn.followerId === currentUser.id) return;

      linkList.push({
        source: conn.followerId,
        target: conn.followeeId,
        isDirect: false,
      });
    });

    return { nodes: nodeList, links: linkList };
  }, [users, currentUser, followStatus, connections]);

  // --- Run force simulation ---
  useEffect(() => {
    if (nodes.length === 0) return;

    // Stop any existing simulation
    if (simulationRef.current) {
      simulationRef.current.stop();
    }

    // Create new simulation
    const simulation = forceSimulation(nodes)
      // Links push connected nodes apart (bigger gap)
      .force(
        "link",
        forceLink<SimNode, SimLink>(links)
          .id((d) => d.id)
          .distance(300) // Larger distance between linked nodes
          .strength(0.3) // Weaker attraction so they stay apart
      )
      // Nodes repel each other less (closer gap for disconnected)
      .force(
        "charge",
        forceManyBody()
          .strength(-150) // Less repulsion = nodes stay closer
          .distanceMax(250) // Shorter range for repulsion
      )
      // Prevent node overlapping with collision detection
      .force(
        "collide",
        forceCollide<SimNode>()
          .radius(NODE_RADIUS)
          .strength(1)
          .iterations(2)
      )
      // Center the graph
      .force("center", forceCenter(0, 0).strength(0.05))
      // Set simulation parameters
      .alpha(1)
      .alphaDecay(0.02)
      .velocityDecay(0.4);

    simulationRef.current = simulation;

    // Update positions on each tick
    simulation.on("tick", () => {
      const newPositions = new Map<number, { x: number; y: number }>();
      nodes.forEach((node) => {
        newPositions.set(node.id, { x: node.x || 0, y: node.y || 0 });
      });
      setNodePositions(new Map(newPositions));
    });

    simulation.on("end", () => {
      setIsSimulating(false);
    });

    return () => {
      simulation.stop();
    };
  }, [nodes, links]);

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

  // Center offset for rendering
  const centerOffsetX = containerSize.width / 2;
  const centerOffsetY = containerSize.height / 2;

  // Build position lookup for links
  const getNodePosition = (nodeId: number): { x: number; y: number } | null => {
    return nodePositions.get(nodeId) || null;
  };

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
              {/* Draw all links */}
              {links.map((link, idx) => {
                const sourceId = typeof link.source === "object" ? link.source.id : link.source;
                const targetId = typeof link.target === "object" ? link.target.id : link.target;

                const sourcePos = getNodePosition(Number(sourceId));
                const targetPos = getNodePosition(Number(targetId));

                if (!sourcePos || !targetPos) return null;

                // Check if this is a friend-of-friend connection where the user follows either end
                const isFollowedConnection = !link.isDirect && (
                  followStatus[Number(sourceId)] || followStatus[Number(targetId)]
                );

                // Determine line style
                const isSolid = link.isDirect || isFollowedConnection;

                return (
                  <Line
                    key={`link-${idx}`}
                    x1={sourcePos.x}
                    y1={sourcePos.y}
                    x2={targetPos.x}
                    y2={targetPos.y}
                    stroke={link.isDirect ? colors.primary : "#FFFFFF"}
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

            return renderUserNode(
              node.user,
              centerOffsetX + pos.x,
              centerOffsetY + pos.y,
              node.isCenter,
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
