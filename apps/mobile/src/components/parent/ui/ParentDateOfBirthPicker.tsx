/**
 * Date of birth field — opens a native calendar (Material on Android, inline on iOS) in a premium sheet.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Pressable,
  Platform,
} from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { format, subYears } from 'date-fns';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../../../constants/colors';
import { Spacing } from '../../../constants/spacing';
import { Typography } from '../../../constants/typography';
import { ParentPrimaryButton } from './ParentPrimaryButton';

const DOB_RE = /^\d{4}-\d{2}-\d{2}$/;

function parseYmdLocal(ymd: string): Date | null {
  if (!DOB_RE.test(ymd.trim())) return null;
  const [y, m, d] = ymd.trim().split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

function defaultChildDob(): Date {
  return subYears(new Date(), 8);
}

type Props = {
  value: string;
  onChange: (yyyyMmDd: string) => void;
  label?: string;
};

export function ParentDateOfBirthPicker({
  value,
  onChange,
  label = 'Date of birth',
}: Props) {
  const insets = useSafeAreaInsets();
  const [iosOpen, setIosOpen] = useState(false);
  const [androidOpen, setAndroidOpen] = useState(false);
  const [iosDraft, setIosDraft] = useState<Date>(() => parseYmdLocal(value) ?? defaultChildDob());

  const displayLabel = useMemo(() => {
    if (!DOB_RE.test(value.trim())) return '';
    const d = parseYmdLocal(value.trim());
    if (!d || Number.isNaN(d.getTime())) return '';
    return d.toLocaleDateString(undefined, {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  }, [value]);

  const maxDate = useMemo(() => new Date(), []);
  const minDate = useMemo(() => subYears(new Date(), 25), []);

  const open = useCallback(() => {
    const initial = parseYmdLocal(value) ?? defaultChildDob();
    setIosDraft(initial);
    if (Platform.OS === 'android') {
      setAndroidOpen(true);
    } else {
      setIosOpen(true);
    }
  }, [value]);

  const onAndroidChange = useCallback(
    (event: DateTimePickerEvent, date?: Date) => {
      setAndroidOpen(false);
      if (event.type === 'dismissed' || !date) return;
      onChange(format(date, 'yyyy-MM-dd'));
    },
    [onChange],
  );

  const confirmIos = useCallback(() => {
    onChange(format(iosDraft, 'yyyy-MM-dd'));
    setIosOpen(false);
  }, [iosDraft, onChange]);

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity
        style={styles.fieldBtn}
        onPress={open}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel="Choose date of birth"
      >
        <Text
          style={[styles.fieldBtnText, !displayLabel && styles.fieldBtnPlaceholder]}
          numberOfLines={1}
        >
          {displayLabel || 'Tap to choose date'}
        </Text>
        <View style={styles.fieldIconWrap}>
          <Ionicons name="calendar-outline" size={22} color={COLORS.parent.primary} />
        </View>
      </TouchableOpacity>

      {Platform.OS === 'android' && androidOpen && (
        <DateTimePicker
          value={parseYmdLocal(value) ?? defaultChildDob()}
          mode="date"
          display="calendar"
          maximumDate={maxDate}
          minimumDate={minDate}
          onChange={onAndroidChange}
        />
      )}

      <Modal
        visible={iosOpen}
        animationType="slide"
        transparent
        presentationStyle="overFullScreen"
        onRequestClose={() => setIosOpen(false)}
      >
        <View style={styles.modalRoot}>
          <Pressable style={styles.backdrop} onPress={() => setIosOpen(false)} />
          <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>{label}</Text>
            <Text style={styles.sheetHint}>Scroll the calendar to pick their birthday.</Text>
            <View style={styles.pickerShell}>
              <DateTimePicker
                value={iosDraft}
                mode="date"
                display="inline"
                themeVariant="light"
                maximumDate={maxDate}
                minimumDate={minDate}
                onChange={(_, d) => {
                  if (d) setIosDraft(d);
                }}
                style={styles.iosPicker}
              />
            </View>
            <ParentPrimaryButton label="Use this date" onPress={confirmIos} />
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setIosOpen(false)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  field: { marginBottom: Spacing.md },
  label: {
    fontFamily: Typography.fonts.interMedium,
    fontSize: 13,
    color: COLORS.parent.textPrimary,
    marginBottom: 6,
  },
  fieldBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.parent.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.parent.surfaceBorder,
    paddingVertical: 12,
    paddingHorizontal: 14,
    minHeight: 48,
  },
  fieldBtnText: {
    flex: 1,
    fontFamily: Typography.fonts.interSemiBold,
    fontSize: 16,
    color: COLORS.parent.textPrimary,
  },
  fieldBtnPlaceholder: {
    fontFamily: Typography.fonts.interRegular,
    color: COLORS.parent.textMuted,
  },
  fieldIconWrap: {
    marginLeft: 8,
    opacity: 0.95,
  },
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(45, 35, 30, 0.45)',
  },
  sheet: {
    backgroundColor: COLORS.parent.surfaceSolid,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: Spacing.screenPadding,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.parent.surfaceBorder,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.parent.textMuted,
    opacity: 0.35,
    marginBottom: 12,
  },
  sheetTitle: {
    fontFamily: Typography.fonts.interBold,
    fontSize: 20,
    color: COLORS.parent.textPrimary,
    textAlign: 'center',
    marginBottom: 6,
  },
  sheetHint: {
    fontFamily: Typography.fonts.interRegular,
    fontSize: 14,
    color: COLORS.parent.textSecondary,
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 20,
  },
  pickerShell: {
    marginVertical: 8,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: 'rgba(232, 244, 236, 0.35)',
    borderWidth: 1,
    borderColor: COLORS.parent.surfaceBorder,
  },
  iosPicker: {
    width: '100%',
    height: 360,
  },
  cancelBtn: {
    alignSelf: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
  },
  cancelText: {
    fontFamily: Typography.fonts.interSemiBold,
    fontSize: 16,
    color: COLORS.parent.textSecondary,
  },
});
