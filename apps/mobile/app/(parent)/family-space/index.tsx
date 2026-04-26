/**
 * Family Space — parent hub for “our household” in the app.
 * Multi-family switcher, premium members CTA, and feature tiles (scoped to selected family in UI).
 */

import type { ComponentProps } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  useWindowDimensions,
  Modal,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { isAxiosError } from 'axios';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, type Href } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { MyFamilyListItem, CreateFamilyRequest } from '@parentingmykid/shared-types';
import { COLORS } from '../../../src/constants/colors';
import { Spacing, Shadow } from '../../../src/constants/spacing';
import { Typography } from '../../../src/constants/typography';
import { colorWithAlpha } from '../../../src/utils/colorAlpha';
import { formatMyRoleInFamily } from '../../../src/utils/familyMemberRelation';
import { API_ENDPOINTS } from '../../../src/constants/api';
import { apiClient } from '../../../src/services/api.client';
import { useAuthStore } from '../../../src/store/auth.store';
import { useFamilyStore } from '../../../src/store/family.store';
import { ParentPrimaryButton } from '../../../src/components/parent/ui/ParentPrimaryButton';
import { LoadingComponent } from '../../../src/components/parent/ui/LoadingComponent';
import { possessiveShortFamilyTitle } from '../../../src/utils/familyTitle';

type RouteTile = {
  kind: 'route';
  key: string;
  href: Href;
  title: string;
  subtitle: string;
  icon: ComponentProps<typeof Ionicons>['name'];
  accent: string;
};

type MembersTile = {
  kind: 'members';
  key: string;
  title: string;
  subtitle: string;
  icon: ComponentProps<typeof Ionicons>['name'];
  accent: string;
};

const ROUTE_TILES: RouteTile[] = [
  {
    kind: 'route',
    key: 'add-child',
    href: '/(parent)/family-space/add-child',
    title: 'Add a child',
    subtitle: 'New profile & PIN',
    icon: 'person-add-outline',
    accent: COLORS.parent.primary,
  },
  {
    kind: 'route',
    key: 'chat',
    href: { pathname: '/(parent)/chat', params: { from: 'family-space' } },
    title: 'Family chat',
    subtitle: 'One place for your threads',
    icon: 'chatbubbles-outline',
    accent: COLORS.parent.primary,
  },
  {
    kind: 'route',
    key: 'memory',
    href: { pathname: '/(parent)/memory', params: { from: 'family-space' } },
    title: 'Memories',
    subtitle: 'Photos & milestones',
    icon: 'images-outline',
    accent: '#EC4899',
  },
  {
    kind: 'route',
    key: 'community',
    href: { pathname: '/(parent)/community', params: { from: 'family-space' } },
    title: 'Community',
    subtitle: 'Parents like you',
    icon: 'people-outline',
    accent: COLORS.parent.secondary,
  },
  {
    kind: 'route',
    key: 'finance',
    href: { pathname: '/(parent)/finance', params: { from: 'family-space' } },
    title: 'Family finance',
    subtitle: 'Allowance & goals',
    icon: 'wallet-outline',
    accent: COLORS.parent.success,
  },
  {
    kind: 'route',
    key: 'nutrition',
    href: { pathname: '/(parent)/nutrition', params: { from: 'family-space' } },
    title: 'Nutrition',
    subtitle: 'Meals & habits',
    icon: 'restaurant-outline',
    accent: COLORS.parent.warning,
  },
  {
    kind: 'route',
    key: 'pair',
    href: '/(parent)/settings/add-device',
    title: 'Pair a device',
    subtitle: "Link a child's phone or tablet",
    icon: 'phone-portrait-outline',
    accent: COLORS.parent.primaryDark,
  },
];

const MEMBERS_TILE: MembersTile = {
  kind: 'members',
  key: 'family-members',
  title: 'Family members',
  subtitle: 'How everyone relates to you',
  icon: 'heart-outline',
  accent: '#C026D3',
};

