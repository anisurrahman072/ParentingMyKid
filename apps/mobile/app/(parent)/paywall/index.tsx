/**
 * RevenueCat Paywall Screen.
 * A/B tested premium upsell — shown after free trial or when hitting a premium gate.
 *
 * Plans:
 *   - Family Starter: $9.99/mo — 1 child, basic features
 *   - Family Pro: $19.99/mo — 3 children, all features (RECOMMENDED)
 *   - Family Ultimate: $29.99/mo — 5 children, all features + priority support
 *
 * RevenueCat handles all App Store/Google Play billing.
 * This screen presents the UI; actual purchase goes through react-native-purchases.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import Animated, { FadeInDown, FadeInUp, ZoomIn } from 'react-native-reanimated';
import { COLORS } from '../../../src/constants/colors';
import { SPACING } from '../../../src/constants/spacing';

// RevenueCat product IDs (must match App Store Connect / Google Play console)
const PRODUCT_IDS = {
  STARTER_MONTHLY: Platform.OS === 'ios' ? 'pmk_starter_monthly_ios' : 'pmk_starter_monthly_android',
  PRO_MONTHLY: Platform.OS === 'ios' ? 'pmk_pro_monthly_ios' : 'pmk_pro_monthly_android',
  ULTIMATE_MONTHLY: Platform.OS === 'ios' ? 'pmk_ultimate_monthly_ios' : 'pmk_ultimate_monthly_android',
};

type Plan = 'STARTER' | 'PRO' | 'ULTIMATE';

interface PlanConfig {
  key: Plan;
  name: string;
  price: string;
  period: string;
  children: number;
  recommended: boolean;
  color: string;
  features: string[];
}

const PLANS: PlanConfig[] = [
  {
    key: 'STARTER',
    name: 'Family Starter',
    price: '$9.99',
    period: '/month',
    children: 1,
    recommended: false,
    color: '#4F46E5',
    features: [
      '1 child profile',
      'Daily missions & habits',
      'Basic safety monitoring',
      'Reward engine & badges',
      'Weekly progress reports',
    ],
  },
  {
    key: 'PRO',
    name: 'Family Pro',
    price: '$19.99',
    period: '/month',
    children: 3,
    recommended: true,
    color: COLORS.parent.primary,
    features: [
      '3 children profiles',
      'AI-powered growth plans',
      'Full safety suite (29+ categories)',
      'Social media monitoring',
      'Tutor invite flow',
      'Memory gallery (100GB)',
      'Islamic module (optional)',
      'Nutrition & health tracking',
    ],
  },
  {
    key: 'ULTIMATE',
    name: 'Family Ultimate',
    price: '$29.99',
    period: '/month',
    children: 5,
    recommended: false,
    color: '#7C3AED',
    features: [
      'Everything in Pro',
      '5 children profiles',
      'Priority AI coaching',
      'Advanced analytics',
      'Family finance module',
      'Community access',
      'Priority support',
      'Offline mode',
    ],
  },
];

const FEATURE_HIGHLIGHTS = [
  { emoji: '🛡️', title: 'Safety First', desc: 'AI scans 29+ harmful content categories' },
  { emoji: '🤖', title: 'AI Growth Plans', desc: 'Personalised weekly plans for each child' },
  { emoji: '🎮', title: 'Kids Love It', desc: 'Gamified missions, badges & rewards' },
  { emoji: '📊', title: 'Smart Insights', desc: 'Wellbeing scores and anomaly alerts' },
];

export default function PaywallScreen() {
  const [selectedPlan, setSelectedPlan] = useState<Plan>('PRO');
  const [loading, setLoading] = useState(false);

  async function handlePurchase() {
    setLoading(true);
    try {
      // In production: call RevenueCat react-native-purchases SDK
      // const purchaserInfo = await Purchases.purchasePackage(selectedPackage);
      // Then update subscription state via API

      Alert.alert(
        'Subscription',
        `Purchase ${selectedPlan} plan via App Store/Google Play.\n\nIn production, this calls the RevenueCat SDK to initiate the native billing flow.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Simulate Purchase', onPress: () => router.back() },
        ],
      );
    } catch (err: any) {
      if (!err.userCancelled) {
        Alert.alert('Purchase failed', 'Please try again or contact support.');
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleRestore() {
    Alert.alert('Restore', 'Restoring purchases...\n\nIn production: Purchases.restoreTransactions()');
  }

  const selected = PLANS.find((p) => p.key === selectedPlan)!;

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <LinearGradient colors={['#0F0A1E', '#1A1035']} style={styles.header}>
          <TouchableOpacity style={styles.closeButton} onPress={() => router.back()}>
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>

          <Animated.Text entering={FadeInUp.springify()} style={styles.crown}>👑</Animated.Text>
          <Animated.Text entering={FadeInDown.delay(100)} style={styles.headerTitle}>
            Upgrade Your Family
          </Animated.Text>
          <Animated.Text entering={FadeInDown.delay(200)} style={styles.headerSubtitle}>
            14-day free trial • Cancel anytime
          </Animated.Text>

          {/* Feature highlights */}
          <View style={styles.highlights}>
            {FEATURE_HIGHLIGHTS.map((feat, i) => (
              <Animated.View
                key={feat.title}
                entering={ZoomIn.delay(i * 80 + 300)}
                style={styles.highlightCard}
              >
                <Text style={styles.highlightEmoji}>{feat.emoji}</Text>
                <Text style={styles.highlightTitle}>{feat.title}</Text>
                <Text style={styles.highlightDesc}>{feat.desc}</Text>
              </Animated.View>
            ))}
          </View>
        </LinearGradient>

        {/* Plan selector */}
        <View style={styles.plansContainer}>
          <Text style={styles.plansTitle}>Choose Your Plan</Text>

          {PLANS.map((plan, i) => (
            <Animated.View key={plan.key} entering={FadeInDown.delay(i * 80 + 500)}>
              <TouchableOpacity
                style={[
                  styles.planCard,
                  selectedPlan === plan.key && styles.planCardSelected,
                  selectedPlan === plan.key && { borderColor: plan.color },
                ]}
                onPress={() => setSelectedPlan(plan.key)}
              >
                {plan.recommended && (
                  <View style={[styles.recommendedBadge, { backgroundColor: plan.color }]}>
                    <Text style={styles.recommendedText}>MOST POPULAR</Text>
                  </View>
                )}

                <View style={styles.planHeader}>
                  <View style={styles.planRadio}>
                    <View
                      style={[
                        styles.planRadioInner,
                        selectedPlan === plan.key && { backgroundColor: plan.color },
                      ]}
                    />
                  </View>
                  <View style={styles.planInfo}>
                    <Text style={styles.planName}>{plan.name}</Text>
                    <Text style={styles.planChildren}>{plan.children} child{plan.children > 1 ? 'ren' : ''}</Text>
                  </View>
                  <View style={styles.planPricing}>
                    <Text style={[styles.planPrice, { color: plan.color }]}>{plan.price}</Text>
                    <Text style={styles.planPeriod}>{plan.period}</Text>
                  </View>
                </View>

                <View style={styles.planFeatures}>
                  {plan.features.slice(0, selectedPlan === plan.key ? undefined : 3).map((feat) => (
                    <View key={feat} style={styles.planFeatureRow}>
                      <Text style={[styles.planFeatureCheck, { color: plan.color }]}>✓</Text>
                      <Text style={styles.planFeatureText}>{feat}</Text>
                    </View>
                  ))}
                  {selectedPlan !== plan.key && plan.features.length > 3 && (
                    <Text style={styles.moreFeatures}>+{plan.features.length - 3} more features</Text>
                  )}
                </View>
              </TouchableOpacity>
            </Animated.View>
          ))}
        </View>

        {/* CTA */}
        <View style={styles.ctaContainer}>
          <TouchableOpacity
            style={[styles.ctaButton, { backgroundColor: selected.color }, loading && styles.ctaDisabled]}
            onPress={handlePurchase}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.ctaText}>
                Start Free Trial → {selected.price}/mo after
              </Text>
            )}
          </TouchableOpacity>

          <Text style={styles.guarantee}>
            🔒 Secure payment via {Platform.OS === 'ios' ? 'App Store' : 'Google Play'} • Cancel anytime
          </Text>

          <TouchableOpacity onPress={handleRestore} style={styles.restoreButton}>
            <Text style={styles.restoreText}>Restore Purchases</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.parent.background },
  scrollContent: { paddingBottom: SPACING[10] },
  header: {
    padding: SPACING[5],
    paddingTop: SPACING[4],
    alignItems: 'center',
    gap: SPACING[3],
  },
  closeButton: {
    alignSelf: 'flex-end',
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 18,
  },
  closeText: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '600',
  },
  crown: { fontSize: 56 },
  headerTitle: {
    fontSize: 28,
    fontFamily: 'Inter',
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 15,
    fontFamily: 'Inter',
    color: 'rgba(255,255,255,0.6)',
  },
  highlights: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING[2],
    marginTop: SPACING[3],
  },
  highlightCard: {
    width: '47%',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 14,
    padding: SPACING[4],
    gap: SPACING[1],
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  highlightEmoji: { fontSize: 28 },
  highlightTitle: {
    fontSize: 14,
    fontFamily: 'Inter',
    fontWeight: '700',
    color: '#FFFFFF',
  },
  highlightDesc: {
    fontSize: 12,
    fontFamily: 'Inter',
    color: 'rgba(255,255,255,0.6)',
    lineHeight: 17,
  },
  plansContainer: {
    padding: SPACING[5],
    gap: SPACING[3],
  },
  plansTitle: {
    fontSize: 20,
    fontFamily: 'Inter',
    fontWeight: '700',
    color: COLORS.parent.text,
    marginBottom: SPACING[2],
  },
  planCard: {
    backgroundColor: COLORS.parent.card,
    borderRadius: 18,
    padding: SPACING[4],
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.1)',
    gap: SPACING[3],
    position: 'relative',
    overflow: 'hidden',
  },
  planCardSelected: {
    borderWidth: 2,
  },
  recommendedBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    paddingHorizontal: SPACING[3],
    paddingVertical: SPACING[1],
    borderBottomLeftRadius: 12,
  },
  recommendedText: {
    fontSize: 10,
    fontFamily: 'Inter',
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[3],
  },
  planRadio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  planRadioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: 'transparent',
  },
  planInfo: { flex: 1 },
  planName: {
    fontSize: 16,
    fontFamily: 'Inter',
    fontWeight: '700',
    color: COLORS.parent.text,
  },
  planChildren: {
    fontSize: 13,
    fontFamily: 'Inter',
    color: COLORS.parent.textMuted,
  },
  planPricing: { alignItems: 'flex-end' },
  planPrice: {
    fontSize: 22,
    fontFamily: 'Inter',
    fontWeight: '800',
  },
  planPeriod: {
    fontSize: 12,
    fontFamily: 'Inter',
    color: COLORS.parent.textMuted,
  },
  planFeatures: { gap: SPACING[2] },
  planFeatureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
  },
  planFeatureCheck: {
    fontSize: 14,
    fontWeight: '700',
    width: 18,
  },
  planFeatureText: {
    fontSize: 13,
    fontFamily: 'Inter',
    color: COLORS.parent.textSecondary,
  },
  moreFeatures: {
    fontSize: 12,
    fontFamily: 'Inter',
    color: COLORS.parent.textMuted,
    fontStyle: 'italic',
    marginTop: SPACING[1],
    marginLeft: 22,
  },
  ctaContainer: {
    paddingHorizontal: SPACING[5],
    gap: SPACING[3],
    alignItems: 'center',
  },
  ctaButton: {
    width: '100%',
    borderRadius: 16,
    paddingVertical: SPACING[4],
    alignItems: 'center',
  },
  ctaDisabled: { opacity: 0.7 },
  ctaText: {
    fontSize: 17,
    fontFamily: 'Inter',
    fontWeight: '700',
    color: '#FFFFFF',
  },
  guarantee: {
    fontSize: 12,
    fontFamily: 'Inter',
    color: COLORS.parent.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
  restoreButton: {
    paddingVertical: SPACING[2],
    paddingHorizontal: SPACING[4],
  },
  restoreText: {
    fontSize: 14,
    fontFamily: 'Inter',
    color: COLORS.parent.textMuted,
    textDecorationLine: 'underline',
  },
});
