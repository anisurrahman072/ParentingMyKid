import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Vibration,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import Animated, { useSharedValue, useAnimatedStyle, withSequence, withTiming } from 'react-native-reanimated';
import { deviceSessionService } from '../../src/store/deviceSession.store';
import { useAuthStore, getStoredRefreshToken } from '../../src/store/auth.store';
import { SPACING } from '../../src/constants/spacing';

const PIN_LENGTH = 4;
const PAD = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['', '0', '⌫'],
];

type Step = 'enter' | 'confirm';

export default function SetupUnlockPinScreen() {
  const [step, setStep] = useState<Step>('enter');
  const [first, setFirst] = useState('');
  const [second, setSecond] = useState('');
  const [loading, setLoading] = useState(false);
  const shakeX = useSharedValue(0);
  const { login, refreshAccessToken } = useAuthStore();
  const pin = step === 'enter' ? first : second;

  useEffect(() => {
    void refreshAccessToken();
  }, [refreshAccessToken]);

  useEffect(() => {
    if (step === 'enter' && first.length === PIN_LENGTH) {
      setStep('confirm');
    }
  }, [first, step]);

  useEffect(() => {
    if (step === 'confirm' && second.length === PIN_LENGTH) {
      void done();
    }
  }, [second, step]);

  async function done() {
    if (first !== second) {
      Vibration.vibrate([0, 50, 50, 50]);
      shakeX.value = withSequence(
        withTiming(10, { duration: 50 }),
        withTiming(-10, { duration: 50 }),
        withTiming(0, { duration: 50 }),
      );
      setSecond('');
      return;
    }
    setLoading(true);
    try {
      await refreshAccessToken();
      const { accessToken: at, user: u } = useAuthStore.getState();
      const refreshToken = await getStoredRefreshToken();
      if (!u || !at || !refreshToken) {
        setSecond('');
        return;
      }
      await deviceSessionService.saveParentSession(
        { accessToken: at, refreshToken, user: u },
        first,
      );
      await login(at, refreshToken, u);
      router.replace('/(parent)/dashboard');
    } finally {
      setLoading(false);
    }
  }

  const animated = useAnimatedStyle(() => ({ transform: [{ translateX: shakeX.value }] }));

  return (
    <LinearGradient colors={['#312e81', '#6366f1', '#312e81']} style={styles.gradient}>
      <View style={styles.container}>
        <Text style={styles.title}>
          {step === 'enter' ? 'Create parent code' : 'Confirm parent code'}
        </Text>
        <Text style={styles.sub}>
          Use this 4-digit code to open parent mode on this device. Keep it private from your child.
        </Text>
        <Animated.View style={[styles.dots, animated]}>
          {Array.from({ length: PIN_LENGTH }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                i < pin.length && styles.dotOn,
              ]}
            />
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
                    if (d === '⌫') {
                      if (step === 'enter') setFirst((p) => p.slice(0, -1));
                      else setSecond((p) => p.slice(0, -1));
                    } else if (pin.length < PIN_LENGTH) {
                      if (step === 'enter') setFirst((p) => p + d);
                      else setSecond((p) => p + d);
                    }
                  }}
                >
                  <Text style={styles.keyText}>{d}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ))}
        </View>
        {step === 'confirm' && (
          <TouchableOpacity
            onPress={() => {
              setStep('enter');
              setFirst('');
              setSecond('');
            }}
          >
            <Text style={styles.alt}>Start over</Text>
          </TouchableOpacity>
        )}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  container: { flex: 1, padding: SPACING[6], paddingTop: 56, alignItems: 'center' },
  title: { color: '#fff', fontSize: 22, fontWeight: '900', textAlign: 'center' },
  sub: {
    color: 'rgba(255,255,255,0.8)',
    marginTop: 12,
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 20,
  },
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
  alt: { color: 'rgba(255,255,255,0.7)', marginTop: 20, fontSize: 16 },
});
