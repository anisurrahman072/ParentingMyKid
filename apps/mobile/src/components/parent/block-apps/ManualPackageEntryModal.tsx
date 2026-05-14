import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  TouchableOpacity,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../../../constants/colors';
import { SPACING } from '../../../constants/spacing';

type Props = {
  visible: boolean;
  onClose: () => void;
  blockedPackages: string[];
  onAdd: (packageName: string) => void;
};

export function ManualPackageEntryModal({ visible, onClose, blockedPackages, onAdd }: Props) {
  const insets = useSafeAreaInsets();
  const [value, setValue] = useState('');

  useEffect(() => {
    if (visible) setValue('');
  }, [visible]);

  function submit() {
    const trimmed = value.trim();
    if (!trimmed) {
      Alert.alert('Package required', 'Enter an Android package name, e.g. com.instagram.android');
      return;
    }
    if (blockedPackages.includes(trimmed)) {
      Alert.alert('Already added', 'This app is already in the blocklist.');
      return;
    }
    onAdd(trimmed);
    onClose();
  }

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.backdrop}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={[styles.sheet, { marginBottom: insets.bottom + SPACING[4] }]}>
          <Text style={styles.title}>Add by package name</Text>
          <Text style={styles.hint}>
            Use the exact package ID from Play Store or App info (e.g. com.whatsapp).
          </Text>
          <TextInput
            style={styles.input}
            placeholder="com.example.app"
            placeholderTextColor={COLORS.parent.textMuted}
            value={value}
            onChangeText={setValue}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TouchableOpacity style={styles.primaryBtn} onPress={submit} activeOpacity={0.9}>
            <Text style={styles.primaryBtnText}>Add</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(44, 36, 32, 0.45)',
    justifyContent: 'center',
    paddingHorizontal: SPACING[6],
  },
  sheet: {
    backgroundColor: COLORS.parent.surfaceSolid,
    borderRadius: 18,
    padding: SPACING[5],
    borderWidth: 1,
    borderColor: 'rgba(91, 61, 46, 0.12)',
  },
  title: {
    fontFamily: 'Inter_700Bold',
    fontSize: 17,
    color: COLORS.parent.textPrimary,
    marginBottom: SPACING[2],
  },
  hint: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: COLORS.parent.textMuted,
    marginBottom: SPACING[4],
    lineHeight: 18,
  },
  input: {
    borderWidth: 1,
    borderColor: 'rgba(92,61,46,0.15)',
    borderRadius: 12,
    paddingHorizontal: SPACING[3],
    paddingVertical: SPACING[3],
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    color: COLORS.parent.textPrimary,
    marginBottom: SPACING[4],
  },
  primaryBtn: {
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
  cancelBtn: { marginTop: SPACING[3], alignItems: 'center', paddingVertical: SPACING[2] },
  cancelBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: COLORS.parent.textMuted,
  },
});
