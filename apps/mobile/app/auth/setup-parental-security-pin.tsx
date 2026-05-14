/**
 * Parental security PIN setup / change — 4-dot entry on the light mint shell gradient,
 * readable brown typography (premium parent palette).
 *
 * Change flow: parent is already authenticated; no "current PIN" step (recovery-friendly).
 */
import React, { useState, useRef, useCallback, useMemo } from 'react';
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
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  FadeInDown,
  FadeInUp,
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { router, useLocalSearchParams } from 'expo-router';
import { COLORS } from '../../src/constants/colors';
import { SPACING } from '../../src/constants/spacing';
import { apiClient } from '../../src/services/api.client';
import { useAuthStore } from '../../src/store/auth.store';
import { saveParentPinPlain } from '../../src/services/parentPinPlainStorage';
import * as Crypto from 'expo-crypto';
import { setOverlayPinHash } from '../../modules/parental-control/src/index';

type PinStep = 'create' | 'confirm';

function PinDots({
  pin,
  shake,
}: {
  pin: string;
  shake: boolean;
}) {
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
  }, [shake, shakeX]);

  return (
    <Animated.View style={[styles.dotsRow, animStyle]}>
      {[0, 1, 2, 3].map((i) => (
        <Animated.View key={i} style={[styles.dot, pin.length > i && styles.dotFilled]} />
      ))}
    </Animated.View>
  );
}

function PinPad({
  onPress,
  onDelete,
  palette,
}: {
  onPress: (d: string) => void;
  onDelete: () => void;
  palette: typeof pinPadPalettes.lightSurface;
}) {
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'];
  return (
    <View style={styles.padGrid}>
      {keys.map((k, i) => (
        <TouchableOpacity
          key={i}
          style={[styles.padKey, { backgroundColor: palette.keyBg, borderColor: palette.keyBorder }, k === '' && styles.padKeyEmpty]}
          onPress={() => {
            if (k === '⌫') onDelete();
            else if (k !== '') onPress(k);
          }}
          disabled={k === ''}
          activeOpacity={0.76}
          accessibilityRole="button"
          accessibilityLabel={k === '' ? '' : k === '⌫' ? 'Delete' : k}
        >
          {k !== '' ? (
            <Text style={[styles.padKeyText, { color: palette.digit }]}>
              {k === '⌫' ? '⌫' : k}
            </Text>
          ) : null}
        </TouchableOpacity>
      ))}
    </View>
  );
}

/** Keys: frosted capsules; digits: readable brown on light (AA on mint blush). */
const pinPadPalettes = {
  lightSurface: {
    digit: COLORS.parent.textPrimary,
    keyBg: 'rgba(255,255,255,0.88)',
    keyBorder: 'rgba(92,61,46,0.14)',
  },
};

