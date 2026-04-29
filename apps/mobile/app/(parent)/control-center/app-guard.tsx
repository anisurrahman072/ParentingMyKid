import React, { useState, useEffect, useCallback } from 'react';
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
  Linking,
  AppState,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { router, useLocalSearchParams } from 'expo-router';
import { apiClient } from '../../../src/services/api.client';
import { useFamilyStore } from '../../../src/store/family.store';
import {
  hasAccessibilityPermission,
  requestAccessibilityPermission,
  hasOverlayPermission,
  requestOverlayPermission,
} from '../../../src/services/ParentalControl';
import { COLORS } from '../../../src/constants/colors';
import { SPACING } from '../../../src/constants/spacing';

type PermissionStatus = 'granted' | 'required' | 'unknown';

function PermissionRow({
  label,
  description,
  status,
  onGrant,
}: {
  label: string;
  description: string;
  status: PermissionStatus;
  onGrant: () => void;
}) {
  return (
    <View style={permStyles.row}>
      <View style={permStyles.info}>
        <Text style={permStyles.label}>{label}</Text>
        <Text style={permStyles.desc}>{description}</Text>
      </View>
      <View style={permStyles.right}>
        <View style={[permStyles.badge, status === 'granted' ? permStyles.badgeGranted : permStyles.badgeRequired]}>
          <Text style={[permStyles.badgeText, status === 'granted' ? permStyles.badgeTextGranted : permStyles.badgeTextRequired]}>
            {status === 'granted' ? 'Granted' : 'Required'}
          </Text>
        </View>
        {status !== 'granted' && (
          <TouchableOpacity style={permStyles.grantBtn} onPress={onGrant}>
            <Text style={permStyles.grantBtnText}>Grant</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const permStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING[3],
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(92,61,46,0.08)',
  },
  info: { flex: 1, marginRight: SPACING[3] },
  label: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: COLORS.parent.textPrimary,
    marginBottom: 3,
  },
  desc: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: COLORS.parent.textMuted,
  },
  right: {
    alignItems: 'flex-end',
    gap: SPACING[2],
  },
  badge: {
    paddingHorizontal: SPACING[2],
    paddingVertical: 3,
    borderRadius: 8,
  },
  badgeGranted: { backgroundColor: 'rgba(5,150,105,0.1)' },
  badgeRequired: { backgroundColor: 'rgba(220,38,38,0.1)' },
  badgeText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
  },
  badgeTextGranted: { color: COLORS.parent.success },
  badgeTextRequired: { color: COLORS.parent.danger },
  grantBtn: {
    backgroundColor: COLORS.parent.primary,
    borderRadius: 8,
    paddingHorizontal: SPACING[3],
    paddingVertical: SPACING[1],
  },
  grantBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: '#FFFFFF',
  },
});

