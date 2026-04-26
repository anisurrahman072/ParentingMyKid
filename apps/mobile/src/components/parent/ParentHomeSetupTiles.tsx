import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { Spacing, Shadow } from '../../constants/spacing';
import { Typography } from '../../constants/typography';
import { colorWithAlpha } from '../../utils/colorAlpha';
import { possessiveShortFamilyTitle } from '../../utils/familyTitle';

const GAP = Spacing.md;
const PAD = Spacing.screenPadding * 2;
const PREMIUM_RADIUS = 22;

/**
 * Height of one tile when kicker text is a single line each (icon + title + hint + CTA).
 * Matches `LoadingComponent` `setupTile`. Tiles grow if title/hint wrap to two lines.
 */
export const PARENT_HOME_SETUP_TILE_MIN_HEIGHT =
  12 + // cardInner paddingTop
  48 + // heroIcon
  2 + // heroIcon marginBottom
  6 + // gap
  21 + // title lineHeight (one line)
  6 +
  16 + // hint lineHeight (one line)
  6 +
  (8 + 18 + 8) + // ctaGrad paddingVertical + label line ~18 + paddingVertical
  12; // cardInner paddingBottom

const ACCENT = {
  family: COLORS.parent.primary,
  kids: COLORS.parent.gold,
} as const;

type Props = {
  familyName: string;
  familyGroupsCount: number;
  childCount: number;
  onOpenFamily: () => void;
  onAddKids: () => void;
};

/**
 * Home: two “premium” tiles — one solid white surface each, soft shadow, no side strip / inner tint.
 */
export function ParentHomeSetupTiles({
  familyName,
  familyGroupsCount,
  childCount,
  onOpenFamily,
  onAddKids,
}: Props) {
  const { width: screenW } = useWindowDimensions();
  const colW = useMemo(() => (screenW - PAD - GAP) / 2, [screenW]);
  const moreFamilies = Math.max(0, familyGroupsCount - 1);
  const familyTitle = useMemo(
    () => possessiveShortFamilyTitle(familyName),
    [familyName],
  );
  const familyHint = useMemo(() => {
    if (moreFamilies > 0) {
      return `+${moreFamilies} more in Settings`;
    }
    return 'Your people at home';
  }, [moreFamilies]);

  return (
    <View style={styles.row} accessibilityRole="summary">
      <View style={[styles.col, { width: colW }]}>
        <View style={styles.card}>
          <View style={styles.cardInner}>
            <View
              style={[
                styles.heroIcon,
                { backgroundColor: colorWithAlpha(ACCENT.family, 0.12) },
              ]}
            >
              <Ionicons name="people" size={26} color={ACCENT.family} />
            </View>
            <Text
              style={styles.title}
              numberOfLines={2}
              ellipsizeMode="tail"
              accessibilityRole="header"
            >
              {familyTitle}
            </Text>
            <Text style={styles.hint} numberOfLines={2} ellipsizeMode="tail">
              {familyHint}
            </Text>
            <CtaPill
              label="Open family"
              onPress={onOpenFamily}
              testID="home-cta-family"
            />
          </View>
        </View>
      </View>

      <View style={[styles.col, { width: colW }]}>
        <View style={styles.card}>
          <View style={styles.cardInner}>
            <View
              style={[
                styles.heroIcon,
                { backgroundColor: colorWithAlpha(ACCENT.kids, 0.12) },
              ]}
            >
              <Ionicons name="happy-outline" size={28} color={ACCENT.kids} />
            </View>
            <Text style={styles.title} numberOfLines={2}>
              {childCount === 0
                ? 'No kids yet'
                : `${childCount} child${childCount === 1 ? '' : 'ren'}`}
            </Text>
            <Text style={styles.hint} numberOfLines={2}>
              {childCount === 0
                ? 'Missions, time, safety'
                : 'Add or edit in Settings'}
            </Text>
            <CtaPill
              label={childCount === 0 ? 'Add a child' : 'Add another'}
              onPress={onAddKids}
              testID="home-cta-kids"
            />
          </View>
        </View>
      </View>
    </View>
  );
}

function CtaPill({
  label,
  onPress,
  testID,
}: {
  label: string;
  onPress: () => void;
  testID?: string;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.9}
      style={styles.ctaWrap}
      accessibilityRole="button"
      accessibilityLabel={label}
      testID={testID}
    >
      <LinearGradient
        colors={[...COLORS.parent.gradientCtaBlue]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={styles.ctaGrad}
      >
        <Text style={styles.ctaText}>{label}</Text>
        <Ionicons name="chevron-forward" size={16} color="#FFFFFF" style={styles.ctaChevron} />
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: GAP,
    marginBottom: Spacing.lg,
  },
  col: {
    minWidth: 0,
  },
  card: {
    flex: 1,
    backgroundColor: COLORS.parent.surfaceSolid,
    borderRadius: PREMIUM_RADIUS,
    borderWidth: 0,
    overflow: 'hidden',
    ...Shadow.md,
  },
  cardInner: {
    flex: 1,
    paddingHorizontal: Spacing.md,
    paddingTop: 12,
    paddingBottom: 12,
    gap: 6,
    alignItems: 'stretch',
  },
  heroIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 2,
  },
  title: {
    fontFamily: Typography.fonts.interBold,
    fontSize: 16,
    lineHeight: 21,
    letterSpacing: -0.35,
    color: COLORS.parent.textPrimary,
    textAlign: 'center',
  },
  hint: {
    fontFamily: Typography.fonts.interRegular,
    fontSize: 12,
    lineHeight: 16,
    color: COLORS.parent.textMuted,
    textAlign: 'center',
  },
  ctaWrap: { alignSelf: 'stretch', marginTop: 'auto' },
  ctaGrad: {
    borderRadius: 14,
    paddingVertical: 8,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  ctaText: {
    fontFamily: Typography.fonts.interSemiBold,
    fontSize: 13,
    letterSpacing: 0.15,
    color: '#FFFFFF',
  },
  ctaChevron: { opacity: 0.95 },
});
