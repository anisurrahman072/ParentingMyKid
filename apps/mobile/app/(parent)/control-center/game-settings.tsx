import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator,
  Platform,
  AppState,
  Image,
  TextInput,
} from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { apiClient } from '../../../src/services/api.client';
import { useFamilyStore } from '../../../src/store/family.store';
import { COLORS } from '../../../src/constants/colors';
import { SPACING } from '../../../src/constants/spacing';
import { LoadingComponent } from '../../../src/components/parent/ui/LoadingComponent';
import { PremiumDurationPickerModal } from '../../../src/components/parent/game-settings/PremiumDurationPickerModal';
import type { InstalledApp } from '../../../modules/parental-control/src/ParentalControlModule';
import {
  getInstalledApps,
  hasAccessibilityPermission,
  hasBatteryOptimizationExemption,
  hasOverlayPermission,
  hasUsageStatsPermission,
  requestAccessibilityPermission,
  requestBatteryOptimizationExemption,
  requestOverlayPermission,
  requestUsageStatsPermission,
} from '../../../src/services/ParentalControl';
import { blockedPackagesFromControlsPayload, fetchAndPushParentalPolicyForChild } from '../../../src/services/policySync.service';
import { childIdFromGlobalParams } from '../../../src/utils/kidHandoffSession';
import {
  type GameScheduleMode,
  type PersistedGameSettings,
  type GamePerAppLimit,
  coercePersistedGameSettings,
  defaultPersistedGameSettings,
  serializePersisted,
  deriveExplicitBlockedFromServer,
  mergeBlockedAppsWithGameChoices,
  gamingLimitMirrorFromSettings,
  normalizePkg,
} from '../../../src/utils/gameScreenPolicy';

const TIME_STEP = 15;
const TIME_MAX = 240;

function formatMinutes(mins: number) {
  if (mins === 0) return '0m';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function Stepper({
  value,
  min,
  max,
  step,
  onChange,
  pickerSubtitle,
}: {
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  /** Shown under the modal title for context */
  pickerSubtitle?: string;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);

  function applyStep(delta: number) {
    setPickerOpen(false);
    onChange(Math.max(min, Math.min(max, value + delta)));
  }

  return (
    <>
      <PremiumDurationPickerModal
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        valueMinutes={value}
        minMinutes={min}
        maxMinutes={max}
        onConfirm={(minutes) => onChange(minutes)}
        title="Set play time"
        subtitle={pickerSubtitle}
      />
      <View style={stepperStyles.row}>
        <TouchableOpacity
          style={[stepperStyles.btn, value <= min && stepperStyles.btnDisabled]}
          onPress={() => applyStep(-step)}
          disabled={value <= min}
        >
          <Text style={stepperStyles.btnText}>−</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={stepperStyles.valueTouchable}
          onPress={() => setPickerOpen(true)}
          activeOpacity={0.72}
          accessibilityRole="button"
          accessibilityLabel={`${formatMinutes(value)}. Open hour and minute picker`}
        >
          <Text style={stepperStyles.value}>{formatMinutes(value)}</Text>
          <Text style={stepperStyles.editCue}>tap to set</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[stepperStyles.btn, value >= max && stepperStyles.btnDisabled]}
          onPress={() => applyStep(step)}
          disabled={value >= max}
        >
          <Text style={stepperStyles.btnText}>+</Text>
        </TouchableOpacity>
      </View>
    </>
  );
}

const stepperStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING[4],
    marginTop: SPACING[3],
  },
  btn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.parent.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnDisabled: { backgroundColor: '#D1D5DB' },
  btnText: {
    fontSize: 22,
    color: '#FFFFFF',
    lineHeight: 26,
  },
  valueWrap: {
    minWidth: 90,
    alignItems: 'center',
  },
  valueTouchable: {
    minWidth: 100,
    alignItems: 'center',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(59,130,246,0.35)',
  },
  editCue: {
    fontFamily: 'Inter_400Regular',
    fontSize: 10,
    color: COLORS.parent.textMuted,
    marginTop: 2,
  },
  value: {
    fontFamily: 'Inter_700Bold',
    fontSize: 22,
    color: COLORS.parent.textPrimary,
  },
});

