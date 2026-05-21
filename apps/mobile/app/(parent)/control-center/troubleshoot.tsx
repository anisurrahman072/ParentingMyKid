import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  AppState,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { router } from 'expo-router';
import { COLORS } from '../../../src/constants/colors';
import { SPACING } from '../../../src/constants/spacing';
import {
  requestAccessibilityPermission,
  openAppSettings,
  releaseDeviceEnforcementState,
} from '../../../src/services/ParentalControl';
import {
  clearActiveKidPolicyLocalMirror,
  setParentDeviceEnforcementPaused,
} from '../../../src/services/policySync.service';
import { useParentGuardStore } from '../../../src/store/parentGuardSettings.store';
import {
  buildParentDevicePermissionDefinitions,
  PARENT_DEVICE_PERMISSION_SLOT_IDS,
  type ParentDevicePermissionDefinition,
} from '../../../src/services/parentDevicePermissions.definitions';
import {
  isAppLocationPermissionGranted,
  isDeviceLocationServicesEnabled,
} from '../../../src/utils/locationPermission';
import { AccessibilityRestrictedSettingsGuideModal } from '../../../src/components/parent/AccessibilityRestrictedSettingsGuideModal';

const PERMISSION_IDS = [...PARENT_DEVICE_PERMISSION_SLOT_IDS];

type PermissionStatus = 'granted' | 'required' | 'partial' | 'checking' | 'unknown';
type StatusMap = Record<string, PermissionStatus>;

