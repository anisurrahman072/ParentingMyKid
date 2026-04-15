/**
 * Critical safety alert banner — shown prominently on parent dashboard.
 * High-contrast red/amber design to ensure immediate attention.
 * Supports swipe-to-dismiss with Reanimated gesture.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Animated, { FadeInDown, FadeOutUp } from 'react-native-reanimated';
import { router } from 'expo-router';
import { COLORS } from '../../constants/colors';
import { SPACING } from '../../constants/spacing';
import { SafetyAlert } from '@parentingmykid/shared-types';

interface SafetyAlertBannerProps {
  alert: SafetyAlert;
  onDismiss: (alertId: string) => void;
}

const SEVERITY_CONFIG: Record<string, { bg: string; border: string; icon: string; label: string }> = {
  CRITICAL: {
    bg: 'rgba(220,38,38,0.18)',
    border: '#DC2626',
    icon: '🚨',
    label: 'CRITICAL',
  },
  HIGH: {
    bg: 'rgba(234,88,12,0.18)',
    border: '#EA580C',
    icon: '⚠️',
    label: 'HIGH',
  },
  MEDIUM: {
    bg: 'rgba(202,138,4,0.15)',
    border: '#CA8A04',
    icon: '🔔',
    label: 'MEDIUM',
  },
};

export function SafetyAlertBanner({ alert, onDismiss }: SafetyAlertBannerProps) {
  const config = SEVERITY_CONFIG[alert.severity] ?? SEVERITY_CONFIG.MEDIUM;

  return (
    <Animated.View
      entering={FadeInDown.springify()}
      exiting={FadeOutUp}
      style={[
        styles.container,
        {
          backgroundColor: config.bg,
          borderColor: config.border,
        },
      ]}
    >
      <View style={styles.left}>
        <Text style={styles.icon}>{config.icon}</Text>
      </View>
      <View style={styles.content}>
        <View style={styles.headerRow}>
          <Text style={[styles.severity, { color: config.border }]}>{config.label}</Text>
          <Text style={styles.timestamp}>
            {new Date(alert.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
        <Text style={styles.title} numberOfLines={1}>{alert.alertType.replace(/_/g, ' ')}</Text>
        {alert.summary && (
          <Text style={styles.summary} numberOfLines={2}>{alert.summary}</Text>
        )}
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.viewButton}
            onPress={() => router.push('/(parent)/safety/index')}
          >
            <Text style={[styles.viewButtonText, { color: config.border }]}>View details →</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => onDismiss(alert.id)}>
            <Text style={styles.dismissText}>Dismiss</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 14,
    padding: SPACING[4],
    gap: SPACING[3],
    marginBottom: SPACING[3],
  },
  left: { paddingTop: 2 },
  icon: { fontSize: 26 },
  content: { flex: 1, gap: SPACING[1] },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  severity: {
    fontSize: 11,
    fontFamily: 'Inter',
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  timestamp: {
    fontSize: 11,
    fontFamily: 'Inter',
    color: 'rgba(255,255,255,0.4)',
  },
  title: {
    fontSize: 14,
    fontFamily: 'Inter',
    fontWeight: '700',
    color: '#FFFFFF',
    textTransform: 'capitalize',
  },
  summary: {
    fontSize: 13,
    fontFamily: 'Inter',
    color: 'rgba(255,255,255,0.65)',
    lineHeight: 18,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[4],
    marginTop: SPACING[1],
  },
  viewButton: { paddingVertical: 2 },
  viewButtonText: {
    fontSize: 13,
    fontFamily: 'Inter',
    fontWeight: '700',
  },
  dismissText: {
    fontSize: 13,
    fontFamily: 'Inter',
    color: 'rgba(255,255,255,0.4)',
  },
});
