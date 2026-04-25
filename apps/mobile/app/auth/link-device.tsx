import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import axios from 'axios';
import { API_BASE_URL, API_ENDPOINTS } from '../../src/constants/api';
import { useAuthStore } from '../../src/store/auth.store';
import { COLORS } from '../../src/constants/colors';
import { SPACING } from '../../src/constants/spacing';
import { CHILD_ID_KEY } from '../../src/store/deviceSession.store';

async function getExpoPushToken(): Promise<string> {
  const { status: existing } = await Notifications.getPermissionsAsync();
  let final = existing;
  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    final = status;
  }
  if (final !== 'granted') {
    return 'no-permission';
  }
  const token = await Notifications.getExpoPushTokenAsync();
  return token.data;
}

export default function LinkDeviceScreen() {
  const [code, setCode] = useState('');
  const [childId, setChildId] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuthStore();

  async function handleLink() {
    const c = code.replace(/\D/g, '').slice(0, 6);
    if (c.length !== 6) {
      Alert.alert('Code', 'Enter the 6-digit code from the parent app.');
      return;
    }
    if (!childId.trim()) {
      Alert.alert('Child ID', 'Ask your parent for the child profile ID from their Add device screen.');
      return;
    }
    setLoading(true);
    try {
      const expoPushToken = await getExpoPushToken();
      const { data } = await axios.post(
        `${API_BASE_URL}/auth/pair-device/confirm`,
        {
          code: c,
          childId: childId.trim(),
          expoPushToken,
          platform: Platform.OS,
          deviceName: Device.deviceName ?? Device.modelName ?? 'Device',
        },
        { headers: { 'Content-Type': 'application/json' } },
      );
      await SecureStore.setItemAsync(CHILD_ID_KEY, childId.trim());
      await login(data.accessToken, data.refreshToken, data.user);
    } catch (e: any) {
      const msg = e?.response?.data?.message ?? e?.message ?? 'Link failed';
      Alert.alert('Could not link', typeof msg === 'string' ? msg : 'Try again');
    } finally {
      setLoading(false);
    }
  }

  return (
    <LinearGradient colors={[...COLORS.kids.gradientApp]} style={styles.gradient}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.title}>Link this device</Text>
          <Text style={styles.sub}>
            Enter the 6-digit code and your child profile ID. Your parent can find the ID in their
            app under Add child device.
          </Text>
          <Text style={styles.label}>6-digit code</Text>
          <TextInput
            value={code}
            onChangeText={setCode}
            keyboardType="number-pad"
            maxLength={6}
            placeholder="000000"
            placeholderTextColor="rgba(255,255,255,0.3)"
            style={styles.input}
          />
          <Text style={styles.label}>Child profile ID (UUID)</Text>
          <TextInput
            value={childId}
            onChangeText={setChildId}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="xxxxxxxx-xxxx-..."
            placeholderTextColor="rgba(255,255,255,0.3)"
            style={styles.input}
          />
          <TouchableOpacity
            style={[styles.btn, loading && { opacity: 0.6 }]}
            onPress={handleLink}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.btnText}>Link device</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.back}>Cancel</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  gradient: { flex: 1 },
  content: { padding: SPACING[6], paddingTop: 60, gap: SPACING[2] },
  title: { color: '#fff', fontSize: 26, fontWeight: '800', marginBottom: SPACING[1] },
  sub: { color: 'rgba(255,255,255,0.75)', fontSize: 14, lineHeight: 20, marginBottom: SPACING[4] },
  label: { color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: '600', marginTop: SPACING[2] },
  input: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 12,
    padding: 14,
    color: '#fff',
    fontSize: 16,
  },
  btn: {
    backgroundColor: COLORS.parent.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: SPACING[4],
  },
  btnText: { color: '#fff', fontWeight: '800', fontSize: 17 },
  back: { color: 'rgba(255,255,255,0.6)', textAlign: 'center', marginTop: 16 },
});
