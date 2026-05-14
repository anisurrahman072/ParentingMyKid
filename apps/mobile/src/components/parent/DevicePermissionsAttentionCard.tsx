import React, { useMemo, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeIn,
  FadeInDown,
  ZoomIn,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  cancelAnimation,
  Easing,
} from 'react-native-reanimated';
import { router } from 'expo-router';
import { COLORS } from '../../constants/colors';
import { SPACING } from '../../constants/spacing';
import {
  buildParentDevicePermissionDefinitions,
  type ParentDevicePermissionDefinition,
} from '../../services/parentDevicePermissions.definitions';
import { policyHasEnforcementRulesConfigured } from '../../services/parentDevicePermissions.policy';
import { useParentDevicePermissionStatus } from '../../hooks/useParentDevicePermissionStatus';
import { AccessibilityRestrictedSettingsGuideModal } from './AccessibilityRestrictedSettingsGuideModal';
import { requestAccessibilityPermission, openAppSettings } from '../../services/ParentalControl';

const SEGMENT_GAP = 4;

/** Soft rose → emerald progression for “missing” segments (premium, not harsh). */
function segmentColor(granted: boolean, index: number, slotCount: number): string {
  if (granted) return '#34D399';
  const t = index / Math.max(slotCount - 1, 1);
  const r = Math.round(252 - t * 120);
  const g = Math.round(165 + t * 70);
  const b = Math.round(165 - t * 40);
  return `rgb(${r},${g},${b})`;
}

export function DevicePermissionsAttentionCard({
  policySnapshot,
}: {
  policySnapshot: unknown;
}) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);

  const definitions = useMemo(
    () =>
      buildParentDevicePermissionDefinitions({
        onAccessibilityHelp: () => setGuideOpen(true),
      }),
    [],
  );

  const { statusById, loading, refresh, grantedCount, missingCount, total, allGranted } =
    useParentDevicePermissionStatus(definitions);

  const policyNeedsDevice = policyHasEnforcementRulesConfigured(policySnapshot);
  const showShake = policyNeedsDevice && missingCount > 0 && !loading;

  const shakeX = useSharedValue(0);
  useEffect(() => {
    if (!showShake) {
      cancelAnimation(shakeX);
      shakeX.value = 0;
      return;
    }
    shakeX.value = withRepeat(
      withSequence(
        withTiming(-4, { duration: 90, easing: Easing.inOut(Easing.quad) }),
        withTiming(4, { duration: 90, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
      true,
    );
    return () => {
      cancelAnimation(shakeX);
    };
  }, [showShake, shakeX]);

  const shakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeX.value }],
  }));

  if (Platform.OS !== 'android') return null;

  const progress = total > 0 ? grantedCount / total : 0;

  return (
    <>
      <AccessibilityRestrictedSettingsGuideModal
        visible={guideOpen}
        onClose={() => setGuideOpen(false)}
        onOpenAccessibility={() => void requestAccessibilityPermission()}
        onOpenAppInfo={() => void openAppSettings()}
      />

      <PremiumPermissionsModal
        visible={sheetOpen}
        onClose={() => {
          setSheetOpen(false);
          void refresh();
        }}
        definitions={definitions}
        statusById={statusById}
        loading={loading}
        onRefresh={() => void refresh()}
      />

      <Animated.View entering={FadeInDown.delay(80).springify()} style={styles.wrap}>
        <LinearGradient
          colors={
            allGranted
              ? ['rgba(52,211,153,0.2)', 'rgba(16,185,129,0.12)', 'rgba(255,255,255,0.85)']
              : ['rgba(254,202,202,0.55)', 'rgba(254,215,170,0.35)', 'rgba(255,255,255,0.92)']
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.card}
        >
          {!allGranted ? (
            <>
              <Text style={styles.preHint}>
                {missingCount}/{total} left on this phone — your saved rules online still need local permission here.
              </Text>

              <View style={styles.segmentRow}>
                {definitions.map((d, i) => (
                  <View
                    key={d.id}
                    style={[
                      styles.segment,
                      {
                        backgroundColor: segmentColor(!!statusById[d.id], i, total),
                        marginRight: i < total - 1 ? SEGMENT_GAP : 0,
                      },
                    ]}
                  />
                ))}
              </View>

              <View style={styles.progressTrack}>
                <LinearGradient
                  colors={['#F87171', '#FBBF24', '#34D399']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[styles.progressFill, { width: `${Math.round(progress * 100)}%` as `${number}%` }]}
                />
              </View>

              <TouchableOpacity style={styles.ctaOuter} activeOpacity={0.92} onPress={() => setSheetOpen(true)}>
                <LinearGradient colors={['#DC2626', '#B91C1C', '#991B1B']} style={styles.ctaGrad}>
                  <Text style={styles.ctaTitle}>Permissions needed</Text>
                  <Text style={styles.ctaSub}>Tap to review & open system settings</Text>
                </LinearGradient>
              </TouchableOpacity>

              {policyNeedsDevice && missingCount > 0 ? (
                <Animated.View style={[styles.badgePulse, shakeStyle]}>
                  <LinearGradient colors={['rgba(239,68,68,0.15)', 'rgba(251,146,60,0.12)']} style={styles.badgeInner}>
                    <Text style={styles.badgeText}>
                      {missingCount} still missing — blocked apps & filters won&apos;t apply on this device until granted.
                    </Text>
                  </LinearGradient>
                </Animated.View>
              ) : null}

              <TouchableOpacity onPress={() => router.push('/(parent)/control-center/troubleshoot')} hitSlop={12}>
                <Text style={styles.troubleshootLink}>Detailed steps · Troubleshoot →</Text>
              </TouchableOpacity>
            </>
          ) : (
            <Animated.View entering={ZoomIn.springify()}>
              <View style={styles.allSetRow}>
                <Text style={styles.allSetEmoji}>✨</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.allSetTitle}>{"You're all set on this device"}</Text>
                  <Text style={styles.allSetSub}>All {total} permissions granted — rules can enforce smoothly.</Text>
                </View>
              </View>
              <View style={styles.segmentRow}>
                {definitions.map((d, i) => (
                  <View
                    key={d.id}
                    style={[
                      styles.segment,
                      {
                        backgroundColor: segmentColor(true, i, total),
                        marginRight: i < total - 1 ? SEGMENT_GAP : 0,
                      },
                    ]}
                  />
                ))}
              </View>
              <TouchableOpacity style={styles.reviewBtn} onPress={() => setSheetOpen(true)}>
                <Text style={styles.reviewBtnText}>Review permissions</Text>
              </TouchableOpacity>
            </Animated.View>
          )}
        </LinearGradient>
      </Animated.View>
    </>
  );
}

