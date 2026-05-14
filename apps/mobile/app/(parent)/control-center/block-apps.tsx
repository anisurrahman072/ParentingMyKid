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
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { apiClient } from '../../../src/services/api.client';
import { useFamilyStore } from '../../../src/store/family.store';
import { COLORS } from '../../../src/constants/colors';
import { SPACING } from '../../../src/constants/spacing';
import { BlockAppsPermissionsSheet } from '../../../src/components/parent/block-apps/BlockAppsPermissionsSheet';
import { SelectAppsToBlockModal } from '../../../src/components/parent/block-apps/SelectAppsToBlockModal';
import { ManualPackageEntryModal } from '../../../src/components/parent/block-apps/ManualPackageEntryModal';
import {
  getInstalledApps,
  hasAccessibilityPermission,
  hasOverlayPermission,
} from '../../../src/services/ParentalControl';
import { blockedPackagesFromControlsPayload, fetchAndPushParentalPolicyForChild } from '../../../src/services/policySync.service';

type PackageMeta = { appName: string; iconBase64?: string };

export default function BlockAppsScreen() {
  const { childId } = useLocalSearchParams<{ childId: string }>();
  const { dashboard } = useFamilyStore();
  const kid = dashboard?.children?.find((c) => c.childId === childId);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [blockAllAppsEnabled, setBlockAllAppsEnabled] = useState(false);
  const [blockedApps, setBlockedApps] = useState<string[]>([]);
  const [permSheetVisible, setPermSheetVisible] = useState(false);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [manualPkgVisible, setManualPkgVisible] = useState(false);
  const [appMetaByPackage, setAppMetaByPackage] = useState<Record<string, PackageMeta>>({});

  const refreshInstalledAppMeta = useCallback(async () => {
    if (Platform.OS !== 'android') {
      setAppMetaByPackage({});
      return;
    }
    try {
      const list = await getInstalledApps();
      const map: Record<string, PackageMeta> = {};
      if (Array.isArray(list)) {
        for (const row of list as { packageName?: string; appName?: string; iconBase64?: string }[]) {
          const pkg = row.packageName;
          if (!pkg) continue;
          map[pkg] = {
            appName: row.appName?.trim() || pkg,
            iconBase64:
              typeof row.iconBase64 === 'string' && row.iconBase64.length > 0 ? row.iconBase64 : undefined,
          };
        }
      }
      setAppMetaByPackage(map);
    } catch {
      setAppMetaByPackage({});
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (!loading) void refreshInstalledAppMeta();
    }, [loading, refreshInstalledAppMeta]),
  );

  useEffect(() => {
    if (!loading) void refreshInstalledAppMeta();
  }, [loading, refreshInstalledAppMeta]);

  const load = useCallback(async () => {
    if (!childId) return;
    try {
      const { data } = await apiClient.get(`/safety/${childId}/parental-controls`);
      setBlockAllAppsEnabled(data?.blockAllAppsEnabled === true);
      setBlockedApps(blockedPackagesFromControlsPayload(data ?? {}));
    } catch {
      Alert.alert('Error', 'Failed to load settings.');
    } finally {
      setLoading(false);
    }
  }, [childId]);

  useEffect(() => {
    load();
  }, [load]);

  function addPackageIfNew(trimmed: string) {
    if (!trimmed) return;
    if (blockedApps.includes(trimmed)) {
      Alert.alert('Already added', 'This app is already in the blocklist.');
      return;
    }
    setBlockedApps((prev) => [...prev, trimmed]);
  }

  async function handleAddApp() {
    if (Platform.OS === 'ios') {
      Alert.prompt(
        'Add App to Blocklist',
        'Enter the package name (e.g. com.example.app)',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Add',
            onPress: (pkg?: string) => addPackageIfNew((pkg ?? '').trim()),
          },
        ],
        'plain-text',
      );
      return;
    }

    const [a11y, overlay] = await Promise.all([
      hasAccessibilityPermission(),
      hasOverlayPermission(),
    ]);
    if (!a11y || !overlay) {
      setPermSheetVisible(true);
      return;
    }
    setPickerVisible(true);
  }

  function handleRemoveApp(pkg: string) {
    setBlockedApps((prev) => prev.filter((a) => a !== pkg));
  }

  async function handleSave() {
    if (!childId) return;
    setSaving(true);
    try {
      await apiClient.patch(`/safety/${childId}/parental-controls`, {
        blockAllAppsEnabled,
        blockedApps,
      });
      if (Platform.OS === 'android') {
        await fetchAndPushParentalPolicyForChild(childId, { clearEnforcementPause: true });
      }
      Alert.alert('Saved', 'Block Apps settings updated successfully.');
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
        <BlockAppsPermissionsSheet
          visible={permSheetVisible}
          onClose={() => setPermSheetVisible(false)}
          onAllGranted={() => {
            setPermSheetVisible(false);
            setPickerVisible(true);
          }}
          onManualPackageEntry={() => {
            setPermSheetVisible(false);
            setManualPkgVisible(true);
          }}
        />
        <SelectAppsToBlockModal
          visible={pickerVisible}
          onClose={() => setPickerVisible(false)}
          blockedPackages={blockedApps}
          onApply={(packages) => setBlockedApps(packages)}
          onRequestManualEntry={() => setManualPkgVisible(true)}
        />
        <ManualPackageEntryModal
          visible={manualPkgVisible}
          onClose={() => setManualPkgVisible(false)}
          blockedPackages={blockedApps}
          onAdd={(pkg) => addPackageIfNew(pkg)}
        />
        {/* Header */}
        <Animated.View entering={FadeInDown.delay(50).springify()} style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backIcon}>‹</Text>
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Block Apps</Text>
            {kid?.name ? (
              <Text style={styles.headerSubtitle}>{kid.name}</Text>
            ) : null}
          </View>
          <View style={styles.headerRight} />
        </Animated.View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          {/* Block all apps (device-wide guard via accessibility policy) */}
          <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.card}>
            <View style={styles.toggleRow}>
              <View style={styles.toggleInfo}>
                <Text style={styles.toggleTitle}>🛡️ Block all apps</Text>
                <Text style={styles.toggleDesc}>Block all external apps on this device</Text>
              </View>
              <Switch
                value={blockAllAppsEnabled}
                onValueChange={setBlockAllAppsEnabled}
                trackColor={{ false: '#D1D5DB', true: COLORS.parent.primary }}
                thumbColor="#FFFFFF"
              />
            </View>
          </Animated.View>

          {/* Blocked Apps */}
          <Animated.View entering={FadeInDown.delay(160).springify()}>
            <Text style={styles.sectionLabel}>BLOCKED APPS</Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.card}>
            <TouchableOpacity style={styles.addButton} onPress={handleAddApp}>
              <Text style={styles.addButtonText}>+ Add App to Blocklist</Text>
            </TouchableOpacity>

            {blockedApps.length === 0 ? (
              <Text style={styles.emptyTextBelow}>No apps blocked yet.</Text>
            ) : (
              <>
                <View style={styles.blockedListTopRule} />
                {blockedApps.map((pkg) => {
                  const meta = appMetaByPackage[pkg];
                  const title = meta?.appName ?? pkg;
                  const iconUri =
                    meta?.iconBase64 && meta.iconBase64.length > 0
                      ? `data:image/png;base64,${meta.iconBase64}`
                      : null;
                  const showPkgSubtitle = Boolean(meta?.appName && meta.appName !== pkg);

                  return (
                    <View key={pkg} style={styles.appRow}>
                      {iconUri ? (
                        <Image source={{ uri: iconUri }} style={styles.blockedAppIcon} resizeMode="cover" />
                      ) : (
                        <View style={[styles.blockedAppIcon, styles.blockedAppIconPlaceholder]}>
                          <Text style={styles.blockedAppIconGlyph}>📱</Text>
                        </View>
                      )}
                      <View style={styles.blockedAppTextCol}>
                        <Text style={styles.blockedAppTitle} numberOfLines={1}>
                          {title}
                        </Text>
                        {showPkgSubtitle ? (
                          <Text style={styles.blockedAppSubtitle} numberOfLines={1}>
                            {pkg}
                          </Text>
                        ) : null}
                      </View>
                      <TouchableOpacity
                        style={styles.removeButton}
                        onPress={() => handleRemoveApp(pkg)}
                        accessibilityLabel={`Remove ${title}`}
                      >
                        <Text style={styles.removeIcon}>×</Text>
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </>
            )}
          </Animated.View>

          {/* Blocked by Schedule */}
          <Animated.View entering={FadeInDown.delay(240).springify()}>
            <Text style={styles.sectionLabel}>BLOCKED BY SCHEDULE</Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(280).springify()} style={styles.card}>
            <Text style={styles.infoText}>
              ⏱️ Schedule-based blocking is configured in Watch Limit.
            </Text>
            <TouchableOpacity
              style={styles.linkButton}
              onPress={() => router.push(`/(parent)/control-center/watch-limit?childId=${childId}`)}
            >
              <Text style={styles.linkButtonText}>Go to Watch Limit →</Text>
            </TouchableOpacity>
          </Animated.View>

          {/* Save */}
          <Animated.View entering={FadeInDown.delay(320).springify()} style={styles.saveWrap}>
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

  sectionLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    color: COLORS.parent.textMuted,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: SPACING[2],
    marginTop: SPACING[2],
  },

  emptyTextBelow: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: COLORS.parent.textMuted,
    textAlign: 'center',
    paddingTop: SPACING[4],
    paddingBottom: SPACING[2],
  },

  blockedListTopRule: {
    height: 1,
    backgroundColor: 'rgba(92,61,46,0.08)',
    marginTop: SPACING[4],
    marginBottom: SPACING[1],
  },

  appRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING[3],
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(92,61,46,0.08)',
  },
  blockedAppIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    marginRight: SPACING[3],
    backgroundColor: 'rgba(92,61,46,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(92,61,46,0.08)',
  },
  blockedAppIconPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  blockedAppIconGlyph: {
    fontSize: 22,
  },
  blockedAppTextCol: {
    flex: 1,
    minWidth: 0,
  },
  blockedAppTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: COLORS.parent.textPrimary,
  },
  blockedAppSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: COLORS.parent.textMuted,
    marginTop: 2,
  },
  removeButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(220,38,38,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeIcon: {
    fontSize: 18,
    color: COLORS.parent.danger,
    lineHeight: 22,
  },

  addButton: {
    paddingVertical: SPACING[3],
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: COLORS.parent.primary,
    borderStyle: 'dashed',
    alignItems: 'center',
  },
  addButtonText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: COLORS.parent.primary,
  },

  infoText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: COLORS.parent.textSecondary,
    lineHeight: 20,
    marginBottom: SPACING[3],
  },
  linkButton: { alignSelf: 'flex-start' },
  linkButtonText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    color: COLORS.parent.primary,
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
