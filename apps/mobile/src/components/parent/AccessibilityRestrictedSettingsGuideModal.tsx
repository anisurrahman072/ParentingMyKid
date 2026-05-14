import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Linking,
} from 'react-native';
import { COLORS } from '../../constants/colors';
import { SPACING } from '../../constants/spacing';

export const ANDROID_RESTRICTED_SETTINGS_HELP_URL =
  'https://support.google.com/android/answer/12623953';

export function AccessibilityRestrictedSettingsGuideModal({
  visible,
  onClose,
  onOpenAccessibility,
  onOpenAppInfo,
}: {
  visible: boolean;
  onClose: () => void;
  onOpenAccessibility: () => void;
  onOpenAppInfo: () => void;
}) {
  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <Text style={styles.title}>Accessibility (Android 13+)</Text>
          <Text style={styles.intro}>
            Some phones hide menus until you try to turn the service on once. Follow the steps below if you see
            “Restricted setting”.
          </Text>
          <ScrollView style={styles.scroll} showsVerticalScrollIndicator>
            <Text style={styles.sectionHeading}>Step 1 — Trigger</Text>
            <Text style={styles.paragraph}>
              Open Accessibility, tap ParentingMyKid, try turning it ON. If you see “Restricted setting”, tap OK — this
              unlocks the fix path on many devices.
            </Text>
            <Text style={styles.sectionHeading}>Step 2 — Allow restricted settings</Text>
            <Text style={styles.paragraph}>
              Use “Open App info”, then ⋮ → Allow restricted settings (wording varies by brand). If ⋮ is missing, try
              long-press the app icon → App info, or toggle Dark theme off briefly (known Android UI glitch).
            </Text>
            <Text style={styles.sectionHeading}>Step 3 — Enable</Text>
            <Text style={styles.paragraph}>Return to Accessibility and turn ParentingMyKid ON.</Text>
          </ScrollView>
          <TouchableOpacity
            style={styles.linkBtn}
            onPress={() => void Linking.openURL(ANDROID_RESTRICTED_SETTINGS_HELP_URL)}
          >
            <Text style={styles.linkBtnText}>Google Help — restricted settings</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryBtn} onPress={onClose}>
            <Text style={styles.secondaryBtnText}>Close</Text>
          </TouchableOpacity>
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => {
                onOpenAccessibility();
                onClose();
              }}
            >
              <Text style={styles.primaryBtnText}>Open Accessibility</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => {
                onOpenAppInfo();
                onClose();
              }}
            >
              <Text style={styles.primaryBtnText}>Open App info</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    paddingHorizontal: SPACING[4],
  },
  sheet: {
    backgroundColor: '#FFFCF9',
    borderRadius: 16,
    padding: SPACING[4],
    maxHeight: '88%',
    borderWidth: 1,
    borderColor: 'rgba(92,61,46,0.12)',
  },
  title: {
    fontFamily: 'Inter_700Bold',
    fontSize: 18,
    color: COLORS.parent.textPrimary,
    marginBottom: SPACING[2],
  },
  intro: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    color: COLORS.parent.textSecondary,
    marginBottom: SPACING[3],
    lineHeight: 19,
  },
  scroll: { maxHeight: 360 },
  sectionHeading: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: COLORS.parent.textPrimary,
    marginTop: SPACING[2],
    marginBottom: SPACING[1],
  },
  paragraph: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: COLORS.parent.textMuted,
    lineHeight: 20,
    marginBottom: SPACING[1],
  },
  linkBtn: {
    marginTop: SPACING[3],
    paddingVertical: SPACING[2],
  },
  linkBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: COLORS.parent.primary,
  },
  secondaryBtn: {
    alignSelf: 'flex-start',
    paddingVertical: SPACING[2],
    marginTop: SPACING[1],
  },
  secondaryBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
    color: COLORS.parent.textMuted,
  },
  actionRow: {
    flexDirection: 'row',
    gap: SPACING[2],
    marginTop: SPACING[3],
    justifyContent: 'space-between',
  },
  primaryBtn: {
    flex: 1,
    backgroundColor: COLORS.parent.primary,
    borderRadius: 12,
    paddingVertical: SPACING[3],
    alignItems: 'center',
  },
  primaryBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    color: '#FFFFFF',
    textAlign: 'center',
  },
});
