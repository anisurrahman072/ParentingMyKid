import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  TextInput,
  ActivityIndicator,
  Platform,
  AppState,
  Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { router, useLocalSearchParams } from 'expo-router';
import { normalizeDomainForPolicy } from '@parentingmykid/shared-types';
import { apiClient } from '../../../src/services/api.client';
import { useFamilyStore } from '../../../src/store/family.store';
import { COLORS } from '../../../src/constants/colors';
import { SPACING } from '../../../src/constants/spacing';
import { domainsArrayForNative, fetchAndPushParentalPolicyForChild } from '../../../src/services/policySync.service';
import { childIdFromGlobalParams } from '../../../src/utils/kidHandoffSession';
import {
  hasAccessibilityPermission,
  hasBatteryOptimizationExemption,
  hasOverlayPermission,
  hasVpnPermission,
  requestAccessibilityPermission,
  requestBatteryOptimizationExemption,
  requestOverlayPermission,
  requestVpnPermission,
} from '../../../src/services/ParentalControl';

const PRESET_DOMAINS = ['facebook.com', 'twitter.com', 'instagram.com', 'tiktok.com'];

type ListMode = 'whitelist' | 'blacklist';

function ModeSegment({
  value,
  onChange,
}: {
  value: ListMode;
  onChange: (m: ListMode) => void;
}) {
  return (
    <View style={modeSegStyles.track}>
      <TouchableOpacity
        style={[modeSegStyles.option, value === 'whitelist' && modeSegStyles.optionActive]}
        onPress={() => onChange('whitelist')}
        accessibilityRole="button"
        accessibilityState={{ selected: value === 'whitelist' }}
      >
        <Text
          style={[modeSegStyles.optionText, value === 'whitelist' && modeSegStyles.optionTextActive]}
          numberOfLines={2}
        >
          Allowed websites (domains)
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[modeSegStyles.option, value === 'blacklist' && modeSegStyles.optionActive]}
        onPress={() => onChange('blacklist')}
        accessibilityRole="button"
        accessibilityState={{ selected: value === 'blacklist' }}
      >
        <Text
          style={[modeSegStyles.optionText, value === 'blacklist' && modeSegStyles.optionTextActive]}
          numberOfLines={2}
        >
          Blocked websites (domains)
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const modeSegStyles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    gap: SPACING[2],
    marginBottom: SPACING[3],
  },
  option: {
    flex: 1,
    minHeight: 48,
    paddingVertical: SPACING[2],
    paddingHorizontal: SPACING[2],
    borderRadius: 12,
    backgroundColor: 'rgba(92,61,46,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(92,61,46,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionActive: {
    backgroundColor: 'rgba(59,130,246,0.12)',
    borderColor: COLORS.parent.primary,
  },
  optionText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: COLORS.parent.textMuted,
    textAlign: 'center',
  },
  optionTextActive: {
    fontFamily: 'Inter_600SemiBold',
    color: COLORS.parent.primary,
  },
});

