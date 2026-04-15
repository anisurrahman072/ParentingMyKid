/**
 * XP progress bar for child profile.
 * Animated fill + level number — RPG style.
 */

import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { COLORS } from '../../constants/colors';
import { SPACING } from '../../constants/spacing';

const LEVEL_XP_THRESHOLD = 500; // XP needed per level

interface XpBarProps {
  xp: number;
  level: number;
}

export function XpBar({ xp, level }: XpBarProps) {
  const { width } = Dimensions.get('window');
  const xpInLevel = xp % LEVEL_XP_THRESHOLD;
  const pct = xpInLevel / LEVEL_XP_THRESHOLD;

  const fillWidth = useSharedValue(0);

  useEffect(() => {
    fillWidth.value = withTiming(pct, {
      duration: 1200,
      easing: Easing.out(Easing.cubic),
    });
  }, [pct]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${fillWidth.value * 100}%` as any,
  }));

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.level}>⭐ Level {level}</Text>
        <Text style={styles.xpText}>
          {xpInLevel} / {LEVEL_XP_THRESHOLD} XP
        </Text>
      </View>
      <View style={styles.track}>
        <Animated.View style={[styles.fill, fillStyle]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: '100%' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING[2],
  },
  level: {
    fontSize: 15,
    fontFamily: 'Nunito_400Regular',
    fontWeight: '800',
    color: COLORS.kids.text,
  },
  xpText: {
    fontSize: 13,
    fontFamily: 'Nunito_400Regular',
    fontWeight: '600',
    color: COLORS.kids.textMuted,
  },
  track: {
    height: 14,
    backgroundColor: 'rgba(0,0,0,0.08)',
    borderRadius: 7,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: COLORS.kids.primary,
    borderRadius: 7,
  },
});
