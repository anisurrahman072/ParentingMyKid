/**
 * @module spacing.ts
 * @description Spacing scale and layout constants.
 *              Kids touch targets must be minimum 56dp — accessibility requirement.
 */

/**
 * Tailwind-style numeric scale: SPACING[2] === 8, SPACING[4] === 16, etc.
 */
export const SPACING = [
  0, 4, 8, 12, 16, 20, 24, 28, 32, 36, 40, 44, 48, 52, 56, 60, 64, 68, 72, 76, 80, 84, 88, 92, 96, 100, 104, 108, 112,
] as const;

export const Spacing = {
  // Base spacing scale (4dp increments)
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 40,
  xxxxl: 56, // Minimum touch target size for kids

  // Layout constants
  screenPadding: 20,
  cardPadding: 16,
  cardPaddingLg: 20,
  cardBorderRadius: 16,
  cardBorderRadiusLg: 24, // Kids screens use larger border radius

  // Kids-specific
  kidsTouchTarget: 56, // Minimum 56dp for all kid interactive elements
  kidsMissionCardHeight: 120,
  kidsBigButtonHeight: 64,
  kidsBigButtonRadius: 24,

  // Parent-specific
  parentCardHeight: 80,
  parentInputHeight: 48,
  parentButtonHeight: 48,
} as const;

export const Shadow = {
  // Card shadows for both light and dark mode
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  // Colored shadow for premium cards
  primary: {
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
} as const;
