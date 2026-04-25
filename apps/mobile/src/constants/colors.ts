/**
 * @module colors.ts
 * @description Design system color tokens for the ParentingMyKid app.
 *              Palettes: Parent UI (light premium), Kids UI (coral gradient shell), Islamic Module.
 *
 * @design-rule CRITICAL RULES (never violate):
 *   1. All text must have minimum 4.5:1 contrast ratio (WCAG AA)
 *   2. Parent: brown text on light mint–blush gradient + glass cards
 *   3. Kids: white text on coral–orange gradient; cards may be light/opaque on top
 *   4. Never use pure black on warm backgrounds for body copy — use brown family (parent)
 */

export const Colors = {
  // ─── Parent UI Palette (light premium — mint/blush shell, blue CTAs) ───
  parent: {
    // Shell reference (2-stop; tab layout also uses theme.store 3-stop presets)
    gradientApp: ['#E8F4EC', '#F2E8E9'] as const,
    gradientCtaBlue: ['#3B82F6', '#0EA5E9'] as const,
    gradientCtaBlue3: ['#2563EB', '#3B82F6', '#0EA5E9'] as const,

    // Primary / blue (replaces legacy indigo #6366F1)
    primary: '#3B82F6',
    primaryLight: '#60A5FA',
    primaryDark: '#2563EB',
    secondary: '#8B5CF6',

    // Accent / semantic
    gold: '#D97706',
    success: '#059669',
    warning: '#F59E0B',
    danger: '#DC2626',

    // Text — warm brown family (on light gradient + glass cards)
    textPrimary: '#5C3D2E',
    textSecondary: '#8B6355',
    textMuted: '#B89580',
    text: '#5C3D2E',
    textPrimaryLight: '#5C3D2E',
    textSecondaryLight: '#8B6355',

    // Surfaces
    surface: 'rgba(255,255,255,0.72)',
    surfaceSolid: '#FFFFFF',
    surfaceBorder: 'rgba(255,255,255,0.55)',
    card: 'rgba(255,255,255,0.72)',

    // Tab bar (parent layout)
    /** Translucent; prefer `tabBarFill` for the actual painted bar (avoids two-tone with gradient). */
    tabBarBg: 'rgba(255,255,255,0.82)',
    /** Solid — full-bleed bottom tab; warm neutral to match the blush part of the shell. */
    tabBarFill: '#F3EDE6',
    tabBarBorder: 'rgba(200,245,225,0.6)',
    tabBarActive: '#3B82F6',
    tabBarInactive: '#B89580',
    /** Selected tab on vivid green/pink glass pill — darker than textPrimary for contrast */
    tabBarPillForeground: '#24150F',

    // Legacy aliases — remapped for light theme (avoid breaking imports)
    background: 'transparent',
    backgroundDark: '#F9FBF9',
    backgroundLight: '#F9FBF9',
    surfaceDark: 'rgba(255,255,255,0.72)',
    surfaceDark2: 'rgba(255,255,255,0.55)',
    cardDark: 'rgba(255,255,255,0.72)',

    /** Auth display name: deep green → deep pink (SVG wordmark) */
    wordmarkGreen: '#064E3B',
    wordmarkPink: '#9F1239',

    // Gradients (non-CTA)
    gradientPrimary: ['#3B82F6', '#0EA5E9'] as const,
    gradientGold: ['#D97706', '#F59E0B'] as const,
    gradientSuccess: ['#059669', '#10B981'] as const,
    gradientCard: ['rgba(255,255,255,0.72)', 'rgba(255,255,255,0.55)'] as const,
    gradientHero: ['#E8F4EC', '#F2E8E9'] as const,
  },

  // ─── Kids UI Palette ─────────────────────────────────────────────────
  kids: {
    // Shell gradient (approved child PIN screen)
    gradientApp: ['#FF6B6B', '#FF8E53', '#FFA726'] as const,
    gradientAppShort: ['#FF6B6B', '#FFA726'] as const,

    textOnGradient: '#FFFFFF',
    textOnGradientMuted: 'rgba(255,255,255,0.75)',

    glassButtonBg: 'rgba(255,255,255,0.28)',
    glassButtonBorder: '#FFFFFF',
    glassButtonText: '#FFFFFF',

    tabBarBg: 'rgba(255,107,107,0.18)',
    tabBarBorder: 'rgba(255,255,255,0.3)',
    tabBarActive: '#FFFFFF',
    tabBarInactive: 'rgba(255,255,255,0.5)',

    // Mission category colors
    academic: '#3B82F6',
    physical: '#10B981',
    habit: '#F59E0B',
    social: '#EC4899',
    islamic: '#0D9488',
    creative: '#8B5CF6',
    selfCare: '#F97316',

    achievementGold: '#F59E0B',
    achievementSilver: '#94A3B8',
    achievementBronze: '#B45309',
    achievementPlatinum: '#7C3AED',
    achievementRoyal: '#DC2626',

    backgroundWarm: '#FFF9F0',
    backgroundBlue: '#EFF6FF',
    backgroundGreen: '#F0FDF4',
    backgroundPurple: '#FAF5FF',
    gradientBackground: ['#FF6B6B', '#FF8E53', '#FFA726'] as const,

    buttonBlue: '#3B82F6',
    buttonGreen: '#10B981',
    buttonPurple: '#8B5CF6',
    buttonPink: '#EC4899',
    buttonOrange: '#F97316',

    xpFill: '#F59E0B',
    xpBackground: '#FEF3C7',

    textPrimary: '#1E293B',
    textSecondary: '#475569',
    textWhite: '#FFFFFF',

    primary: '#FF8E53',
    secondary: '#10B981',
    success: '#10B981',
    danger: '#EF4444',
    accent: '#FF6B35',
    text: '#1E293B',
    textMuted: '#475569',

    streakFire: '#EF4444',
    coin: '#F59E0B',
  },

  // ─── Islamic Module Palette ────────────────────────────────────────────
  islamic: {
    primary: '#0D9488',
    secondary: '#D97706',
    dark: '#1E3A5F',
    light: '#F0FDFA',
    gold: '#D97706',
    green: '#15803D',
    gradientHeader: ['#0D9488', '#0F766E'] as const,
  },

  sos: {
    button: '#EF4444',
    buttonGlow: '#FCA5A5',
    buttonPulse: '#DC2626',
    background: '#FEF2F2',
  },

  transparent: 'transparent',
  white: '#FFFFFF',
  black: '#000000',

  severity: {
    low: '#10B981',
    medium: '#F59E0B',
    high: '#F97316',
    critical: '#EF4444',
  },

  wellbeing: {
    great: '#10B981',
    okay: '#F59E0B',
    poor: '#EF4444',
  },
} as const;

/** Uppercase alias — matches imports across the app */
export const COLORS = Colors;

export type ColorToken = typeof Colors;
