/**
 * Parent registration screen.
 * Multi-step flow: Personal Info → Family Setup → Consent → Start Trial
 * 14-day free trial starts immediately — no credit card on first screen.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
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
import { Redirect, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeInUp, FadeOutUp } from 'react-native-reanimated';
import { useAuthStore } from '../../src/store/auth.store';
import { apiClient } from '../../src/services/api.client';
import { API_ENDPOINTS } from '../../src/constants/api';
import { COLORS } from '../../src/constants/colors';
import { SPACING } from '../../src/constants/spacing';
import { LOGO_PNG, APP_DISPLAY_NAME } from '../../src/constants/branding';
import { getParentPostAuthHref } from '../../src/utils/parentPostAuthHref';
import {
  configureGoogleSignIn,
  formatGoogleSignInError,
  getGoogleSignInResultWithAccountPicker,
  getGoogleWebClientId,
} from '../../src/config/googleSignIn';

type Step = 'personal' | 'religion' | 'consent' | 'success';

type Religion = 'ISLAM' | 'OTHER';

const RELIGIONS: { value: Religion; label: string; emoji: string; desc: string }[] = [
  { value: 'ISLAM', label: 'Islam', emoji: '🕌', desc: 'Islamic content & Halal filtering' },
  { value: 'OTHER', label: 'Other / Prefer not to say', emoji: '🌍', desc: 'General family content' },
];

export default function RegisterScreen() {
  const [step, setStep] = useState<Step>('personal');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [googleIdToken, setGoogleIdToken] = useState<string | null>(null);

  // Personal info
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Religion
  const [religion, setReligion] = useState<Religion>('ISLAM');

  // Consent
  const [consentToTerms, setConsentToTerms] = useState(false);
  const [consentToDataProcessing, setConsentToDataProcessing] = useState(false);

  const { login, isLoading: authLoading, isAuthenticated, user } = useAuthStore();

  if (step !== 'success' && !authLoading && isAuthenticated && user) {
    return <Redirect href={getParentPostAuthHref(user)} />;
  }

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
      const payload = {
        email: email.trim().toLowerCase(),
        password,
        name,
        religion,
        parentalConsentGiven: consentToTerms && consentToDataProcessing,
      };

      let data: any;
      if (googleIdToken) {
        ({ data } = await apiClient.post('/auth/google', {
          idToken: googleIdToken,
          parentalConsentGiven: true,
          religion,
          name,
        }));
      } else {
        try {
          ({ data } = await apiClient.post(API_ENDPOINTS.auth.register, payload));
        } catch (firstErr: any) {
          const raw = firstErr?.response?.data?.message;
          const fromServer = Array.isArray(raw) ? raw.join('\n') : String(raw ?? '');
          const isLegacyServerReligionMismatch =
            firstErr?.response?.status === 400 &&
            /religion\s+should\s+not\s+exist/i.test(fromServer);

          if (!isLegacyServerReligionMismatch) {
            throw firstErr;
          }

          // Backward compatibility: retry for old API versions that don't accept `religion` yet.
          const { religion: _ignoredReligion, ...legacyPayload } = payload;
          ({ data } = await apiClient.post(API_ENDPOINTS.auth.register, legacyPayload));
        }
      }

      await login(data.accessToken, data.refreshToken, data.user);
      setStep('success');

      setTimeout(() => {
        const u = useAuthStore.getState().user;
        if (u) router.replace(getParentPostAuthHref(u));
      }, 2000);
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

  async function handleGoogleSignUp() {
    setGoogleLoading(true);
    try {
      configureGoogleSignIn();
      if (!getGoogleWebClientId()) {
        Alert.alert(
          'Google Sign-In not configured',
          'Add EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID to apps/mobile/.env (Web OAuth client from Google Cloud), restart Metro with --clear, then rebuild the app (expo run:android).',
        );
        return;
      }
      const { statusCodes } = await import('@react-native-google-signin/google-signin');
      const result = await getGoogleSignInResultWithAccountPicker();
      setGoogleIdToken(result.idToken);
      if (result.email) {
        setEmail(result.email);
      }
      if (result.name) {
        const parts = result.name.trim().split(/\s+/);
        if (parts.length > 0) {
          setFirstName(parts[0]);
          setLastName(parts.slice(1).join(' '));
        }
      }
      setStep('religion');
    } catch (err: any) {
      const { statusCodes } = await import('@react-native-google-signin/google-signin');
      if (err.code !== statusCodes.SIGN_IN_CANCELLED) {
        Alert.alert('Google Sign-In failed', formatGoogleSignInError(err));
      }
    } finally {
      setGoogleLoading(false);
    }
  }

  if (step === 'success') {
    return (
      <LinearGradient colors={COLORS.parent.gradientHero} style={styles.gradient}>
        <View style={styles.successContainer}>
          <Animated.View entering={FadeInUp.springify()} style={styles.successLogoWrap}>
            <Animated.Image source={LOGO_PNG} style={styles.successLogo} resizeMode="cover" />
          </Animated.View>
          <Animated.Text entering={FadeInUp.delay(80).springify()} style={styles.successEmoji}>🎉</Animated.Text>
          <Animated.Text entering={FadeInDown.delay(200)} style={styles.successTitle}>
            Welcome to {APP_DISPLAY_NAME}!
          </Animated.Text>
          <Animated.Text entering={FadeInDown.delay(350)} style={styles.successSubtitle}>
            Account created successfully!{'\n'}Let's set up your family.
          </Animated.Text>
          <ActivityIndicator color={COLORS.parent.primary} style={{ marginTop: SPACING[6] }} />
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={COLORS.parent.gradientHero} style={styles.gradient}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <Animated.View entering={FadeInUp.delay(100).springify()} style={styles.header}>
            {/* Step indicator */}
            <View style={styles.stepIndicator}>
              <View style={[styles.stepDot, step === 'personal' && styles.stepDotActive]} />
              <View style={styles.stepLine} />
              <View style={[styles.stepDot, step === 'religion' && styles.stepDotActive]} />
              <View style={styles.stepLine} />
              <View style={[styles.stepDot, step === 'consent' && styles.stepDotActive]} />
            </View>

            <View style={styles.titleRow}>
              <TouchableOpacity
                onPress={() => router.back()}
                style={styles.backButton}
                accessibilityLabel="Go back"
                accessibilityRole="button"
              >
                <Ionicons name="chevron-back" size={28} color={COLORS.parent.textSecondary} />
              </TouchableOpacity>
              <Text style={styles.title}>
                {step === 'personal' ? 'Create Account' : step === 'religion' ? 'Family profile' : 'Almost there!'}
              </Text>
            </View>
            <Text style={styles.subtitle}>
              {step === 'personal'
                ? 'Free account — no credit card needed'
                : step === 'religion'
                ? 'Help us tailor content for your family'
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
                    placeholderTextColor={COLORS.parent.textMuted}
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
                    placeholderTextColor={COLORS.parent.textMuted}
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
                  placeholderTextColor={COLORS.parent.textMuted}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Password</Text>
                <View style={styles.passwordContainer}>
                  <TextInput
                    style={[styles.input, styles.passwordInput]}
                    value={password}
                    onChangeText={setPassword}
                    placeholder="Min. 8 characters"
                    placeholderTextColor={COLORS.parent.textMuted}
                    secureTextEntry={!showPassword}
                  />
                  <TouchableOpacity
                    style={styles.eyeButton}
                    onPress={() => setShowPassword(!showPassword)}
                    accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                    accessibilityRole="button"
                  >
                    <Text style={styles.eyeIcon}>{showPassword ? '🙈' : '👁️'}</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.hint}>Must be at least 8 characters</Text>
              </View>

              <TouchableOpacity
                style={styles.primaryButton}
                onPress={() => {
                  if (!validatePersonal()) return;
                  setGoogleIdToken(null);
                  setStep('religion');
                }}
              >
                <Text style={styles.primaryButtonText}>Continue →</Text>
              </TouchableOpacity>

              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>or</Text>
                <View style={styles.dividerLine} />
              </View>

              <TouchableOpacity
                style={[styles.googleButton, googleLoading && styles.disabled]}
                onPress={handleGoogleSignUp}
                disabled={googleLoading}
              >
                {googleLoading ? (
                  <ActivityIndicator color="#333" />
                ) : (
                  <>
                    <Text style={styles.googleIcon}>G</Text>
                    <Text style={styles.googleButtonText}>Continue with Google</Text>
                  </>
                )}
              </TouchableOpacity>
            </Animated.View>
          )}

          {/* Step: Religion / Family Profile */}
          {step === 'religion' && (
            <Animated.View entering={FadeInDown.delay(200)} style={styles.form}>
              <View style={styles.consentCard}>
                <Text style={styles.consentTitle}>🌟 Personalize your experience</Text>
                <Text style={styles.consentDescription}>
                  Select your family's faith tradition. This helps us recommend appropriate content, videos, and educational materials for your children.
                </Text>
              </View>

              {RELIGIONS.map((rel) => (
                <TouchableOpacity
                  key={rel.value}
                  style={[styles.religionCard, religion === rel.value && styles.religionCardActive]}
                  onPress={() => setReligion(rel.value)}
                >
                  <Text style={styles.religionEmoji}>{rel.emoji}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.religionLabel}>{rel.label}</Text>
                    <Text style={styles.religionDesc}>{rel.desc}</Text>
                  </View>
                  {religion === rel.value && (
                    <View style={styles.religionCheck}>
                      <Text style={{ color: '#fff', fontSize: 14, fontFamily: 'Inter_700Bold' }}>✓</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}

              <View style={styles.buttonRow}>
                <TouchableOpacity style={styles.secondaryButton} onPress={() => setStep('personal')}>
                  <Text style={styles.secondaryButtonText}>← Back</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.primaryButton, styles.flex]}
                  onPress={() => setStep('consent')}
                >
                  <Text style={styles.primaryButtonText}>Continue →</Text>
                </TouchableOpacity>
              </View>
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
                <TouchableOpacity style={styles.secondaryButton} onPress={() => setStep('religion')}>
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
                    <Text style={styles.primaryButtonText}>Create Account 🚀</Text>
                  )}
                </TouchableOpacity>
              </View>

              <Text style={styles.trialNote}>
                ✓ Free account  ✓ No credit card  ✓ All features included
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
    paddingTop: 56,
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
    backgroundColor: COLORS.parent.surface,
  },
  successLogo: { width: 88, height: 88, borderRadius: 20 },
  successEmoji: { fontSize: 72 },
  successTitle: {
    fontSize: 28,
    fontFamily: 'Inter_700Bold',
    color: COLORS.parent.textPrimary,
    marginTop: SPACING[3],
    textAlign: 'center',
  },
  successSubtitle: {
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    color: COLORS.parent.textSecondary,
    textAlign: 'center',
    marginTop: SPACING[3],
    lineHeight: 24,
  },
  header: { marginBottom: SPACING[8] },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING[3],
  },
  backButton: { width: 36, height: 36, justifyContent: 'center', marginRight: SPACING[3] },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING[6],
  },
  stepDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(92, 61, 46, 0.2)',
  },
  stepDotActive: { backgroundColor: COLORS.parent.primary },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: 'rgba(92, 61, 46, 0.15)',
    marginHorizontal: SPACING[2],
  },
  title: {
    fontSize: 28,
    fontFamily: 'Inter_700Bold',
    color: COLORS.parent.textPrimary,
    flexShrink: 1,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    color: COLORS.parent.textSecondary,
    lineHeight: 22,
    marginTop: SPACING[1],
  },
  form: { gap: SPACING[5] },
  nameRow: { flexDirection: 'row', gap: SPACING[4] },
  inputGroup: { gap: SPACING[2] },
  label: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    color: COLORS.parent.textSecondary,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: COLORS.parent.surface,
    borderWidth: 1,
    borderColor: COLORS.parent.surfaceBorder,
    borderRadius: 12,
    paddingHorizontal: SPACING[4],
    paddingVertical: SPACING[4],
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    color: COLORS.parent.textPrimary,
  },
  passwordContainer: { position: 'relative' },
  passwordInput: { paddingRight: 52 },
  eyeButton: {
    position: 'absolute',
    right: SPACING[3],
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    width: 40,
  },
  eyeIcon: { fontSize: 18 },
  hint: {
    fontSize: 12,
    color: COLORS.parent.textMuted,
    fontFamily: 'Inter_400Regular',
  },
  primaryButton: {
    backgroundColor: COLORS.parent.primary,
    borderRadius: 14,
    paddingVertical: SPACING[4],
    alignItems: 'center',
    marginTop: SPACING[1],
  },
  primaryButtonText: {
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
    color: '#FFFFFF',
  },
  disabled: { opacity: 0.7 },
  consentCard: {
    backgroundColor: COLORS.parent.surface,
    borderRadius: 14,
    padding: SPACING[4],
    borderWidth: 1,
    borderColor: COLORS.parent.surfaceBorder,
  },
  consentTitle: {
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
    color: COLORS.parent.textPrimary,
    marginBottom: SPACING[3],
  },
  consentDescription: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: COLORS.parent.textSecondary,
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
    fontFamily: 'Inter_400Regular',
    color: COLORS.parent.textSecondary,
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
    borderColor: COLORS.parent.surfaceBorder,
    backgroundColor: COLORS.parent.surface,
    borderRadius: 14,
    paddingVertical: SPACING[4],
    paddingHorizontal: SPACING[5],
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    color: COLORS.parent.textSecondary,
  },
  trialNote: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: COLORS.parent.textMuted,
    textAlign: 'center',
  },
  religionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[3],
    backgroundColor: COLORS.parent.surface,
    borderRadius: 14,
    padding: SPACING[4],
    borderWidth: 1,
    borderColor: COLORS.parent.surfaceBorder,
  },
  religionCardActive: {
    borderColor: COLORS.parent.primary,
    backgroundColor: 'rgba(59,130,246,0.08)',
  },
  religionEmoji: { fontSize: 28 },
  religionLabel: {
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
    color: COLORS.parent.textPrimary,
  },
  religionDesc: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: COLORS.parent.textSecondary,
    marginTop: 2,
  },
  religionCheck: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.parent.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[3],
    marginVertical: 0,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.parent.surfaceBorder,
  },
  dividerText: {
    fontSize: 13,
    color: COLORS.parent.textMuted,
    fontFamily: 'Inter_400Regular',
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING[3],
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: SPACING[4],
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  googleIcon: {
    fontSize: 20,
    fontFamily: 'Inter_700Bold',
    color: '#4285F4',
  },
  googleButtonText: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    color: '#333333',
  },
  footer: { marginTop: SPACING[4], alignItems: 'center' },
  footerText: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: COLORS.parent.textSecondary,
  },
});
