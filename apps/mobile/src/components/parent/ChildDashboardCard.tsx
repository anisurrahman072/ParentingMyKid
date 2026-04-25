/**
 * Child summary card for parent dashboard.
 * Shows: avatar, name, today's completion %, wellbeing score ring, streak, active alerts.
 * Tapping navigates to detailed child growth view.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { router } from 'expo-router';
import { WellbeingScoreRing } from './WellbeingScoreRing';
import { StreakBadge } from '../kids/StreakBadge';
import { COLORS } from '../../constants/colors';
import { SPACING } from '../../constants/spacing';
import type { ChildSummary } from '@parentingmykid/shared-types';

interface ChildDashboardCardProps {
  child: ChildSummary;
}

export function ChildDashboardCard({ child }: ChildDashboardCardProps) {
  const completionPct = Math.round(child.todayCompletionPct ?? 0);
  const hasAlerts = (child.activeAlertsCount ?? 0) > 0;

  return (
    <TouchableOpacity
      style={[styles.card, hasAlerts && styles.cardWithAlert]}
      onPress={() => router.push(`/(parent)/growth`)}
      activeOpacity={0.85}
    >
      {/* Alert badge */}
      {hasAlerts && (
        <View style={styles.alertBadge}>
          <Text style={styles.alertBadgeText}>🚨 {child.activeAlertsCount}</Text>
        </View>
      )}

      {/* Avatar */}
      <View style={styles.avatarContainer}>
        {child.avatarUrl ? (
          <Image source={{ uri: child.avatarUrl }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <Text style={styles.avatarEmoji}>
              {child.gender === 'MALE' ? '👦' : child.gender === 'FEMALE' ? '👧' : '🧒'}
            </Text>
          </View>
        )}

        {/* Online indicator */}
        <View style={[styles.onlineIndicator, { backgroundColor: '#4ADE80' }]} />
      </View>

      {/* Info */}
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>{child.name}</Text>
        <Text style={styles.age}>{child.age} years old</Text>

        {/* Today's progress bar */}
        <View style={styles.progressRow}>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${completionPct}%` }]} />
          </View>
          <Text style={styles.progressLabel}>{completionPct}%</Text>
        </View>
        <Text style={styles.progressSubtext}>missions today</Text>
      </View>

      {/* Right side: score + streak */}
      <View style={styles.rightSide}>
        <WellbeingScoreRing score={child.wellbeingScore ?? 0} size={72} strokeWidth={7} />
        {child.currentStreak > 0 && (
          <View style={styles.streakMini}>
            <Text style={styles.streakEmoji}>{child.currentStreak >= 7 ? '🔥' : '⚡'}</Text>
            <Text style={styles.streakCount}>{child.currentStreak}d</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.parent.card,
    borderRadius: 20,
    padding: SPACING[4],
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[4],
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    marginBottom: SPACING[3],
    position: 'relative',
    overflow: 'hidden',
  },
  cardWithAlert: {
    borderColor: 'rgba(220,38,38,0.4)',
    borderWidth: 1.5,
  },
  alertBadge: {
    position: 'absolute',
    top: SPACING[3],
    right: SPACING[3],
    backgroundColor: 'rgba(220,38,38,0.2)',
    borderRadius: 10,
    paddingHorizontal: SPACING[2],
    paddingVertical: 2,
  },
  alertBadgeText: {
    fontSize: 11,
    fontFamily: 'Inter',
    fontWeight: '700',
    color: '#DC2626',
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  avatarPlaceholder: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarEmoji: { fontSize: 32 },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: COLORS.parent.card,
  },
  info: { flex: 1, gap: 2 },
  name: {
    fontSize: 17,
    fontFamily: 'Inter',
    fontWeight: '700',
    color: COLORS.parent.text,
  },
  age: {
    fontSize: 13,
    fontFamily: 'Inter',
    color: COLORS.parent.textMuted,
    marginBottom: SPACING[2],
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
  },
  progressTrack: {
    flex: 1,
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.parent.primary,
    borderRadius: 4,
  },
  progressLabel: {
    fontSize: 13,
    fontFamily: 'Inter',
    fontWeight: '700',
    color: COLORS.parent.primary,
    minWidth: 34,
  },
  progressSubtext: {
    fontSize: 11,
    fontFamily: 'Inter',
    color: COLORS.parent.textMuted,
  },
  rightSide: {
    alignItems: 'center',
    gap: SPACING[2],
  },
  streakMini: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  streakEmoji: { fontSize: 14 },
  streakCount: {
    fontSize: 13,
    fontFamily: 'Inter',
    fontWeight: '700',
    color: '#FF6B35',
  },
});
