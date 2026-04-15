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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router, Link } from 'expo-router';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useAuthStore } from '../../src/store/auth.store';
import { apiClient } from '../../src/services/api.client';
import { API_ENDPOINTS } from '../../src/constants/api';
import { COLORS } from '../../src/constants/colors';
import { SPACING } from '../../src/constants/spacing';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const passwordRef = useRef<TextInput>(null);

  const { login } = useAuthStore();

  async function handleLogin() {
    if (!email.trim() || !password) {
      Alert.alert('Missing fields', 'Please enter your email and password.');
      return;
    }

    setLoading(true);
    try {
      const { data } = await apiClient.post(API_ENDPOINTS.auth.login, { email, password });
      await login(data.accessToken, data.refreshToken, data.user);
      // Root layout handles redirect based on role
    } catch (err: any) {
      const message = err.response?.data?.message || 'Login failed. Please check your credentials.';
      Alert.alert('Login failed', message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <LinearGradient colors={['#0F0A1E', '#1A1035', '#0F0A1E']} style={styles.gradient}>
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
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Text style={styles.backIcon}>←</Text>
            </TouchableOpacity>
            <Text style={styles.logo}>ParentingMyKid</Text>
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
                placeholderTextColor="rgba(255,255,255,0.3)"
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
                  placeholderTextColor="rgba(255,255,255,0.3)"
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
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(350)} style={styles.footer}>
            <Text style={styles.footerText}>
              Don't have an account?{' '}
              <Text
                style={styles.signUpLink}
                onPress={() => router.replace('/auth/register')}
              >
                Start free trial
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
  backIcon: { fontSize: 24, color: 'rgba(255,255,255,0.7)' },
  logo: {
    fontSize: 14,
    color: COLORS.parent.primary,
    fontFamily: 'Inter',
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: SPACING[3],
  },
  title: {
    fontSize: 32,
    fontFamily: 'Inter',
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: SPACING[2],
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Inter',
    color: 'rgba(255,255,255,0.6)',
    lineHeight: 22,
  },
  form: { gap: SPACING[4] },
  inputGroup: { gap: SPACING[2] },
  label: {
    fontSize: 13,
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
    fontFamily: 'Inter',
    color: COLORS.parent.primary,
    fontWeight: '500',
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
    fontFamily: 'Inter',
    fontWeight: '700',
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
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  dividerText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.4)',
    fontFamily: 'Inter',
  },
  childPinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING[2],
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 14,
    paddingVertical: SPACING[4],
  },
  childPinIcon: { fontSize: 20 },
  childPinText: {
    fontSize: 15,
    fontFamily: 'Inter',
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '500',
  },
  footer: { marginTop: SPACING[8], alignItems: 'center' },
  footerText: {
    fontSize: 14,
    fontFamily: 'Inter',
    color: 'rgba(255,255,255,0.5)',
  },
  signUpLink: {
    color: COLORS.parent.primary,
    fontWeight: '700',
  },
});