function DomainList({
  domains,
  onRemove,
  onAdd,
  placeholder,
  label,
  color,
}: {
  domains: string[];
  onRemove: (d: string) => void;
  onAdd: (d: string) => void;
  placeholder: string;
  label: string;
  color: string;
}) {
  const [input, setInput] = useState('');

  function handleAdd() {
    const trimmed = normalizeDomainForPolicy(input);
    if (!trimmed) return;
    if (domains.includes(trimmed)) {
      Alert.alert('Already added', 'This domain is already in the list.');
      return;
    }
    onAdd(trimmed);
    setInput('');
  }

  return (
    <View>
      <View style={[domainStyles.inputRow]}>
        <TextInput
          style={domainStyles.input}
          value={input}
          onChangeText={setInput}
          placeholder={placeholder}
          placeholderTextColor={COLORS.parent.textMuted}
          autoCapitalize="none"
          keyboardType="url"
          onSubmitEditing={handleAdd}
          returnKeyType="done"
        />
        <TouchableOpacity
          style={[domainStyles.addBtn, { backgroundColor: color }]}
          onPress={handleAdd}
        >
          <Text style={domainStyles.addBtnText}>Add</Text>
        </TouchableOpacity>
      </View>

      {/* Preset quick-add chips */}
      <View style={domainStyles.presetsRow}>
        {PRESET_DOMAINS.map((d) => (
          !domains.includes(d) && (
            <TouchableOpacity
              key={d}
              style={[domainStyles.presetChip, { borderColor: color }]}
              onPress={() => onAdd(d)}
            >
              <Text style={[domainStyles.presetChipText, { color }]}>+{d}</Text>
            </TouchableOpacity>
          )
        ))}
      </View>

      {/* Domain chips */}
      <View style={domainStyles.chipsWrap}>
        {domains.map((d) => (
          <View key={d} style={[domainStyles.chip, { borderColor: color }]}>
            <Text style={[domainStyles.chipText, { color }]} numberOfLines={1}>{d}</Text>
            <TouchableOpacity onPress={() => onRemove(d)} style={domainStyles.chipRemove}>
              <Text style={[domainStyles.chipRemoveText, { color }]}>×</Text>
            </TouchableOpacity>
          </View>
        ))}
        {domains.length === 0 && (
          <Text style={domainStyles.emptyText}>No {label.toLowerCase()} yet.</Text>
        )}
      </View>
    </View>
  );
}

const domainStyles = StyleSheet.create({
  inputRow: {
    flexDirection: 'row',
    gap: SPACING[2],
    marginBottom: SPACING[3],
  },
  input: {
    flex: 1,
    height: 44,
    backgroundColor: 'rgba(92,61,46,0.05)',
    borderRadius: 10,
    paddingHorizontal: SPACING[3],
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: COLORS.parent.textPrimary,
    borderWidth: 1,
    borderColor: 'rgba(92,61,46,0.1)',
  },
  addBtn: {
    height: 44,
    paddingHorizontal: SPACING[4],
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: '#FFFFFF',
  },
  presetsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING[2],
    marginBottom: SPACING[3],
  },
  presetChip: {
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: SPACING[3],
    paddingVertical: SPACING[1],
  },
  presetChipText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING[2],
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: SPACING[3],
    paddingVertical: SPACING[1],
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.5)',
    maxWidth: 200,
  },
  chipText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    flexShrink: 1,
  },
  chipRemove: { padding: 2 },
  chipRemoveText: {
    fontSize: 16,
    lineHeight: 18,
  },
  emptyText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: COLORS.parent.textMuted,
    fontStyle: 'italic',
  },
});