function ScheduleSegment({
  value,
  onChange,
}: {
  value: GameScheduleMode;
  onChange: (m: GameScheduleMode) => void;
}) {
  return (
    <View style={segStyles.track}>
      <TouchableOpacity
        style={[segStyles.option, value === 'same_every_day' && segStyles.optionActive]}
        onPress={() => onChange('same_every_day')}
      >
        <Text style={[segStyles.optionText, value === 'same_every_day' && segStyles.optionTextActive]} numberOfLines={2}>
          Same limit every day
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[segStyles.option, value === 'weekday_weekend' && segStyles.optionActive]}
        onPress={() => onChange('weekday_weekend')}
      >
        <Text
          style={[segStyles.optionText, value === 'weekday_weekend' && segStyles.optionTextActive]}
          numberOfLines={2}
        >
          Weekdays vs weekend
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const segStyles = StyleSheet.create({
  track: { flexDirection: 'row', gap: SPACING[2], marginTop: SPACING[2], marginBottom: SPACING[2] },
  option: {
    flex: 1,
    minHeight: 52,
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
    fontSize: 11,
    color: COLORS.parent.textMuted,
    textAlign: 'center',
  },
  optionTextActive: {
    fontFamily: 'Inter_600SemiBold',
    color: COLORS.parent.primary,
  },
});

function defaultPerApp(global: PersistedGameSettings): GamePerAppLimit {
  return {
    limitMode: 'inherit',
    sameMinutes: global.globalSameMinutes,
    weekdayMinutes: global.globalWeekdayMinutes,
    weekendMinutes: global.globalWeekendMinutes,
  };
}

export default function GameSettingsScreen() {
  const params = useLocalSearchParams<{ childId?: string | string[] }>();
  const childId = useMemo(() => childIdFromGlobalParams(params.childId), [params.childId]);
  const { dashboard } = useFamilyStore();
  const kid = dashboard?.children?.find((c) => c.childId === childId);

  const [loading, setLoading] = useState(true);
  /** True only after GET succeeds — avoids erasing blockedApps with stale defaults after a failure. */
  const [hasSuccessfulLoad, setHasSuccessfulLoad] = useState(false);
  const [saving, setSaving] = useState(false);
  const [gamesEnabled, setGamesEnabled] = useState(true);
  const [serverBlockedApps, setServerBlockedApps] = useState<string[]>([]);
  const [gamePersisted, setGamePersisted] = useState<PersistedGameSettings>(() =>
    defaultPersistedGameSettings(45),
  );
  const [explicitBlockedGames, setExplicitBlockedGames] = useState<Set<string>>(new Set());
  const [celebrationLine, setCelebrationLine] = useState('');

  const [gamesList, setGamesList] = useState<InstalledApp[]>([]);
  const [gamesLoading, setGamesLoading] = useState(false);
  const [expandedPkg, setExpandedPkg] = useState<string | null>(null);

  const [a11yOk, setA11yOk] = useState(false);
  const [overlayOk, setOverlayOk] = useState(false);
  const [usageOk, setUsageOk] = useState(false);
  const [batteryExempt, setBatteryExempt] = useState(false);

  const refreshAndroidPermissions = useCallback(async () => {
    if (Platform.OS !== 'android') return;
    try {
      const [a11y, overlay, usage, batt] = await Promise.all([
        hasAccessibilityPermission(),
        hasOverlayPermission(),
        hasUsageStatsPermission(),
        hasBatteryOptimizationExemption(),
      ]);
      setA11yOk(a11y);
      setOverlayOk(overlay);
      setUsageOk(usage);
      setBatteryExempt(batt);
    } catch {
      setA11yOk(false);
      setOverlayOk(false);
      setUsageOk(false);
      setBatteryExempt(false);
    }
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') void refreshAndroidPermissions();
    });
    return () => sub.remove();
  }, [refreshAndroidPermissions]);

  useFocusEffect(
    useCallback(() => {
      void refreshAndroidPermissions();
    }, [refreshAndroidPermissions]),
  );

  const canScanGames = Platform.OS !== 'android' || (a11yOk && overlayOk);

  const refreshGames = useCallback(async () => {
    if (Platform.OS !== 'android' || !(a11yOk && overlayOk)) {
      setGamesList([]);
      return;
    }
    setGamesLoading(true);
    try {
      const list = await getInstalledApps();
      const games = Array.isArray(list)
        ? (list as InstalledApp[])
            .filter((r) => (r.category ?? '') === 'Games')
            .sort((x, y) => (x.appName ?? '').localeCompare(y.appName ?? '', undefined, { sensitivity: 'base' }))
        : [];
      setGamesList(games);
    } catch {
      setGamesList([]);
    } finally {
      setGamesLoading(false);
    }
  }, [a11yOk, overlayOk]);

  useEffect(() => {
    void refreshGames();
  }, [refreshGames]);

  const gamePkgsLower = useMemo(
    () => gamesList.map((g) => normalizePkg(g.packageName)).filter(Boolean),
    [gamesList],
  );

  const allTrackedGamesBlocked = useMemo(
    () =>
      gamePkgsLower.length > 0 && gamePkgsLower.every((pk) => explicitBlockedGames.has(pk)),
    [gamePkgsLower, explicitBlockedGames],
  );

  const setAllTrackedGamesBlocked = useCallback(
    (blockAll: boolean) => {
      setExplicitBlockedGames((prev) => {
        const next = new Set(prev);
        for (const pk of gamePkgsLower) {
          if (blockAll) next.add(pk);
          else next.delete(pk);
        }
        return next;
      });
    },
    [gamePkgsLower],
  );

  /** Muted track/thumb while “Allow games” is off — switches stay disabled but read as inactive. */
  const gameRowBlockSwitchTrack = useMemo(
    () =>
      gamesEnabled
        ? { false: '#D1D5DB', true: COLORS.parent.danger }
        : { false: 'rgba(209, 213, 219, 0.65)', true: 'rgba(239, 68, 68, 0.42)' },
    [gamesEnabled],
  );
  const gameRowBlockSwitchThumb = gamesEnabled ? '#FFFFFF' : '#EDE9E4';

  const hydrateExplicitIfNeeded = useCallback(() => {
    if (!hasSuccessfulLoad || gamePkgsLower.length === 0) return;
    setExplicitBlockedGames((prev) => {
      if (prev.size > 0) return prev;
      return new Set(deriveExplicitBlockedFromServer(serverBlockedApps, gamePkgsLower));
    });
  }, [hasSuccessfulLoad, gamePkgsLower, serverBlockedApps]);

  useEffect(() => {
    hydrateExplicitIfNeeded();
  }, [hydrateExplicitIfNeeded]);

  const load = useCallback(async () => {
    if (!childId) {
      setLoading(false);
      setHasSuccessfulLoad(false);
      return;
    }
    setLoading(true);
    setHasSuccessfulLoad(false);
    await refreshAndroidPermissions();
    try {
      const { data } = await apiClient.get(`/safety/${childId}/parental-controls`);
      setGamesEnabled(data?.gamesEnabled !== false);
      const blockedNorm = blockedPackagesFromControlsPayload(data ?? {});
      setServerBlockedApps(blockedNorm);
      const gm = typeof data?.gamingLimitMinutes === 'number' ? data.gamingLimitMinutes : 45;
      const rawGs = data?.gameSettingsJson ?? data?.gameSettings;
      const coerced = coercePersistedGameSettings(rawGs ?? {}, gm);
      setGamePersisted(coerced);
      setCelebrationLine(coerced.celebrationLine ?? '');
      setExplicitBlockedGames(new Set());
      setHasSuccessfulLoad(true);
    } catch {
      Alert.alert('Error', 'Failed to load settings.');
      setHasSuccessfulLoad(false);
    } finally {
      setLoading(false);
    }
  }, [childId, refreshAndroidPermissions]);

  useEffect(() => {
    void load();
  }, [load]);

  function toggleBlocked(pkgLower: string) {
    setExplicitBlockedGames((prev) => {
      const next = new Set(prev);
      if (next.has(pkgLower)) next.delete(pkgLower);
      else next.add(pkgLower);
      return next;
    });
  }

  function setPerApp(pkgLower: string, patch: Partial<GamePerAppLimit>) {
    setGamePersisted((prev) => {
      const next: PersistedGameSettings = {
        ...prev,
        perPackage: { ...prev.perPackage },
      };
      next.perPackage[pkgLower] = { ...(next.perPackage[pkgLower] ?? defaultPerApp(prev)), ...patch };
      return next;
    });
  }

  async function handleSave() {
    if (!childId) return;
    if (!hasSuccessfulLoad || loading) {
      Alert.alert('Please wait', 'Finish loading settings, then tap Save.');
      return;
    }
    setSaving(true);
    try {
      const tracked = [...new Set(gamePkgsLower)];
      const celebration = celebrationLine.trim().slice(0, 200);
      const persistedToSave: PersistedGameSettings = {
        ...gamePersisted,
        trackedGamePackages: tracked.length > 0 ? tracked : gamePersisted.trackedGamePackages,
        celebrationLine: celebration,
      };
      const mergedBlocked = mergeBlockedAppsWithGameChoices(
        serverBlockedApps,
        tracked.length > 0 ? tracked : gamePersisted.trackedGamePackages,
        gamesEnabled,
        explicitBlockedGames,
      );

      await apiClient.patch(`/safety/${childId}/parental-controls`, {
        gamesEnabled,
        gamingLimitMinutes: gamingLimitMirrorFromSettings(persistedToSave),
        gameSettingsJson: serializePersisted({
          ...persistedToSave,
          celebrationLine: celebration,
        }),
        blockedApps: mergedBlocked,
      });
      setServerBlockedApps(mergedBlocked);
      if (Platform.OS === 'android') {
        await fetchAndPushParentalPolicyForChild(childId, { clearEnforcementPause: true });
      }
      Alert.alert('Saved', 'Game settings saved and pushed to this device.');
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
            <Text style={styles.headerTitle}>Game Settings</Text>
            {kid?.name ? <Text style={styles.headerSubtitle}>{kid.name}</Text> : null}
          </View>
          <View style={styles.headerRight} />
        </Animated.View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          <Animated.View entering={FadeInDown.delay(70).springify()} style={styles.heroCard}>
            <Text style={styles.heroTitle}>Game time dashboard</Text>
            <Text style={styles.heroBody}>
              Tune how long games run on{' '}
              <Text style={styles.infoBold}>{Platform.OS === 'android' ? 'this Android phone' : 'this device'}</Text>.
              Blocking uses the same engine as{' '}
              <Text style={styles.infoBold}>Block Apps</Text>; timers need{' '}
              <Text style={styles.infoBold}>Usage Access</Text> so we can measure today&apos;s play time accurately.
            </Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(95).springify()} style={styles.card}>
            <View style={styles.toggleRow}>
              <View style={styles.toggleInfo}>
                <Text style={styles.toggleTitle}>Allow games</Text>
                <Text style={styles.toggleDesc}>
                  When turned off, every game-type app detected on save is merged into Block Apps automatically.
                </Text>
              </View>
              <Switch
                value={gamesEnabled}
                onValueChange={setGamesEnabled}
                trackColor={{ false: '#D1D5DB', true: COLORS.parent.primary }}
                thumbColor="#FFFFFF"
              />
            </View>
          </Animated.View>

          {gamesEnabled ? (
            <>
              <Animated.View entering={FadeInDown.delay(120).springify()} style={styles.card}>
                <Text style={styles.sectionHint}>Kid motivation (shown softly in Games Zone)</Text>
                <TextInput
                  value={celebrationLine}
                  onChangeText={setCelebrationLine}
                  placeholder='e.g. "When you pause on time you grow your focus superpower"'
                  placeholderTextColor={COLORS.parent.textMuted}
                  style={styles.celebInput}
                  multiline
                />
              </Animated.View>

              <Animated.View entering={FadeInDown.delay(145).springify()}>
                <Text style={styles.sectionLabel}>GLOBAL RULES</Text>
                <View style={styles.card}>
                  <ScheduleSegment
                    value={gamePersisted.scheduleMode}
                    onChange={(scheduleMode) => setGamePersisted((s) => ({ ...s, scheduleMode }))}
                  />

                  {gamePersisted.scheduleMode === 'same_every_day' ? (
                    <>
                      <Text style={styles.cardTitleMuted}>Default daily cap each game inherits</Text>
                      <Stepper
                        value={gamePersisted.globalSameMinutes}
                        min={0}
                        max={TIME_MAX}
                        step={TIME_STEP}
                        pickerSubtitle="Default daily cap · every day"
                        onChange={(globalSameMinutes) => setGamePersisted((s) => ({ ...s, globalSameMinutes }))}
                      />
                      <Text style={styles.limitCaption}>
                        {gamePersisted.globalSameMinutes === 0
                          ? '0 = unlimited inherited cap (set per-game timers below)'
                          : 'Inherited by every title unless you set a custom timer'}
                      </Text>
                    </>
                  ) : (
                    <>
                      <Text style={styles.cardTitleMuted}>Monday–Friday</Text>
                      <Stepper
                        value={gamePersisted.globalWeekdayMinutes}
                        min={0}
                        max={TIME_MAX}
                        step={TIME_STEP}
                        pickerSubtitle="Monday–Friday"
                        onChange={(globalWeekdayMinutes) => setGamePersisted((s) => ({ ...s, globalWeekdayMinutes }))}
                      />
                      <Text style={styles.cardTitleMuted}>Weekend</Text>
                      <Stepper
                        value={gamePersisted.globalWeekendMinutes}
                        min={0}
                        max={TIME_MAX}
                        step={TIME_STEP}
                        pickerSubtitle="Saturday & Sunday"
                        onChange={(globalWeekendMinutes) => setGamePersisted((s) => ({ ...s, globalWeekendMinutes }))}
                      />
                    </>
                  )}
                </View>
              </Animated.View>
            </>
          ) : (
            <Animated.View entering={FadeInDown.delay(130).springify()} style={styles.freezeBanner}>
              <Text style={styles.freezeTitle}>All games paused</Text>
              <Text style={styles.freezeBody}>Save to push every scanned game package into Block Apps alongside your other picks.</Text>
            </Animated.View>
          )}

          <View collapsable={false} style={styles.gamesSectionWrap}>
            <View style={styles.gamesSectionHead}>
              <Text style={[styles.sectionLabel, styles.gamesSectionLabelShrink]} numberOfLines={1}>
                YOUR GAMES
              </Text>
              {canScanGames && Platform.OS === 'android' && !gamesLoading && gamesList.length > 0 ? (
                <View style={styles.masterBlockWrap} collapsable={false}>
                  <Text style={[styles.switchLabel, !gamesEnabled && styles.switchLabelWhenGamesOff]}>Block all</Text>
                  <Switch
                    accessibilityLabel={
                      allTrackedGamesBlocked ? 'Turn off blocking for every game listed' : 'Block every game listed'
                    }
                    value={allTrackedGamesBlocked}
                    onValueChange={setAllTrackedGamesBlocked}
                    disabled={!gamesEnabled}
                    trackColor={gameRowBlockSwitchTrack}
                    thumbColor={gameRowBlockSwitchThumb}
                  />
                </View>
              ) : null}
            </View>
            {!canScanGames && Platform.OS === 'android' ? (
              <View style={styles.card}>
                <Text style={styles.gateEmoji}>🔐</Text>
                <Text style={styles.gateBody}>
                  Grant Accessibility + Display over apps below to reveal every installed{' '}
                  <Text style={styles.infoBold}>Games</Text> bucket app exactly like Block Apps scanning.
                </Text>
              </View>
            ) : Platform.OS !== 'android' ? (
              <View style={styles.card}>
                <Text style={styles.gateBody}>
                  Managed game lists ship on Android. On iOS continue using Block Apps together with Screen Time shortcuts.
                </Text>
              </View>
            ) : gamesLoading ? (
              <View style={styles.loaderCard}>
                <LoadingComponent variant="premiumCard" accessibilityLabel="Loading games" />
                <Text style={styles.loaderCaption}>Fetching your installed arcade…</Text>
              </View>
            ) : gamesList.length === 0 ? (
              <View style={styles.card}>
                <Text style={styles.emptyGames}>No store-tagged Games found via Android categories yet.</Text>
                <TouchableOpacity style={styles.openBlockApps} onPress={() => router.push(`/(parent)/control-center/block-apps?childId=${childId}`)}>
                  <Text style={styles.openBlockAppsText}>Open Block Apps</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.cardFlat}>
                {gamesList.map((g) => {
                  const pk = normalizePkg(g.packageName);
                  const blocked = explicitBlockedGames.has(pk);
                  const expanded = expandedPkg === pk;
                  const rowLimit = gamePersisted.perPackage[pk] ?? defaultPerApp(gamePersisted);

                  const iconUri =
                    g.iconBase64 && g.iconBase64.length > 0 ? `data:image/png;base64,${g.iconBase64}` : null;

                  return (
                    <View key={pk} style={styles.gameCard} collapsable={false}>
                      <View style={styles.gameTopRow} collapsable={false}>
                        <TouchableOpacity style={styles.gameLeftTap} onPress={() => setExpandedPkg(expanded ? null : pk)} activeOpacity={0.85}>
                          {iconUri ? (
                            <Image source={{ uri: iconUri }} style={styles.gameIcon} />
                          ) : (
                            <View style={[styles.gameIcon, styles.gameIconPh]}>
                              <Text style={styles.gameGlyph}>🕹️</Text>
                            </View>
                          )}
                          <View style={styles.gameTextWrap}>
                            <Text style={styles.gameName} numberOfLines={1}>
                              {g.appName}
                            </Text>
                            <Text style={styles.gamePkg} numberOfLines={1}>
                              {g.packageName}
                            </Text>
                          </View>
                        </TouchableOpacity>
                        <View style={styles.switchCol} collapsable={false}>
                          <Text style={[styles.switchLabel, !gamesEnabled && styles.switchLabelWhenGamesOff]}>Block</Text>
                          <Switch
                            value={blocked}
                            onValueChange={() => toggleBlocked(pk)}
                            disabled={!gamesEnabled}
                            trackColor={gameRowBlockSwitchTrack}
                            thumbColor={gameRowBlockSwitchThumb}
                          />
                        </View>
                      </View>
                      {gamesEnabled && !blocked ? (
                        <TouchableOpacity hitSlop={12} onPress={() => setExpandedPkg(expanded ? null : pk)}>
                          <Text style={styles.expandHint}>{expanded ? '▴ Hide timers' : '▾ Custom timers'}</Text>
                        </TouchableOpacity>
                      ) : blocked ? (
                        <Text style={styles.blockedMuted}>Timers hidden while blocked</Text>
                      ) : null}
                      {expanded && gamesEnabled && !blocked ? (
                        <View style={styles.expandedPanel}>
                          <View style={styles.inheritRow}>
                            <Text style={styles.miniLabel}>Per-game budget</Text>
                            <TouchableOpacity
                              style={[styles.miniChip, rowLimit.limitMode === 'inherit' && styles.miniChipOn]}
                              onPress={() =>
                                setPerApp(pk, {
                                  ...defaultPerApp(gamePersisted),
                                  limitMode: 'inherit',
                                  sameMinutes: gamePersisted.globalSameMinutes,
                                  weekdayMinutes: gamePersisted.globalWeekdayMinutes,
                                  weekendMinutes: gamePersisted.globalWeekendMinutes,
                                })
                              }
                            >
                              <Text style={[styles.miniChipText, rowLimit.limitMode === 'inherit' && styles.miniChipTextOn]}>
                                Use global rule
                              </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={[styles.miniChip, rowLimit.limitMode === 'custom' && styles.miniChipOn]}
                              onPress={() => setPerApp(pk, { limitMode: 'custom' })}
                            >
                              <Text style={[styles.miniChipText, rowLimit.limitMode === 'custom' && styles.miniChipTextOn]}>
                                Custom
                              </Text>
                            </TouchableOpacity>
                          </View>
                          {rowLimit.limitMode === 'custom' ? (
                            gamePersisted.scheduleMode === 'same_every_day' ? (
                              <>
                                <Text style={styles.miniHint}>Dedicated cap · 0 leaves this game unrestricted</Text>
                                <Stepper
                                  value={rowLimit.sameMinutes}
                                  min={0}
                                  max={TIME_MAX}
                                  step={TIME_STEP}
                                  pickerSubtitle={`${g.appName} · each day`}
                                  onChange={(sameMinutes) => setPerApp(pk, { sameMinutes })}
                                />
                              </>
                            ) : (
                              <>
                                <Text style={styles.miniHint}>Monday–Friday</Text>
                                <Stepper
                                  value={rowLimit.weekdayMinutes}
                                  min={0}
                                  max={TIME_MAX}
                                  step={TIME_STEP}
                                  pickerSubtitle={`${g.appName} · Mon–Fri`}
                                  onChange={(weekdayMinutes) => setPerApp(pk, { weekdayMinutes })}
                                />
                                <Text style={styles.miniHint}>Weekend</Text>
                                <Stepper
                                  value={rowLimit.weekendMinutes}
                                  min={0}
                                  max={TIME_MAX}
                                  step={TIME_STEP}
                                  pickerSubtitle={`${g.appName} · weekend`}
                                  onChange={(weekendMinutes) => setPerApp(pk, { weekendMinutes })}
                                />
                              </>
                            )
                          ) : null}
                        </View>
                      ) : null}
                    </View>
                  );
                })}
              </View>
            )}
          </View>

          {Platform.OS === 'android' ? (
            <>
              <Animated.View entering={FadeInDown.delay(220).springify()}>
                <Text style={styles.sectionLabel}>ENFORCEMENT STATUS</Text>
              </Animated.View>
              <Animated.View entering={FadeInDown.delay(230).springify()} style={styles.card}>
                <Text style={styles.permExplain}>
                  App blocking overlays need Accessibility & system overlay mirroring{' '}
                  <Text style={styles.infoBold}>Block Apps</Text>. Per-game quotas need Usage Access for reliable daily totals.
                </Text>
                <View style={styles.permRow}>
                  <View style={styles.permInfo}>
                    <Text style={styles.permLabel}>Accessibility service</Text>
                    <Text style={styles.permDesc}>Lets us stop blocked games from staying open.</Text>
                  </View>
                  <View style={styles.permRight}>
                    <View style={[styles.badge, a11yOk ? styles.badgeGranted : styles.badgeRequired]}>
                      <Text style={[styles.badgeText, a11yOk ? styles.badgeTextGranted : styles.badgeTextRequired]}>
                        {a11yOk ? 'Granted' : 'Needed'}
                      </Text>
                    </View>
                    {!a11yOk ? (
                      <TouchableOpacity style={styles.grantBtn} onPress={() => void requestAccessibilityPermission().then(refreshAndroidPermissions)}>
                        <Text style={styles.grantBtnText}>Grant</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                </View>
                <View style={[styles.permRow, styles.permRowSpaced]}>
                  <View style={styles.permInfo}>
                    <Text style={styles.permLabel}>Display over other apps</Text>
                    <Text style={styles.permDesc}>Polite full-screen cues when limits hit.</Text>
                  </View>
                  <View style={styles.permRight}>
                    <View style={[styles.badge, overlayOk ? styles.badgeGranted : styles.badgeRequired]}>
                      <Text style={[styles.badgeText, overlayOk ? styles.badgeTextGranted : styles.badgeTextRequired]}>
                        {overlayOk ? 'Granted' : 'Needed'}
                      </Text>
                    </View>
                    {!overlayOk ? (
                      <TouchableOpacity style={styles.grantBtn} onPress={() => void requestOverlayPermission().then(refreshAndroidPermissions)}>
                        <Text style={styles.grantBtnText}>Grant</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                </View>
                <View style={[styles.permRow, styles.permRowSpaced]}>
                  <View style={styles.permInfo}>
                    <Text style={styles.permLabel}>Usage access</Text>
                    <Text style={styles.permDesc}>Required for respecting daily quotas per profile.</Text>
                  </View>
                  <View style={styles.permRight}>
                    <View style={[styles.badge, usageOk ? styles.badgeGranted : styles.badgeRequired]}>
                      <Text style={[styles.badgeText, usageOk ? styles.badgeTextGranted : styles.badgeTextRequired]}>
                        {usageOk ? 'Granted' : 'Needed'}
                      </Text>
                    </View>
                    {!usageOk ? (
                      <TouchableOpacity style={styles.grantBtn} onPress={() => void requestUsageStatsPermission().then(refreshAndroidPermissions)}>
                        <Text style={styles.grantBtnText}>Grant</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                </View>
                <View style={[styles.permRow, styles.permRowSpaced]}>
                  <View style={styles.permInfo}>
                    <Text style={styles.permLabel}>Run the app in background</Text>
                    <Text style={styles.permDesc}>Same system choice as “always run in background” — keeps overlays and limits dependable.</Text>
                  </View>
                  <View style={styles.permRight}>
                    <View style={[styles.badge, batteryExempt ? styles.badgeGranted : styles.badgeRequired]}>
                      <Text style={[styles.badgeText, batteryExempt ? styles.badgeTextGranted : styles.badgeTextRequired]}>
                        {batteryExempt ? 'Granted' : 'Needed'}
                      </Text>
                    </View>
                    {!batteryExempt ? (
                      <TouchableOpacity
                        style={styles.grantBtn}
                        onPress={() =>
                          void (async () => {
                            try {
                              await requestBatteryOptimizationExemption();
                            } catch {
                              Alert.alert(
                                'Run in background',
                                'In Settings → Apps → ParentingMyKid → Battery, choose Unrestricted or allow background activity.',
                              );
                            }
                            await refreshAndroidPermissions();
                          })()
                        }
                      >
                        <Text style={styles.grantBtnText}>Grant</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                </View>
              </Animated.View>
            </>
          ) : null}

          <Animated.View entering={FadeInDown.delay(260).springify()} style={styles.infoCard}>
            <Text style={styles.infoEmoji}>💡</Text>
            <Text style={styles.infoText}>
              Games use Android&apos;s app category tagging. Mixed titles can still be tweaked from Block Apps. Weekend vs weekday timers follow the
              device&apos;s calendar.
            </Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(285).springify()} style={styles.saveWrap}>
            <TouchableOpacity
              style={[styles.saveButton, (saving || loading || !hasSuccessfulLoad || !childId) && styles.saveButtonDisabled]}
              onPress={() => void handleSave()}
              disabled={saving || loading || !hasSuccessfulLoad || !childId}
            >
              {saving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.saveButtonText}>Save Settings</Text>}
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

  heroCard: {
    backgroundColor: 'rgba(59,130,246,0.08)',
    borderRadius: 14,
    padding: SPACING[4],
    marginBottom: SPACING[4],
    borderWidth: 1,
    borderColor: 'rgba(59,130,246,0.2)',
  },
  heroTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 15,
    color: COLORS.parent.textPrimary,
    marginBottom: SPACING[2],
  },
  heroBody: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: COLORS.parent.textSecondary,
    lineHeight: 18,
  },
  infoBold: { fontFamily: 'Inter_600SemiBold', color: COLORS.parent.textPrimary },

  cardFlat: {
    backgroundColor: 'rgba(255,255,255,0.72)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.55)',
    paddingVertical: SPACING[2],
    marginBottom: SPACING[4],
    overflow: 'hidden',
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

  freezeBanner: {
    backgroundColor: 'rgba(139,92,246,0.09)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.25)',
    padding: SPACING[4],
    marginBottom: SPACING[4],
  },
  freezeTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 15,
    color: COLORS.parent.textPrimary,
    marginBottom: SPACING[2],
  },
  freezeBody: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: COLORS.parent.textSecondary,
    lineHeight: 19,
  },

  gamesSectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING[2],
    marginTop: SPACING[2],
    marginBottom: SPACING[2],
  },
  gamesSectionLabelShrink: {
    flex: 1,
    flexShrink: 1,
    marginTop: 0,
    marginBottom: 0,
  },
  masterBlockWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    ...(Platform.OS === 'android' ? { elevation: 6, zIndex: 4 } : {}),
  },

  gamesSectionWrap: Platform.select({
    android: { zIndex: 2 },
    ios: {},
    default: {},
  }),

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
    marginBottom: SPACING[2],
    fontStyle: 'italic',
  },

  celebInput: {
    minHeight: 72,
    backgroundColor: 'rgba(92,61,46,0.05)',
    borderRadius: 12,
    padding: SPACING[3],
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: COLORS.parent.textPrimary,
    borderWidth: 1,
    borderColor: 'rgba(92,61,46,0.08)',
    textAlignVertical: 'top',
  },

  cardTitleMuted: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    color: COLORS.parent.textSecondary,
    marginTop: SPACING[2],
  },
  limitCaption: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: COLORS.parent.textMuted,
    textAlign: 'center',
    marginTop: SPACING[3],
  },

  gateEmoji: { fontSize: 28, marginBottom: SPACING[2] },
  gateBody: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: COLORS.parent.textSecondary,
    lineHeight: 20,
  },

  loaderCard: { marginBottom: SPACING[4], alignItems: 'center' },
  loaderCaption: {
    marginTop: SPACING[3],
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    color: COLORS.parent.textSecondary,
    textAlign: 'center',
  },

  emptyGames: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: COLORS.parent.textMuted,
    textAlign: 'center',
    marginBottom: SPACING[4],
  },
  openBlockApps: {
    backgroundColor: COLORS.parent.primary,
    borderRadius: 12,
    paddingVertical: SPACING[3],
    alignItems: 'center',
  },
  openBlockAppsText: { fontFamily: 'Inter_600SemiBold', fontSize: 14, color: '#FFFFFF' },

  gameCard: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(92,61,46,0.08)',
    paddingHorizontal: SPACING[3],
    paddingVertical: SPACING[3],
  },
  gameTopRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING[2] },
  gameLeftTap: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: SPACING[2], minWidth: 0 },
  switchCol: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    ...(Platform.OS === 'android' ? { elevation: 6, zIndex: 4 } : {}),
  },
  switchLabel: { fontFamily: 'Inter_500Medium', fontSize: 10, color: COLORS.parent.textMuted },
  switchLabelWhenGamesOff: {
    color: 'rgba(92, 61, 46, 0.42)',
  },
  gameIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(92,61,46,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(92,61,46,0.08)',
  },
  gameIconPh: { justifyContent: 'center', alignItems: 'center' },
  gameGlyph: { fontSize: 22 },
  gameTextWrap: { flex: 1, minWidth: 0 },
  gameName: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: COLORS.parent.textPrimary,
  },
  gamePkg: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: COLORS.parent.textMuted,
    marginTop: 2,
  },
  expandHint: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: COLORS.parent.primary,
    marginTop: SPACING[2],
    marginLeft: 56,
  },
  blockedMuted: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: COLORS.parent.textMuted,
    marginTop: SPACING[2],
    marginLeft: 56,
    fontStyle: 'italic',
  },

  expandedPanel: {
    marginTop: SPACING[3],
    paddingTop: SPACING[3],
    borderTopWidth: 1,
    borderTopColor: 'rgba(92,61,46,0.06)',
    marginLeft: 56,
  },
  inheritRow: { gap: SPACING[2], marginBottom: SPACING[2] },
  miniLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 12, color: COLORS.parent.textPrimary },
  miniHint: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: COLORS.parent.textMuted,
    marginTop: SPACING[2],
    marginBottom: SPACING[1],
  },
  miniChip: {
    alignSelf: 'flex-start',
    paddingHorizontal: SPACING[3],
    paddingVertical: SPACING[1],
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(92,61,46,0.14)',
    backgroundColor: 'rgba(92,61,46,0.04)',
    marginRight: SPACING[2],
  },
  miniChipOn: {
    borderColor: COLORS.parent.primary,
    backgroundColor: 'rgba(59,130,246,0.1)',
  },
  miniChipText: { fontFamily: 'Inter_500Medium', fontSize: 12, color: COLORS.parent.textMuted },
  miniChipTextOn: { fontFamily: 'Inter_700Bold', color: COLORS.parent.primary },

  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(59,130,246,0.08)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(59,130,246,0.2)',
    padding: SPACING[4],
    gap: SPACING[3],
    marginBottom: SPACING[4],
  },
  infoEmoji: { fontSize: 20 },
  infoText: {
    flex: 1,
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

  permExplain: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: COLORS.parent.textMuted,
    marginBottom: SPACING[3],
    lineHeight: 17,
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
});
