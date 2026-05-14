import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  TouchableOpacity,
  ScrollView,
  Alert,
  AppState,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../../../constants/colors';
import { SPACING } from '../../../constants/spacing';
import {
  hasAccessibilityPermission,
  hasOverlayPermission,
  requestAccessibilityPermission,
  requestOverlayPermission,
} from '../../../services/ParentalControl';

type Props = {
  visible: boolean;
  onClose: () => void;
  /** Called after Accessibility + overlay are both granted. */
  onAllGranted: () => void;
  onManualPackageEntry: () => void;
};

export function BlockAppsPermissionsSheet({
  visible,
  onClose,
  onAllGranted,
  onManualPackageEntry,
}: Props) {
  const insets = useSafeAreaInsets();
  const [a11y, setA11y] = useState(false);
  const [overlay, setOverlay] = useState(false);

  const refresh = useCallback(async () => {
    const [a, o] = await Promise.all([
      hasAccessibilityPermission(),
      hasOverlayPermission(),
    ]);
    setA11y(a);
    setOverlay(o);
  }, []);

  useEffect(() => {
    if (visible) void refresh();
  }, [visible, refresh]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active' && visible) void refresh();
    });
    return () => sub.remove();
  }, [visible, refresh]);

  async function handleContinue() {
    await refresh();
    const [a, o] = await Promise.all([
      hasAccessibilityPermission(),
      hasOverlayPermission(),
    ]);
    if (a && o) {
      onAllGranted();
      return;
    }
    Alert.alert(
      'Almost there',
      'Enable every item below for blocking to work on this device, then tap Continue again.',
    );
  }

  if (Platform.OS !== 'android') return null;

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={[styles.sheet, { paddingBottom: SPACING[5] + insets.bottom }]} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.sheetTitle}>Enable parental controls</Text>
          <Text style={styles.sheetSubtitle}>
            App blocking uses Accessibility (to detect opened apps) and Display over other apps (for the lock message).
            Turn both on for this phone, then continue.
          </Text>

          <ScrollView style={styles.sheetScroll} showsVerticalScrollIndicator={false}>
            <PermissionRow
              title="Accessibility service"
              description="Lets us detect when a blocked app opens."
              granted={a11y}
              onOpenSettings={() => void requestAccessibilityPermission()}
            />
            <PermissionRow
              title="Display over other apps"
              description="Shows a short message when something is blocked."
              granted={overlay}
              onOpenSettings={() => void requestOverlayPermission()}
            />
          </ScrollView>

          <TouchableOpacity style={styles.primaryBtn} onPress={() => void handleContinue()} activeOpacity={0.9}>
            <Text style={styles.primaryBtnText}>Continue</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.linkBtn} onPress={onManualPackageEntry}>
            <Text style={styles.linkBtnText}>Enter package name manually</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function PermissionRow({
  title,
  description,
  granted,
  onOpenSettings,
}: {
  title: string;
  description: string;
  granted: boolean;
  onOpenSettings: () => void;
}) {
  return (
    <View style={styles.permRow}>
      <View style={styles.permRowTop}>
        <Text style={styles.permTitle}>{title}</Text>
        <View style={[styles.badge, granted ? styles.badgeOk : styles.badgeNeed]}>
          <Text style={[styles.badgeText, granted ? styles.badgeTextOk : styles.badgeTextNeed]}>
            {granted ? 'Granted' : 'Needed'}
          </Text>
        </View>
      </View>
      <Text style={styles.permDesc}>{description}</Text>
      {!granted ? (
        <TouchableOpacity style={styles.openSettingsBtn} onPress={onOpenSettings}>
          <Text style={styles.openSettingsBtnText}>Open settings</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(44, 36, 32, 0.45)',
    justifyContent: 'center',
    paddingHorizontal: SPACING[5],
  },
  sheet: {
    backgroundColor: COLORS.parent.surfaceSolid,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(91, 61, 46, 0.12)',
    padding: SPACING[5],
    maxHeight: '88%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 12,
  },
  sheetScroll: { maxHeight: 340 },
  sheetTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 18,
    color: COLORS.parent.textPrimary,
    marginBottom: SPACING[2],
    textAlign: 'center',
  },
  sheetSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: COLORS.parent.textSecondary,
    lineHeight: 19,
    marginBottom: SPACING[4],
    textAlign: 'center',
  },
  permRow: {
    paddingVertical: SPACING[3],
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(92,61,46,0.08)',
  },
  permRowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  permTitle: {
    flex: 1,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: COLORS.parent.textPrimary,
    marginRight: SPACING[2],
  },
  permDesc: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: COLORS.parent.textMuted,
    lineHeight: 17,
  },
  badge: {
    paddingHorizontal: SPACING[2],
    paddingVertical: 3,
    borderRadius: 8,
  },
  badgeOk: { backgroundColor: 'rgba(5,150,105,0.12)' },
  badgeNeed: { backgroundColor: 'rgba(220,38,38,0.1)' },
  badgeText: { fontFamily: 'Inter_600SemiBold', fontSize: 11 },
  badgeTextOk: { color: COLORS.parent.success },
  badgeTextNeed: { color: COLORS.parent.danger },
  openSettingsBtn: {
    alignSelf: 'flex-start',
    marginTop: SPACING[2],
    backgroundColor: COLORS.parent.primary,
    paddingHorizontal: SPACING[4],
    paddingVertical: SPACING[2],
    borderRadius: 10,
  },
  openSettingsBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    color: '#FFFFFF',
  },
  primaryBtn: {
    marginTop: SPACING[4],
    backgroundColor: COLORS.parent.primary,
    borderRadius: 14,
    paddingVertical: SPACING[4],
    alignItems: 'center',
  },
  primaryBtnText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 16,
    color: '#FFFFFF',
  },
  linkBtn: { marginTop: SPACING[3], alignItems: 'center', paddingVertical: SPACING[2] },
  linkBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    color: COLORS.parent.primary,
  },
  cancelBtn: { marginTop: SPACING[1], alignItems: 'center', paddingVertical: SPACING[2] },
  cancelBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    color: COLORS.parent.textMuted,
  },
});
