/**
 * Parent login screen.
 * Clean, minimal premium design with email + password.
 */

import React, { useState, useRef } from 'react';
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
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Redirect, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useAuthStore } from '../../src/store/auth.store';
import { apiClient } from '../../src/services/api.client';
import { API_ENDPOINTS } from '../../src/constants/api';
import { COLORS } from '../../src/constants/colors';
import { SPACING } from '../../src/constants/spacing';
import { getRoleHomeHref } from '../../src/utils/roleHomeHref';
import { getResolvedActiveFamilyId } from '../../src/store/activeFamily.persistence';
import { FamilyDashboard } from '@parentingmykid/shared-types';
import { autoPairCurrentDevice } from '../../src/services/devicePairing.service';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const passwordRef = useRef<TextInput>(null);

  const { login, isLoading: authLoading, isAuthenticated, user } = useAuthStore();

  if (!authLoading && isAuthenticated && user) {
    const href = getRoleHomeHref(user.role);
    if (href) {
      return <Redirect href={href} />;
    }
  }

  async function handleLogin() {
    if (!email.trim() || !password) {
      Alert.alert('Missing fields', 'Please enter your email and password.');
      return;
    }

    setLoading(true);
    try {
      const { data } = await apiClient.post(API_ENDPOINTS.auth.login, { email, password });
      await login(data.accessToken, data.refreshToken, data.user);
      await tryAutoPairOnParentLogin(data.user.familyIds ?? []);
      // Root layout handles redirect based on role
    } catch (err: any) {
      if (!err.response) {
        const isNetwork =
          err.code === 'ERR_NETWORK' ||
          err.message === 'Network Error' ||
          String(err.message ?? '').toLowerCase().includes('network');
        if (isNetwork) {
          Alert.alert(
            "Can't connect to server",
            "The app couldn't reach the API. If you're on a real phone, add EXPO_PUBLIC_API_BASE_URL in apps/mobile/.env (e.g. http://YOUR_LAN_IP:3001/api/v1) and restart Metro. On Android emulators, the host is detected automatically. Confirm Nest is running on port 3001.",
          );
        } else {
          Alert.alert('Login failed', err.message || 'Request failed. Please try again.');
        }
      } else {
        const message = err.response?.data?.message || 'Login failed. Please check your credentials.';
        Alert.alert('Login failed', message);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleLogin() {
    setGoogleLoading(true);
    try {
      const { GoogleSignin, statusCodes } = await import('@react-native-google-signin/google-signin');
      await GoogleSignin.hasPlayServices();
      const userInfo = await GoogleSignin.signIn();
      const idToken = (userInfo as any).idToken || (userInfo as any).data?.idToken;
      if (!idToken) throw new Error('No ID token returned from Google');
      const { data } = await apiClient.post('/auth/google', { idToken });
      await login(data.accessToken, data.refreshToken, data.user);
    } catch (err: any) {
      const { statusCodes } = await import('@react-native-google-signin/google-signin');
      if (err.code !== statusCodes.SIGN_IN_CANCELLED) {
        Alert.alert('Google Sign-In failed', err.message || 'Please try again.');
      }
    } finally {
      setGoogleLoading(false);
    }
  }

  async function tryAutoPairOnParentLogin(familyIds: string[]) {
    if (!familyIds.length) {
      return;
    }
    try {
      const activeFamilyId = await getResolvedActiveFamilyId(familyIds);
      if (!activeFamilyId) {
        return;
      }
      const { data } = await apiClient.get<FamilyDashboard>(API_ENDPOINTS.children.home(activeFamilyId));
      if (data.children.length !== 1) {
        return;
      }
      await autoPairCurrentDevice(data.children[0].childId);
    } catch {
      // Best effort only: parent login should not fail if auto-pair fails/offline.
    }
  }

  return (
    <LinearGradient colors={COLORS.parent.gradientHero} style={styles.gradient}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View entering={FadeInUp.delay(100).springify()} style={styles.header}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.backButton}
              accessibilityLabel="Go back"
              accessibilityRole="button"
            >
              <Ionicons name="chevron-back" size={28} color={COLORS.parent.textSecondary} />
            </TouchableOpacity>
            <Text style={styles.title}>Welcome back</Text>
            <Text style={styles.subtitle}>Sign in to continue your family journey</Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.form}>
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
                autoComplete="email"
                returnKeyType="next"
                onSubmitEditing={() => passwordRef.current?.focus()}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  ref={passwordRef}
                  style={[styles.input, styles.passwordInput]}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Your password"
                  placeholderTextColor={COLORS.parent.textMuted}
                  secureTextEntry={!showPassword}
                  autoComplete="password"
                  returnKeyType="done"
                  onSubmitEditing={handleLogin}
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <Text style={styles.eyeIcon}>{showPassword ? '🙈' : '👁️'}</Text>
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity style={styles.forgotPassword}>
              <Text style={styles.forgotText}>Forgot password?</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.loginButton, loading && styles.loginButtonDisabled]}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.loginButtonText}>Sign In</Text>
              )}
            </TouchableOpacity>

            {/* Google Sign-In */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>

            <TouchableOpacity
              style={[styles.googleButton, googleLoading && styles.loginButtonDisabled]}
              onPress={handleGoogleLogin}
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

            {/* TODO: commented-for-now 🔴 — "Sign in as a child (PIN)" button + divider hidden for Milestone 1.
                Child PIN login is a Milestone 3+ feature. Kids are now identified via KidIdentityModal
                after the parent has logged in and set up the device. Restore when child PIN login is re-enabled.
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>

            <TouchableOpacity
              style={styles.childPinButton}
              onPress={() => router.push('/auth/child-pin')}
            >
              <Text style={styles.childPinIcon}>👶</Text>
              <Text style={styles.childPinText}>Sign in as a child (PIN)</Text>
            </TouchableOpacity>
            */}
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(350)} style={styles.footer}>
            <Text style={styles.footerText}>
              Don't have an account?{' '}
              {/* TODO: commented-for-now 🔴 — "Start free trial" link text changed for Milestone 1 (no trial messaging). Restore original text when paid tier launches. */}
              <Text style={styles.signUpLink} onPress={() => router.replace('/auth/register')}>
                Create an account
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
  header: { marginBottom: SPACING[8] },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    marginBottom: SPACING[4],
  },
  title: {
    fontSize: 32,
    fontFamily: 'Inter_700Bold',
    color: COLORS.parent.textPrimary,
    marginBottom: SPACING[2],
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    color: COLORS.parent.textSecondary,
    lineHeight: 22,
  },
  form: { gap: SPACING[4] },
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
  forgotPassword: { alignSelf: 'flex-end' },
  forgotText: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    color: COLORS.parent.primary,
  },
  loginButton: {
    backgroundColor: COLORS.parent.primary,
    borderRadius: 14,
    paddingVertical: SPACING[4],
    alignItems: 'center',
    marginTop: SPACING[2],
  },
  loginButtonDisabled: { opacity: 0.7 },
  loginButtonText: {
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
    color: '#FFFFFF',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[3],
    marginVertical: SPACING[2],
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(92, 61, 46, 0.15)',
  },
  dividerText: {
    fontSize: 13,
    color: COLORS.parent.textMuted,
    fontFamily: 'Inter_400Regular',
  },
  childPinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING[2],
    backgroundColor: COLORS.parent.surface,
    borderWidth: 1,
    borderColor: COLORS.parent.surfaceBorder,
    borderRadius: 14,
    paddingVertical: SPACING[4],
  },
  childPinIcon: { fontSize: 20 },
  childPinText: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    color: COLORS.parent.textPrimary,
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
  footer: { marginTop: SPACING[8], alignItems: 'center' },
  footerText: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: COLORS.parent.textSecondary,
  },
  signUpLink: {
    fontFamily: 'Inter_700Bold',
    color: COLORS.parent.primary,
  },
});
