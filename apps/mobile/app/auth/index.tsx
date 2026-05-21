/**
 * @module auth/index.tsx
 * @description Welcome/landing screen shown to unauthenticated users.
 *              The first impression — must immediately communicate the core value proposition.
 *              Uses premium gradient background with animated elements.
 */

import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Redirect, router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { Colors } from '../../src/constants/colors';
import { Typography } from '../../src/constants/typography';
import { Spacing } from '../../src/constants/spacing';
import { AppLogoMark } from '../../src/components/branding/AppLogoMark';
import { AppDisplayNameGradient } from '../../src/components/branding/AppDisplayNameGradient';
import { useAuthStore } from '../../src/store/auth.store';
import { getRoleHomeHref } from '../../src/utils/roleHomeHref';

export default function WelcomeScreen() {
  const { isLoading, isAuthenticated, user } = useAuthStore();
  if (!isLoading && isAuthenticated && user) {
    const href = getRoleHomeHref(user.role);
    if (href) {
      return <Redirect href={href} />;
    }
  }

  return (
    <LinearGradient
      colors={Colors.parent.gradientHero as [string, string]}
      style={styles.container}
    >
      {/* Logo and tagline */}
      <Animated.View entering={FadeInDown.duration(800).delay(200)} style={styles.hero}>

        {/* Ambient color blobs — the premium backdrop */}
        <View style={styles.blobWrap} pointerEvents="none">
          <LinearGradient
            colors={['rgba(116,148,255,0.28)', 'rgba(116,148,255,0)']}
            style={[styles.blob, styles.blobTopLeft]}
          />
          <LinearGradient
            colors={['rgba(218,120,244,0.24)', 'rgba(218,120,244,0)']}
            style={[styles.blob, styles.blobTopRight]}
          />
          <LinearGradient
            colors={['rgba(72,196,175,0.22)', 'rgba(72,196,175,0)']}
            style={[styles.blob, styles.blobBottomLeft]}
          />
          <LinearGradient
            colors={['rgba(255,160,120,0.18)', 'rgba(255,160,120,0)']}
            style={[styles.blob, styles.blobBottomRight]}
          />
        </View>

        {/* Sparkle dots — tiny, tasteful */}
        <Text style={[styles.sparkle, styles.sparkleTL]}>✦</Text>
        <Text style={[styles.sparkle, styles.sparkleTR]}>✦</Text>
        <Text style={[styles.sparkle, styles.sparkleBL]}>✧</Text>
        <Text style={[styles.sparkle, styles.sparkleBR]}>✧</Text>

        {/* Logo card */}
        <View style={styles.logoCard}>
          <View style={styles.logoCardInner}>
            {/* Diagonal premium lines behind logo */}
            <LinearGradient
              colors={['rgba(130,158,255,0.22)', 'rgba(130,158,255,0)']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={[styles.diagLine, styles.diagLine1]}
            />
            <LinearGradient
              colors={['rgba(218,120,244,0.18)', 'rgba(218,120,244,0)']}
              start={{ x: 1, y: 0 }} end={{ x: 0, y: 1 }}
              style={[styles.diagLine, styles.diagLine2]}
            />
            <LinearGradient
              colors={['rgba(72,196,175,0.16)', 'rgba(72,196,175,0)']}
              start={{ x: 0, y: 1 }} end={{ x: 1, y: 0 }}
              style={[styles.diagLine, styles.diagLine3]}
            />
            <LinearGradient
              colors={['rgba(255,160,100,0.14)', 'rgba(255,160,100,0)']}
              start={{ x: 1, y: 1 }} end={{ x: 0, y: 0 }}
              style={[styles.diagLine, styles.diagLine4]}
            />
            <LinearGradient
              colors={['rgba(130,158,255,0.12)', 'rgba(218,120,244,0.12)', 'rgba(72,196,175,0.1)']}
              start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }}
              style={[styles.diagLine, styles.diagLine5]}
            />
            <AppLogoMark size={120} showWordmark={false} />
          </View>
        </View>

        {/* Brand name */}
        <AppDisplayNameGradient style={styles.heroTitle} />
        <Text style={styles.tagline}>Grow together. Every day.</Text>
      </Animated.View>

      {/* Value propositions */}
      <Animated.View entering={FadeInUp.duration(800).delay(400)} style={styles.valueProps}>
        <ValueProp icon="🛡️" text="Keep your child safe — online and offline" />
        <ValueProp icon="📈" text="Track real growth in every area" />
        <ValueProp icon="🎮" text="Kids LOVE the missions and reward system" />
        <ValueProp icon="🤖" text="AI parenting coach — knows your child" />
      </Animated.View>

      {/* CTA Buttons */}
      <Animated.View entering={FadeInUp.duration(800).delay(600)} style={styles.buttons}>
        {/* TODO: commented-for-now 🔴 — "Start Free Trial" button hidden for Milestone 1 (all features free, no trial messaging needed). Restore when paid tier launches.
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => router.push('/auth/register')}
          activeOpacity={0.8}
        >
          <Text style={styles.primaryButtonText}>Start Free Trial — 14 Days</Text>
          <Text style={styles.primaryButtonSub}>No credit card required</Text>
        </TouchableOpacity>
        */}

        {/* Milestone 1 replacement — clean free account CTA */}
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => router.push('/auth/register')}
          activeOpacity={0.8}
        >
          <Text style={styles.primaryButtonText}>Get Started Free</Text>
          <Text style={styles.primaryButtonSub}>Create your parental account</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryLink}
          onPress={() => router.push('/auth/login')}
          activeOpacity={0.65}
          hitSlop={{ top: 14, bottom: 14, left: 20, right: 20 }}
        >
          <Text style={styles.secondaryLinkText}>I already have an account</Text>
        </TouchableOpacity>
      </Animated.View>

      <Text style={styles.legalText}>
        By continuing, you agree to our Privacy Policy. We never sell your child's data.
      </Text>
    </LinearGradient>
  );
}

