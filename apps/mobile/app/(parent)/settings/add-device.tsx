import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../../src/services/api.client';
import { API_ENDPOINTS } from '../../../src/constants/api';
import { useFamilyStore } from '../../../src/store/family.store';
import { COLORS } from '../../../src/constants/colors';
import { SPACING } from '../../../src/constants/spacing';

export default function AddDeviceScreen() {
  const { dashboard } = useFamilyStore();
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);

  const { data, refetch, isLoading } = useQuery({
    queryKey: ['pairing-code'],
    queryFn: () =>
      apiClient
        .post<{ code: string; expiresAt: string; qrData: string }>(
          API_ENDPOINTS.auth.generatePairingCode,
        )
        .then((r) => r.data),
  });

  useEffect(() => {
    if (data?.expiresAt) {
      setExpiresAt(data.expiresAt);
    }
  }, [data?.expiresAt]);

  useEffect(() => {
    if (!expiresAt) return;
    const end = new Date(expiresAt).getTime();
    const id = setInterval(() => {
      const left = Math.max(0, Math.floor((end - Date.now()) / 1000));
      setSecondsLeft(left);
      if (left <= 0) clearInterval(id);
    }, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);

  const children = dashboard?.children ?? [];

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Add child device</Text>
        <View style={styles.backBtn} />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.help}>
          Show this 6-digit code (or QR) on your phone. On the child device, open
          &quot;Link this device&quot; and enter the code.
        </Text>
        {children.length > 0 && (
          <View style={styles.kidsBlock}>
            <Text style={styles.kidsTitle}>Child profile IDs (for the kid device form)</Text>
            {children.map((c) => (
              <Text key={c.childId} style={styles.kidLine}>
                {c.name}: {c.childId}
              </Text>
            ))}
          </View>
        )}
        {isLoading && !data ? (
          <ActivityIndicator color={COLORS.parent.primary} size="large" style={{ marginTop: 24 }} />
        ) : (
          <>
            <View style={styles.codeBox}>
              <Text style={styles.codeText}>{data?.code ?? '------'}</Text>
              <Text style={styles.timer}>
                {secondsLeft > 0 ? `Expires in ${Math.floor(secondsLeft / 60)}:${String(secondsLeft % 60).padStart(2, '0')}` : 'Expired'}
              </Text>
            </View>
            {data?.qrData ? (
              <View style={styles.qrBox}>
                <Image source={{ uri: data.qrData }} style={styles.qr} resizeMode="contain" />
              </View>
            ) : null}
            <TouchableOpacity style={styles.regen} onPress={() => void refetch()}>
              <Text style={styles.regenText}>Generate new code</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.parent.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING[4],
    paddingVertical: SPACING[3],
  },
  backBtn: { minWidth: 64 },
  backText: { color: COLORS.parent.primary, fontSize: 16, fontWeight: '600' },
  title: { color: COLORS.parent.text, fontSize: 18, fontWeight: '800' },
  content: { padding: SPACING[5], paddingBottom: 40 },
  help: { color: COLORS.parent.textMuted, fontSize: 14, lineHeight: 20, marginBottom: SPACING[4] },
  kidsBlock: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12,
    padding: SPACING[3],
    marginBottom: SPACING[4],
    gap: 4,
  },
  kidsTitle: { color: COLORS.parent.text, fontSize: 13, fontWeight: '700' },
  kidLine: { color: COLORS.parent.textMuted, fontSize: 12, fontFamily: 'monospace' },
  codeBox: { alignItems: 'center', marginVertical: SPACING[4] },
  codeText: {
    fontSize: 42,
    fontWeight: '900',
    letterSpacing: 8,
    color: '#FFFFFF',
    fontVariant: ['tabular-nums'],
  },
  timer: { marginTop: SPACING[2], color: COLORS.parent.textMuted, fontSize: 14 },
  qrBox: { alignItems: 'center', marginTop: SPACING[2] },
  qr: { width: 220, height: 220, backgroundColor: '#FFF' },
  regen: {
    marginTop: SPACING[6],
    alignSelf: 'center',
    backgroundColor: COLORS.parent.primary,
    paddingVertical: SPACING[3],
    paddingHorizontal: SPACING[6],
    borderRadius: 12,
  },
  regenText: { color: '#FFF', fontWeight: '800', fontSize: 16 },
});