const FAMILY_SCHEDULE_TILE: RouteTile = {
  kind: 'route',
  key: 'family-schedule',
  href: '/(parent)/family-space/calendar',
  title: 'Family schedule',
  subtitle: 'View and manage events',
  icon: 'calendar-outline',
  accent: '#0EA5E9',
};

const GRID_TILES: Array<RouteTile | MembersTile> = [
  MEMBERS_TILE,
  FAMILY_SCHEDULE_TILE,
  ...ROUTE_TILES,
];

const CARD_RADIUS = 20;

export default function FamilySpaceScreen() {
  const { width } = useWindowDimensions();
  const pad = Spacing.screenPadding;
  const gap = Spacing.md;
  const colW = (width - pad * 2 - gap) / 2;

  const activeFamilyId = useFamilyStore((s) => s.activeFamilyId);
  const setActiveFamilyId = useFamilyStore((s) => s.setActiveFamilyId);

  const [families, setFamilies] = useState<MyFamilyListItem[]>([]);
  const [loadState, setLoadState] = useState<'loading' | 'ok' | 'err'>('loading');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedFamilyId, setSelectedFamilyId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [newFamilyName, setNewFamilyName] = useState('');
  const [createBusy, setCreateBusy] = useState(false);
  const [createErr, setCreateErr] = useState<string | null>(null);
  const [nudgeSecondFamilyOpen, setNudgeSecondFamilyOpen] = useState(false);

  const loadFamilies = useCallback(async (opts?: { quiet?: boolean }) => {
    if (!opts?.quiet) {
      setLoadState('loading');
      setLoadError(null);
    }
    try {
      const { data } = await apiClient.get<MyFamilyListItem[]>(API_ENDPOINTS.families.mine);
      setFamilies(data);
      setLoadState('ok');
    } catch {
      if (!opts?.quiet) {
        setLoadState('err');
        setLoadError(
          "We couldn't load your households. Pull to try again or check your connection.",
        );
      }
    }
  }, []);

  useEffect(() => {
    loadFamilies();
  }, [loadFamilies]);

  useEffect(() => {
    if (families.length === 0) {
      setSelectedFamilyId(null);
      return;
    }
    setSelectedFamilyId((prev) => {
      if (activeFamilyId && families.some((f) => f.id === activeFamilyId)) {
        return activeFamilyId;
      }
      if (prev && families.some((f) => f.id === prev)) {
        return prev;
      }
      return families[0]!.id;
    });
  }, [families, activeFamilyId]);

  const selected = useMemo(
    () => families.find((f) => f.id === selectedFamilyId) ?? null,
    [families, selectedFamilyId],
  );

  const currentFamilyTitle = useMemo(
    () => (selected ? possessiveShortFamilyTitle(selected.name) : ''),
    [selected],
  );

  const appendFamilyId = useAuthStore((s) => s.appendFamilyId);
  const refreshAccessToken = useAuthStore((s) => s.refreshAccessToken);

  const openCreateFamily = useCallback(() => {
    setCreateErr(null);
    setNewFamilyName('');
    setCreateOpen(true);
  }, []);

  const openSwitchHousehold = useCallback(() => {
    if (families.length > 1) {
      router.push('/(parent)/family-space/switch-family');
      return;
    }
    setNudgeSecondFamilyOpen(true);
  }, [families.length]);

  const closeNudgeAndCreateFamily = useCallback(() => {
    setNudgeSecondFamilyOpen(false);
    openCreateFamily();
  }, [openCreateFamily]);

  const submitNewFamily = useCallback(async () => {
    const name = newFamilyName.trim();
    if (!name) {
      setCreateErr('Please enter a name for this household.');
      return;
    }
    setCreateErr(null);
    setCreateBusy(true);
    try {
      const { data } = await apiClient.post<MyFamilyListItem>(API_ENDPOINTS.families.mine, {
        name,
      } satisfies CreateFamilyRequest);
      await appendFamilyId(data.id);
      await refreshAccessToken();
      setCreateOpen(false);
      setNewFamilyName('');
      await loadFamilies({ quiet: true });
    } catch (e) {
      if (isAxiosError(e)) {
        const d = e.response?.data as { message?: string | string[] } | undefined;
        const m = d?.message;
        const out = Array.isArray(m) ? m[0] : m;
        setCreateErr(String(out || e.message || 'Could not create this household.'));
      } else {
        setCreateErr('Could not create this household. Try again.');
      }
    } finally {
      setCreateBusy(false);
    }
  }, [appendFamilyId, loadFamilies, newFamilyName, refreshAccessToken]);

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          hitSlop={12}
          accessibilityLabel="Back"
        >
          <Ionicons name="chevron-back" size={26} color={COLORS.parent.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.topTitle} numberOfLines={1}>
          Family space
        </Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingHorizontal: pad, paddingBottom: 32 }]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.lead} numberOfLines={1}>
          Memories, meals, and more—in one place.
        </Text>

        {loadState === 'loading' && (
          <>
            <View style={styles.householdsSection}>
              <LoadingComponent variant="compact" accessibilityLabel="Loading your households" />
            </View>
            <LoadingComponent variant="premiumCard" accessibilityLabel="Loading current family" />
          </>
        )}

        {loadState === 'err' && (
          <View style={styles.warnBox}>
            <Text style={styles.warnText}>{loadError}</Text>
            <ParentPrimaryButton label="Try again" onPress={() => loadFamilies()} />
          </View>
        )}

        {loadState === 'ok' && (
          <View style={styles.householdsSection}>
            <TouchableOpacity
              style={styles.createNewFamilyCtaPress}
              onPress={openCreateFamily}
              activeOpacity={0.88}
              accessibilityRole="button"
              accessibilityLabel="Create new family"
            >
              <LinearGradient
                colors={[...COLORS.parent.gradientCreateFamilyCta]}
                locations={[0, 0.34, 0.68, 1]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.createNewFamilyCtaGradient}
              >
                <Ionicons name="add-circle" size={22} color={COLORS.parent.primary} />
                <View style={styles.createNewFamilyCtaText}>
                  <Text style={styles.createNewFamilyCtaTitle}>Create new family</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={COLORS.parent.textSecondary} />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}

        {loadState === 'ok' && selected && (
          <>
            <LinearGradient
              colors={['#2563EB', '#0EA5E9', '#38BDF8']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.premiumFrame}
            >
              <View style={styles.premiumInner}>
                <View style={styles.premiumRow}>
                  <View style={styles.premiumTitles}>
                    <Text style={styles.premiumKicker}>Current family</Text>
                    <Text style={styles.premiumTitle} numberOfLines={2}>
                      {currentFamilyTitle}
                    </Text>
                    <Text style={styles.premiumSub}>
                      {memberCountLine(selected)} · Your role:{' '}
                      {formatMyRoleInFamily(selected.myRole)}
                    </Text>
                  </View>
                  <View style={styles.premiumIconBubble}>
                    <Ionicons name="people" size={28} color={COLORS.parent.primary} />
                  </View>
                </View>
                <ParentPrimaryButton
                  label="Switch to another family"
                  onPress={openSwitchHousehold}
                />
              </View>
            </LinearGradient>
          </>
        )}

        <View style={styles.grid}>
          {GRID_TILES.map((item) => {
            if (item.kind === 'members') {
              return (
                <TouchableOpacity
                  key={item.key}
                  style={[styles.tile, { width: colW }]}
                  onPress={() => {
                    if (selected) {
                      router.push({
                        pathname: '/(parent)/family-space/members',
                        params: { familyId: selected.id },
                      });
                    }
                  }}
                  activeOpacity={0.92}
                >
                  <View
                    style={[
                      styles.iconWrap,
                      { backgroundColor: colorWithAlpha(item.accent, 0.12) },
                    ]}
                  >
                    <Ionicons name={item.icon} size={24} color={item.accent} />
                  </View>
                  <Text style={styles.tileTitle} numberOfLines={2}>
                    {item.title}
                  </Text>
                  <Text style={styles.tileSub} numberOfLines={2}>
                    {item.subtitle}
                  </Text>
                </TouchableOpacity>
              );
            }
            return (
              <TouchableOpacity
                key={item.key}
                style={[styles.tile, { width: colW }]}
                onPress={() => router.push(item.href)}
                activeOpacity={0.92}
              >
                <View
                  style={[styles.iconWrap, { backgroundColor: colorWithAlpha(item.accent, 0.12) }]}
                >
                  <Ionicons name={item.icon} size={24} color={item.accent} />
                </View>
                <Text style={styles.tileTitle} numberOfLines={2}>
                  {item.title}
                </Text>
                <Text style={styles.tileSub} numberOfLines={2}>
                  {item.subtitle}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      <Modal
        visible={nudgeSecondFamilyOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setNudgeSecondFamilyOpen(false)}
        style={styles.nudgeModalRoot}
      >
        <View style={styles.nudgeOverlay}>
          <Pressable style={styles.nudgeBackdrop} onPress={() => setNudgeSecondFamilyOpen(false)} />
          <View style={styles.nudgeCardOuter} pointerEvents="box-none">
            <View style={styles.nudgeCard}>
              <LinearGradient
                colors={['#2563EB', '#0EA5E9', '#38BDF8']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.nudgeIconBlob}
              >
                <Ionicons name="people" size={30} color="#FFFFFF" />
              </LinearGradient>
              <View style={styles.nudgeTitleRule} />
              <Text style={styles.nudgeTitle}>One family for now</Text>
              <Text style={styles.nudgeBody}>
                Add another family with “Create new family” on this page. You can switch between
                them with the same button.
              </Text>
              <TouchableOpacity
                onPress={closeNudgeAndCreateFamily}
                style={styles.nudgeCtaPress}
                activeOpacity={0.9}
                accessibilityRole="button"
                accessibilityLabel="Create new family"
              >
                <LinearGradient
                  colors={[...COLORS.parent.gradientCtaBlue]}
                  start={{ x: 0, y: 0.5 }}
                  end={{ x: 1, y: 0.5 }}
                  style={styles.nudgeCtaGradient}
                >
                  <Ionicons name="add-circle-outline" size={22} color="#FFFFFF" />
                  <Text style={styles.nudgeCtaText}>Create new family</Text>
                </LinearGradient>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setNudgeSecondFamilyOpen(false)}
                style={styles.nudgeDismiss}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel="Not now"
              >
                <Text style={styles.nudgeDismissText}>Not now</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={createOpen}
        animationType="fade"
        transparent
        onRequestClose={() => !createBusy && setCreateOpen(false)}
        style={styles.createModalRoot}
      >
        <KeyboardAvoidingView
          style={styles.createOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.createWrap}>
            <Pressable
              style={styles.createBackdrop}
              onPress={() => !createBusy && setCreateOpen(false)}
            />
            <View style={styles.createSheet}>
              <Text style={styles.createSheetTitle}>New household</Text>
              <Text style={styles.createSheetSub}>
                Give it a name you’ll recognize. You can add children to it from &quot;Add a
                child&quot; on this page.
              </Text>
              <TextInput
                value={newFamilyName}
                onChangeText={setNewFamilyName}
                placeholder="e.g. With the kids (week on)"
                placeholderTextColor={COLORS.parent.textMuted}
                style={styles.createInput}
                autoCapitalize="words"
                autoCorrect
                maxLength={80}
                editable={!createBusy}
              />
              {createErr && <Text style={styles.createErr}>{createErr}</Text>}
              <View style={styles.createActions}>
                <TouchableOpacity
                  onPress={() => !createBusy && setCreateOpen(false)}
                  style={styles.createCancel}
                  activeOpacity={0.85}
                >
                  <Text style={styles.createCancelText}>Cancel</Text>
                </TouchableOpacity>
                <View style={styles.createPrimaryWrap}>
                  <ParentPrimaryButton
                    label="Create family"
                    onPress={submitNewFamily}
                    disabled={createBusy}
                    loading={createBusy}
                  />
                </View>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

function memberCountLine(f: MyFamilyListItem): string {
  const a = f.members.length;
  const c = f.children.length;
  if (a === 0 && c === 0) return 'No members yet';
  const parts: string[] = [];
  if (a) parts.push(`${a} adult${a === 1 ? '' : 's'}`);
  if (c) parts.push(`${c} child${c === 1 ? '' : 'ren'}`);
  return parts.join(' · ');
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: 'transparent' },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.screenPadding,
    marginBottom: 0,
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  topTitle: {
    flex: 1,
    textAlign: 'center',
    fontFamily: Typography.fonts.interBold,
    fontSize: 18,
    color: COLORS.parent.textPrimary,
    letterSpacing: -0.3,
  },
  scroll: { paddingTop: 0 },
  lead: {
    fontFamily: Typography.fonts.interRegular,
    fontSize: 15,
    lineHeight: 20,
    color: COLORS.parent.textSecondary,
    marginBottom: Spacing.base,
  },
  warnBox: {
    backgroundColor: COLORS.parent.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.parent.surfaceBorder,
    padding: Spacing.base,
    marginBottom: Spacing.lg,
    gap: Spacing.md,
  },
  warnText: {
    fontFamily: Typography.fonts.interRegular,
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.parent.textSecondary,
  },
  /** Always visible (even with one home) so create + switch are never hidden. */
  householdsSection: { marginBottom: Spacing.lg },
  createNewFamilyCtaPress: {
    borderRadius: 16,
    overflow: 'hidden',
    ...Shadow.sm,
  },
  createNewFamilyCtaGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.72)',
  },
  createNewFamilyCtaText: { flex: 1, marginLeft: 10, marginRight: 6 },
  createNewFamilyCtaTitle: {
    fontFamily: Typography.fonts.interBold,
    fontSize: 16,
    color: COLORS.parent.textPrimary,
  },
  premiumFrame: {
    borderRadius: 20,
    padding: 2,
    marginBottom: Spacing.lg,
    ...Shadow.md,
  },
  premiumInner: {
    backgroundColor: COLORS.parent.surfaceSolid,
    borderRadius: 18,
    padding: Spacing.base,
  },
  premiumRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: Spacing.md },
  premiumTitles: { flex: 1, paddingRight: Spacing.sm },
  premiumKicker: {
    fontFamily: Typography.fonts.interSemiBold,
    fontSize: 12,
    letterSpacing: 0.2,
    color: COLORS.parent.textSecondary,
    marginBottom: 4,
  },
  premiumTitle: {
    fontFamily: Typography.fonts.interBold,
    fontSize: 20,
    lineHeight: 26,
    color: COLORS.parent.textPrimary,
    marginBottom: 6,
  },
  premiumSub: {
    fontFamily: Typography.fonts.interRegular,
    fontSize: 13,
    lineHeight: 18,
    color: COLORS.parent.textSecondary,
  },
  premiumIconBubble: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: colorWithAlpha(COLORS.parent.primary, 0.12),
    alignItems: 'center',
    justifyContent: 'center',
  },
  nudgeModalRoot: { margin: 0, flex: 1 },
  nudgeOverlay: { flex: 1, position: 'relative' },
  nudgeBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(10, 16, 28, 0.5)' },
  nudgeCardOuter: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 22,
    zIndex: 1,
  },
  nudgeCard: {
    backgroundColor: COLORS.parent.surfaceSolid,
    borderRadius: 24,
    paddingVertical: 24,
    paddingHorizontal: 22,
    borderWidth: 1,
    borderColor: COLORS.parent.surfaceBorder,
    ...Shadow.lg,
  },
  nudgeIconBlob: {
    width: 68,
    height: 68,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 12,
  },
  nudgeTitleRule: {
    width: 40,
    height: 2,
    borderRadius: 1,
    backgroundColor: colorWithAlpha(COLORS.parent.primary, 0.22),
    alignSelf: 'center',
    marginBottom: 10,
  },
  nudgeTitle: {
    fontFamily: Typography.fonts.interBold,
    fontSize: 20,
    lineHeight: 26,
    textAlign: 'center',
    color: COLORS.parent.textPrimary,
    marginBottom: 8,
    letterSpacing: -0.4,
  },
  nudgeBody: {
    fontFamily: Typography.fonts.interRegular,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    color: COLORS.parent.textSecondary,
    marginBottom: 20,
  },
  nudgeCtaPress: {
    borderRadius: 16,
    marginBottom: 4,
    overflow: 'hidden',
    ...Shadow.md,
  },
  nudgeCtaGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
    paddingHorizontal: 18,
    borderRadius: 16,
    gap: 8,
  },
  nudgeCtaText: {
    color: '#FFFFFF',
    fontFamily: Typography.fonts.interBold,
    fontSize: 16,
    letterSpacing: -0.2,
  },
  nudgeDismiss: { alignItems: 'center', paddingVertical: 12 },
  nudgeDismissText: {
    fontFamily: Typography.fonts.interSemiBold,
    fontSize: 16,
    color: COLORS.parent.textSecondary,
  },
  createModalRoot: { margin: 0, flex: 1 },
  createOverlay: { flex: 1 },
  createWrap: { flex: 1, justifyContent: 'center', position: 'relative' },
  createBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
  createSheet: {
    marginHorizontal: Spacing.screenPadding,
    backgroundColor: COLORS.parent.surfaceSolid,
    borderRadius: 20,
    padding: Spacing.lg,
    ...Shadow.lg,
  },
  createSheetTitle: {
    fontFamily: Typography.fonts.interBold,
    fontSize: 20,
    color: COLORS.parent.textPrimary,
    marginBottom: 6,
  },
  createSheetSub: {
    fontFamily: Typography.fonts.interRegular,
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.parent.textSecondary,
    marginBottom: Spacing.md,
  },
  createInput: {
    borderWidth: 1,
    borderColor: COLORS.parent.surfaceBorder,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: Typography.fonts.interRegular,
    fontSize: 16,
    color: COLORS.parent.textPrimary,
    backgroundColor: '#FAFCFA',
  },
  createErr: {
    fontFamily: Typography.fonts.interRegular,
    fontSize: 13,
    color: COLORS.parent.danger,
    marginTop: 8,
  },
  createActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.lg,
    gap: 12,
  },
  createCancel: { paddingVertical: 12, paddingHorizontal: 4 },
  createCancelText: {
    fontFamily: Typography.fonts.interSemiBold,
    fontSize: 16,
    color: COLORS.parent.textSecondary,
  },
  createPrimaryWrap: { flex: 1, minWidth: 0 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md },
  tile: {
    backgroundColor: COLORS.parent.surfaceSolid,
    borderRadius: CARD_RADIUS,
    borderWidth: 0,
    padding: Spacing.base,
    marginBottom: 0,
    minHeight: 128,
    justifyContent: 'flex-start',
    ...Shadow.md,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  tileTitle: {
    fontFamily: Typography.fonts.interBold,
    fontSize: 15,
    lineHeight: 20,
    letterSpacing: -0.2,
    color: COLORS.parent.textPrimary,
    marginBottom: 4,
  },
  tileSub: {
    fontFamily: Typography.fonts.interRegular,
    fontSize: 12,
    lineHeight: 16,
    color: COLORS.parent.textMuted,
  },
});
