/**
 * Circular wellbeing score ring for parent dashboard child cards.
 * Animated SVG-style arc using RN's built-in drawing approach.
 * Color transitions from red (0-40) → amber (40-70) → green (70-100).
 */

import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  interpolateColor,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { COLORS } from '../../constants/colors';

interface WellbeingScoreRingProps {
  score: number; // 0-100
  size?: number;
  strokeWidth?: number;
  label?: string;
}

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export function WellbeingScoreRing({
  score,
  size = 88,
  strokeWidth = 8,
  label = 'Wellbeing',
}: WellbeingScoreRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(score / 100, {
      duration: 1400,
      easing: Easing.out(Easing.cubic),
    });
  }, [score]);

  const strokeDashoffset = circumference - (score / 100) * circumference;

  const scoreColor =
    score >= 70 ? COLORS.parent.success :
    score >= 40 ? '#FFA726' :
    COLORS.parent.danger;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        {/* Background ring */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(0,0,0,0.08)"
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Progress arc */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={scoreColor}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          rotation="-90"
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>

      {/* Center content */}
      <View style={styles.center}>
        <Text style={[styles.score, { color: scoreColor }]}>{Math.round(score)}</Text>
        <Text style={styles.label}>{label}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  score: {
    fontSize: 22,
    fontFamily: 'Inter',
    fontWeight: '800',
    lineHeight: 26,
  },
  label: {
    fontSize: 9,
    fontFamily: 'Inter',
    fontWeight: '600',
    color: COLORS.parent.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
