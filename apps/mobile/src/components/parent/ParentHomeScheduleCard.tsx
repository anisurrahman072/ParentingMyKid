import { useEffect } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import Animated, {
  FadeInDown,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { COLORS } from '../../constants/colors';
import { Spacing, Shadow } from '../../constants/spacing';
import { Typography } from '../../constants/typography';
import { useFamilyStore } from '../../store/family.store';
import { possessiveShortFamilyTitle } from '../../utils/familyTitle';

const CALENDAR_ROUTE = '/(parent)/family-space/calendar' as const;

type Props = {
  /** Stagger after greeting */
  enteringDelay?: number;
};

/** Soft cyan → blush diagonal gradient on the full card (no inner/outer color split). */
const SCHEDULE_CARD_GRADIENT = ['#CFF5FC', '#E8F6FA', '#FCE8F0'] as const;

/**
 * Home: entry to the shared family calendar — premium gradient shell, icon halo, gentle chevron motion.
 */
export function ParentHomeScheduleCard({ enteringDelay = 140 }: Props) {
  const dashboard = useFamilyStore((s) => s.dashboard);
  const familySubtext =
    dashboard == null ? 'Loading…' : possessiveShortFamilyTitle(dashboard.familyName ?? '');

  const chevronX = useSharedValue(0);

  useEffect(() => {
    chevronX.value = withRepeat(
      withSequence(
        withTiming(5, { duration: 750, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 750, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
  }, [chevronX]);

  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: chevronX.value }],
  }));

  return (
    <Animated.View entering={FadeInDown.duration(580).delay(enteringDelay)} style={styles.outer}>
      <Pressable
        onPress={() => router.push(CALENDAR_ROUTE)}
        style={({ pressed }) => [styles.pressable, pressed && styles.pressablePressed]}
        accessibilityRole="button"
        accessibilityLabel={`Family schedule — ${familySubtext}`}
      >
        <LinearGradient
          colors={[...SCHEDULE_CARD_GRADIENT]}
          locations={[0, 0.48, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradientShell}
        >
          <View style={styles.cardInner}>
            <View style={styles.iconBubble}>
              <LinearGradient
                colors={['#0EA5E9', '#2563EB']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.iconBubbleInner}
              >
                <Ionicons name="calendar" size={24} color="#fff" />
              </LinearGradient>
            </View>
            <View style={styles.textCol}>
              <Text style={styles.title}>Family schedule</Text>
              <Text style={styles.sub} numberOfLines={2}>
                {familySubtext}
              </Text>
            </View>
            <Animated.View style={chevronStyle}>
              <Ionicons name="chevron-forward" size={22} color={COLORS.parent.primary} />
            </Animated.View>
          </View>
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
}

const R = 22;

const styles = StyleSheet.create({
  outer: {
    marginBottom: Spacing.lg,
  },
  pressable: {
    borderRadius: R,
    overflow: 'hidden',
    borderWidth: 0,
    ...Shadow.md,
  },
  gradientShell: {
    borderRadius: R,
    overflow: 'hidden',
  },
  pressablePressed: {
    opacity: 0.94,
    transform: [{ scale: 0.992 }],
  },
  cardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    gap: 14,
  },
  iconBubble: {
    borderRadius: 16,
    overflow: 'hidden',
    ...Shadow.sm,
  },
  iconBubbleInner: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textCol: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontFamily: Typography.fonts.interBold,
    fontSize: 17,
    letterSpacing: -0.2,
    color: COLORS.parent.textPrimary,
  },
  sub: {
    marginTop: 4,
    fontFamily: Typography.fonts.interRegular,
    fontSize: 13,
    lineHeight: 18,
    color: COLORS.parent.textSecondary,
  },
});
