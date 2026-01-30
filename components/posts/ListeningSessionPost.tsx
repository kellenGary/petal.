import { ThemedText } from '@/components/themed-text';
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import feedApi, { FeedPost, ListeningSessionTrack } from "@/services/feedApi";
import { Image } from "expo-image";
import { router } from 'expo-router';
import React from "react";
import { Dimensions, Pressable, StyleSheet, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  Extrapolation,
  interpolate,
  SharedValue,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withSpring
} from "react-native-reanimated";
import PostHeader from "./PostHeader";

interface ListeningSessionPostProps {
  item: FeedPost;
}

// Card dimensions
const SCREEN_WIDTH = Dimensions.get("window").width;
const CARD_WIDTH = 320; // Shrunk from 320
const CARD_HEIGHT = 400;
const CARD_OVERLAP = 50; // How much cards overlap (smaller = more overlap)

export default function ListeningSessionPost({
  item,
}: ListeningSessionPostProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = Colors[isDark ? "dark" : "light"];

  const timeAgo = feedApi.getTimeAgo(item.createdAt);
  const metadata = feedApi.parseListeningSessionMetadata(item);

  // Animation values
  const scrollOffset = useSharedValue(0);
  const savedOffset = useSharedValue(0);

  if (!metadata || !metadata.tracks) return null;

  const durationMins = Math.round(metadata.totalDurationMs / 60000);
  const tracks = metadata.tracks;
  const maxOffset = Math.max(0, (tracks.length - 1) * CARD_OVERLAP);

  // Pan gesture for scrolling through cards
  const panGesture = Gesture.Pan()
    .activeOffsetX([-10, 10]) // Only activate if moved >10px horizontally
    .failOffsetY([-10, 10])   // Fail if moved >10px vertically (allows scrolling)
    .onUpdate((event) => {
      const newOffset = savedOffset.value - event.translationX;
      // Clamp with rubber band effect at edges
      if (newOffset < 0) {
        scrollOffset.value = newOffset * 0.3;
      } else if (newOffset > maxOffset) {
        scrollOffset.value = maxOffset + (newOffset - maxOffset) * 0.3;
      } else {
        scrollOffset.value = newOffset;
      }
    })
    .onEnd((event) => {
      // Snap to nearest card
      const velocity = -event.velocityX;
      const projectedOffset = scrollOffset.value + velocity * 0.1;
      const nearestCard = Math.round(projectedOffset / CARD_OVERLAP);
      const clampedCard = Math.max(0, Math.min(nearestCard, tracks.length - 1));
      const targetOffset = clampedCard * CARD_OVERLAP;

      scrollOffset.value = withSpring(targetOffset, {
        damping: 10000,
        stiffness: 500,
        velocity: velocity,
      });
      savedOffset.value = targetOffset;
    });

  return (
    <View style={styles.card}>
      <PostHeader user={item.user} timeAgo={timeAgo} />

      <View style={styles.sessionInfo}>
        <ThemedText style={[styles.actionLabel, { color: colors.text }]}>
          LISTENING SESSION
        </ThemedText>
        <View style={styles.statsRow}>
          <View style={styles.statBadge}>
            <ThemedText style={[styles.statValue, { color: colors.text }]}>
              {metadata.trackCount}
            </ThemedText>
            <ThemedText style={[styles.statLabel, { color: colors.text }]}>
              tracks
            </ThemedText>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.text }]} />
          <View style={styles.statBadge}>
            <ThemedText style={[styles.statValue, { color: colors.text }]}>
              {durationMins}
            </ThemedText>
            <ThemedText style={[styles.statLabel, { color: colors.text }]}>
              min
            </ThemedText>
          </View>
        </View>
      </View>

      <GestureDetector gesture={panGesture}>
        <View style={styles.carouselContainer}>
          <View style={styles.carouselTrack}>
            {tracks.map((track, index) => (
              <StackedCard
                key={`${track.trackId}-${index}`}
                track={track}
                index={index}
                totalCards={tracks.length}
                scrollOffset={scrollOffset}
                colors={colors}
              />
            ))}
          </View>
        </View>
      </GestureDetector>
    </View>
  );
}