export default function SetupParentalSecurityPinScreen() {
  const params = useLocalSearchParams<{ mode?: string }>();
  const modeParam = typeof params.mode === 'string' ? params.mode : undefined;
  const isChange = modeParam === 'change';

  const updateUser = useAuthStore((s) => s.updateUser);

  const [step, setStep] = useState<PinStep>('create');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [shake, setShake] = useState(false);
  const [saving, setSaving] = useState(false);
  const firstPin = useRef('');

  const currentPin = step === 'create' ? pin : confirmPin;
  const setter = step === 'create' ? setPin : setConfirmPin;

  const headerCopy = useMemo(() => {
    if (step === 'create') {
      return {
        title: isChange ? 'Create your new PIN' : 'Create your parental PIN',
        subtitle: isChange
          ? 'You’re signed in as parent — pick a new PIN only you remember.'
          : 'This PIN protects your settings.\nKids will not see it.',
      };
    }
    return {
      title: 'Re-enter your PIN',
      subtitle: 'Match the PIN you chose on the previous step.',
    };
  }, [step, isChange]);

  const resetFlowToCreate = useCallback(() => {
    setPin('');
    setConfirmPin('');
    firstPin.current = '';
    setStep('create');
  }, []);

  const shakeAndClearConfirm = useCallback(() => {
    Vibration.vibrate(300);
    setShake(true);
    setTimeout(() => {
      setShake(false);
      setConfirmPin('');
    }, 500);
  }, []);

  function handleDigit(d: string) {
    if (saving) return;
    if (currentPin.length >= 4) return;
    const next = currentPin + d;
    setter(next);

    if (next.length !== 4) return;
    setTimeout(() => void handlePinStepComplete(next), 200);
  }

  async function handlePinStepComplete(enteredPin: string) {
    if (step === 'create') {
      firstPin.current = enteredPin;
      setPin('');
      setConfirmPin('');
      setStep('confirm');
      return;
    }

    if (enteredPin !== firstPin.current) {
      shakeAndClearConfirm();
      return;
    }

    setSaving(true);
    try {
      await apiClient.post('/auth/set-parental-pin', { pin: enteredPin });
      await saveParentPinPlain(enteredPin);
      // Write SHA-256 hash to SharedPreferences so the overlay can verify PIN locally
      try {
        const hash = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, enteredPin);
        await setOverlayPinHash(hash);
      } catch {
        // native module not linked (Expo Go) — non-critical
      }
      updateUser({ parentalPinSet: true, parentalPinDigits: enteredPin });
      if (isChange) {
        router.replace('/(parent)/settings/my-pin');
      } else {
        router.replace('/(parent)/control-center');
      }
    } catch (e: any) {
      Alert.alert(
        'Error',
        typeof e?.response?.data?.message === 'string' ? e.response.data.message : 'Could not save PIN. Try again.',
      );
      setConfirmPin('');
    } finally {
      setSaving(false);
    }
  }

  function handleDelete() {
    if (currentPin.length === 0 || saving) return;
    setter(currentPin.slice(0, -1));
  }

  function handleHeaderBack() {
    if (saving) return;
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace('/(parent)/control-center');
  }

  return (
    <LinearGradient colors={[...COLORS.parent.gradientHero]} style={styles.screenGrad}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.topBackHit}
            onPress={handleHeaderBack}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityRole="button"
            accessibilityLabel="Back"
          >
            <Text style={styles.topBackGlyph}>←</Text>
          </TouchableOpacity>
        </View>

        <Animated.View entering={FadeInUp.delay(80).springify()} style={styles.heroCard}>
          <Text style={styles.heroEmoji}>🔐</Text>
          <Text style={styles.title}>{headerCopy.title}</Text>
          <Text style={styles.subtitle}>{headerCopy.subtitle}</Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.pinSection}>
          <PinDots pin={currentPin} shake={shake} />

          {saving ? (
            <ActivityIndicator color={COLORS.parent.primary} size="large" style={styles.spinner} />
          ) : (
            <PinPad onPress={handleDigit} onDelete={handleDelete} palette={pinPadPalettes.lightSurface} />
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
              hitSlop={12}
            >
              <Text style={styles.backText}>← Edit PIN</Text>
            </TouchableOpacity>
          </Animated.View>
        )}

        {step === 'create' && isChange && (
          <TouchableOpacity style={styles.backRow} onPress={() => resetFlowToCreate()} hitSlop={12}>
            <Text style={styles.backText}>← Start over</Text>
          </TouchableOpacity>
        )}
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  screenGrad: {
    flex: 1,
  },
  safe: {
    flex: 1,
    paddingHorizontal: SPACING[6],
    justifyContent: 'space-between',
    paddingBottom: SPACING[8],
  },
  topBar: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING[1],
    marginBottom: SPACING[1],
  },
  topBackHit: {
    paddingVertical: SPACING[2],
    paddingRight: SPACING[4],
  },
  topBackGlyph: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 24,
    color: COLORS.parent.textPrimary,
  },
  heroCard: {
    marginTop: SPACING[1],
    alignItems: 'center',
    paddingVertical: SPACING[5],
    paddingHorizontal: SPACING[4],
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.55)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.75)',
    gap: SPACING[2],
  },
  heroEmoji: { fontSize: 56 },
  title: {
    fontFamily: 'Inter_700Bold',
    fontSize: 24,
    color: COLORS.parent.textPrimary,
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  subtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    color: COLORS.parent.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  pinSection: {
    alignItems: 'center',
    width: '100%',
    flex: 1,
    justifyContent: 'center',
  },
  spinner: { marginTop: SPACING[8] },
  dotsRow: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: SPACING[10],
  },
  dot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: 'rgba(59,130,246,0.45)',
    backgroundColor: 'transparent',
  },
  dotFilled: {
    backgroundColor: COLORS.parent.primary,
    borderColor: COLORS.parent.primaryDark,
  },
  padGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: 280,
    gap: 12,
    justifyContent: 'center',
  },
  padKey: {
    width: 82,
    height: 82,
    borderRadius: 41,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    shadowColor: 'rgba(30,50,40,0.12)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 3,
  },
  padKeyEmpty: {
    backgroundColor: 'transparent',
    borderColor: 'transparent',
    shadowOpacity: 0,
    elevation: 0,
  },
  padKeyText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 28,
  },
  backRow: {
    alignItems: 'center',
    paddingBottom: SPACING[2],
  },
  backText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 16,
    color: COLORS.parent.primaryDark,
  },
});
