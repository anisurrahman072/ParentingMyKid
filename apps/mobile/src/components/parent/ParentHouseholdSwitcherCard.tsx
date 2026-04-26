import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Pressable,
  Modal,
  ActivityIndicator,
  type ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { MyFamilyListItem } from '@parentingmykid/shared-types';
import { useFamilyStore } from '../../store/family.store';
import { API_ENDPOINTS } from '../../constants/api';
import { apiClient } from '../../services/api.client';
import { COLORS } from '../../constants/colors';
import { Spacing, Shadow } from '../../constants/spacing';
import { Typography } from '../../constants/typography';
import { colorWithAlpha } from '../../utils/colorAlpha';
import { formatMyRoleInFamily } from '../../utils/familyMemberRelation';
import { possessiveShortFamilyTitle } from '../../utils/familyTitle';

export type ParentHouseholdSwitcherCardProps = {
  /** Extra TanStack query keys to invalidate after the active family changes */
  invalidateQueryKeysAfterSwitch?: readonly (readonly unknown[])[];
  /** Runs after the store updates (e.g. sync route params to the new family) */
  onFamilySelected?: (familyId: string) => void;
  /** Merged onto the outer card wrapper (e.g. custom vertical margins on one screen) */
  containerStyle?: ViewStyle;
};

