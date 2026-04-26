/**
 * Family members roster — stack screen (not RN Modal) so the parent shell gradient + tab bar stay visible.
 */

import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  MyFamilyListItem,
  FamilyChildNameRef,
  FamilyMemberSummary,
} from '@parentingmykid/shared-types';
import { COLORS } from '../../../src/constants/colors';
import { Spacing, Shadow } from '../../../src/constants/spacing';
import { Typography } from '../../../src/constants/typography';
import { colorWithAlpha } from '../../../src/utils/colorAlpha';
import {
  formatChildRelationLine,
  formatMemberRelation,
} from '../../../src/utils/familyMemberRelation';
import { API_ENDPOINTS } from '../../../src/constants/api';
import { apiClient } from '../../../src/services/api.client';
import { useAuthStore } from '../../../src/store/auth.store';
import { ParentHouseholdSwitcherCard } from '../../../src/components/parent/ParentHouseholdSwitcherCard';

export default function FamilyMembersScreen() {
  const navigation = useNavigation();
  const params = useLocalSearchParams<{ familyId: string | string[] }>();
  const familyId = Array.isArray(params.familyId) ? params.familyId[0] : params.familyId;

  const user = useAuthStore((s) => s.user);
  const currentUserId = user?.id ?? '';

  const [item, setItem] = useState<MyFamilyListItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!familyId) {
      setLoading(false);
      setErr('Missing family.');
      return;
    }
    setErr(null);
    setLoading(true);
    try {
      const { data } = await apiClient.get<MyFamilyListItem[]>(API_ENDPOINTS.families.mine);
      const f = data.find((x) => x.id === familyId) ?? null;
      setItem(f);
      if (!f) setErr('This family was not found.');
    } catch {
      setErr("We couldn't load this family. Try again.");
    } finally {
      setLoading(false);
    }
  }, [familyId]);

  useEffect(() => {
    void load();
  }, [load]);

  const goBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      router.replace('/(parent)/family-space');
    }
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={goBack}
          style={styles.backBtn}
          hitSlop={12}
          accessibilityLabel="Back"
        >
          <Ionicons name="chevron-back" size={26} color={COLORS.parent.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.topTitle} numberOfLines={2}>
          {item?.name ?? 'Family members'}
        </Text>
        <View style={styles.backBtn} />
      </View>

      <ParentHouseholdSwitcherCard
        onFamilySelected={(id) => router.setParams({ familyId: id })}
      />

      {loading && (
        <View style={styles.loadWrap}>
          <ActivityIndicator size="small" color={COLORS.parent.primary} />
        </View>
      )}

      {err && !loading && <Text style={styles.errText}>{err}</Text>}

      {!loading && !err && item && currentUserId && (
        <ScrollView
          contentContainerStyle={styles.body}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.rosterSection}>Adults & caregivers</Text>
          {item.members.map((m: FamilyMemberSummary) => {
            const rel = formatMemberRelation(m, currentUserId);
            return (
              <View key={m.userId} style={styles.rosterRow}>
                <View style={styles.rosterAvatar}>
                  <Ionicons name="person" size={20} color={COLORS.parent.primary} />
                </View>
                <View style={styles.rosterText}>
                  <Text style={styles.rosterName}>{rel.title}</Text>
                  <Text style={styles.rosterMeta}>{rel.relationLine}</Text>
                </View>
              </View>
            );
          })}
          {item.children.length > 0 && (
            <>
              <Text style={[styles.rosterSection, styles.rosterSectionSpaced]}>Children</Text>
              {item.children.map((c: FamilyChildNameRef) => (
                <View key={c.id} style={styles.rosterRow}>
                  <View style={styles.rosterAvatar}>
                    <Ionicons name="happy-outline" size={20} color={COLORS.parent.secondary} />
                  </View>
                  <View style={styles.rosterText}>
                    <Text style={styles.rosterName}>{c.name}</Text>
                    <Text style={styles.rosterMeta}>{formatChildRelationLine()}</Text>
                  </View>
                </View>
              ))}
            </>
          )}
        </ScrollView>
      )}

      {!loading && !err && item && !currentUserId && (
        <Text style={styles.errText}>Sign in to see relationships.</Text>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: 'transparent' },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.screenPadding,
    marginBottom: Spacing.sm,
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
  loadWrap: { paddingVertical: 24, alignItems: 'center' },
  errText: {
    fontFamily: Typography.fonts.interRegular,
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.parent.textSecondary,
    paddingHorizontal: Spacing.screenPadding,
  },
  body: { paddingHorizontal: Spacing.screenPadding, paddingBottom: 32 },
  rosterSection: {
    fontFamily: Typography.fonts.interSemiBold,
    fontSize: 12,
    color: COLORS.parent.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 10,
  },
  rosterSectionSpaced: { marginTop: Spacing.lg },
  rosterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    backgroundColor: COLORS.parent.surfaceSolid,
    borderRadius: 14,
    padding: 12,
    ...Shadow.sm,
  },
  rosterAvatar: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colorWithAlpha(COLORS.parent.primary, 0.1),
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  rosterText: { flex: 1 },
  rosterName: {
    fontFamily: Typography.fonts.interSemiBold,
    fontSize: 16,
    color: COLORS.parent.textPrimary,
  },
  rosterMeta: {
    fontFamily: Typography.fonts.interRegular,
    fontSize: 13,
    lineHeight: 18,
    color: COLORS.parent.textSecondary,
    marginTop: 2,
  },
});
