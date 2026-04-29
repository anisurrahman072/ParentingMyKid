import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  PermissionsAndroid,
  Linking,
  Alert,
  AppState,
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { router } from 'expo-router';
import { COLORS } from '../../../src/constants/colors';
import { SPACING } from '../../../src/constants/spacing';
import {
  hasUsageStatsPermission,
  requestUsageStatsPermission,
  hasAccessibilityPermission,
  requestAccessibilityPermission,
  hasOverlayPermission,
  requestOverlayPermission,
  hasCameraPermission,
  hasVpnPermission,
  requestVpnPermission,
  openAppSettings,
} from '../../../src/services/ParentalControl';

/** Google Help: Restricted settings (Android 13+) — usable on any OEM incl. Tecno/HiOS */
const ANDROID_RESTRICTED_SETTINGS_HELP_URL =
  'https://support.google.com/android/answer/12623953';

type PermissionDef = {
  id: string;
  icon: string;
  title: string;
  description: string;
  checkFn: () => Promise<boolean>;
  grantFn: () => void | Promise<void>;
};

function buildPermissionList(showAccessibilityGuide: () => void): PermissionDef[] {
  return [
  {
    id: 'usage-access',
    icon: '📊',
    title: 'Usage Access',
    description: 'Allows monitoring which apps are used and for how long.',
    checkFn: () => hasUsageStatsPermission(),
    grantFn: async () => {
      const ok = await requestUsageStatsPermission();
      if (!ok) {
        Alert.alert('Usage access', 'Open Settings → Apps → Special app access → Usage access → ParentingMyKid.', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'App settings', onPress: () => void Linking.openSettings() },
        ]);
      }
    },
  },
  {
    id: 'accessibility',
    icon: '♿',
    title: 'Accessibility Service',
    description: 'Detects when kids try to exit the app and brings them back.',
    checkFn: () => hasAccessibilityPermission(),
    grantFn: showAccessibilityGuide,
  },
  {
    id: 'overlay',
    icon: '🖥️',
    title: 'System Overlay',
    description: 'Displays the lock screen overlay on top of other apps.',
    checkFn: () => hasOverlayPermission(),
    grantFn: async () => {
      const ok = await requestOverlayPermission();
      if (!ok) {
        Alert.alert('Display over other apps', 'Enable this under your app’s special access settings.', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'App settings', onPress: () => void Linking.openSettings() },
        ]);
      }
    },
  },
  {
    id: 'vpn',
    icon: '🔒',
    title: 'VPN Service',
    description: 'Enables DNS-based website filtering and internet blocking.',
    // hasVpnPermission checks VpnService.prepare()==null (user consented), not whether VPN is active
    checkFn: () => hasVpnPermission(),
    grantFn: async () => {
      // Android VPN consent MUST use startActivityForResult — fixed in native module
      await requestVpnPermission();
      // The OS dialog handles user interaction; AppState refresh will update the badge on return
    },
  },
  {
    id: 'camera',
    icon: '📷',
    title: 'Camera',
    description: 'Required for silent camera monitoring of who is using the device.',
    checkFn: () => hasCameraPermission(),
    grantFn: async () => {
      if (Platform.OS !== 'android') return;
      try {
        await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.CAMERA);
      } catch {
        void Linking.openSettings();
      }
    },
  },
];
}

const noop = () => {};
const PERMISSION_IDS = buildPermissionList(noop).map((p) => p.id);

