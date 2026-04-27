import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { apiClient } from '../../src/services/api.client';
import { API_ENDPOINTS } from '../../src/constants/api';
import { useAuthStore } from '../../src/store/auth.store';
import { COLORS } from '../../src/constants/colors';
import { SPACING } from '../../src/constants/spacing';
import { CHILD_ID_KEY } from '../../src/store/deviceSession.store';
import { getCurrentDeviceRegistration } from '../../src/services/devicePairing.service';

export default function LinkDeviceScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanPaused, setScanPaused] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuthStore();

  useEffect(() => {
    if (!permission) {
      return;
    }
    if (!permission.granted) {
      void requestPermission();
    }
  }, [permission, requestPermission]);

  async function handleScanned(raw: string) {
    if (scanPaused || loading) {
      return;
    }
    setScanPaused(true);
    setLoading(true);
    try {
      const qrToken = raw.trim();
      const device = await getCurrentDeviceRegistration();
      const { data } = await apiClient.post(API_ENDPOINTS.auth.confirmPairing, {
        qrToken,
        expoPushToken: device.expoPushToken,
        platform: device.platform,
        deviceName: device.deviceName,
      });
      if (data?.user?.childProfileId) {
        await SecureStore.setItemAsync(CHILD_ID_KEY, data.user.childProfileId);
      } else {
        await SecureStore.deleteItemAsync(CHILD_ID_KEY);
      }
      await login(data.accessToken, data.refreshToken, data.user);
    } catch (e: any) {
      const msg = e?.response?.data?.message ?? e?.message ?? 'Link failed';
      Alert.alert('Could not link', typeof msg === 'string' ? msg : 'Try again');
      setScanPaused(false);
    } finally {
      setLoading(false);
    }
  }

  return (
    <LinearGradient colors={[...COLORS.kids.gradientApp]} style={styles.gradient}>
      <View style={styles.content}>
        <Text style={styles.title}>Link this device</Text>
        <Text style={styles.sub}>
          Ask your parent to open "Kids Login" (More tab), choose "Setup a New Device", then scan the QR code.
        </Text>

        <View style={styles.cameraShell}>
          {permission?.granted ? (
            <CameraView
              style={styles.camera}
              barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
              onBarcodeScanned={scanPaused ? undefined : (event) => void handleScanned(event.data)}
            />
          ) : (
            <View style={styles.permissionBox}>
              <Text style={styles.permissionText}>Camera permission is needed to scan the parent QR.</Text>
              <TouchableOpacity style={styles.btn} onPress={() => void requestPermission()}>
                <Text style={styles.btnText}>Allow camera</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {loading ? <ActivityIndicator color="#fff" style={styles.loader} /> : null}
        {scanPaused && !loading ? (
          <TouchableOpacity style={styles.btn} onPress={() => setScanPaused(false)}>
            <Text style={styles.btnText}>Scan again</Text>
          </TouchableOpacity>
        ) : null}
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  content: { flex: 1, padding: SPACING[6], paddingTop: 60, gap: SPACING[3] },
  title: { color: '#fff', fontSize: 26, fontWeight: '800', marginBottom: SPACING[1] },
  sub: { color: 'rgba(255,255,255,0.75)', fontSize: 14, lineHeight: 20, marginBottom: SPACING[2] },
  cameraShell: {
    overflow: 'hidden',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    backgroundColor: 'rgba(0,0,0,0.18)',
    minHeight: 340,
  },
  camera: { width: '100%', height: 340 },
  permissionBox: {
    minHeight: 340,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING[4],
    gap: SPACING[3],
  },
  permissionText: { color: '#fff', textAlign: 'center', lineHeight: 20 },
  btn: {
    backgroundColor: COLORS.parent.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  btnText: { color: '#fff', fontWeight: '800', fontSize: 17 },
  loader: { marginTop: SPACING[2] },
  back: { color: 'rgba(255,255,255,0.6)', textAlign: 'center', marginTop: 16 },
});
