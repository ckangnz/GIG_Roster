import { PRESENCE_COLORS } from "./usePresence";

/**
 * Returns the theme-optimized hex color for an online user.
 * Falls back to the stored 'color' string if no colorIndex is available.
 */
export const resolvePresenceColor = (
  colorIndex: number | undefined,
  storedColor: string,
  isDark: boolean
): string => {
  if (typeof colorIndex === 'number' && PRESENCE_COLORS[colorIndex]) {
    return PRESENCE_COLORS[colorIndex][isDark ? 1 : 0];
  }
  return storedColor;
};
