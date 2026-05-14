/**
 * Kid Mode & Protection Settings
 *
 * Three independent parent-facing features:
 *   1. Block Rules for Parent — apply child block rules to parent session too
 *   2. Auto Kid Mode         — phone auto-switches to Kid Mode after N minutes idle
 *   3. Quick Access Overlay  — floating bubble for one-tap mode switching
 */
import React, { useEffect, useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { router } from 'expo-router';
import { useParentGuardStore } from '../../../src/store/parentGuardSettings.store';
import { COLORS } from '../../../src/constants/colors';
import { SPACING } from '../../../src/constants/spacing';
import {
  hasOverlayPermission,
  requestOverlayPermission,
  setApplyRulesToParent,
  startOverlayService,
  stopOverlayService,
  isOverlayRunning,
  hasBatteryOptimizationExemption,
  requestBatteryOptimizationExemption,
} from '../../../modules/parental-control/src/index';

const IDLE_OPTIONS = [1, 2, 5, 10, 15, 20, 30, 45, 60];

// ─── Sub-components ──────────────────────────────────────────────────────────

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
    </View>
  );
}

function FeatureCard({
  icon,
  title,
  description,
  children,
}: {
  icon: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <Animated.View entering={FadeInDown.delay(80).springify()} style={styles.featureCard}>
      <View style={styles.featureCardHeader}>
        <View style={styles.featureIconWrap}>
          <Text style={styles.featureIcon}>{icon}</Text>
        </View>
        <View style={styles.featureCardTexts}>
          <Text style={styles.featureTitle}>{title}</Text>
          <Text style={styles.featureDescription}>{description}</Text>
        </View>
      </View>
      <View style={styles.featureCardBody}>{children}</View>
    </Animated.View>
  );
}

