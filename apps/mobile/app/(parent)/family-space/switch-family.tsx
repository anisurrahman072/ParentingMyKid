/**
 * Pushed route (not a React Native Modal) so the parent tab bar + shell gradient stay visible.
 */

import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, type Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { MyFamilyListItem } from '@parentingmykid/shared-types';
import { COLORS } from '../../../src/constants/colors';
import { Spacing, Shadow } from '../../../src/constants/spacing';
import { Typography } from '../../../src/constants/typography';
import { API_ENDPOINTS } from '../../../src/constants/api';
import { apiClient } from '../../../src/services/api.client';
import { useFamilyStore } from '../../../src/store/family.store';
import { formatMyRoleInFamily } from '../../../src/utils/familyMemberRelation';
import { ParentPrimaryButton } from '../../../src/components/parent/ui/ParentPrimaryButton';

const FAMILY_SPACE_HREF: Href = '/(parent)/family-space';

export default function SwitchFamilyScreen() {
  const navigation = useNavigation();
  const activeFamilyId = useFamilyStore((s) => s.activeFamilyId);
  const setActiveFamilyId = useFamilyStore((s) => s.setActiveFamilyId);

  const [families, setFamilies] = useState<MyFamilyListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setErr(null);
    setLoading(true);
    try {
      const { data } = await apiClient.get<MyFamilyListItem[]>(API_ENDPOINTS.families.mine);
      setFamilies(data);
    } catch {
      setErr("We couldn't load your families. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const goBackToFamilySpace = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      router.replace(FAMILY_SPACE_HREF);
    }
  };

  const onPick = (id: string) => {
    if (id === activeFamilyId) {
      goBackToFamilySpace();
      return;
    }
    setActiveFamilyId(id);
    goBackToFamilySpace();
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={goBackToFamilySpace}
          style={styles.backBtn}
          hitSlop={12}
          accessibilityLabel="Back"
        >
          <Ionicons name="chevron-back" size={26} color={COLORS.parent.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.topTitle} numberOfLines={1}>
          Switch family
        </Text>
        <View style={styles.backBtn} />
      </View>

      <Text style={styles.sub}>
        Choose which family this page is for. Tiles and actions follow the family you select.
      </Text>

      {loading && (
        <View style={styles.loadWrap}>
          <ActivityIndicator size="small" color={COLORS.parent.primary} />
        </View>
      )}

      {err && !loading && (
        <View style={styles.errBox}>
          <Text style={styles.errText}>{err}</Text>
          <ParentPrimaryButton label="Try again" onPress={() => void load()} />
        </View>
      )}

      <ScrollView
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {!loading && !err &&
          families.map((f) => {
            const isActive = f.id === activeFamilyId;
            return (
              <Pressable
                key={f.id}
                onPress={() => onPick(f.id)}
                style={({ pressed }) => [styles.row, pressed && { opacity: 0.9 }]}
              >
                <Ionicons
                  name="home"
                  size={22}
                  color={isActive ? COLORS.parent.primary : COLORS.parent.textMuted}
                  style={styles.rowIcon}
                />
                <View style={styles.rowText}>
                  <Text
                    style={[styles.rowName, isActive && styles.rowNameActive]}
                    numberOfLines={2}
                  >
                    {f.name}
                  </Text>
                  <Text style={styles.rowMeta} numberOfLines={1}>
                    {formatMyRoleInFamily(f.myRole)}
                  </Text>
                </View>
                {isActive && (
                  <Ionicons name="checkmark-circle" size={24} color={COLORS.parent.primary} />
                )}
              </Pressable>
            );
          })}
      </ScrollView>
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
  sub: {
    fontFamily: Typography.fonts.interRegular,
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.parent.textSecondary,
    paddingHorizontal: Spacing.screenPadding,
    marginBottom: Spacing.md,
  },
  loadWrap: { paddingVertical: 24, alignItems: 'center' },
  errBox: {
    paddingHorizontal: Spacing.screenPadding,
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  errText: {
    fontFamily: Typography.fonts.interRegular,
    fontSize: 14,
    color: COLORS.parent.textSecondary,
  },
  body: { paddingHorizontal: Spacing.screenPadding, paddingBottom: 32 },
  row: {
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
  rowIcon: { marginRight: 12 },
  rowText: { flex: 1, minWidth: 0 },
  rowName: {
    fontFamily: Typography.fonts.interSemiBold,
    fontSize: 16,
    color: COLORS.parent.textPrimary,
  },
  rowNameActive: { fontFamily: Typography.fonts.interBold },
  rowMeta: {
    fontFamily: Typography.fonts.interRegular,
    fontSize: 13,
    color: COLORS.parent.textMuted,
    marginTop: 2,
  },
});
