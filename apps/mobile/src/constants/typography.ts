/**
 * @module typography.ts
 * @description Typography scale for ParentingMyKid.
 *
 * @design-rule
 *   - Parent UI: Inter or Nunito (clean, professional)
 *   - Kids UI: Nunito (rounded, friendly, LARGE)
 *   - Kids minimum: 18sp body, 28sp+ titles
 *   - Parent minimum: 14sp body, 20sp+ headings
 *   - Kids buttons: minimum 16sp label
 */

export const Typography = {
  // ─── Font Families ────────────────────────────────────────────────────
  fonts: {
    // Primary app font — rounded, friendly, readable across all ages (@expo-google-fonts/nunito)
    regular: 'Nunito_400Regular',
    medium: 'Nunito_500Medium',
    semiBold: 'Nunito_600SemiBold',
    bold: 'Nunito_700Bold',
    extraBold: 'Nunito_800ExtraBold',
    black: 'Nunito_900Black',

    // Parent UI secondary font — clean, professional (@expo-google-fonts/inter)
    interRegular: 'Inter_400Regular',
    interMedium: 'Inter_500Medium',
    interSemiBold: 'Inter_600SemiBold',
    interBold: 'Inter_700Bold',
  },

  // ─── Parent UI Font Sizes ──────────────────────────────────────────────
  parent: {
    caption: 12,
    small: 13,
    body: 14,
    bodyLarge: 16,
    label: 15,
    subheading: 18,
    heading: 20,
    headingLarge: 24,
    display: 28,
    displayLarge: 34,
  },

  // ─── Kids UI Font Sizes ───────────────────────────────────────────────
  // MINIMUM 18sp for body — kids need large, readable text
  kids: {
    label: 16,           // Button labels (minimum per design rules)
    body: 18,            // Body text (minimum per design rules)
    bodyLarge: 20,
    missionTitle: 22,
    subheading: 24,
    heading: 28,         // Mission card titles (28sp+ minimum)
    headingLarge: 32,
    display: 40,         // Level number, streak count
    displayLarge: 52,    // Celebration numbers (XP earned, coins)
  },

  // ─── Line Heights ─────────────────────────────────────────────────────
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.7,
  },

  // ─── Letter Spacing ───────────────────────────────────────────────────
  letterSpacing: {
    tight: -0.5,
    normal: 0,
    wide: 0.5,
    wider: 1,
    widest: 2, // Used for achievement tier labels: "ROYAL"
  },
} as const;
