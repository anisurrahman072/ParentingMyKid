/**
 * Parent registration screen.
 * Multi-step flow: Personal Info → Family Setup → Consent → Start Trial
 * 14-day free trial starts immediately — no credit card on first screen.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import Animated, { FadeInDown, FadeInUp, FadeOutUp } from 'react-native-reanimated';
import { useAuthStore } from '../../src/store/auth.store';
import { apiClient } from '../../src/services/api.client';
import { API_ENDPOINTS } from '../../src/constants/api';
import { COLORS } from '../../src/constants/colors';
import { SPACING } from '../../src/constants/spacing';
import { AppLogoMark } from '../../src/components/branding/AppLogoMark';
import { LOGO_PNG, APP_DISPLAY_NAME } from '../../src/constants/branding';

type Step = 'personal' | 'consent' | 'success';

export default function RegisterScreen() {
  const [step, setStep] = useState<Step>('personal');
  const [loading, setLoading] = useState(false);

  // Personal info
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Consent
  const [consentToTerms, setConsentToTerms] = useState(false);
  const [consentToDataProcessing, setConsentToDataProcessing] = useState(false);

  const { login } = useAuthStore();

  function validatePersonal(): boolean {
    if (!firstName.trim()) { Alert.alert('Required', 'Please enter your first name.'); return false; }
    if (!email.trim() || !email.includes('@')) { Alert.alert('Required', 'Please enter a valid email.'); return false; }
    if (password.length < 8) { Alert.alert('Weak password', 'Password must be at least 8 characters.'); return false; }
    return true;
  }

  async function handleRegister() {
    if (!consentToTerms || !consentToDataProcessing) {
      Alert.alert('Consent required', 'Please agree to both items to continue.');
      return;
    }

    setLoading(true);
    try {
      const name = [firstName.trim(), lastName.trim()].filter(Boolean).join(' ').trim() || firstName.trim();
      const { data } = await apiClient.post(API_ENDPOINTS.auth.register, {
        email: email.trim().toLowerCase(),
        password,
        name,
        parentalConsentGiven: consentToTerms && consentToDataProcessing,
      });

      await login(data.accessToken, data.refreshToken, data.user);
      setStep('success');

      // Navigate to baseline assessment (primary conversion hook)
      setTimeout(() => router.replace('/(parent)/dashboard'), 2000);
    } catch (err: any) {
      const raw = err.response?.data?.message;
      const fromServer = Array.isArray(raw) ? raw.join('\n') : raw;
      const networkHint =
        err.code === 'ERR_NETWORK' || err.message === 'Network Error'
          ? '\n\nCheck that the API is running and EXPO_PUBLIC_API_BASE_URL (or same Wi‑Fi as Metro) points to your computer.'
          : '';
      const message =
        fromServer ||
        (err.message && err.message !== 'Network Error' ? err.message : null) ||
        `Registration failed. Please try again.${networkHint}`;
      Alert.alert('Error', message);
    } finally {
      setLoading(false);
    }
  }

  if (step === 'success') {
    return (
      <LinearGradient colors={['#0F0A1E', '#1A1035', '#0F0A1E']} style={styles.gradient}>
        <View style={styles.successContainer}>
          <Animated.View entering={FadeInUp.springify()} style={styles.successLogoWrap}>
            <Image source={LOGO_PNG} style={styles.successLogo} resizeMode="cover" />
          </Animated.View>
          <Animated.Text entering={FadeInUp.delay(80).springify()} style={styles.successEmoji}>🎉</Animated.Text>
          <Animated.Text entering={FadeInDown.delay(200)} style={styles.successTitle}>
            Welcome to {APP_DISPLAY_NAME}!
          </Animated.Text>
          <Animated.Text entering={FadeInDown.delay(350)} style={styles.successSubtitle}>
            Your 14-day free trial has started.{'\n'}Let's build your family profile.
          </Animated.Text>
          <ActivityIndicator color={COLORS.parent.primary} style={{ marginTop: SPACING[6] }} />
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={['#0F0A1E', '#1A1035', '#0F0A1E']} style={styles.gradient}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <Animated.View entering={FadeInUp.delay(100).springify()} style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Text style={styles.backIcon}>←</Text>
            </TouchableOpacity>
            <View style={styles.logoBlock}>
              <AppLogoMark size={80} showWordmark wordmarkColor="light" />
            </View>

            {/* Step indicator */}
            <View style={styles.stepIndicator}>
              <View style={[styles.stepDot, step === 'personal' && styles.stepDotActive]} />
              <View style={styles.stepLine} />
              <View style={[styles.stepDot, step === 'consent' && styles.stepDotActive]} />
            </View>

            <Text style={styles.title}>
              {step === 'personal' ? 'Create your account' : 'Almost there!'}
            </Text>
            <Text style={styles.subtitle}>
              {step === 'personal'
                ? '14-day free trial — no credit card needed'
                : 'We take your family\'s privacy seriously'}
            </Text>
          </Animated.View>

          {/* Step: Personal Info */}
          {step === 'personal' && (
            <Animated.View entering={FadeInDown.delay(200)} style={styles.form}>
              <View style={styles.nameRow}>
                <View style={[styles.inputGroup, styles.flex]}>
                  <Text style={styles.label}>First name</Text>
                  <TextInput
                    style={styles.input}
                    value={firstName}
                    onChangeText={setFirstName}
                    placeholder="Sarah"
                    placeholderTextColor="rgba(255,255,255,0.3)"
                    autoCapitalize="words"
                  />
                </View>
                <View style={[styles.inputGroup, styles.flex]}>
                  <Text style={styles.label}>Last name</Text>
                  <TextInput
                    style={styles.input}
                    value={lastName}
                    onChangeText={setLastName}
                    placeholder="Johnson"
                    placeholderTextColor="rgba(255,255,255,0.3)"
                    autoCapitalize="words"
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Email address</Text>
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="parent@email.com"
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Password</Text>
                <TextInput
                  style={styles.input}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Min. 8 characters"
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  secureTextEntry
                />
                <Text style={styles.hint}>Must be at least 8 characters</Text>
              </View>

              <TouchableOpacity
                style={styles.primaryButton}
                onPress={() => validatePersonal() && setStep('consent')}
              >
                <Text style={styles.primaryButtonText}>Continue →</Text>
              </TouchableOpacity>
            </Animated.View>
          )}

          {/* Step: Consent */}
          {step === 'consent' && (
            <Animated.View entering={FadeInDown.delay(200)} style={styles.form}>
              <View style={styles.consentCard}>
                <Text style={styles.consentTitle}>🔒 Privacy & Safety</Text>
                <Text style={styles.consentDescription}>
                  ParentingMyKid processes your children's data to provide growth tracking, safety monitoring, and AI coaching. We never sell or share personal data with third parties.
                </Text>
              </View>

              <TouchableOpacity
                style={styles.consentRow}
                onPress={() => setConsentToTerms(!consentToTerms)}
              >
                <Switch
                  value={consentToTerms}
                  onValueChange={setConsentToTerms}
                  trackColor={{ true: COLORS.parent.primary }}
                  thumbColor="#fff"
                />
                <Text style={styles.consentText}>
                  I agree to the{' '}
                  <Text style={styles.link}>Terms of Service</Text>
                  {' '}and{' '}
                  <Text style={styles.link}>Privacy Policy</Text>
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.consentRow}
                onPress={() => setConsentToDataProcessing(!consentToDataProcessing)}
              >
                <Switch
                  value={consentToDataProcessing}
                  onValueChange={setConsentToDataProcessing}
                  trackColor={{ true: COLORS.parent.primary }}
                  thumbColor="#fff"
                />
                <Text style={styles.consentText}>
                  I consent to processing my children's data for family growth features (required by COPPA/GDPR)
                </Text>
              </TouchableOpacity>

              <View style={styles.buttonRow}>
                <TouchableOpacity style={styles.secondaryButton} onPress={() => setStep('personal')}>
                  <Text style={styles.secondaryButtonText}>← Back</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.primaryButton, styles.flex, loading && styles.disabled]}
                  onPress={handleRegister}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.primaryButtonText}>Start Free Trial 🚀</Text>
                  )}
                </TouchableOpacity>
              </View>

              <Text style={styles.trialNote}>
                ✓ 14 days free  ✓ No credit card  ✓ Cancel anytime
              </Text>
            </Animated.View>
          )}

          <Animated.View entering={FadeInDown.delay(400)} style={styles.footer}>
            <Text style={styles.footerText}>
              Already have an account?{' '}
              <Text style={styles.link} onPress={() => router.replace('/auth/login')}>
                Sign in
              </Text>
            </Text>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  gradient: { flex: 1 },
  container: {
    flexGrow: 1,
    paddingHorizontal: SPACING[6],
    paddingTop: 60,
    paddingBottom: 40,
  },
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING[6],
  },
  successLogoWrap: {
    marginBottom: SPACING[3],
    padding: 6,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  successLogo: { width: 88, height: 88, borderRadius: 20 },
  successEmoji: { fontSize: 72 },
  successTitle: {
    fontSize: 28,
    fontFamily: 'Inter',
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: SPACING[3],
    textAlign: 'center',
  },
  successSubtitle: {
    fontSize: 16,
    fontFamily: 'Inter',
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    marginTop: SPACING[3],
    lineHeight: 24,
  },
  header: { marginBottom: SPACING[8] },
  backButton: { width: 40, height: 40, justifyContent: 'center', marginBottom: SPACING[4] },
  backIcon: { fontSize: 24, color: 'rgba(255,255,255,0.7)' },
  logoBlock: { alignItems: 'center', marginBottom: SPACING[3] },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING[5],
  },
  stepDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  stepDotActive: { backgroundColor: COLORS.parent.primary },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.15)',
    marginHorizontal: SPACING[2],
  },
  title: {
    fontSize: 28,
    fontFamily: 'Inter',
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: SPACING[2],
  },
  subtitle: {
    fontSize: 15,
    fontFamily: 'Inter',
    color: 'rgba(255,255,255,0.6)',
  },
  form: { gap: SPACING[4] },
  nameRow: { flexDirection: 'row', gap: SPACING[3] },
  inputGroup: { gap: SPACING[2] },
  label: {
    fontSize: 12,
    fontFamily: 'Inter',
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 12,
    paddingHorizontal: SPACING[4],
    paddingVertical: SPACING[4],
    fontSize: 16,
    fontFamily: 'Inter',
    color: '#FFFFFF',
  },
  hint: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
    fontFamily: 'Inter',
  },
  primaryButton: {
    backgroundColor: COLORS.parent.primary,
    borderRadius: 14,
    paddingVertical: SPACING[4],
    alignItems: 'center',
    marginTop: SPACING[2],
  },
  primaryButtonText: {
    fontSize: 16,
    fontFamily: 'Inter',
    fontWeight: '700',
    color: '#FFFFFF',
  },
  disabled: { opacity: 0.7 },
  consentCard: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 14,
    padding: SPACING[4],
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  consentTitle: {
    fontSize: 16,
    fontFamily: 'Inter',
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: SPACING[3],
  },
  consentDescription: {
    fontSize: 14,
    fontFamily: 'Inter',
    color: 'rgba(255,255,255,0.6)',
    lineHeight: 22,
  },
  consentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING[3],
  },
  consentText: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Inter',
    color: 'rgba(255,255,255,0.7)',
    lineHeight: 20,
    marginTop: 2,
  },
  link: {
    color: COLORS.parent.primary,
    fontWeight: '600',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: SPACING[3],
    marginTop: SPACING[2],
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: 14,
    paddingVertical: SPACING[4],
    paddingHorizontal: SPACING[5],
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: 15,
    fontFamily: 'Inter',
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
  },
  trialNote: {
    fontSize: 13,
    fontFamily: 'Inter',
    color: 'rgba(255,255,255,0.4)',
    textAlign: 'center',
  },
  footer: { marginTop: SPACING[8], alignItems: 'center' },
  footerText: {
    fontSize: 14,
    fontFamily: 'Inter',
    color: 'rgba(255,255,255,0.5)',
  },
});
