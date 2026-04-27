import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Vibration,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import Animated, { useSharedValue, useAnimatedStyle, withSequence, withTiming } from 'react-native-reanimated';
import { deviceSessionService } from '../../src/store/deviceSession.store';
import { useAuthStore } from '../../src/store/auth.store';
import { SPACING } from '../../src/constants/spacing';

const PIN_LENGTH = 4;
const PAD = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['', '0', '⌫'],
];

export default function SwitchToParentScreen() {
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const shakeX = useSharedValue(0);
  const { login } = useAuthStore();

  useEffect(() => {
    if (pin.length === PIN_LENGTH) {
      void submit();
    }
  }, [pin]);

  async function submit() {
    setLoading(true);
    try {
      const ok = await deviceSessionService.verifyUnlockPin(pin);
      if (!ok) {
        Vibration.vibrate([0, 50, 50, 50]);
        shakeX.value = withSequence(
          withTiming(10, { duration: 50 }),
          withTiming(-10, { duration: 50 }),
          withTiming(0, { duration: 50 }),
        );
        setPin('');
        return;
      }
      const session = await deviceSessionService.getParentSession();
      if (!session) {
        Alert.alert('Session missing', 'Sign in as parent with email and password.');
        router.replace('/auth/login');
        return;
      }
      await login(session.accessToken, session.refreshToken, session.user);
      router.replace('/(parent)/dashboard');
    } finally {
      setLoading(false);
    }
  }

  const animated = useAnimatedStyle(() => ({ transform: [{ translateX: shakeX.value }] }));

  return (
    <LinearGradient colors={['#312e81', '#6366f1', '#312e81']} style={styles.gradient}>
      <View style={styles.container}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Parent unlock</Text>
        <Text style={styles.sub}>Enter your 4-digit code</Text>
        <Animated.View style={[styles.dots, animated]}>
          {Array.from({ length: PIN_LENGTH }).map((_, i) => (
            <View key={i} style={[styles.dot, i < pin.length && styles.dotOn]} />
          ))}
        </Animated.View>
        <View style={styles.pad}>
          {PAD.map((row, ri) => (
            <View key={ri} style={styles.row}>
              {row.map((d, ci) => (
                <TouchableOpacity
                  key={ci}
                  style={[styles.key, d === '' && styles.keyEmpty]}
                  disabled={d === '' || loading}
                  onPress={() => {
                    if (d === '⌫') setPin((p) => p.slice(0, -1));
                    else if (pin.length < PIN_LENGTH) setPin((p) => p + d);
                  }}
                >
                  <Text style={styles.keyText}>{d}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ))}
        </View>
        <TouchableOpacity onPress={() => router.replace('/auth/login')}>
          <Text style={styles.alt}>Use parent email & password</Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  container: { flex: 1, padding: SPACING[6], paddingTop: 48, alignItems: 'center' },
  back: { alignSelf: 'flex-start', marginBottom: SPACING[4] },
  backText: { color: 'rgba(255,255,255,0.75)', fontSize: 16 },
  title: { color: '#fff', fontSize: 24, fontWeight: '900' },
  sub: { color: 'rgba(255,255,255,0.75)', marginTop: 8, marginBottom: 24 },
  dots: { flexDirection: 'row', gap: 12, marginBottom: 28 },
  dot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  dotOn: { backgroundColor: '#fff', borderColor: '#fff' },
  pad: { gap: 10, maxWidth: 280 },
  row: { flexDirection: 'row', justifyContent: 'center', gap: 10 },
  key: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyEmpty: { backgroundColor: 'transparent' },
  keyText: { color: '#fff', fontSize: 26, fontWeight: '700' },
  alt: { color: 'rgba(255,255,255,0.65)', marginTop: 24, fontSize: 15 },
});