function PermissionCard({
  perm,
  status,
  actionLabel,
  onGrant,
}: {
  perm: ParentDevicePermissionDefinition;
  status: PermissionStatus;
  actionLabel?: string;
  onGrant: () => void;
}) {
  const isGranted = status === 'granted';
  const isPartial = status === 'partial';
  const showAction = !isGranted && status !== 'checking';

  let badgeText = '! Required';
  if (isGranted) badgeText = '✓ Granted';
  else if (status === 'unknown') badgeText = 'Unknown';
  else if (isPartial) badgeText = 'Step 2 needed';

  return (
    <View style={cardStyles.card}>
      <View style={cardStyles.top}>
        <View
          style={[
            cardStyles.iconWrap,
            isGranted ? cardStyles.iconGranted : cardStyles.iconRequired,
          ]}
        >
          <Text style={cardStyles.icon}>{perm.icon}</Text>
        </View>
        <View style={cardStyles.info}>
          <Text style={cardStyles.title}>{perm.title}</Text>
          <Text style={cardStyles.desc}>{perm.description}</Text>
        </View>
      </View>
      <View style={cardStyles.bottom}>
        <View
          style={[
            cardStyles.badge,
            isGranted ? cardStyles.badgeGranted : cardStyles.badgeRequired,
          ]}
        >
          {status === 'checking' ? (
            <ActivityIndicator size="small" color={COLORS.parent.primary} />
          ) : (
            <Text
              style={[
                cardStyles.badgeText,
                isGranted ? cardStyles.badgeTextGranted : cardStyles.badgeTextRequired,
              ]}
            >
              {badgeText}
            </Text>
          )}
        </View>
        {showAction && (
          <TouchableOpacity style={cardStyles.grantBtn} onPress={onGrant}>
            <Text style={cardStyles.grantBtnText}>{actionLabel ?? 'Grant Permission'}</Text>
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
  const [releasing, setReleasing] = useState(false);
  const updateGuard = useParentGuardStore((s) => s.update);

  const permissions = useMemo(
    () =>
      buildParentDevicePermissionDefinitions({
        onAccessibilityHelp: () => setAccessibilityGuideOpen(true),
      }),
    [],
  );

  const [statuses, setStatuses] = useState<StatusMap>(() =>
    Object.fromEntries(PERMISSION_IDS.map((id) => [id, 'checking'])),
  );
  const [actionLabels, setActionLabels] = useState<Record<string, string>>({});
  const [checking, setChecking] = useState(false);

  const refreshStatuses = useCallback(async () => {
    setChecking(true);
    setStatuses(Object.fromEntries(permissions.map((p) => [p.id, 'checking'])));

    for (const perm of permissions) {
      try {
        if (perm.id === 'location') {
          const appOk = await isAppLocationPermissionGranted();
          const deviceOk = await isDeviceLocationServicesEnabled();
          if (appOk && deviceOk) {
            setStatuses((prev) => ({ ...prev, location: 'granted' }));
            setActionLabels((prev) => ({ ...prev, location: '' }));
          } else if (appOk && !deviceOk) {
            setStatuses((prev) => ({ ...prev, location: 'partial' }));
            setActionLabels((prev) => ({
              ...prev,
              location: 'Turn on device location',
            }));
          } else {
            setStatuses((prev) => ({ ...prev, location: 'required' }));
            setActionLabels((prev) => ({
              ...prev,
              location: 'Allow app access',
            }));
          }
          continue;
        }

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

  const onReleaseDeviceControl = useCallback(() => {
    if (Platform.OS !== 'android') {
      Alert.alert('Android only', 'This reset runs on the Android app build with parental controls.');
      return;
    }
    Alert.alert(
      'Release on-device control?',
      'This stops the website VPN, turns off the quick overlay, and clears block rules from this phone’s enforcement layer. Your account, login, and saved lists on the server are not deleted.\n\nAndroid does not let apps turn off Accessibility for you — if Chrome or other apps still act blocked, open Accessibility settings and disable ParentingMyKid there.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Release control',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              setReleasing(true);
              try {
                // Pause server→native sync first; then clear native enforcement before zustand,
                // so we never call startForegroundService while prefs still imply an active VPN tunnel.
                await setParentDeviceEnforcementPaused(true);
                await clearActiveKidPolicyLocalMirror();
                await releaseDeviceEnforcementState();
                await updateGuard({
                  applyBlockRulesToParent: false,
                  quickAccessOverlayEnabled: false,
                  autoKidModeEnabled: false,
                });
                Alert.alert(
                  'On-device control released',
                  'Automatic sync of rules to this phone is paused until you save again in Block Apps, Website blocker, or Stop internet. If needed, turn off ParentingMyKid in Accessibility settings.',
                );
                void refreshStatuses();
              } catch {
                Alert.alert('Something went wrong', 'Try again after reopening the app.');
              } finally {
                setReleasing(false);
              }
            })();
          },
        },
      ],
    );
  }, [refreshStatuses, updateGuard]);

  return (
    <LinearGradient colors={['#E8F4EC', '#F2E8E9']} style={styles.container}>
      <AccessibilityRestrictedSettingsGuideModal
        visible={accessibilityGuideOpen}
        onClose={() => setAccessibilityGuideOpen(false)}
        onOpenAccessibility={() => void requestAccessibilityPermission()}
        onOpenAppInfo={() => void openAppSettings()}
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

          {Platform.OS === 'android' && (
            <Animated.View entering={FadeInDown.delay(175).springify()} style={styles.dangerZoneCard}>
              <Text style={styles.dangerZoneLabel}>Danger zone</Text>
              <Text style={styles.dangerZoneBody}>
                If the phone feels stuck (e.g. Chrome not loading), use this to stop VPN/overlay enforcement and
                pause pushing rules to the device. Your account and server-side lists stay as they are.
              </Text>
              <TouchableOpacity
                style={[styles.dangerButton, releasing && styles.dangerButtonDisabled]}
                onPress={onReleaseDeviceControl}
                disabled={releasing}
              >
                {releasing ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.dangerButtonText}>Clear app access and on-phone enforcement</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.dangerSecondaryBtn}
                onPress={() => void requestAccessibilityPermission()}
                disabled={releasing}
              >
                <Text style={styles.dangerSecondaryBtnText}>Open Accessibility settings</Text>
              </TouchableOpacity>
            </Animated.View>
          )}

          {/* Permission cards */}
          {permissions.map((perm, i) => (
            <Animated.View key={perm.id} entering={FadeInDown.delay(200 + i * 60).springify()}>
              <PermissionCard
                perm={perm}
                status={statuses[perm.id] ?? 'unknown'}
                actionLabel={actionLabels[perm.id]}
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

  dangerZoneCard: {
    backgroundColor: 'rgba(127,29,29,0.06)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(220,38,38,0.35)',
    padding: SPACING[4],
    marginBottom: SPACING[5],
  },
  dangerZoneLabel: {
    fontFamily: 'Inter_700Bold',
    fontSize: 13,
    color: COLORS.parent.danger,
    marginBottom: SPACING[2],
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  dangerZoneBody: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: COLORS.parent.textSecondary,
    lineHeight: 20,
    marginBottom: SPACING[4],
  },
  dangerButton: {
    backgroundColor: COLORS.parent.danger,
    borderRadius: 12,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING[2],
  },
  dangerButtonDisabled: { opacity: 0.65 },
  dangerButtonText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 15,
    color: '#FFFFFF',
  },
  dangerSecondaryBtn: {
    alignItems: 'center',
    paddingVertical: SPACING[2],
  },
  dangerSecondaryBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: COLORS.parent.danger,
  },

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