function ValueProp({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={styles.valuePropRow}>
      <Text style={styles.valuePropIcon}>{icon}</Text>
      <Text style={styles.valuePropText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: Spacing.screenPadding,
    paddingTop: 80,
    paddingBottom: 40,
    justifyContent: 'space-between',
  },
  hero: {
    alignItems: 'center',
    gap: 6,
    position: 'relative',
  },

  /* ── ambient blobs ── */
  blobWrap: {
    position: 'absolute',
    width: 340,
    height: 260,
    top: -36,
  },
  blob: {
    position: 'absolute',
    borderRadius: 999,
  },
  blobTopLeft: {
    width: 160,
    height: 140,
    top: 0,
    left: 0,
    transform: [{ rotate: '-18deg' }],
  },
  blobTopRight: {
    width: 150,
    height: 140,
    top: 0,
    right: 0,
    transform: [{ rotate: '14deg' }],
  },
  blobBottomLeft: {
    width: 140,
    height: 120,
    bottom: 8,
    left: 10,
    transform: [{ rotate: '12deg' }],
  },
  blobBottomRight: {
    width: 148,
    height: 118,
    bottom: 6,
    right: 6,
    transform: [{ rotate: '-14deg' }],
  },

  /* ── sparkles ── */
  sparkle: {
    position: 'absolute',
    fontSize: 14,
    color: 'rgba(110, 141, 248, 0.65)',
    fontFamily: Typography.fonts.extraBold,
  },
  sparkleTL: { top: 14, left: 30 },
  sparkleTR: { top: 10, right: 28 },
  sparkleBL: { top: 160, left: 14 },
  sparkleBR: { top: 156, right: 12 },

  /* ── logo card ── */
  logoCard: {
    borderRadius: 32,
    marginTop: 20,
    shadowColor: '#4a6ef5',
    shadowOpacity: 0.15,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 0,
  },
  logoCardInner: {
    borderRadius: 32,
    padding: 16,
    backgroundColor: '#ffffff',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  diagLine: {
    position: 'absolute',
    borderRadius: 999,
  },
  diagLine1: {
    width: 220,
    height: 60,
    top: -10,
    left: -30,
    transform: [{ rotate: '32deg' }],
  },
  diagLine2: {
    width: 200,
    height: 55,
    top: -8,
    right: -30,
    transform: [{ rotate: '-36deg' }],
  },
  diagLine3: {
    width: 210,
    height: 52,
    bottom: -8,
    left: -20,
    transform: [{ rotate: '-30deg' }],
  },
  diagLine4: {
    width: 200,
    height: 50,
    bottom: -10,
    right: -28,
    transform: [{ rotate: '34deg' }],
  },
  diagLine5: {
    width: 260,
    height: 38,
    top: '48%',
    transform: [{ rotate: '-18deg' }],
  },

  /* ── name / tagline ── */
  heroTitle: {
    marginTop: 4,
  },
  tagline: {
    fontFamily: Typography.fonts.semiBold,
    fontSize: Typography.parent.bodyLarge,
    color: Colors.parent.textSecondary,
    textAlign: 'center',
    marginTop: 2,
  },

  /* ── value props ── */
  valueProps: {
    gap: Spacing.md,
    paddingVertical: Spacing.xl,
  },
  valuePropRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  valuePropIcon: { fontSize: 24 },
  valuePropText: {
    fontFamily: Typography.fonts.semiBold,
    fontSize: Typography.parent.bodyLarge,
    color: Colors.parent.textPrimary,
    flex: 1,
  },

  /* ── buttons ── */
  buttons: {
    gap: Spacing.sm,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: Colors.parent.primary,
    borderRadius: Spacing.cardBorderRadius,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    alignItems: 'center',
  },
  primaryButtonText: {
    fontFamily: Typography.fonts.extraBold,
    fontSize: Typography.parent.heading,
    color: Colors.white,
  },
  primaryButtonSub: {
    fontFamily: Typography.fonts.regular,
    fontSize: Typography.parent.small,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  secondaryLink: {
    paddingVertical: 4,
    paddingHorizontal: Spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryLinkText: {
    fontFamily: Typography.fonts.extraBold,
    fontSize: Typography.parent.label,
    color: Colors.parent.primary,
  },
  legalText: {
    fontFamily: Typography.fonts.regular,
    fontSize: Typography.parent.caption,
    color: Colors.parent.textSecondary,
    textAlign: 'center',
    opacity: 0.7,
  },
});