function AccessibilityGuideModal({
  visible,
  onClose,
  onOpenAccessibility,
  onOpenAppInfo,
  onOpenGoogleHelp,
}: {
  visible: boolean;
  onClose: () => void;
  onOpenAccessibility: () => void;
  onOpenAppInfo: () => void;
  onOpenGoogleHelp: () => void;
}) {
  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
      <View style={a11yModalStyles.overlay}>
        <View style={a11yModalStyles.sheet}>
          <Text style={a11yModalStyles.title}>Accessibility (Android 13+)</Text>
          <Text style={a11yModalStyles.intro}>
            Tecno HiOS can hide the top-right ⋮ when App info opens the wrong task/fragment. Step 2 below includes fixes that match what works for others (XDA, Android issue trackers).
          </Text>
          <ScrollView style={a11yModalStyles.scroll} showsVerticalScrollIndicator>
            <Text style={a11yModalStyles.sectionHeading}>
              Step 1 — Trigger (do not skip)
            </Text>
            <Text style={a11yModalStyles.paragraph}>
              {
                'Open Accessibility, tap our app, and try to turn it ON. If Android shows "Restricted setting", tap OK. Google says the override often stays hidden until you do this once.'
              }
            </Text>
            <Text style={a11yModalStyles.sectionHeading}>Step 2 — Allow restricted settings</Text>
            <Text style={a11yModalStyles.paragraph}>
              {
                'Use button "2 · Open App info" after you install the latest ParentingMyKid dev build — it opens App info using the foreground app (shows ⋮ more often).\n\n' +
                  'Still no ⋮? Try BOTH:\n\n' +
                  '(A) Turn OFF system Dark theme briefly (Display → Dark theme). On some phones the overflow menu disappears in dark mode only — Android bug).\n\n' +
                  '(B) Swipe ParentingMyKid away from Recent apps fully. Long-press the app icon on the home drawer → App info / More info. Many users report ⋮ appears on that route (XDA).\n\n' +
                  'Then: Pixel-style ⋮ → "Allow restricted settings", or Samsung row in the list — scroll App info.'
              }
            </Text>
            <Text style={a11yModalStyles.sectionHeading}>Step 3 — Enable</Text>
            <Text style={a11yModalStyles.paragraph}>
              Return to Settings → Accessibility → Parenting My Kid → turn ON.
            </Text>
            <Text style={a11yModalStyles.sectionHeading}>If it still will not unlock</Text>
            <Text style={a11yModalStyles.paragraph}>
              Sideloaded dev APKs are the strictest case. Easiest end-user path is installing from Google Play when you publish. Some developers use Split APK Installer (Play) to reinstall an APK for testing — search that name if you need a last resort.
            </Text>
          </ScrollView>
          <TouchableOpacity style={a11yModalStyles.linkBtn} onPress={onOpenGoogleHelp}>
            <Text style={a11yModalStyles.linkBtnText}>Open Google Help (restricted settings)</Text>
          </TouchableOpacity>
          <View style={a11yModalStyles.row}>
            <TouchableOpacity style={a11yModalStyles.secondaryBtn} onPress={onClose}>
              <Text style={a11yModalStyles.secondaryBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
          <View style={a11yModalStyles.actionRow}>
            <TouchableOpacity
              style={a11yModalStyles.primaryBtn}
              onPress={() => {
                onOpenAccessibility();
                onClose();
              }}
            >
              <Text style={a11yModalStyles.primaryBtnText}>1 · Open Accessibility</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={a11yModalStyles.primaryBtn}
              onPress={() => {
                onOpenAppInfo();
                onClose();
              }}
            >
              <Text style={a11yModalStyles.primaryBtnText}>2 · Open App info</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const a11yModalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    paddingHorizontal: SPACING[4],
  },
  sheet: {
    backgroundColor: '#FFFCF9',
    borderRadius: 16,
    padding: SPACING[4],
    maxHeight: '88%',
    borderWidth: 1,
    borderColor: 'rgba(92,61,46,0.12)',
  },
  title: {
    fontFamily: 'Inter_700Bold',
    fontSize: 18,
    color: COLORS.parent.textPrimary,
    marginBottom: SPACING[2],
  },
  intro: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    color: COLORS.parent.textSecondary,
    marginBottom: SPACING[3],
    lineHeight: 19,
  },
  scroll: { maxHeight: 400 },
  sectionHeading: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: COLORS.parent.textPrimary,
    marginTop: SPACING[2],
    marginBottom: SPACING[1],
  },
  paragraph: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: COLORS.parent.textMuted,
    lineHeight: 20,
    marginBottom: SPACING[1],
  },
  linkBtn: {
    marginTop: SPACING[3],
    paddingVertical: SPACING[2],
  },
  linkBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: COLORS.parent.primary,
  },
  row: { marginTop: SPACING[2] },
  secondaryBtn: {
    alignSelf: 'flex-start',
    paddingVertical: SPACING[2],
  },
  secondaryBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
    color: COLORS.parent.textMuted,
  },
  actionRow: {
    flexDirection: 'row',
    gap: SPACING[2],
    marginTop: SPACING[3],
    justifyContent: 'space-between',
  },
  primaryBtn: {
    flex: 1,
    backgroundColor: COLORS.parent.primary,
    borderRadius: 12,
    paddingVertical: SPACING[3],
    alignItems: 'center',
  },
  primaryBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    color: '#FFFFFF',
    textAlign: 'center',
  },
});

