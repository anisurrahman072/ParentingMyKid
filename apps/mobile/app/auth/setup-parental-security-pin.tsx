/**
 * Parental security PIN setup screen.
 * Shown once after first parent login when parentalPinSet === false.
 * Uses a 4-dot PIN entry (no visible text input).
 */
import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Vibration,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeInDown,
  FadeInUp,
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  withSpring,
} from 'react-native-reanimated';
import { router } from 'expo-router';
import { COLORS } from '../../src/constants/colors';
import { apiClient } from '../../src/services/api.client';
import { useAuthStore } from '../../src/store/auth.store';

type PinStep = 'create' | 'confirm';

function PinDots({ pin, shake }: { pin: string; shake: boolean }) {
  const shakeX = useSharedValue(0);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shakeX.value }] }));

  React.useEffect(() => {
    if (shake) {
      shakeX.value = withSequence(
        withTiming(-10, { duration: 60 }),
        withTiming(10, { duration: 60 }),
        withTiming(-8, { duration: 60 }),
        withTiming(8, { duration: 60 }),
        withTiming(0, { duration: 60 }),
      );
    }
  }, [shake]);

  return (
    <Animated.View style={[styles.dotsRow, animStyle]}>
      {[0, 1, 2, 3].map((i) => (
        <Animated.View
          key={i}
          style={[
            styles.dot,
            pin.length > i && styles.dotFilled,
          ]}
        />
      ))}
    </Animated.View>
  );
}

function PinPad({ onPress, onDelete }: { onPress: (d: string) => void; onDelete: () => void }) {
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'];
  return (
    <View style={styles.padGrid}>
      {keys.map((k, i) => (
        <TouchableOpacity
          key={i}
          style={[styles.padKey, k === '' && styles.padKeyEmpty]}
          onPress={() => {
            if (k === '⌫') onDelete();
            else if (k !== '') onPress(k);
          }}
          disabled={k === ''}
          activeOpacity={0.7}
        >
          {k !== '' && <Text style={styles.padKeyText}>{k}</Text>}
        </TouchableOpacity>
      ))}
    </View>
  );
}

export default function SetupParentalSecurityPinScreen() {
  const [step, setStep] = useState<PinStep>('create');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [shake, setShake] = useState(false);
  const [saving, setSaving] = useState(false);
  const firstPin = useRef('');
  const { login, user } = useAuthStore();

  const currentPin = step === 'create' ? pin : confirmPin;
  const setter = step === 'create' ? setPin : setConfirmPin;

  function handleDigit(d: string) {
    if (currentPin.length >= 4) return;
    const next = currentPin + d;
    setter(next);

    if (next.length === 4) {
      setTimeout(() => handleComplete(next), 200);
    }
  }

  function handleDelete() {
    if (currentPin.length === 0) return;
    setter(currentPin.slice(0, -1));
  }

  async function handleComplete(enteredPin: string) {
    if (step === 'create') {
      firstPin.current = enteredPin;
      setPin('');
      setStep('confirm');
      return;
    }

    // Confirm step
    if (enteredPin !== firstPin.current) {
      Vibration.vibrate(300);
      setShake(true);
      setTimeout(() => {
        setShake(false);
        setConfirmPin('');
      }, 500);
      return;
    }

    // PINs match — save
    setSaving(true);
    try {
      await apiClient.post('/auth/set-parental-pin', { pin: enteredPin });
      router.replace('/(parent)/control-center');
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message || 'Could not save PIN. Please try again.');
      setConfirmPin('');
    } finally {
      setSaving(false);
    }
  }

  return (
    <LinearGradient
      colors={COLORS.parent.gradientHero as unknown as [string, string]}
      style={styles.container}
    >
      <Animated.View entering={FadeInUp.delay(100).springify()} style={styles.header}>
        <Text style={styles.emoji}>🔐</Text>
        <Text style={styles.title}>
          {step === 'create' ? 'Create your parental PIN' : 'Confirm your PIN'}
        </Text>
        <Text style={styles.subtitle}>
          {step === 'create'
            ? 'This PIN protects your settings.\nOnly you will know it.'
            : 'Re-enter the same PIN to confirm.'}
        </Text>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(300).springify()} style={styles.pinSection}>
        <PinDots pin={currentPin} shake={shake} />

        {saving ? (
          <ActivityIndicator color="#fff" size="large" style={{ marginTop: 32 }} />
        ) : (
          <PinPad onPress={handleDigit} onDelete={handleDelete} />
        )}
      </Animated.View>

      {step === 'confirm' && (
        <Animated.View entering={FadeInDown.delay(400)} style={styles.backRow}>
          <TouchableOpacity
            onPress={() => {
              setStep('create');
              setPin('');
              setConfirmPin('');
              firstPin.current = '';
            }}
          >
            <Text style={styles.backText}>← Start over</Text>
          </TouchableOpacity>
        </Animated.View>
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 80,
    paddingBottom: 48,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  header: {
    alignItems: 'center',
    gap: 12,
  },
  emoji: { fontSize: 60 },
  title: {
    fontFamily: 'Inter_700Bold',
    fontSize: 26,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 16,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    lineHeight: 24,
  },
  pinSection: {
    alignItems: 'center',
    width: '100%',
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 40,
  },
  dot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.6)',
    backgroundColor: 'transparent',
  },
  dotFilled: {
    backgroundColor: '#FFFFFF',
    borderColor: '#FFFFFF',
  },
  padGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: 280,
    gap: 12,
  },
  padKey: {
    width: 82,
    height: 82,
    borderRadius: 41,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  padKeyEmpty: {
    backgroundColor: 'transparent',
    borderColor: 'transparent',
  },
  padKeyText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 28,
    color: '#FFFFFF',
  },
  backRow: {
    alignItems: 'center',
  },
  backText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 16,
    color: 'rgba(255,255,255,0.7)',
  },
});
