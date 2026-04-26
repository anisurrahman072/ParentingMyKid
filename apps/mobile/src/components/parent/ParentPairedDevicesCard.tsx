import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { COLORS } from '../../constants/colors';
import { Spacing, Shadow } from '../../constants/spacing';
import { Typography } from '../../constants/typography';
import type { PairedDeviceSummary } from '@parentingmykid/shared-types';

type Props = {
  devices: PairedDeviceSummary[];
  onAddDevice: () => void;
};

function formatRelative(iso: string | null) {
  if (!iso) return 'No recent activity';
  try {
    return `${formatDistanceToNow(parseISO(iso), { addSuffix: true })}`;
  } catch {
    return 'No recent activity';
  }
}

/**
 * Lists paired child devices, or a colorful CTA to connect the first one (Reanimated on UI thread).
 */
export function ParentPairedDevicesCard({ devices, onAddDevice }: Props) {
  const float = useSharedValue(0);

  useEffect(() => {
    float.value = withRepeat(
      withSequence(
        withTiming(6, { duration: 2200, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 2200, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true,
    );
  }, [float]);

  const floatStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -float.value * 0.3 }],
  }));

  if (devices.length === 0) {
    return (
      <View style={styles.wrap}>
        <Text style={styles.sectionTitle}>Child devices</Text>
        <Text style={styles.sectionHint}>
          When you connect your child’s phone or tablet, you can manage it from here: safety, screen
          time, and more.
        </Text>
        <Pressable
          onPress={onAddDevice}
          style={({ pressed }) => [styles.emptyCard, pressed && { opacity: 0.95 }]}
        >
          <LinearGradient
            colors={['#0EA5E9', '#6366F1', '#A855F7']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.emptyGradient}
          >
            <Animated.View style={floatStyle}>
              <Ionicons name="phone-portrait" size={56} color="#FFFFFF" style={styles.emptyIcon} />
            </Animated.View>
            <Text style={styles.emptyTitle}>No devices paired yet</Text>
            <Text style={styles.emptySub}>
              Pair a device to see screen activity and parent controls. Tap to get your code.
            </Text>
          </LinearGradient>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.sectionHeaderRow}>
        <View>
          <Text style={styles.sectionTitle}>Paired devices</Text>
          <Text style={styles.sectionHint}>
            {devices.length} device{devices.length === 1 ? '' : 's'} — manage in Safety & more.
          </Text>
        </View>
        <Pressable onPress={onAddDevice} hitSlop={8} style={styles.addLink}>
          <Text style={styles.addLinkText}>+ Add</Text>
        </Pressable>
      </View>
      {devices.map((d) => (
        <View key={d.id} style={styles.deviceRow}>
          <View style={styles.deviceIconBox}>
            <Ionicons
              name={d.platform === 'android' ? 'logo-android' : 'phone-portrait-outline'}
              size={22}
              color={COLORS.parent.primary}
            />
          </View>
          <View style={styles.deviceTextCol}>
            <Text style={styles.deviceName} numberOfLines={1}>
              {d.deviceName || 'Child device'}
            </Text>
            <Text style={styles.deviceMeta} numberOfLines={1}>
              {d.childName} · {d.platform}
            </Text>
            <Text style={styles.deviceLast}>{formatRelative(d.lastActiveAt)}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: Spacing.lg, marginBottom: Spacing.xl },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontFamily: Typography.fonts.bold,
    fontSize: Typography.parent.subheading,
    color: COLORS.parent.textPrimary,
    marginBottom: 4,
  },
  sectionHint: {
    fontFamily: Typography.fonts.regular,
    fontSize: Typography.parent.small,
    lineHeight: 20,
    color: COLORS.parent.textSecondary,
    marginBottom: Spacing.md,
  },
  addLink: { paddingTop: 2 },
  addLinkText: {
    fontFamily: Typography.fonts.semiBold,
    fontSize: Typography.parent.caption,
    color: COLORS.parent.primary,
  },
  emptyCard: {
    borderRadius: Spacing.cardBorderRadius,
    overflow: 'hidden',
    ...Shadow.lg,
  },
  emptyGradient: {
    padding: Spacing.xl,
    alignItems: 'center',
  },
  emptyIcon: { marginBottom: Spacing.md },
  emptyTitle: {
    fontFamily: Typography.fonts.bold,
    fontSize: Typography.parent.bodyLarge,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  emptySub: {
    fontFamily: Typography.fonts.regular,
    fontSize: Typography.parent.body,
    lineHeight: 22,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
  },
  deviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.parent.surface,
    borderRadius: Spacing.cardBorderRadius,
    borderWidth: 1,
    borderColor: COLORS.parent.surfaceBorder,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    ...Shadow.sm,
  },
  deviceIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  deviceTextCol: { flex: 1 },
  deviceName: {
    fontFamily: Typography.fonts.semiBold,
    fontSize: Typography.parent.body,
    color: COLORS.parent.textPrimary,
  },
  deviceMeta: {
    fontFamily: Typography.fonts.regular,
    fontSize: Typography.parent.caption,
    color: COLORS.parent.textSecondary,
    marginTop: 2,
  },
  deviceLast: {
    fontFamily: Typography.fonts.regular,
    fontSize: Typography.parent.small,
    color: COLORS.parent.textMuted,
    marginTop: 4,
  },
});
