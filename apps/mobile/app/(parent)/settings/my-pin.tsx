/**
 * "My PIN" — shows the parental PIN on this device (stored at setup) and entry to change it.
 */

import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../../../src/constants/colors';
import { SPACING } from '../../../src/constants/spacing';
import { getParentPinPlain, saveParentPinPlain } from '../../../src/services/parentPinPlainStorage';
import { useAuthStore } from '../../../src/store/auth.store';

function splitDigits(pin: string) {
  return pin.split('').filter((ch) => /\d/.test(ch));
}

export default function MyPinScreen() {
  const [digits, setDigits] = useState<string[] | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      void (async () => {
        const stored = await getParentPinPlain();
        if (!active) return;
        if (stored && /^\d{4}$/.test(stored)) {
          setDigits(splitDigits(stored));
          return;
        }
        await useAuthStore.getState().refreshUserProfileFromServer();
        if (!active) return;
        const fromServer = useAuthStore.getState().user?.parentalPinDigits;
        if (fromServer && /^\d{4}$/.test(fromServer)) {
          setDigits(splitDigits(fromServer));
          await saveParentPinPlain(fromServer);
          return;
        }
        setDigits([]);
      })();
      return () => {
        active = false;
      };
    }, []),
  );

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <Text style={styles.pageTitle}>My PIN</Text>
        <Text style={styles.pageSub}>
          Your 4-digit code unlocks Parent mode from this device after Kids Login. We also keep an encrypted copy on
          your account so you can see it here after reinstall (same protection as your child PIN reminder).
        </Text>

        <LinearGradient
          colors={COLORS.parent.gradientCtaBlue as unknown as readonly [string, string, ...string[]]}
          style={styles.pinRevealOuter}
        >
          <View style={styles.pinRevealInner}>
            <Text style={styles.pinLabel}>Parent PIN</Text>
            {digits === null ? (
              <Text style={styles.loadingHint}>…</Text>
            ) : digits.length === 4 ? (
              <View style={styles.digitRow}>
                {digits.map((d, i) => (
                  <View key={i} style={styles.digitBubble}>
                    <Text style={styles.digit}>{d}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.missingHint}>
                Your PIN is set, but we don’t have an encrypted backup for this account yet (for example you set it
                before this feature, or the server encryption key changed). Tap Change PIN while signed in as parent —
                pick a new PIN twice — and we’ll save a backup so digits show here next time.
              </Text>
            )}
          </View>
        </LinearGradient>

        <TouchableOpacity
          style={styles.ctaOutline}
          onPress={() => router.push('/auth/setup-parental-security-pin?mode=change')}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Change parental PIN"
        >
          <Text style={styles.ctaOutlineText}>Change PIN</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.backLink}
          onPress={() => router.replace('/(parent)/settings')}
          hitSlop={12}
        >
          <Text style={styles.backLinkText}>← Back to settings</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: 'transparent' },
  scroll: { paddingHorizontal: SPACING[5], paddingBottom: SPACING[10], gap: SPACING[4] },
  pageTitle: {
    marginTop: SPACING[2],
    fontFamily: 'Inter_700Bold',
    fontSize: 26,
    color: COLORS.parent.textPrimary,
    letterSpacing: 0.2,
  },
  pageSub: {
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    color: COLORS.parent.textSecondary,
    lineHeight: 22,
  },
  pinRevealOuter: {
    borderRadius: 22,
    padding: 2,
    marginTop: SPACING[2],
    shadowColor: '#1e3a5f33',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 5,
  },
  pinRevealInner: {
    backgroundColor: COLORS.parent.surfaceSolid,
    borderRadius: 20,
    paddingVertical: SPACING[6],
    paddingHorizontal: SPACING[5],
    alignItems: 'center',
    gap: SPACING[3],
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.95)',
  },
  pinLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    letterSpacing: 1.6,
    color: COLORS.parent.textMuted,
    textTransform: 'uppercase',
  },
  digitRow: {
    flexDirection: 'row',
    gap: SPACING[3],
    justifyContent: 'center',
  },
  digitBubble: {
    minWidth: 52,
    height: 64,
    borderRadius: 14,
    backgroundColor: 'rgba(59,130,246,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(59,130,246,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  digit: {
    fontFamily: 'Inter_700Bold',
    fontSize: 32,
    color: COLORS.parent.textPrimary,
    letterSpacing: 2,
  },
  loadingHint: {
    fontSize: 28,
    color: COLORS.parent.textMuted,
  },
  missingHint: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: COLORS.parent.textSecondary,
    textAlign: 'center',
    lineHeight: 21,
  },
  ctaOutline: {
    marginTop: SPACING[2],
    borderRadius: 16,
    borderWidth: 2,
    borderColor: COLORS.parent.primary,
    paddingVertical: SPACING[4],
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.55)',
  },
  ctaOutlineText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 17,
    color: COLORS.parent.primaryDark,
  },
  backLink: { alignItems: 'center', paddingVertical: SPACING[4] },
  backLinkText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 16,
    color: COLORS.parent.textSecondary,
  },
});