export function ParentHouseholdSwitcherCard({
  invalidateQueryKeysAfterSwitch,
  onFamilySelected,
  containerStyle,
}: ParentHouseholdSwitcherCardProps) {
  const familyId = useFamilyStore((s) => s.activeFamilyId);
  const setActiveFamilyId = useFamilyStore((s) => s.setActiveFamilyId);
  const [switchModalOpen, setSwitchModalOpen] = useState(false);
  const queryClient = useQueryClient();

  const {
    data: families,
    isLoading: familiesLoading,
    isError: familiesErr,
    refetch: refetchFamilies,
  } = useQuery({
    queryKey: ['my-families'],
    queryFn: async () => {
      const { data } = await apiClient.get<MyFamilyListItem[]>(API_ENDPOINTS.families.mine);
      return data;
    },
    enabled: !!familyId,
  });

  const activeFamily = useMemo(
    () => (families && familyId ? families.find((f) => f.id === familyId) ?? null : null),
    [families, familyId],
  );

  const householdTitle = activeFamily
    ? possessiveShortFamilyTitle(activeFamily.name)
    : 'Your household';

  const onPickFamilyInModal = useCallback(
    (id: string) => {
      setActiveFamilyId(id);
      setSwitchModalOpen(false);
      onFamilySelected?.(id);
      void queryClient.invalidateQueries({ queryKey: ['my-families'] });
      for (const key of invalidateQueryKeysAfterSwitch ?? []) {
        void queryClient.invalidateQueries({ queryKey: key as readonly unknown[] });
      }
    },
    [invalidateQueryKeysAfterSwitch, onFamilySelected, queryClient, setActiveFamilyId],
  );

  if (!familyId) {
    return null;
  }

  return (
    <>
      <View style={[styles.householdCardOuter, containerStyle]}>
        <LinearGradient
          colors={['#2563EB', '#0EA5E9', '#38BDF8']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.householdCardFrame}
        >
          <LinearGradient
            colors={['#FFFBF7', '#F5F9FF', '#EEF6FF']}
            locations={[0, 0.45, 1]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.householdCardInner}
          >
            <View style={styles.householdCardRow}>
              <View style={styles.householdIconBubble}>
                <Ionicons name="people" size={18} color={COLORS.parent.primary} />
              </View>
              <View style={styles.householdTextCol}>
                {familiesLoading && !activeFamily ? (
                  <Text style={styles.householdNameCompact}>Loading…</Text>
                ) : (
                  <Text style={styles.householdNameCompact} numberOfLines={1}>
                    {householdTitle}
                  </Text>
                )}
              </View>
              <TouchableOpacity
                onPress={() => setSwitchModalOpen(true)}
                style={styles.switchPill}
                activeOpacity={0.88}
                accessibilityRole="button"
                accessibilityLabel="Switch family"
              >
                <Text style={styles.switchPillText}>Switch</Text>
                <Ionicons name="swap-horizontal" size={14} color={COLORS.parent.primary} />
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </LinearGradient>
      </View>

      <Modal
        visible={switchModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setSwitchModalOpen(false)}
      >
        <View style={styles.switchModalRoot}>
          <Pressable style={styles.switchModalBackdrop} onPress={() => setSwitchModalOpen(false)} />
          <View style={styles.switchModalSheet} pointerEvents="box-none">
            <View style={styles.switchModalCard}>
              <Text style={styles.switchModalTitle}>Switch family</Text>
              <Text style={styles.switchModalSub}>
                Choose which household this screen is for.
              </Text>
              {familiesLoading ? (
                <View style={styles.switchModalLoad}>
                  <ActivityIndicator color={COLORS.parent.primary} />
                </View>
              ) : familiesErr ? (
                <View style={styles.switchModalErr}>
                  <Text style={styles.switchModalErrText}>
                    We couldn’t load your families. Check your connection.
                  </Text>
                  <TouchableOpacity
                    onPress={() => void refetchFamilies()}
                    style={styles.switchModalRetry}
                    accessibilityRole="button"
                    accessibilityLabel="Try again"
                  >
                    <Text style={styles.switchModalRetryText}>Try again</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <ScrollView
                  style={styles.switchModalList}
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                >
                  {(families ?? []).map((f) => {
                    const isActive = f.id === familyId;
                    return (
                      <Pressable
                        key={f.id}
                        onPress={() => onPickFamilyInModal(f.id)}
                        style={({ pressed }) => [styles.switchRow, pressed && { opacity: 0.92 }]}
                      >
                        <Ionicons
                          name="home"
                          size={22}
                          color={isActive ? COLORS.parent.primary : COLORS.parent.textMuted}
                          style={styles.switchRowIcon}
                        />
                        <View style={styles.switchRowText}>
                          <Text
                            style={[styles.switchRowName, isActive && styles.switchRowNameActive]}
                            numberOfLines={2}
                          >
                            {f.name}
                          </Text>
                          <Text style={styles.switchRowMeta} numberOfLines={1}>
                            {formatMyRoleInFamily(f.myRole)}
                          </Text>
                        </View>
                        {isActive ? (
                          <Ionicons name="checkmark-circle" size={24} color={COLORS.parent.primary} />
                        ) : null}
                      </Pressable>
                    );
                  })}
                </ScrollView>
              )}
              <TouchableOpacity
                onPress={() => setSwitchModalOpen(false)}
                style={styles.switchModalDismiss}
                accessibilityRole="button"
                accessibilityLabel="Close"
              >
                <Text style={styles.switchModalDismissText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  householdCardOuter: {
    alignSelf: 'stretch',
    width: '100%',
    paddingHorizontal: Spacing.screenPadding,
    marginBottom: 12,
  },
  householdCardFrame: {
    alignSelf: 'stretch',
    width: '100%',
    borderRadius: 14,
    padding: 2,
    ...Shadow.sm,
  },
  householdCardInner: {
    width: '100%',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    overflow: 'hidden',
  },
  householdCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  householdIconBubble: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: colorWithAlpha(COLORS.parent.primary, 0.12),
    alignItems: 'center',
    justifyContent: 'center',
  },
  householdTextCol: { flex: 1, minWidth: 0, justifyContent: 'center' },
  householdNameCompact: {
    fontFamily: Typography.fonts.interSemiBold,
    fontSize: 14,
    lineHeight: 18,
    color: COLORS.parent.text,
    letterSpacing: -0.15,
  },
  switchPill: {
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colorWithAlpha(COLORS.parent.primary, 0.45),
    backgroundColor: colorWithAlpha(COLORS.parent.primary, 0.08),
  },
  switchPillText: {
    fontFamily: Typography.fonts.interSemiBold,
    fontSize: 12,
    color: COLORS.parent.primary,
    letterSpacing: -0.1,
  },
  switchModalRoot: { flex: 1, justifyContent: 'center', position: 'relative' },
  switchModalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10, 16, 28, 0.5)',
  },
  switchModalSheet: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.screenPadding,
    zIndex: 1,
  },
  switchModalCard: {
    backgroundColor: COLORS.parent.surfaceSolid,
    borderRadius: 22,
    paddingVertical: 20,
    paddingHorizontal: 18,
    borderWidth: 1,
    borderColor: COLORS.parent.surfaceBorder,
    maxHeight: '72%',
    ...Shadow.lg,
  },
  switchModalTitle: {
    fontFamily: Typography.fonts.interBold,
    fontSize: 20,
    color: COLORS.parent.text,
    letterSpacing: -0.3,
    marginBottom: 6,
  },
  switchModalSub: {
    fontFamily: Typography.fonts.interRegular,
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.parent.textSecondary,
    marginBottom: 14,
  },
  switchModalLoad: { paddingVertical: 28, alignItems: 'center' },
  switchModalErr: { gap: 12, paddingVertical: 8 },
  switchModalErrText: {
    fontFamily: Typography.fonts.interRegular,
    fontSize: 14,
    color: COLORS.parent.textSecondary,
  },
  switchModalRetry: { alignSelf: 'flex-start', paddingVertical: 8 },
  switchModalRetryText: {
    fontFamily: Typography.fonts.interSemiBold,
    fontSize: 16,
    color: COLORS.parent.primary,
  },
  switchModalList: { maxHeight: 320 },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    backgroundColor: COLORS.parent.surfaceSolid,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.parent.surfaceBorder,
    ...Shadow.sm,
  },
  switchRowIcon: { marginRight: 12 },
  switchRowText: { flex: 1, minWidth: 0 },
  switchRowName: {
    fontFamily: Typography.fonts.interSemiBold,
    fontSize: 16,
    color: COLORS.parent.text,
  },
  switchRowNameActive: { fontFamily: Typography.fonts.interBold },
  switchRowMeta: {
    fontFamily: Typography.fonts.interRegular,
    fontSize: 13,
    color: COLORS.parent.textMuted,
    marginTop: 2,
  },
  switchModalDismiss: { alignItems: 'center', paddingTop: 14 },
  switchModalDismissText: {
    fontFamily: Typography.fonts.interSemiBold,
    fontSize: 16,
    color: COLORS.parent.textSecondary,
  },
});
