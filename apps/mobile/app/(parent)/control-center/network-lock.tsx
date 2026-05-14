import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { router, useLocalSearchParams } from 'expo-router';
import { apiClient } from '../../../src/services/api.client';
import { useFamilyStore } from '../../../src/store/family.store';
import { COLORS } from '../../../src/constants/colors';
import { SPACING } from '../../../src/constants/spacing';
import { fetchAndPushParentalPolicyForChild } from '../../../src/services/policySync.service';
import { childIdFromGlobalParams } from '../../../src/utils/kidHandoffSession';

export default function NetworkLockScreen() {
  const params = useLocalSearchParams<{ childId?: string | string[] }>();
  const childId = useMemo(() => childIdFromGlobalParams(params.childId), [params.childId]);
  const { dashboard } = useFamilyStore();
  const kid = dashboard?.children?.find((c) => c.childId === childId);

  const [loading, setLoading] = useState(true);
  const [hasSuccessfulLoad, setHasSuccessfulLoad] = useState(false);
  const [saving, setSaving] = useState(false);
  const [blockNetworkChanges, setBlockNetworkChanges] = useState(false);

  const load = useCallback(async () => {
    if (!childId) {
      setLoading(false);
      setHasSuccessfulLoad(false);
      return;
    }
    setLoading(true);
    setHasSuccessfulLoad(false);
    try {
      const { data } = await apiClient.get(`/safety/${childId}/parental-controls`);
      setBlockNetworkChanges(data?.blockNetworkChanges === true);
      setHasSuccessfulLoad(true);
    } catch {
      Alert.alert('Error', 'Failed to load settings.');
      setHasSuccessfulLoad(false);
    } finally {
      setLoading(false);
    }
  }, [childId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleSave() {
    if (!childId) return;
    if (!hasSuccessfulLoad || loading) {
      Alert.alert('Please wait', 'Load settings from the server first, then try Save again.');
      return;
    }
    setSaving(true);
    try {
      await apiClient.patch(`/safety/${childId}/parental-controls`, {
        blockNetworkChanges,
      });
      if (Platform.OS === 'android') {
        await fetchAndPushParentalPolicyForChild(childId, { clearEnforcementPause: true });
      }
      Alert.alert('Saved', 'Network Lock settings updated.');
    } catch {
      Alert.alert('Error', 'Failed to save settings.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <LinearGradient colors={['#E8F4EC', '#F2E8E9']} style={styles.container}>
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <ActivityIndicator size="large" color={COLORS.parent.primary} style={{ flex: 1 }} />
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={['#E8F4EC', '#F2E8E9']} style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <Animated.View entering={FadeInDown.delay(50).springify()} style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backIcon}>‹</Text>
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Network Lock</Text>
            {kid?.name ? <Text style={styles.headerSubtitle}>{kid.name}</Text> : null}
          </View>
          <View style={styles.headerRight} />
        </Animated.View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          <Animated.View entering={FadeInDown.delay(70).springify()} style={styles.infoCard}>
            <Text style={styles.infoTitle}>How it works</Text>
            <Text style={styles.infoBody}>
              When Kid Mode is active on this phone (same time as Block Apps / Website Blocker), turning this on tries to
              close the Quick Settings panel and block Wi-Fi / mobile data / SIM pages inside the Settings app. This
              helps stop children from disabling Wi‑Fi or data to get around your rules.
            </Text>
            <Text style={styles.infoBodyMuted}>
              Requires <Text style={styles.bold}>Accessibility</Text> enabled for ParentingMyKid. Some OEMs may still
              allow brief flashes of settings; combine with App Blocker and VPN filtering for best results.
            </Text>
          </Animated.View>

          {Platform.OS === 'android' ? (
            <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.card}>
              <View style={styles.toggleRow}>
                <View style={styles.toggleInfo}>
                  <Text style={styles.toggleTitle}>Block network setting changes</Text>
                  <Text style={styles.toggleDesc}>
                    Close Quick Settings and network-related Settings screens during Kid Mode / when rules apply to
                    parent.
                  </Text>
                </View>
                <Switch
                  value={blockNetworkChanges}
                  onValueChange={setBlockNetworkChanges}
                  trackColor={{ false: '#D1D5DB', true: COLORS.parent.primary }}
                  thumbColor="#FFFFFF"
                />
              </View>
            </Animated.View>
          ) : (
            <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.card}>
              <Text style={styles.iosNote}>Network Lock is available on Android only.</Text>
            </Animated.View>
          )}

          <Animated.View entering={FadeInDown.delay(140).springify()} style={styles.saveWrap}>
            <TouchableOpacity
              style={[styles.saveButton, (saving || loading || !hasSuccessfulLoad) && styles.saveButtonDisabled]}
              onPress={() => void handleSave()}
              disabled={saving || loading || !hasSuccessfulLoad}
            >
              {saving ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.saveButtonText}>Save Settings</Text>
              )}
            </TouchableOpacity>
          </Animated.View>
          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING[5],
    paddingVertical: SPACING[4],
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.55)',
  },
  backIcon: {
    fontSize: 26,
    color: COLORS.parent.textPrimary,
    lineHeight: 30,
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 18,
    color: COLORS.parent.textPrimary,
  },
  headerSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: COLORS.parent.textMuted,
    marginTop: 2,
  },
  headerRight: { width: 40 },
  scroll: { paddingHorizontal: SPACING[5], paddingTop: SPACING[2] },
  infoCard: {
    backgroundColor: 'rgba(59,130,246,0.08)',
    borderRadius: 14,
    padding: SPACING[4],
    marginBottom: SPACING[4],
    borderWidth: 1,
    borderColor: 'rgba(59,130,246,0.2)',
  },
  infoTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
    color: COLORS.parent.textPrimary,
    marginBottom: SPACING[2],
  },
  infoBody: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: COLORS.parent.textSecondary,
    lineHeight: 18,
    marginBottom: SPACING[2],
  },
  infoBodyMuted: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: COLORS.parent.textMuted,
    lineHeight: 17,
  },
  bold: { fontFamily: 'Inter_600SemiBold', color: COLORS.parent.textPrimary },
  card: {
    backgroundColor: 'rgba(255,255,255,0.72)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.55)',
    padding: SPACING[4],
    marginBottom: SPACING[4],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleInfo: { flex: 1, marginRight: SPACING[4] },
  toggleTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
    color: COLORS.parent.textPrimary,
    marginBottom: 4,
  },
  toggleDesc: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: COLORS.parent.textMuted,
  },
  iosNote: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: COLORS.parent.textSecondary,
  },
  saveWrap: { marginTop: SPACING[2] },
  saveButton: {
    backgroundColor: COLORS.parent.primary,
    borderRadius: 14,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
  },
  saveButtonDisabled: { opacity: 0.7 },
  saveButtonText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 16,
    color: '#FFFFFF',
  },
});