interface StackedCardProps {
  track: ListeningSessionTrack;
  index: number;
  totalCards: number;
  scrollOffset: SharedValue<number>;
  colors: typeof Colors.light;
}

function StackedCard({
  track,
  index,
  totalCards,
  scrollOffset,
  colors,
}: StackedCardProps) {
  const centerOffset = useDerivedValue(() => {
    const basePosition = index * CARD_OVERLAP;
    const relativePosition = basePosition - scrollOffset.value;
    return relativePosition / CARD_OVERLAP;
  });

  const animatedStyle = useAnimatedStyle(() => {
    // Calculate the position based on scroll offset
    const basePosition = index * CARD_OVERLAP;
    const relativePosition = basePosition - scrollOffset.value;

    const absoluteCenterOffset = Math.abs(centerOffset.value);

    // Width: focused card is wider, unfocused cards shrink
    const minWidth = 20; // Unfocused width 20px
    const width = interpolate(
      absoluteCenterOffset,
      [0, 1],
      [CARD_WIDTH, minWidth],
      Extrapolation.CLAMP
    );

    /* 
      Strict non-overlap logic:
      - Focused card (centerOffset 0): x=0, width=260
      - Right neighbor (centerOffset 1): x=260, width=20
      - Left neighbor (centerOffset -1): x=-20, width=20
      
      We interpolate translateX based on centerOffset to enforce these boundaries.
      Neighbors are stacked tightly (minWidth spacing) instead of CARD_OVERLAP spacing.
    */
    const translateX = interpolate(
      centerOffset.value,
      [-2, -1, 0, 1, 2],
      [
        -minWidth * 2, // -40
        -minWidth,     // -20
        0,             // 0
        CARD_WIDTH,    // 260
        CARD_WIDTH + minWidth // 280
      ],
      Extrapolation.EXTEND
    );

    // Z-index: decreasing order based on render index (first card on top)
    const zIndex = totalCards - index;

    return {
      transform: [
        { translateX: translateX },
      ],
      width: width,
      zIndex: zIndex,
    };
  });

  const handlePress = (trackId: number) => {
    // Check if card is roughly centered (allow small tolerance)
    if (Math.abs(centerOffset.value) < 0.1) {
      router.push(`/song/${trackId}`);
    }
  };

  return (
    <Animated.View style={[styles.stackedCard, animatedStyle]}>
      <Pressable style={[styles.cardInner, { backgroundColor: colors.card }]} onPress={() => { handlePress(track.trackId) }}>
        {track.albumImageUrl && (
          <Image
            source={{ uri: track.albumImageUrl }}
            style={styles.cardImage}
          />
        )}
        <View style={[styles.cardContent, { backgroundColor: colors.card }]}>
          <ThemedText
            style={[styles.cardTrackName, { color: colors.text }]}
            numberOfLines={2}
          >
            {track.name || 'Unknown Track'}
          </ThemedText>
          <ThemedText
            style={[styles.cardArtistName, { color: colors.text }]}
            numberOfLines={1}
          >
            {track.artistNames || 'Unknown Artist'}
          </ThemedText>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 16,
  },
  sessionInfo: {
    paddingHorizontal: 4,
    marginBottom: 8,
  },
  actionLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.5,
    opacity: 0.5,
    marginBottom: 8,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  statBadge: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
  },
  statValue: {
    fontSize: 24,
    fontWeight: "700",
  },
  statLabel: {
    fontSize: 13,
    opacity: 0.6,
  },
  statDivider: {
    width: 1,
    height: 20,
    opacity: 0.2,
  },
  carouselContainer: {
    height: CARD_HEIGHT + 40,
    overflow: "visible",
    paddingVertical: 20,
  },
  carouselTrack: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    paddingLeft: (SCREEN_WIDTH - CARD_WIDTH) / 2,
    height: CARD_HEIGHT,
  },
  stackedCard: {
    position: "absolute",
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  cardInner: {
    flex: 1,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  cardImage: {
    width: CARD_WIDTH,
    aspectRatio: 1,
    resizeMode: "cover",
  },
  cardContent: {
    padding: 12,
    justifyContent: "flex-end",
  },
  cardTrackName: {
    fontSize: 14,
    fontWeight: "700",
  },
  cardArtistName: {
    fontSize: 12,
    opacity: 0.6,
  },
});