export default function WebsiteBlockerScreen() {
  const params = useLocalSearchParams<{ childId?: string | string[] }>();
  const childId = useMemo(() => childIdFromGlobalParams(params.childId), [params.childId]);
  const { dashboard } = useFamilyStore();
  const kid = dashboard?.children?.find((c) => c.childId === childId);

  const [loading, setLoading] = useState(true);
  /** True only after a successful GET — never allow Save after a failed load (would push empty defaults to the server). */
  const [hasSuccessfulLoad, setHasSuccessfulLoad] = useState(false);
  const [saving, setSaving] = useState(false);
  /** Independent from Stop Internet — drives VPN DNS filtering only when lists are non-empty. */
  const [websiteFilteringEnabled, setWebsiteFilteringEnabled] = useState(false);
  /** Which single list is active when filtering is on (whitelist = strict allow-only). */
  const [listMode, setListMode] = useState<ListMode>('blacklist');
  const [allowedDomains, setAllowedDomains] = useState<string[]>([]);
  const [blockedDomains, setBlockedDomains] = useState<string[]>([]);
  const [vpnConsentOk, setVpnConsentOk] = useState(false);
  const [batteryExempt, setBatteryExempt] = useState(false);
  const [a11yOk, setA11yOk] = useState(false);
  const [overlayOk, setOverlayOk] = useState(false);

  const refreshAndroidSetup = useCallback(async () => {
    if (Platform.OS !== 'android') return;
    try {
      const [vpn, batt, a11y, overlay] = await Promise.all([
        hasVpnPermission(),
        hasBatteryOptimizationExemption(),
        hasAccessibilityPermission(),
        hasOverlayPermission(),
      ]);
      setVpnConsentOk(vpn);
      setBatteryExempt(batt);
      setA11yOk(a11y);
      setOverlayOk(overlay);
    } catch {
      setVpnConsentOk(false);
      setBatteryExempt(false);
      setA11yOk(false);
      setOverlayOk(false);
    }
  }, []);

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
      setWebsiteFilteringEnabled(data?.websiteFilteringEnabled ?? false);
      const allowed = domainsArrayForNative(data?.allowedDomains);
      const blocked = domainsArrayForNative(data?.blockedDomains);
      setAllowedDomains(allowed);
      setBlockedDomains(blocked);
      const wm = data?.websiteFilterMode;
      if (wm === 'WHITELIST') setListMode('whitelist');
      else if (wm === 'BLACKLIST') setListMode('blacklist');
      else setListMode(allowed.length > 0 ? 'whitelist' : 'blacklist');
      setHasSuccessfulLoad(true);
    } catch {
      Alert.alert('Error', 'Failed to load settings.');
      setHasSuccessfulLoad(false);
    } finally {
      setLoading(false);
    }
    void refreshAndroidSetup();
  }, [childId, refreshAndroidSetup]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') void refreshAndroidSetup();
    });
    return () => sub.remove();
  }, [refreshAndroidSetup]);

  async function handleGrantVpn() {
    if (Platform.OS !== 'android') return;
    await requestVpnPermission();
    void refreshAndroidSetup();
  }

  async function openVpnSystemSettings() {
    try {
      await Linking.openURL('android.settings.VPN_SETTINGS');
    } catch {
      Alert.alert('Settings', 'Open Settings → Network & internet → VPN and enable Always-on for ParentingMyKid.');
    }
  }

  async function handleSave() {
    if (!childId) return;
    if (!hasSuccessfulLoad || loading) {
      Alert.alert('Please wait', 'Load settings from the server first, then try Save again.');
      return;
    }
    if (websiteFilteringEnabled) {
      if (listMode === 'whitelist' && allowedDomains.length === 0) {
        Alert.alert(
          'Add allowed domains',
          'Add at least one domain to the allowed list, or turn filtering off.',
        );
        return;
      }
      if (listMode === 'blacklist' && blockedDomains.length === 0) {
        Alert.alert(
          'Add blocked domains',
          'Add at least one domain to the blocked list, or turn filtering off.',
        );
        return;
      }
    }
    setSaving(true);
    try {
      await apiClient.patch(`/safety/${childId}/parental-controls`, {
        websiteFilteringEnabled,
        websiteFilterMode: listMode === 'whitelist' ? 'WHITELIST' : 'BLACKLIST',
        allowedDomains,
        blockedDomains,
      });
      if (Platform.OS === 'android') {
        // Push updated policy to native SharedPreferences so the VPN starts with the
        // correct rules the moment Kid Mode is activated — no extra network round-trip needed.
        await fetchAndPushParentalPolicyForChild(childId, { clearEnforcementPause: true });
      }
      Alert.alert('Saved', 'Website Blocker settings updated successfully.');
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
            <Text style={styles.headerTitle}>Website Blocker</Text>
            {kid?.name ? <Text style={styles.headerSubtitle}>{kid.name}</Text> : null}
          </View>
          <View style={styles.headerRight} />
        </Animated.View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          <Animated.View entering={FadeInDown.delay(70).springify()} style={styles.infoExplain}>
            <Text style={styles.infoExplainTitle}>How it works</Text>
            <Text style={styles.infoExplainBody}>
              Turn filtering on, then pick <Text style={styles.infoBold}>one</Text> mode:{' '}
              <Text style={styles.infoBold}>Allowed</Text> (strict — only listed sites work) or{' '}
              <Text style={styles.infoBold}>Blocked</Text> (everything works except listed sites). This app&apos;s API stays
              reachable. Uses Android VPN for DNS filtering on this device after you grant VPN permission.
            </Text>
          </Animated.View>

          {/* Enable toggle */}
          <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.card}>
            <View style={styles.toggleRow}>
              <View style={styles.toggleInfo}>
                <Text style={styles.toggleTitle}>🌐 Enable website filtering</Text>
                <Text style={styles.toggleDesc}>
                  When on, choose allowed-only or blocked-only lists for DNS filtering on this phone. Does not pause all
                  internet — use Stop Internet for that.
                </Text>
              </View>
              <Switch
                value={websiteFilteringEnabled}
                onValueChange={setWebsiteFilteringEnabled}
                trackColor={{ false: '#D1D5DB', true: COLORS.parent.primary }}
                thumbColor="#FFFFFF"
              />
            </View>
          </Animated.View>

          {websiteFilteringEnabled ? (
            <>
              <Animated.View entering={FadeInDown.delay(130).springify()} style={styles.card}>
                <Text style={styles.sectionHint}>
                  Select one list type. Only that list is used; the other stays empty when you save.
                </Text>
                <ModeSegment value={listMode} onChange={setListMode} />
              </Animated.View>

              {listMode === 'whitelist' ? (
                <>
                  <Animated.View entering={FadeInDown.delay(160).springify()}>
                    <Text style={styles.sectionLabel}>ALLOWED DOMAINS (WHITELIST)</Text>
                  </Animated.View>
                  <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.card}>
                    <Text style={styles.sectionHint}>
                      Strict mode: only these sites resolve; everything else is blocked
                      (this app&apos;s API stays allowed).
                    </Text>
                    <DomainList
                      label="Allowed domains"
                      domains={allowedDomains}
                      onRemove={(d) => setAllowedDomains((prev) => prev.filter((x) => x !== d))}
                      onAdd={(d) => setAllowedDomains((prev) => [...prev, d])}
                      placeholder="e.g. youtube.com"
                      color={COLORS.parent.success}
                    />
                  </Animated.View>
                </>
              ) : (
                <>
                  <Animated.View entering={FadeInDown.delay(160).springify()}>
                    <Text style={styles.sectionLabel}>BLOCKED DOMAINS (BLACKLIST)</Text>
                  </Animated.View>
                  <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.card}>
                    <Text style={styles.sectionHint}>These sites are blocked; all other browsing works as usual.</Text>
                    <DomainList
                      label="Blocked domains"
                      domains={blockedDomains}
                      onRemove={(d) => setBlockedDomains((prev) => prev.filter((x) => x !== d))}
                      onAdd={(d) => setBlockedDomains((prev) => [...prev, d])}
                      placeholder="e.g. tiktok.com"
                      color={COLORS.parent.danger}
                    />
                  </Animated.View>
                </>
              )}
            </>
          ) : null}

          {Platform.OS === 'android' && (
            <>
              <Animated.View entering={FadeInDown.delay(320).springify()}>
                <Text style={styles.sectionLabel}>VPN PERMISSION</Text>
              </Animated.View>
              <Animated.View entering={FadeInDown.delay(340).springify()} style={styles.card}>
                <Text style={styles.vpnExplain}>
                  Grant once per install. Turning filtering on starts DNS filtering only when you saved with domains below —
                  not when you only tap Grant.
                </Text>
                <Text style={styles.oemHint}>
                  On Samsung, Xiaomi, Tecno, etc., also open your phone&apos;s Battery or Auto-start settings and allow
                  ParentingMyKid to run in the background (each brand names this differently).
                </Text>
                <View style={styles.permRow}>
                  <View style={styles.permInfo}>
                    <Text style={styles.permLabel}>VPN consent</Text>
                    <Text style={styles.permDesc}>Required for DNS website filtering on Android.</Text>
                  </View>
                  <View style={styles.permRight}>
                    <View style={[styles.badge, vpnConsentOk ? styles.badgeGranted : styles.badgeRequired]}>
                      <Text style={[styles.badgeText, vpnConsentOk ? styles.badgeTextGranted : styles.badgeTextRequired]}>
                        {vpnConsentOk ? 'Granted' : 'Needed'}
                      </Text>
                    </View>
                    {!vpnConsentOk ? (
                      <TouchableOpacity style={styles.grantBtn} onPress={() => void handleGrantVpn()}>
                        <Text style={styles.grantBtnText}>Grant</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                </View>

                <View style={[styles.permRow, styles.permRowSpaced]}>
                  <View style={styles.permInfo}>
                    <Text style={styles.permLabel}>Run the app in background</Text>
                    <Text style={styles.permDesc}>
                      Same as Android&apos;s permission to always run in the background — keeps VPN filtering reliable.
                    </Text>
                  </View>
                  <View style={styles.permRight}>
                    <View style={[styles.badge, batteryExempt ? styles.badgeGranted : styles.badgeRequired]}>
                      <Text
                        style={[styles.badgeText, batteryExempt ? styles.badgeTextGranted : styles.badgeTextRequired]}
                      >
                        {batteryExempt ? 'Granted' : 'Needed'}
                      </Text>
                    </View>
                    {!batteryExempt ? (
                      <TouchableOpacity
                        style={styles.grantBtn}
                        onPress={() => {
                          void (async () => {
                            try {
                              await requestBatteryOptimizationExemption();
                            } catch {
                              Alert.alert(
                                'Run in background',
                                'In Settings → Apps → ParentingMyKid → Battery, choose Unrestricted or allow background activity.',
                              );
                            }
                            void refreshAndroidSetup();
                          })();
                        }}
                      >
                        <Text style={styles.grantBtnText}>Grant</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                </View>

                <View style={styles.alwaysOnRow}>
                  <Text style={styles.alwaysOnText}>
                    For the strongest protection, turn on <Text style={styles.infoBold}>Always-on VPN</Text> for
                    ParentingMyKid in system settings (blocks other VPN apps from replacing our filter).
                  </Text>
                  <TouchableOpacity style={styles.alwaysOnBtn} onPress={() => void openVpnSystemSettings()}>
                    <Text style={styles.alwaysOnBtnText}>Open VPN settings</Text>
                  </TouchableOpacity>
                </View>
              </Animated.View>

              <Animated.View entering={FadeInDown.delay(350).springify()}>
                <Text style={styles.sectionLabel}>PROTECT YOUR VPN FILTERING</Text>
              </Animated.View>
              <Animated.View entering={FadeInDown.delay(370).springify()} style={styles.card}>
                <View style={styles.warnBanner}>
                  <Text style={styles.warnBannerTitle}>Other VPN apps bypass blocking</Text>
                  <Text style={styles.warnBannerBody}>
                    If your child turns on another VPN (for example NordVPN, ExpressVPN, Proton VPN, Cloudflare 1.1.1.1,
                    Psiphon, Lantern, OpenVPN), Android usually <Text style={styles.infoBold}>replaces</Text> our
                    ParentingMyKid connection. Then website filtering stops working until you fix it.
                  </Text>
                </View>
                <Text style={styles.sectionHint}>
                  Use <Text style={styles.infoBold}>Block Apps</Text> to block VPN installer apps. You need the same
                  permissions as app blocking:
                </Text>
                <View style={styles.permRow}>
                  <View style={styles.permInfo}>
                    <Text style={styles.permLabel}>Accessibility service</Text>
                    <Text style={styles.permDesc}>Needed so blocked apps (including VPNs) cannot open.</Text>
                  </View>
                  <View style={styles.permRight}>
                    <View style={[styles.badge, a11yOk ? styles.badgeGranted : styles.badgeRequired]}>
                      <Text style={[styles.badgeText, a11yOk ? styles.badgeTextGranted : styles.badgeTextRequired]}>
                        {a11yOk ? 'Granted' : 'Needed'}
                      </Text>
                    </View>
                    {!a11yOk ? (
                      <TouchableOpacity
                        style={styles.grantBtn}
                        onPress={() => {
                          void (async () => {
                            await requestAccessibilityPermission();
                            void refreshAndroidSetup();
                          })();
                        }}
                      >
                        <Text style={styles.grantBtnText}>Grant</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                </View>
                <View style={[styles.permRow, styles.permRowSpaced]}>
                  <View style={styles.permInfo}>
                    <Text style={styles.permLabel}>Display over other apps</Text>
                    <Text style={styles.permDesc}>Shows prompts when a blocked app opens.</Text>
                  </View>
                  <View style={styles.permRight}>
                    <View style={[styles.badge, overlayOk ? styles.badgeGranted : styles.badgeRequired]}>
                      <Text style={[styles.badgeText, overlayOk ? styles.badgeTextGranted : styles.badgeTextRequired]}>
                        {overlayOk ? 'Granted' : 'Needed'}
                      </Text>
                    </View>
                    {!overlayOk ? (
                      <TouchableOpacity
                        style={styles.grantBtn}
                        onPress={() => {
                          void (async () => {
                            await requestOverlayPermission();
                            void refreshAndroidSetup();
                          })();
                        }}
                      >
                        <Text style={styles.grantBtnText}>Grant</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                </View>
                <Text style={styles.vpnPkgHint}>
                  Example packages to block: <Text style={styles.infoBold}>com.cloudflare.onedotonedotonedotone</Text>,{' '}
                  <Text style={styles.infoBold}>org.mozilla.firefox.vpn</Text>,{' '}
                  <Text style={styles.infoBold}>com.nordvpn.android</Text>,{' '}
                  <Text style={styles.infoBold}>com.wireguard.android</Text>,{' '}
                  <Text style={styles.infoBold}>net.openvpn.openvpn</Text>, <Text style={styles.infoBold}>com.psiphon3</Text>{' '}
                  (names vary by app — pick from your child&apos;s app list).
                </Text>
                {childId ? (
                  <TouchableOpacity
                    style={styles.openBlockAppsBtn}
                    onPress={() => router.push(`/(parent)/control-center/block-apps?childId=${childId}`)}
                  >
                    <Text style={styles.openBlockAppsBtnText}>Open App Blocker</Text>
                  </TouchableOpacity>
                ) : null}
              </Animated.View>
            </>
          )}

          {/* Save */}
          <Animated.View entering={FadeInDown.delay(360).springify()} style={styles.saveWrap}>
            <TouchableOpacity
              style={[styles.saveButton, (saving || loading || !hasSuccessfulLoad) && styles.saveButtonDisabled]}
              onPress={handleSave}
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

  infoExplain: {
    backgroundColor: 'rgba(59,130,246,0.08)',
    borderRadius: 14,
    padding: SPACING[4],
    marginBottom: SPACING[4],
    borderWidth: 1,
    borderColor: 'rgba(59,130,246,0.2)',
  },
  infoExplainTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
    color: COLORS.parent.textPrimary,
    marginBottom: SPACING[2],
  },
  infoExplainBody: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: COLORS.parent.textSecondary,
    lineHeight: 18,
  },
  infoBold: { fontFamily: 'Inter_600SemiBold', color: COLORS.parent.textPrimary },

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
  sectionHint: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: COLORS.parent.textMuted,
    marginBottom: SPACING[3],
    fontStyle: 'italic',
  },

  vpnExplain: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: COLORS.parent.textMuted,
    marginBottom: SPACING[2],
    lineHeight: 17,
  },
  oemHint: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: COLORS.parent.textSecondary,
    lineHeight: 16,
    marginBottom: SPACING[3],
    fontStyle: 'italic',
  },
  permRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING[2],
  },
  permRowSpaced: { marginTop: SPACING[3] },
  permInfo: { flex: 1, marginRight: SPACING[2] },
  permLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: COLORS.parent.textPrimary,
    marginBottom: 3,
  },
  permDesc: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: COLORS.parent.textMuted,
    lineHeight: 17,
  },
  permRight: { alignItems: 'flex-end', gap: SPACING[2] },
  badge: {
    paddingHorizontal: SPACING[2],
    paddingVertical: 6,
    borderRadius: 8,
  },
  badgeGranted: { backgroundColor: 'rgba(5,150,105,0.1)' },
  badgeRequired: { backgroundColor: 'rgba(220,38,38,0.1)' },
  badgeText: { fontFamily: 'Inter_600SemiBold', fontSize: 11 },
  badgeTextGranted: { color: COLORS.parent.success },
  badgeTextRequired: { color: COLORS.parent.danger },
  grantBtn: {
    backgroundColor: COLORS.parent.primary,
    borderRadius: 8,
    paddingHorizontal: SPACING[3],
    paddingVertical: SPACING[2],
  },
  grantBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: '#FFFFFF',
  },
  alwaysOnRow: {
    marginTop: SPACING[4],
    paddingTop: SPACING[3],
    borderTopWidth: 1,
    borderTopColor: 'rgba(92,61,46,0.1)',
  },
  alwaysOnText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: COLORS.parent.textSecondary,
    lineHeight: 18,
    marginBottom: SPACING[2],
  },
  alwaysOnBtn: {
    alignSelf: 'flex-start',
    paddingVertical: SPACING[2],
    paddingHorizontal: SPACING[3],
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.parent.primary,
    backgroundColor: 'rgba(59,130,246,0.08)',
  },
  alwaysOnBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    color: COLORS.parent.primary,
  },
  warnBanner: {
    backgroundColor: 'rgba(248,113,113,0.1)',
    borderRadius: 12,
    padding: SPACING[3],
    marginBottom: SPACING[3],
    borderWidth: 1,
    borderColor: 'rgba(248,113,113,0.25)',
  },
  warnBannerTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
    color: COLORS.parent.textPrimary,
    marginBottom: SPACING[2],
  },
  warnBannerBody: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: COLORS.parent.textSecondary,
    lineHeight: 18,
  },
  vpnPkgHint: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: COLORS.parent.textMuted,
    lineHeight: 16,
    marginTop: SPACING[3],
  },
  openBlockAppsBtn: {
    marginTop: SPACING[4],
    backgroundColor: COLORS.parent.primary,
    borderRadius: 12,
    paddingVertical: SPACING[3],
    alignItems: 'center',
  },
  openBlockAppsBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: '#FFFFFF',
  },

  vpnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING[3],
  },
  vpnRight: { alignItems: 'flex-end', gap: SPACING[2] },
  vpnBadge: {
    paddingHorizontal: SPACING[3],
    paddingVertical: 6,
    borderRadius: 10,
  },
  vpnBadgeOk: { backgroundColor: 'rgba(16,185,129,0.12)' },
  vpnBadgeNeed: { backgroundColor: 'rgba(248,113,113,0.15)' },
  vpnBadgeText: { fontFamily: 'Inter_600SemiBold', fontSize: 11 },
  vpnBadgeTextOk: { color: '#059669' },
  vpnBadgeTextNeed: { color: '#B91C1C' },
  vpnGrantBtn: {
    backgroundColor: COLORS.parent.primary,
    paddingHorizontal: SPACING[4],
    paddingVertical: SPACING[2],
    borderRadius: 10,
  },
  vpnGrantText: { fontFamily: 'Inter_600SemiBold', fontSize: 13, color: '#FFFFFF' },

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
