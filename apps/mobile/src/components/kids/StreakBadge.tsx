/**
 * Animated streak counter badge — shown on missions screen.
 * Fire emoji grows on long streaks (7+), turns rainbow on 30+.
 */

import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { COLORS } from '../../constants/colors';
import { SPACING } from '../../constants/spacing';

interface StreakBadgeProps {
  streak: number;
}

export function StreakBadge({ streak }: StreakBadgeProps) {
  const scale = useSharedValue(0);
  const fireScale = useSharedValue(1);

  useEffect(() => {
    scale.value = withSpring(1, { damping: 10, stiffness: 200 });

    if (streak >= 7) {
      fireScale.value = withRepeat(
        withSequence(
          withTiming(1.2, { duration: 500 }),
          withTiming(1, { duration: 500 }),
        ),
        -1,
        true,
      );
    }
  }, [streak]);

  const containerStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const fireStyle = useAnimatedStyle(() => ({ transform: [{ scale: fireScale.value }] }));

  const bgColor = streak >= 30 ? '#FFD700' : streak >= 7 ? '#FF6B35' : COLORS.kids.accent;
  const fireEmoji = streak >= 30 ? '🌟' : streak >= 7 ? '🔥' : '⚡';

  return (
    <Animated.View style={[styles.container, { backgroundColor: bgColor }, containerStyle]}>
      <Animated.Text style={[styles.fire, fireStyle]}>{fireEmoji}</Animated.Text>
      <Text style={styles.count}>{streak}</Text>
      <Text style={styles.label}>day{streak !== 1 ? 's' : ''}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[1],
    paddingHorizontal: SPACING[3],
    paddingVertical: SPACING[2],
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 5,
  },
  fire: { fontSize: 18 },
  count: {
    fontSize: 18,
    fontFamily: 'Nunito_400Regular',
    fontWeight: '900',
    color: '#FFFFFF',
  },
  label: {
    fontSize: 13,
    fontFamily: 'Nunito_400Regular',
    fontWeight: '700',
    color: 'rgba(255,255,255,0.85)',
  },
});
