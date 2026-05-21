/**
 * Full-screen weather particle overlays — rain drops and snowflakes.
 * Rendered absolutely on top of the time-of-day gradient background; they never
 * intercept touches (`pointerEvents="none"`).
 *
 * Intentionally light/subtle: opacity is kept low so the background theme still
 * reads clearly and the app never feels heavy.
 */
import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions, StyleSheet, View } from 'react-native';

const { width: W, height: H } = Dimensions.get('window');

// ─── Rain ───────────────────────────────────────────────────────────────────

const RAIN_COUNT = 40;

interface RainDrop {
  x: number;
  delay: number;
  duration: number;
  length: number;
  opacity: number;
}

function randomBetween(a: number, b: number) {
  return a + Math.random() * (b - a);
}

const RAIN_DROPS: RainDrop[] = Array.from({ length: RAIN_COUNT }, () => ({
  x: randomBetween(0, W),
  delay: randomBetween(0, 1200),
  duration: randomBetween(700, 1100),
  length: randomBetween(14, 28),
  opacity: randomBetween(0.18, 0.38),
}));

function RainDropAnim({ drop }: { drop: RainDrop }) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(drop.delay),
        Animated.timing(anim, {
          toValue: 1,
          duration: drop.duration,
          useNativeDriver: true,
        }),
        Animated.timing(anim, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [anim, drop.delay, drop.duration]);

  const translateY = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [-drop.length, H + drop.length],
  });

  return (
    <Animated.View
      style={[
        styles.rainDrop,
        {
          left: drop.x,
          height: drop.length,
          opacity: drop.opacity,
          transform: [{ translateY }, { rotate: '15deg' }],
        },
      ]}
    />
  );
}

export function RainOverlay() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {RAIN_DROPS.map((drop, i) => (
        <RainDropAnim key={i} drop={drop} />
      ))}
    </View>
  );
}

// ─── Snow ───────────────────────────────────────────────────────────────────

const SNOW_COUNT = 30;

interface SnowFlake {
  x: number;
  size: number;
  delay: number;
  duration: number;
  swayAmp: number;
  opacity: number;
}

const SNOW_FLAKES: SnowFlake[] = Array.from({ length: SNOW_COUNT }, () => ({
  x: randomBetween(0, W),
  size: randomBetween(4, 9),
  delay: randomBetween(0, 2500),
  duration: randomBetween(3000, 6000),
  swayAmp: randomBetween(8, 22),
  opacity: randomBetween(0.35, 0.65),
}));

function SnowFlakeAnim({ flake }: { flake: SnowFlake }) {
  const fallAnim = useRef(new Animated.Value(0)).current;
  const swayAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const fall = Animated.loop(
      Animated.sequence([
        Animated.delay(flake.delay),
        Animated.timing(fallAnim, {
          toValue: 1,
          duration: flake.duration,
          useNativeDriver: true,
        }),
        Animated.timing(fallAnim, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ]),
    );

    const sway = Animated.loop(
      Animated.sequence([
        Animated.timing(swayAnim, {
          toValue: 1,
          duration: flake.duration * 0.5,
          useNativeDriver: true,
        }),
        Animated.timing(swayAnim, {
          toValue: -1,
          duration: flake.duration * 0.5,
          useNativeDriver: true,
        }),
      ]),
    );

    fall.start();
    sway.start();
    return () => {
      fall.stop();
      sway.stop();
    };
  }, [fallAnim, swayAnim, flake.delay, flake.duration]);

  const translateY = fallAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-flake.size * 2, H + flake.size * 2],
  });

  const translateX = swayAnim.interpolate({
    inputRange: [-1, 1],
    outputRange: [-flake.swayAmp, flake.swayAmp],
  });

  return (
    <Animated.View
      style={[
        styles.snowFlake,
        {
          left: flake.x,
          width: flake.size,
          height: flake.size,
          borderRadius: flake.size / 2,
          opacity: flake.opacity,
          transform: [{ translateY }, { translateX }],
        },
      ]}
    />
  );
}

export function SnowOverlay() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {SNOW_FLAKES.map((flake, i) => (
        <SnowFlakeAnim key={i} flake={flake} />
      ))}
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  rainDrop: {
    position: 'absolute',
    top: 0,
    width: 1.5,
    backgroundColor: '#90B8D8',
    borderRadius: 1,
  },
  snowFlake: {
    position: 'absolute',
    top: 0,
    backgroundColor: '#DDEEF8',
  },
});