type StatusMap = Record<string, 'granted' | 'required' | 'checking' | 'unknown'>;

function PermissionCard({
  perm,
  status,
  onGrant,
}: {
  perm: PermissionDef;
  status: string;
  onGrant: () => void;
}) {
  const isGranted = status === 'granted';
  return (
    <View style={cardStyles.card}>
      <View style={cardStyles.top}>
        <View style={[cardStyles.iconWrap, isGranted ? cardStyles.iconGranted : cardStyles.iconRequired]}>
          <Text style={cardStyles.icon}>{perm.icon}</Text>
        </View>
        <View style={cardStyles.info}>
          <Text style={cardStyles.title}>{perm.title}</Text>
          <Text style={cardStyles.desc}>{perm.description}</Text>
        </View>
      </View>
      <View style={cardStyles.bottom}>
        <View style={[cardStyles.badge, isGranted ? cardStyles.badgeGranted : cardStyles.badgeRequired]}>
          {status === 'checking' ? (
            <ActivityIndicator size="small" color={COLORS.parent.primary} />
          ) : (
            <Text style={[cardStyles.badgeText, isGranted ? cardStyles.badgeTextGranted : cardStyles.badgeTextRequired]}>
              {isGranted ? '✓ Granted' : status === 'unknown' ? 'Unknown' : '! Required'}
            </Text>
          )}
        </View>
        {!isGranted && status !== 'checking' && (
          <TouchableOpacity style={cardStyles.grantBtn} onPress={onGrant}>
            <Text style={cardStyles.grantBtnText}>Grant Permission</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const cardStyles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(255,255,255,0.72)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.55)',
    padding: SPACING[4],
    marginBottom: SPACING[3],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING[3],
    marginBottom: SPACING[3],
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconGranted: { backgroundColor: 'rgba(5,150,105,0.1)' },
  iconRequired: { backgroundColor: 'rgba(220,38,38,0.08)' },
  icon: { fontSize: 22 },
  info: { flex: 1 },
  title: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
    color: COLORS.parent.textPrimary,
    marginBottom: 4,
  },
  desc: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: COLORS.parent.textMuted,
    lineHeight: 18,
  },
  bottom: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[3],
  },
  badge: {
    paddingHorizontal: SPACING[3],
    paddingVertical: SPACING[1],
    borderRadius: 10,
    minWidth: 80,
    alignItems: 'center',
  },
  badgeGranted: { backgroundColor: 'rgba(5,150,105,0.1)' },
  badgeRequired: { backgroundColor: 'rgba(220,38,38,0.1)' },
  badgeText: { fontFamily: 'Inter_600SemiBold', fontSize: 12 },
  badgeTextGranted: { color: COLORS.parent.success },
  badgeTextRequired: { color: COLORS.parent.danger },
  grantBtn: {
    backgroundColor: COLORS.parent.primary,
    borderRadius: 10,
    paddingHorizontal: SPACING[4],
    paddingVertical: SPACING[2],
  },
  grantBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    color: '#FFFFFF',
  },
});