export default function AppGuardScreen() {
  const { childId } = useLocalSearchParams<{ childId: string }>();
  const { dashboard } = useFamilyStore();
  const kid = dashboard?.children?.find((c) => c.childId === childId);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [appGuardEnabled, setAppGuardEnabled] = useState(false);
  const [silentCameraEnabled, setSilentCameraEnabled] = useState(false);
  const [accessibilityStatus, setAccessibilityStatus] = useState<PermissionStatus>('unknown');
  const [overlayStatus, setOverlayStatus] = useState<PermissionStatus>('unknown');

  const load = useCallback(async () => {
    if (!childId) return;
    try {
      const { data } = await apiClient.get(`/safety/${childId}/parental-controls`);
      setAppGuardEnabled(data?.appGuardEnabled ?? false);
      setSilentCameraEnabled(data?.silentCameraEnabled ?? false);
    } catch {
      Alert.alert('Error', 'Failed to load settings.');
    } finally {
      setLoading(false);
    }

    if (Platform.OS === 'android') {
      try {
        const [a11y, overlay] = await Promise.all([
          hasAccessibilityPermission(),
          hasOverlayPermission(),
        ]);
        setAccessibilityStatus(a11y ? 'granted' : 'required');
        setOverlayStatus(overlay ? 'granted' : 'required');
      } catch {
        setAccessibilityStatus('unknown');
        setOverlayStatus('unknown');
      }
    }
  }, [childId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void load();
    });
    return () => sub.remove();
  }, [load]);

  async function handleGrantAccessibility() {
    if (Platform.OS !== 'android') return;
    const opened = await requestAccessibilityPermission();
    if (!opened) {
      Alert.alert(
        'Could not open settings',
        'Rebuild your development client after native dependency updates, or open Settings → Accessibility and enable ParentingMyKid.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'App settings', onPress: () => void Linking.openSettings() },
        ],
      );
    }
  }

  async function handleGrantOverlay() {
    if (Platform.OS !== 'android') return;
    const opened = await requestOverlayPermission();
    if (!opened) {
      Alert.alert(
        'Display over other apps',
        'Allow ParentingMyKid to draw over other apps: Settings → Apps → ParentingMyKid → Display over other apps.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'App settings', onPress: () => void Linking.openSettings() },
        ],
      );
    }
  }

  function handleToggleSilentCamera(value: boolean) {
    if (!value) {
      setSilentCameraEnabled(false);
      return;
    }
    Alert.alert(
      'Enable Silent Camera Monitoring?',
      'This will silently capture front-camera photos of your child every 5 minutes while they are active, to verify who is using the device. These photos are only visible to you.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Enable',
          style: 'destructive',
          onPress: () => setSilentCameraEnabled(true),
        },
      ],
    );
  }

  async function handleSave() {
    if (!childId) return;
    setSaving(true);
    try {
      await apiClient.patch(`/safety/${childId}/parental-controls`, {
        appGuardEnabled,
        silentCameraEnabled,
      });
      Alert.alert('Saved', 'App Guard settings updated successfully.');
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
        {/* Header */}
        <Animated.View entering={FadeInDown.delay(50).springify()} style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backIcon}>‹</Text>
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>App Guard</Text>
            {kid?.name ? <Text style={styles.headerSubtitle}>{kid.name}</Text> : null}
          </View>
          <View style={styles.headerRight} />
        </Animated.View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          {/* Description card */}
          <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.descCard}>
            <Text style={styles.descEmoji}>🛡️</Text>
            <Text style={styles.descText}>
              App Guard uses Android Accessibility Service to detect when kids try to exit this app
              and automatically brings them back.
            </Text>
          </Animated.View>

          {/* Main toggle */}
          <Animated.View entering={FadeInDown.delay(160).springify()} style={styles.card}>
            <View style={styles.toggleRow}>
              <View style={styles.toggleInfo}>
                <Text style={styles.toggleTitle}>Enable App Guard</Text>
                <Text style={styles.toggleDesc}>Keep kids locked inside this app</Text>
              </View>
              <Switch
                value={appGuardEnabled}
                onValueChange={setAppGuardEnabled}
                trackColor={{ false: '#D1D5DB', true: COLORS.parent.primary }}
                thumbColor="#FFFFFF"
              />
            </View>
          </Animated.View>

          {/* Permissions */}
          {Platform.OS === 'android' ? (
            <Animated.View entering={FadeInDown.delay(220).springify()}>
              <Text style={styles.sectionLabel}>PERMISSIONS</Text>
              <View style={styles.card}>
                <PermissionRow
                  label="Accessibility Service"
                  description="Required to detect app switching"
                  status={accessibilityStatus === 'unknown' ? 'required' : accessibilityStatus}
                  onGrant={handleGrantAccessibility}
                />
                <PermissionRow
                  label="System Overlay"
                  description="Required to display the lock overlay"
                  status={overlayStatus === 'unknown' ? 'required' : overlayStatus}
                  onGrant={handleGrantOverlay}
                />
              </View>
            </Animated.View>
          ) : (
            <Animated.View entering={FadeInDown.delay(220).springify()} style={styles.infoCard}>
              <Text style={styles.infoText}>
                ℹ️ Native permissions are only available on Android builds.
              </Text>
            </Animated.View>
          )}

          {/* Divider */}
          <View style={styles.divider} />

          {/* Silent Camera Monitoring */}
          <Animated.View entering={FadeInDown.delay(280).springify()}>
            <Text style={styles.sectionLabel}>SILENT CAMERA MONITORING</Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(320).springify()} style={styles.privacyCard}>
            <Text style={styles.privacyTitle}>⚠️ Privacy Notice</Text>
            <Text style={styles.privacyText}>
              With your consent, this app will silently capture front-camera photos of the child
              every 5 minutes while they are active, to verify who is using the device. These photos
              are only visible to you as the parent.
            </Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(360).springify()} style={styles.card}>
            <View style={styles.toggleRow}>
              <View style={styles.toggleInfo}>
                <Text style={styles.toggleTitle}>Enable Silent Camera</Text>
                <Text style={styles.toggleDesc}>Silently capture front-camera every 5 min</Text>
              </View>
              <Switch
                value={silentCameraEnabled}
                onValueChange={handleToggleSilentCamera}
                trackColor={{ false: '#D1D5DB', true: '#F97316' }}
                thumbColor="#FFFFFF"
              />
            </View>
          </Animated.View>

          {/* Save */}
          <Animated.View entering={FadeInDown.delay(420).springify()} style={styles.saveWrap}>
            <TouchableOpacity
              style={[styles.saveButton, saving && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={saving}
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

  sectionLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    color: COLORS.parent.textMuted,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: SPACING[2],
    marginTop: SPACING[2],
  },

  descCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(14,165,233,0.08)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(14,165,233,0.2)',
    padding: SPACING[4],
    gap: SPACING[3],
    marginBottom: SPACING[4],
  },
  descEmoji: { fontSize: 24 },
  descText: {
    flex: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: COLORS.parent.textSecondary,
    lineHeight: 20,
  },

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

  infoCard: {
    backgroundColor: 'rgba(245,158,11,0.08)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.2)',
    padding: SPACING[4],
    marginBottom: SPACING[4],
  },
  infoText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: COLORS.parent.textSecondary,
    lineHeight: 20,
  },

  divider: {
    height: 1,
    backgroundColor: 'rgba(92,61,46,0.1)',
    marginVertical: SPACING[4],
  },

  privacyCard: {
    backgroundColor: 'rgba(249,115,22,0.06)',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(249,115,22,0.35)',
    padding: SPACING[4],
    marginBottom: SPACING[4],
  },
  privacyTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
    color: '#C2410C',
    marginBottom: SPACING[2],
  },
  privacyText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: COLORS.parent.textSecondary,
    lineHeight: 20,
  },

  saveWrap: { marginTop: SPACING[2] },
  saveButton: {
    backgroundColor: COLORS.parent.primary,
    borderRadius: 14,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.parent.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  saveButtonDisabled: { opacity: 0.7 },
  saveButtonText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 16,
    color: '#FFFFFF',
  },
});
