/**
 * @module colors.ts
 * @description Design system color tokens for the ParentingMyKid app.
 *              Three distinct palettes: Parent UI, Kids UI, Islamic Module.
 *
 * @design-rule CRITICAL RULES (never violate):
 *   1. All text must have minimum 4.5:1 contrast ratio (WCAG AA)
 *   2. Never white text on light background
 *   3. Never dark text on dark background
 *   4. Kids screen backgrounds are always bright/warm — never dark or scary
 *   5. Parent UI uses deep dark/indigo gradients — premium feel
 */

export const Colors = {
  // ─── Parent UI Palette ─────────────────────────────────────────────────
  parent: {
    // Primary gradient: Indigo → Violet (premium, trustworthy)
    primary: '#6366F1',
    primaryLight: '#818CF8',
    primaryDark: '#4F46E5',
    secondary: '#8B5CF6', // Violet

    // Accent colors
    gold: '#F59E0B',      // Achievement gold — rewards, badges
    success: '#10B981',   // Green — mission complete, healthy, safe
    warning: '#F97316',   // Orange — alerts, streaks
    danger: '#EF4444',    // Red — critical alerts, SOS, danger

    // Backgrounds (dark mode default for parent)
    backgroundDark: '#0F0F1A',
    surfaceDark: '#1E1E2E',
    surfaceDark2: '#252535',
    cardDark: '#2A2A3E',

    // Backgrounds (light mode)
    backgroundLight: '#F8F7FF',
    surfaceLight: '#FFFFFF',
    cardLight: '#F1F0FF',

    // Text
    textPrimary: '#F1F5F9',     // On dark backgrounds
    textSecondary: '#94A3B8',   // Subtle text on dark
    textPrimaryLight: '#1E1E2E', // On light backgrounds
    textSecondaryLight: '#64748B',

    // Semantic aliases (screens use these shorter names)
    background: '#0F0F1A',
    text: '#F1F5F9',
    textMuted: '#94A3B8',
    card: '#2A2A3E',

    // Gradient arrays for LinearGradient
    gradientPrimary: ['#6366F1', '#8B5CF6'],
    gradientGold: ['#F59E0B', '#EF4444'],
    gradientSuccess: ['#10B981', '#059669'],
    gradientCard: ['#1E1E2E', '#252535'],
    gradientHero: ['#0F0F1A', '#1E1E3F'],
  },

  // ─── Kids UI Palette ──────────────────────────────────────────────────
  // Always bright, always colorful, always warm — never dark or scary
  kids: {
    // Mission category colors (each category has a distinct color)
    academic: '#3B82F6',    // Blue — learning, knowledge
    physical: '#10B981',    // Green — health, energy
    habit: '#F59E0B',       // Gold — building good habits
    social: '#EC4899',      // Pink — friendship, kindness
    islamic: '#0D9488',     // Teal — spiritual growth
    creative: '#8B5CF6',    // Purple — creativity, expression
    selfCare: '#F97316',    // Orange — self-love, wellbeing

    // Achievement colors
    achievementGold: '#F59E0B',
    achievementSilver: '#94A3B8',
    achievementBronze: '#B45309',
    achievementPlatinum: '#7C3AED',
    achievementRoyal: '#DC2626',

    // Backgrounds (always bright and warm)
    backgroundWarm: '#FFF9F0',   // Warm cream background
    backgroundBlue: '#EFF6FF',   // Light blue background
    backgroundGreen: '#F0FDF4',  // Light green background
    backgroundPurple: '#FAF5FF', // Light purple background
    gradientBackground: ['#1A1A3E', '#2D1B69'], // Dark premium gradient for gaming zone

    // Big button colors (56dp minimum height)
    buttonBlue: '#3B82F6',
    buttonGreen: '#10B981',
    buttonPurple: '#8B5CF6',
    buttonPink: '#EC4899',
    buttonOrange: '#F97316',

    // XP/Level progress bar
    xpFill: '#F59E0B',
    xpBackground: '#FEF3C7',

    // Text on kids screens (always high contrast)
    textPrimary: '#1E293B',   // Very dark on light backgrounds
    textSecondary: '#475569',
    textWhite: '#FFFFFF',

    // Primary UI / buttons (aliases used by KidsButton, tabs, XP bar)
    primary: '#FF6B35',
    secondary: '#10B981',
    success: '#10B981',
    danger: '#EF4444',
    accent: '#FF6B35',
    text: '#1E293B',
    textMuted: '#475569',

    // Streak fire
    streakFire: '#EF4444',

    // Coin color
    coin: '#F59E0B',
  },

  // ─── Islamic Module Palette ────────────────────────────────────────────
  islamic: {
    primary: '#0D9488',     // Deep teal
    secondary: '#D97706',   // Golden
    dark: '#1E3A5F',        // Night blue
    light: '#F0FDFA',       // Light teal background
    gold: '#D97706',
    green: '#15803D',       // Islamic green
    gradientHeader: ['#0D9488', '#0F766E'],
  },

  // ─── SOS / Emergency ──────────────────────────────────────────────────
  sos: {
    button: '#EF4444',
    buttonGlow: '#FCA5A5',
    buttonPulse: '#DC2626',
    background: '#FEF2F2',
  },

  // ─── Shared ────────────────────────────────────────────────────────────
  transparent: 'transparent',
  white: '#FFFFFF',
  black: '#000000',

  // Severity colors for alerts
  severity: {
    low: '#10B981',
    medium: '#F59E0B',
    high: '#F97316',
    critical: '#EF4444',
  },

  // Wellbeing score colors
  wellbeing: {
    great: '#10B981',    // 75-100: green
    okay: '#F59E0B',     // 50-74: amber
    poor: '#EF4444',     // 0-49: red
  },
} as const;

/** Uppercase alias — matches imports across the app */
export const COLORS = Colors;

export type ColorToken = typeof Colors;