function Row({
  label,
  children,
  borderBottom = true,
}: {
  label: string;
  children: React.ReactNode;
  borderBottom?: boolean;
}) {
  return (
    <View style={[styles.row, !borderBottom && styles.rowNoBorder]}>
      <Text style={styles.rowLabel}>{label}</Text>
      {children}
    </View>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function KidModeSettingsScreen() {
  const {
    load,
    update,
    applyBlockRulesToParent,
    autoKidModeEnabled,
    autoKidModeIdleMinutes,
    quickAccessOverlayEnabled,
  } = useParentGuardStore();

  const [overlayGranted, setOverlayGranted] = useState(false);
  const [overlayActive, setOverlayActive] = useState(false);
  const [batteryExempt, setBatteryExempt] = useState(false);

  // Load settings and check overlay state on mount
  useEffect(() => {
    void load();
    if (Platform.OS === 'android') {
      void checkOverlayState();
      void checkBatteryState();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkOverlayState = useCallback(async () => {
    const granted = await hasOverlayPermission();
    const running = await isOverlayRunning();
    setOverlayGranted(granted);
    setOverlayActive(running);
  }, []);

  const checkBatteryState = useCallback(async () => {
    try {
      const exempt = await hasBatteryOptimizationExemption();
      setBatteryExempt(exempt);
    } catch {
      setBatteryExempt(false);
    }
  }, []);

  // ─── Feature 1 handlers ──────────────────────────────────────────────────

  async function toggleApplyBlockRulesToParent(value: boolean) {
    await update({ applyBlockRulesToParent: value });
    try {
      await setApplyRulesToParent(value);
    } catch {
      // native module not linked (Expo Go) — setting persisted in JS store only
    }
    if (value) {
      Alert.alert(
        'Block rules now apply to you',
        'Apps and websites you have blocked for your children will also be blocked when you are in Parent Mode on this device.',
        [{ text: 'Got it' }],
      );
    }
  }

  // ─── Feature 2 handlers ──────────────────────────────────────────────────

  async function toggleAutoKidMode(value: boolean) {
    await update({ autoKidModeEnabled: value });
  }

  async function selectIdleMinutes(minutes: number) {
    await update({ autoKidModeIdleMinutes: minutes });
  }

  // ─── Feature 3 handlers ──────────────────────────────────────────────────

  async function toggleOverlay(value: boolean) {
    if (Platform.OS !== 'android') {
      Alert.alert('Android only', 'The quick-access overlay is only available on Android.');
      return;
    }

    if (value) {
      const granted = await hasOverlayPermission();
      if (!granted) {
        Alert.alert(
          'Permission required',
          'To show the floating quick-access button, please allow "Display over other apps" in the next screen.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Open Settings',
              onPress: async () => {
                await requestOverlayPermission();
                await checkOverlayState();
              },
            },
          ],
        );
        return;
      }
      await update({ quickAccessOverlayEnabled: true });
      try {
        await startOverlayService();
        setOverlayActive(true);
      } catch {
        // native module not linked
      }
    } else {
      await update({ quickAccessOverlayEnabled: false });
      try {
        await stopOverlayService();
        setOverlayActive(false);
      } catch {
        // native module not linked
      }
    }
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Kid Mode & Protection</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Feature 1: Block Rules for Parent ─────────────────────────────── */}
        <SectionHeader
          title="Block Rules"
          subtitle="Control whether the rules you set for your children also apply to you"
        />

        <FeatureCard
          icon="🛡️"
          title="Apply block rules to me"
          description="When ON, apps and websites you've blocked for your children are also blocked for you in Parent Mode — great for self-discipline or when sharing the device."
        >
          <Row label="Apply block rules to me too" borderBottom={false}>
            <Switch
              value={applyBlockRulesToParent}
              onValueChange={toggleApplyBlockRulesToParent}
              trackColor={{ false: 'rgba(0,0,0,0.1)', true: COLORS.parent.primary }}
              thumbColor="#FFFFFF"
            />
          </Row>
        </FeatureCard>

        {/* ── Feature 2: Auto Kid Mode ──────────────────────────────────────── */}
        <SectionHeader
          title="Auto Kid Mode"
          subtitle="Automatically switch to Kid Mode when the phone is idle or locked"
        />

        <FeatureCard
          icon="⏱️"
          title="Auto-switch to Kid Mode"
          description="When your phone is locked or idle for the selected time, it will automatically switch to Kid Mode so your child sees the right screen when they pick it up."
        >
          <Row label="Enable auto-switch">
            <Switch
              value={autoKidModeEnabled}
              onValueChange={toggleAutoKidMode}
              trackColor={{ false: 'rgba(0,0,0,0.1)', true: COLORS.parent.primary }}
              thumbColor="#FFFFFF"
            />
          </Row>

          <View style={styles.idlePickerWrap}>
            <Text style={styles.idlePickerLabel}>Switch after:</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.idlePickerRow}
            >
              {IDLE_OPTIONS.map((min) => (
                <TouchableOpacity
                  key={min}
                  style={[
                    styles.idleChip,
                    autoKidModeIdleMinutes === min && styles.idleChipActive,
                    !autoKidModeEnabled && styles.idleChipDisabled,
                  ]}
                  onPress={() => autoKidModeEnabled && selectIdleMinutes(min)}
                  disabled={!autoKidModeEnabled}
                >
                  <Text
                    style={[
                      styles.idleChipText,
                      autoKidModeIdleMinutes === min && styles.idleChipTextActive,
                    ]}
                  >
                    {min < 60 ? `${min}m` : '1h'}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <View style={styles.infoBox}>
            <Text style={styles.infoBoxText}>
              💡 This uses the phone&apos;s screen-lock / idle time. The app must still run in the
              background — allow it in Background Execution below (often Settings → Apps → Battery / Background).
            </Text>
          </View>
        </FeatureCard>

        {/* ── Feature 3: Quick Access Overlay ──────────────────────────────── */}
        <SectionHeader
          title="Quick Access"
          subtitle="Floating button on your screen for instant mode switching — like ISLAMI JINDEGI"
        />

        <FeatureCard
          icon="🔮"
          title="Floating quick-switch button"
          description="Shows a draggable button on top of any screen. Tap it to quickly switch between Parent Mode and Kid Mode with PIN verification — without opening the app."
        >
          {Platform.OS !== 'android' && (
            <View style={styles.infoBox}>
              <Text style={styles.infoBoxText}>
                ⚠️ Floating overlay is only available on Android devices.
              </Text>
            </View>
          )}

          {Platform.OS === 'android' && !overlayGranted && quickAccessOverlayEnabled && (
            <TouchableOpacity
              style={styles.permissionBtn}
              onPress={() => void requestOverlayPermission().then(checkOverlayState)}
            >
              <Text style={styles.permissionBtnText}>Grant "Display over other apps" →</Text>
            </TouchableOpacity>
          )}

          <Row label="Show floating quick-switch button">
            <Switch
              value={quickAccessOverlayEnabled && (Platform.OS !== 'android' ? false : overlayGranted ? overlayActive : false)}
              onValueChange={toggleOverlay}
              trackColor={{ false: 'rgba(0,0,0,0.1)', true: COLORS.parent.primary }}
              thumbColor="#FFFFFF"
              disabled={Platform.OS !== 'android'}
            />
          </Row>

          {overlayActive && (
            <View style={[styles.infoBox, styles.infoBoxSuccess]}>
              <Text style={styles.infoBoxText}>
                ✅ Overlay is running. Drag the PMK bubble to reposition it on your screen.
              </Text>
            </View>
          )}

          <View style={styles.infoBox}>
            <Text style={styles.infoBoxText}>
              💡 The button floats above all apps. Tap once to expand — then switch modes with
              your parental PIN. It requires "Display over other apps" permission.
            </Text>
          </View>
        </FeatureCard>

        {/* ── Background Execution ──────────────────────────────────────────── */}
        <SectionHeader
          title="Background Execution"
          subtitle="Required for the overlay and auto-switch to work reliably when your phone is locked"
        />

        <FeatureCard
          icon="⚡"
          title="Run the app in background"
          description="Some Android phones (Xiaomi, Huawei, Samsung, etc.) aggressively stop background apps. Grant this exemption so the PMK overlay stays active and the auto-switch timer keeps counting even while your screen is off."
        >
          {Platform.OS !== 'android' && (
            <View style={styles.infoBox}>
              <Text style={styles.infoBoxText}>
                ⚠️ Background execution settings are only available on Android.
              </Text>
            </View>
          )}

          {Platform.OS === 'android' && (
            <>
              {batteryExempt ? (
                <View style={[styles.infoBox, styles.infoBoxSuccess]}>
                  <Text style={styles.infoBoxText}>
                    ✅ Background execution is already unrestricted for this app.
                  </Text>
                </View>
              ) : (
                <>
                  <View style={[styles.infoBox, { backgroundColor: 'rgba(234,88,12,0.07)' }]}>
                    <Text style={styles.infoBoxText}>
                      ⚠️ Android may still stop this app in the background — the overlay can quit after the screen is off for a long time. Tap below to allow running in background.
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.permissionBtn}
                    onPress={async () => {
                      await requestBatteryOptimizationExemption();
                      setTimeout(() => void checkBatteryState(), 1500);
                    }}
                  >
                    <Text style={styles.permissionBtnText}>
                      Request "Run in background" permission →
                    </Text>
                  </TouchableOpacity>
                </>
              )}
              <View style={styles.infoBox}>
                <Text style={styles.infoBoxText}>
                  💡 On MIUI (Xiaomi), also go to Settings → Apps → ParentingMyKid → Battery → No restrictions, and enable "Autostart". On Huawei, add the app to "Protected Apps" in Battery settings.
                </Text>
              </View>
            </>
          )}
        </FeatureCard>

        <View style={{ height: SPACING[10] }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.parent.backgroundLight,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING[4],
    paddingVertical: SPACING[3],
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(92,61,46,0.08)',
    backgroundColor: COLORS.parent.surface,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    fontSize: 28,
    color: COLORS.parent.primary,
    lineHeight: 32,
  },
  headerTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 17,
    color: COLORS.parent.textPrimary,
  },

  scrollContent: {
    paddingHorizontal: SPACING[4],
    paddingTop: SPACING[4],
  },

  sectionHeader: {
    marginBottom: SPACING[3],
    marginTop: SPACING[2],
    paddingHorizontal: SPACING[1],
  },
  sectionTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 13,
    color: COLORS.parent.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  sectionSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: COLORS.parent.textSecondary,
    marginTop: 3,
  },

  featureCard: {
    backgroundColor: COLORS.parent.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.parent.surfaceBorder,
    marginBottom: SPACING[5],
    overflow: 'hidden',
    shadowColor: 'rgba(92,61,46,0.08)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 3,
  },
  featureCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: SPACING[4],
    gap: SPACING[3],
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(92,61,46,0.07)',
  },
  featureIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(59,130,246,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureIcon: { fontSize: 22 },
  featureCardTexts: { flex: 1 },
  featureTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 15,
    color: COLORS.parent.textPrimary,
    marginBottom: 3,
  },
  featureDescription: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: COLORS.parent.textSecondary,
    lineHeight: 19,
  },
  featureCardBody: {
    paddingHorizontal: SPACING[4],
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING[3],
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(92,61,46,0.07)',
  },
  rowNoBorder: { borderBottomWidth: 0 },
  rowLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    color: COLORS.parent.textPrimary,
    flex: 1,
    marginRight: SPACING[3],
  },

  idlePickerWrap: {
    paddingVertical: SPACING[3],
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(92,61,46,0.07)',
  },
  idlePickerLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    color: COLORS.parent.textSecondary,
    marginBottom: SPACING[2],
  },
  idlePickerRow: {
    flexDirection: 'row',
    gap: SPACING[2],
    paddingBottom: 2,
  },
  idleChip: {
    paddingHorizontal: SPACING[3],
    paddingVertical: SPACING[2],
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(92,61,46,0.18)',
    backgroundColor: 'rgba(255,255,255,0.6)',
  },
  idleChipActive: {
    backgroundColor: COLORS.parent.primary,
    borderColor: COLORS.parent.primary,
  },
  idleChipDisabled: {
    opacity: 0.4,
  },
  idleChipText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    color: COLORS.parent.textPrimary,
  },
  idleChipTextActive: {
    color: '#FFFFFF',
  },

  infoBox: {
    backgroundColor: 'rgba(59,130,246,0.06)',
    borderRadius: 10,
    padding: SPACING[3],
    marginVertical: SPACING[3],
  },
  infoBoxSuccess: {
    backgroundColor: 'rgba(5,150,105,0.07)',
  },
  infoBoxText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: COLORS.parent.textSecondary,
    lineHeight: 18,
  },

  permissionBtn: {
    backgroundColor: 'rgba(59,130,246,0.1)',
    borderRadius: 10,
    padding: SPACING[3],
    alignItems: 'center',
    marginVertical: SPACING[2],
    borderWidth: 1,
    borderColor: 'rgba(59,130,246,0.25)',
  },
  permissionBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    color: COLORS.parent.primary,
  },
});
