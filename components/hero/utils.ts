import { Dimensions } from "react-native";

export const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } =
  Dimensions.get("window");

export interface BubblePosition {
  x: number;
  y: number;
  size: number;
  delay: number;
}

/**
 * Generate random positions for bubbles in middle 80% of screen, avoiding center
 */
export function generateBubblePositions(count: number): BubblePosition[] {
  const positions: BubblePosition[] = [];
  const minDistance = 100;

  // Define the usable area (middle 80% of screen)
  const horizontalPadding = 0;
  const verticalPadding = 0;
  const usableWidth = SCREEN_WIDTH * 0.8;
  const usableHeight = SCREEN_HEIGHT * 0.75;

  // Define center exclusion zone (where logo/text is)
  const centerX = SCREEN_WIDTH / 2;
  const centerY = SCREEN_HEIGHT / 2;
  const exclusionRadiusX = SCREEN_WIDTH * 0.25;
  const exclusionRadiusY = SCREEN_HEIGHT * 0.15;

  for (let i = 0; i < count; i++) {
    let attempts = 0;
    let x: number, y: number;
    const size = 48;

    do {
      x = horizontalPadding + Math.random() * (usableWidth - size);
      y = verticalPadding + Math.random() * (usableHeight - size);
      attempts++;

      const bubbleCenterX = x + size / 2;
      const bubbleCenterY = y + size / 2;
      const inExclusionZone =
        Math.pow((bubbleCenterX - centerX) / exclusionRadiusX, 2) +
          Math.pow((bubbleCenterY - centerY) / exclusionRadiusY, 2) <
        1;

      const overlapsOther = positions.some(
        (p) => Math.sqrt((p.x - x) ** 2 + (p.y - y) ** 2) < minDistance,
      );

      if (!inExclusionZone && !overlapsOther) break;
    } while (attempts < 100);

    positions.push({ x, y, size, delay: i * 200 + Math.random() * 300 });
  }

  return positions;
}
