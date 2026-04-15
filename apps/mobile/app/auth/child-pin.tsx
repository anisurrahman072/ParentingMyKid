/**
 * Child PIN login screen.
 * Big, colorful, kid-friendly design with an on-screen number pad.
 * Designed for kids aged 5-16 with large touch targets (56dp min).
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Vibration,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import Animated, {
  FadeInDown,
  FadeInUp,
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { apiClient } from '../../src/services/api.client';
import { API_ENDPOINTS } from '../../src/constants/api';
import { useAuthStore } from '../../src/store/auth.store';
import { COLORS } from '../../src/constants/colors';
import { SPACING } from '../../src/constants/spacing';

const PIN_LENGTH = 4;

const PAD_BUTTONS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['', '0', '⌫'],
];

export default function ChildPinScreen() {
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const shakeX = useSharedValue(0);
  const { login } = useAuthStore();

  useEffect(() => {
    if (pin.length === PIN_LENGTH) {
      submitPin();
    }
  }, [pin]);

  async function submitPin() {
    setLoading(true);
    try {
      const { data } = await apiClient.post(API_ENDPOINTS.auth.childPinLogin, { pin });
      await login(data.accessToken, data.refreshToken, data.user);
    } catch (err: any) {
      // Shake animation + haptic
      Vibration.vibrate([0, 50, 50, 50]);
      shakeX.value = withSequence(
        withTiming(12, { duration: 60 }),
        withTiming(-12, { duration: 60 }),
        withTiming(8, { duration: 60 }),
        withTiming(-8, { duration: 60 }),
        withTiming(0, { duration: 60 }),
      );
      setPin('');
    } finally {
      setLoading(false);
    }
  }

  function handlePress(digit: string) {
    if (digit === '⌫') {
      setPin((prev) => prev.slice(0, -1));
    } else if (digit !== '' && pin.length < PIN_LENGTH) {
      setPin((prev) => prev + digit);
    }
  }

  const animatedPinRow = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeX.value }],
  }));

  return (
    <LinearGradient colors={['#FF6B6B', '#FF8E53', '#FFA726']} style={styles.gradient}>
      <View style={styles.container}>
        <Animated.View entering={FadeInUp.delay(100).springify()} style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>

          <Text style={styles.mascot}>🐼</Text>
          <Text style={styles.title}>Hey! Enter your PIN</Text>
          <Text style={styles.subtitle}>to unlock your adventures</Text>
        </Animated.View>

        {/* PIN dots */}
        <Animated.View style={[styles.pinDots, animatedPinRow]}>
          {Array.from({ length: PIN_LENGTH }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.pinDot,
                i < pin.length && styles.pinDotFilled,
              ]}
            />
          ))}
        </Animated.View>

        {/* Number pad */}
        <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.pad}>
          {PAD_BUTTONS.map((row, rowIdx) => (
            <View key={rowIdx} style={styles.padRow}>
              {row.map((digit, colIdx) => (
                <TouchableOpacity
                  key={colIdx}
                  style={[
                    styles.padButton,
                    digit === '' && styles.padButtonInvisible,
                    digit === '⌫' && styles.padButtonDelete,
                  ]}
                  onPress={() => handlePress(digit)}
                  disabled={digit === '' || loading}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.padButtonText,
                      digit === '⌫' && styles.padButtonDeleteText,
                    ]}
                  >
                    {digit}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          ))}
        </Animated.View>

        <TouchableOpacity style={styles.parentLink} onPress={() => router.replace('/auth/login')}>
          <Text style={styles.parentLinkText}>I'm a parent →</Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING[6],
  },
  header: { alignItems: 'center', marginBottom: SPACING[8] },
  backButton: {
    position: 'absolute',
    top: -80,
    left: -SPACING[6],
    width: 48,
    height: 48,
    justifyContent: 'center',
  },
  backIcon: { fontSize: 26, color: 'rgba(255,255,255,0.8)' },
  mascot: { fontSize: 72, marginBottom: SPACING[3] },
  title: {
    fontSize: 26,
    fontFamily: 'Nunito_400Regular',
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Nunito_400Regular',
    color: 'rgba(255,255,255,0.8)',
    marginTop: SPACING[1],
  },
  pinDots: {
    flexDirection: 'row',
    gap: SPACING[4],
    marginBottom: SPACING[8],
  },
  pinDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.6)',
    backgroundColor: 'transparent',
  },
  pinDotFilled: {
    backgroundColor: '#FFFFFF',
    borderColor: '#FFFFFF',
  },
  pad: { gap: SPACING[3], width: '100%', maxWidth: 280 },
  padRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: SPACING[3],
  },
  padButton: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  padButtonInvisible: {
    backgroundColor: 'transparent',
    borderColor: 'transparent',
  },
  padButtonDelete: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderColor: 'rgba(255,255,255,0.2)',
  },
  padButtonText: {
    fontSize: 28,
    fontFamily: 'Nunito_400Regular',
    fontWeight: '700',
    color: '#FFFFFF',
  },
  padButtonDeleteText: { fontSize: 22 },
  parentLink: {
    marginTop: SPACING[8],
    paddingVertical: SPACING[3],
    paddingHorizontal: SPACING[5],
  },
  parentLinkText: {
    fontSize: 15,
    fontFamily: 'Nunito_400Regular',
    fontWeight: '700',
    color: 'rgba(255,255,255,0.7)',
  },
});
