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
        <AppLogoMark size={128} showWordmark={false} />
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
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => router.push('/auth/register')}
          activeOpacity={0.8}
        >
          <Text style={styles.primaryButtonText}>Start Free Trial — 14 Days</Text>
          <Text style={styles.primaryButtonSub}>No credit card required</Text>
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
    gap: Spacing.sm,
  },
  heroTitle: {
    marginTop: Spacing.md,
  },
  tagline: {
    fontFamily: Typography.fonts.semiBold,
    fontSize: Typography.parent.bodyLarge,
    color: Colors.parent.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.md,
  },
  valueProps: {
    gap: Spacing.md,
    paddingVertical: Spacing.xl,
  },
  valuePropRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  valuePropIcon: {
    fontSize: 24,
  },
  valuePropText: {
    fontFamily: Typography.fonts.semiBold,
    fontSize: Typography.parent.bodyLarge,
    color: Colors.parent.textPrimary,
    flex: 1,
  },
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
  /** Text-style secondary action — tight vertical hit area to save screen height */
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