function PremiumPermissionsModal({
  visible,
  onClose,
  definitions,
  statusById,
  loading,
  onRefresh,
}: {
  visible: boolean;
  onClose: () => void;
  definitions: ParentDevicePermissionDefinition[];
  statusById: Record<string, boolean>;
  loading: boolean;
  onRefresh: () => void;
}) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={modalStyles.backdrop}>
        <Animated.View entering={FadeIn} style={modalStyles.sheet}>
          <LinearGradient colors={['#FFFCF9', '#F0FDF4']} style={modalStyles.sheetGrad}>
            <Text style={modalStyles.title}>This device</Text>
            <Text style={modalStyles.sub}>
              Short checklist — grant each once per install. Your child rules live in your account; Android still needs
              local access.
            </Text>

            <TouchableOpacity style={modalStyles.refreshBtn} onPress={onRefresh}>
              <Text style={modalStyles.refreshText}>{loading ? 'Checking…' : '↻ Refresh status'}</Text>
            </TouchableOpacity>

            <ScrollView style={modalStyles.list} showsVerticalScrollIndicator={false}>
              {definitions.map((perm, i) => {
                const ok = !!statusById[perm.id];
                return (
                  <Animated.View key={perm.id} entering={FadeInDown.delay(i * 40)} style={modalStyles.rowBlock}>
                    <View style={modalStyles.rowTop}>
                      <Text style={modalStyles.rowIcon}>{perm.icon}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={modalStyles.rowTitle}>{perm.title}</Text>
                        <Text style={modalStyles.rowDesc}>{perm.description}</Text>
                      </View>
                      <View style={[modalStyles.pill, ok ? modalStyles.pillOk : modalStyles.pillNeed]}>
                        {loading ? (
                          <ActivityIndicator size="small" color={COLORS.parent.primary} />
                        ) : (
                          <Text style={[modalStyles.pillText, ok ? modalStyles.pillTextOk : modalStyles.pillTextNeed]}>
                            {ok ? 'On' : 'Off'}
                          </Text>
                        )}
                      </View>
                    </View>
                    {!loading && !ok ? (
                      <TouchableOpacity
                        style={modalStyles.grantWide}
                        onPress={() => void Promise.resolve(perm.grantFn()).then(onRefresh)}
                      >
                        <Text style={modalStyles.grantText}>Grant · open settings</Text>
                      </TouchableOpacity>
                    ) : null}
                  </Animated.View>
                );
              })}
            </ScrollView>

            <TouchableOpacity style={modalStyles.closeBtn} onPress={onClose}>
              <Text style={modalStyles.closeBtnText}>Done</Text>
            </TouchableOpacity>
          </LinearGradient>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: SPACING[5] },
  card: {
    borderRadius: 18,
    padding: SPACING[4],
    borderWidth: 1,
    borderColor: 'rgba(92,61,46,0.12)',
  },
  preHint: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: COLORS.parent.textSecondary,
    marginBottom: SPACING[3],
    lineHeight: 17,
  },
  segmentRow: {
    flexDirection: 'row',
    marginBottom: SPACING[2],
  },
  segment: {
    flex: 1,
    height: 8,
    borderRadius: 5,
  },
  progressTrack: {
    height: 6,
    borderRadius: 6,
    backgroundColor: 'rgba(92,61,46,0.08)',
    overflow: 'hidden',
    marginBottom: SPACING[4],
  },
  progressFill: {
    height: '100%',
    borderRadius: 6,
  },
  ctaOuter: {
    borderRadius: 14,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#991B1B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 8,
  },
  ctaGrad: {
    paddingVertical: SPACING[4],
    paddingHorizontal: SPACING[4],
    alignItems: 'center',
  },
  ctaTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 17,
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  ctaSub: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: 'rgba(255,255,255,0.88)',
    marginTop: 4,
  },
  badgePulse: {
    marginTop: SPACING[3],
  },
  badgeInner: {
    borderRadius: 12,
    padding: SPACING[3],
    borderWidth: 1,
    borderColor: 'rgba(220,38,38,0.25)',
  },
  badgeText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: COLORS.parent.textPrimary,
    lineHeight: 17,
    textAlign: 'center',
  },
  troubleshootLink: {
    marginTop: SPACING[3],
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: COLORS.parent.primary,
    textAlign: 'center',
  },
  allSetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[3],
    marginBottom: SPACING[4],
  },
  allSetEmoji: { fontSize: 36 },
  allSetTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 17,
    color: COLORS.parent.textPrimary,
  },
  allSetSub: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: COLORS.parent.textSecondary,
    marginTop: 4,
    lineHeight: 17,
  },
  reviewBtn: {
    alignSelf: 'center',
    marginTop: SPACING[2],
    paddingVertical: SPACING[2],
    paddingHorizontal: SPACING[4],
  },
  reviewBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    color: COLORS.parent.primary,
  },
});

const modalStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    overflow: 'hidden',
    maxHeight: '88%',
  },
  sheetGrad: {
    padding: SPACING[5],
    paddingBottom: SPACING[8],
  },
  title: {
    fontFamily: 'Inter_700Bold',
    fontSize: 22,
    color: COLORS.parent.textPrimary,
  },
  sub: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    color: COLORS.parent.textSecondary,
    marginTop: SPACING[2],
    lineHeight: 19,
  },
  refreshBtn: { alignSelf: 'flex-start', marginTop: SPACING[3], marginBottom: SPACING[2] },
  refreshText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    color: COLORS.parent.primary,
  },
  list: { maxHeight: 420 },
  rowBlock: {
    paddingVertical: SPACING[3],
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(92,61,46,0.08)',
  },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING[2],
  },
  rowIcon: { fontSize: 22, width: 32, textAlign: 'center', marginTop: 2 },
  rowTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
    color: COLORS.parent.textPrimary,
  },
  rowDesc: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: COLORS.parent.textMuted,
    marginTop: 2,
    lineHeight: 16,
  },
  pill: {
    minWidth: 44,
    paddingHorizontal: SPACING[2],
    paddingVertical: 6,
    borderRadius: 10,
    alignItems: 'center',
  },
  pillOk: { backgroundColor: 'rgba(16,185,129,0.15)' },
  pillNeed: { backgroundColor: 'rgba(248,113,113,0.15)' },
  pillText: { fontFamily: 'Inter_600SemiBold', fontSize: 11 },
  pillTextOk: { color: '#059669' },
  pillTextNeed: { color: '#B91C1C' },
  grantWide: {
    marginTop: SPACING[2],
    marginLeft: 40,
    backgroundColor: COLORS.parent.primary,
    paddingVertical: SPACING[2],
    paddingHorizontal: SPACING[4],
    borderRadius: 10,
    alignItems: 'center',
  },
  grantText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: '#FFFFFF',
  },
  closeBtn: {
    marginTop: SPACING[4],
    backgroundColor: COLORS.parent.textPrimary,
    borderRadius: 14,
    paddingVertical: SPACING[4],
    alignItems: 'center',
  },
  closeBtnText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 16,
    color: '#FFFFFF',
  },
});