export default function TroubleshootScreen() {
  const [accessibilityGuideOpen, setAccessibilityGuideOpen] = useState(false);

  const permissions = useMemo(
    () => buildPermissionList(() => setAccessibilityGuideOpen(true)),
    [],
  );

  const [statuses, setStatuses] = useState<StatusMap>(() =>
    Object.fromEntries(PERMISSION_IDS.map((id) => [id, 'checking'])),
  );
  const [checking, setChecking] = useState(false);

  const refreshStatuses = useCallback(async () => {
    setChecking(true);
    setStatuses(Object.fromEntries(permissions.map((p) => [p.id, 'checking'])));

    for (const perm of permissions) {
      try {
        const result = await perm.checkFn();
        setStatuses((prev) => ({ ...prev, [perm.id]: result ? 'granted' : 'required' }));
      } catch {
        setStatuses((prev) => ({ ...prev, [perm.id]: 'unknown' }));
      }
    }

    setChecking(false);
  }, [permissions]);

  useEffect(() => {
    void refreshStatuses();
  }, [refreshStatuses]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void refreshStatuses();
    });
    return () => sub.remove();
  }, [refreshStatuses]);

  return (
    <LinearGradient colors={['#E8F4EC', '#F2E8E9']} style={styles.container}>
      <AccessibilityGuideModal
        visible={accessibilityGuideOpen}
        onClose={() => setAccessibilityGuideOpen(false)}
        onOpenAccessibility={() => void requestAccessibilityPermission()}
        onOpenAppInfo={() => void openAppSettings()}
        onOpenGoogleHelp={() => void Linking.openURL(ANDROID_RESTRICTED_SETTINGS_HELP_URL)}
      />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Header */}
        <Animated.View entering={FadeInDown.delay(50).springify()} style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backIcon}>‹</Text>
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Troubleshoot</Text>
          </View>
          <View style={styles.headerRight} />
        </Animated.View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          {/* Subtitle */}
          <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.subtitleCard}>
            <Text style={styles.subtitle}>
              🔧 Re-grant permissions if parental controls stop working
            </Text>
          </Animated.View>

          {/* Android-only guard */}
          {Platform.OS !== 'android' && (
            <Animated.View entering={FadeInDown.delay(140).springify()} style={styles.warningCard}>
              <Text style={styles.warningText}>
                ℹ️ Native permissions are only available on Android builds.
              </Text>
            </Animated.View>
          )}

          {/* Check All button */}
          <Animated.View entering={FadeInDown.delay(160).springify()} style={styles.checkAllWrap}>
            <TouchableOpacity
              style={[styles.checkAllButton, checking && styles.checkAllButtonDisabled]}
              onPress={() => void refreshStatuses()}
              disabled={checking}
            >
              {checking ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.checkAllButtonText}>🔍 Check All Permissions</Text>
              )}
            </TouchableOpacity>
          </Animated.View>

          {/* Permission cards */}
          {permissions.map((perm, i) => (
            <Animated.View key={perm.id} entering={FadeInDown.delay(200 + i * 60).springify()}>
              <PermissionCard
                perm={perm}
                status={statuses[perm.id]}
                onGrant={perm.grantFn}
              />
            </Animated.View>
          ))}

          {/* Info card at bottom */}
          <Animated.View entering={FadeInDown.delay(600).springify()} style={styles.infoCard}>
            <Text style={styles.infoEmoji}>📦</Text>
            <Text style={styles.infoText}>
              Some checks need the ParentingMyKid native module; grant buttons open system settings
              via the dev client. Rebuild the app if a screen fails to open.
            </Text>
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
  headerRight: { width: 40 },

  scroll: { paddingHorizontal: SPACING[5], paddingTop: SPACING[2] },

  subtitleCard: {
    backgroundColor: 'rgba(255,255,255,0.72)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.55)',
    padding: SPACING[4],
    marginBottom: SPACING[4],
  },
  subtitle: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    color: COLORS.parent.textSecondary,
    lineHeight: 22,
  },

  warningCard: {
    backgroundColor: 'rgba(245,158,11,0.08)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.25)',
    padding: SPACING[4],
    marginBottom: SPACING[4],
  },
  warningText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: COLORS.parent.textSecondary,
    lineHeight: 20,
  },

  checkAllWrap: { marginBottom: SPACING[5] },
  checkAllButton: {
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
  checkAllButtonDisabled: { opacity: 0.7 },
  checkAllButtonText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 16,
    color: '#FFFFFF',
  },

  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(59,130,246,0.06)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(59,130,246,0.18)',
    padding: SPACING[4],
    gap: SPACING[3],
    marginTop: SPACING[2],
  },
  infoEmoji: { fontSize: 22 },
  infoText: {
    flex: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: COLORS.parent.textSecondary,
    lineHeight: 20,
  },
});
