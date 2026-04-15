/**
 * Confetti celebration overlay.
 * Renders 60 animated confetti pieces when triggered.
 * Used for mission completion, level-up, badge unlock.
 *
 * Pure RN implementation (no native modules required for now).
 * In production, replace with react-native-confetti-cannon for better perf.
 */

import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Dimensions, Animated as RNAnimated } from 'react-native';

const { width: W, height: H } = Dimensions.get('window');
const CONFETTI_COUNT = 60;
const COLORS_LIST = ['#FF6B6B', '#4ECDC4', '#FFD93D', '#6BCB77', '#4D96FF', '#FF6B35', '#C77DFF'];

function ConfettiPiece() {
  const x = useRef(new RNAnimated.Value(Math.random() * W)).current;
  const y = useRef(new RNAnimated.Value(-20)).current;
  const rotate = useRef(new RNAnimated.Value(0)).current;
  const opacity = useRef(new RNAnimated.Value(1)).current;
  const color = COLORS_LIST[Math.floor(Math.random() * COLORS_LIST.length)];
  const size = 8 + Math.random() * 8;
  const duration = 1800 + Math.random() * 1200;
  const delay = Math.random() * 600;

  useEffect(() => {
    RNAnimated.parallel([
      RNAnimated.timing(y, {
        toValue: H + 40,
        duration,
        delay,
        useNativeDriver: true,
      }),
      RNAnimated.timing(rotate, {
        toValue: (Math.random() > 0.5 ? 1 : -1) * 720,
        duration,
        delay,
        useNativeDriver: true,
      }),
      RNAnimated.timing(opacity, {
        toValue: 0,
        duration: 400,
        delay: delay + duration - 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const spin = rotate.interpolate({
    inputRange: [0, 720],
    outputRange: ['0deg', '720deg'],
  });

  return (
    <RNAnimated.View
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        width: size,
        height: size * (Math.random() > 0.5 ? 2 : 1),
        borderRadius: Math.random() > 0.5 ? size / 2 : 0,
        backgroundColor: color,
        opacity,
        transform: [{ translateX: x }, { translateY: y }, { rotate: spin }],
      }}
    />
  );
}

interface ConfettiCelebrationProps {
  visible: boolean;
}

export function ConfettiCelebration({ visible }: ConfettiCelebrationProps) {
  if (!visible) return null;

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFillObject}>
      {Array.from({ length: CONFETTI_COUNT }).map((_, i) => (
        <ConfettiPiece key={i} />
      ))}
    </View>
  );
}
