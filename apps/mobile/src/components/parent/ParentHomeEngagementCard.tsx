import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { COLORS } from '../../constants/colors';
import { Spacing, Shadow } from '../../constants/spacing';
import { Typography } from '../../constants/typography';
import type { FamilyDashboard } from '@parentingmykid/shared-types';

type EngagementKind = 'add_kids' | 'pair_device' | 'no_usage_today';

function resolveEngagement(d: FamilyDashboard | null | undefined): EngagementKind | null {
  if (!d) return null;
  if (d.children.length === 0) return 'add_kids';
  if ((d.pairedDevices?.length ?? 0) === 0) return 'pair_device';
  if (!d.children.some((c) => c.hasScreenUsageToday)) return 'no_usage_today';
  return null;
}

export type { EngagementKind };

type Props = {
  dashboard: FamilyDashboard | null;
  onPairDevice: () => void;
  onNoUsageCta: () => void;
};

const COPY: Record<Exclude<EngagementKind, 'add_kids'>, { line: string; cta: string; accent: string; border: string }> = {
  pair_device: {
    line: 'Pair a phone or tablet',
    cta: 'Pair',
    accent: 'rgba(59, 130, 246, 0.12)',
    border: 'rgba(59, 130, 246, 0.35)',
  },
  no_usage_today: {
    line: 'No screen time logged yet',
    cta: 'Chat',
    accent: 'rgba(139, 92, 246, 0.12)',
    border: 'rgba(139, 92, 246, 0.35)',
  },
};

/**
 * Drives parent engagement: add kids, pair devices, or a gentle nudge when there’s no usage data yet.
 */
export function ParentHomeEngagementCard({ dashboard, onPairDevice, onNoUsageCta }: Props) {
  const kind = resolveEngagement(dashboard);
  if (!kind || kind === 'add_kids') return null;

  const c = COPY[kind];
  const onPress = kind === 'pair_device' ? onPairDevice : onNoUsageCta;

  return (
    <View
      style={[styles.card, { backgroundColor: c.accent, borderColor: c.border }]}
      accessibilityRole="summary"
    >
      <Text style={styles.line} numberOfLines={1}>
        {c.line}
      </Text>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}
        hitSlop={6}
        accessibilityLabel={c.cta}
      >
        <Text style={styles.ctaText}>{c.cta}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Spacing.cardBorderRadius,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
    ...Shadow.sm,
  },
  line: {
    fontFamily: Typography.fonts.semiBold,
    fontSize: Typography.parent.body,
    color: COLORS.parent.textPrimary,
    flex: 1,
  },
  cta: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: COLORS.parent.primary,
  },
  ctaPressed: { opacity: 0.88 },
  ctaText: {
    fontFamily: Typography.fonts.semiBold,
    fontSize: Typography.parent.caption,
    color: '#FFFFFF',
  },
});
