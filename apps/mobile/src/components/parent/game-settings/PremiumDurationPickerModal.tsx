import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Platform,
} from 'react-native';
import { GestureHandlerRootView, ScrollView } from 'react-native-gesture-handler';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../../../constants/colors';
import { SPACING } from '../../../constants/spacing';

const ROW_H = 48;
const WHEEL_H = ROW_H * 5;
/** Top + bottom inset so snapping to multiples of ROW_H aligns a row with the viewport center */
const WHEEL_PAD = (WHEEL_H - ROW_H) / 2;

const PREMIUM_BG = ['#FFF6ED', '#FFF2F7', '#F5F1FF', '#EDFAF6'] as const;
const PREMIUM_LOC = [0, 0.34, 0.68, 1] as const;

function hourRange(minMinutes: number, maxMinutes: number): number[] {
  const start = Math.floor(minMinutes / 60);
  const end = Math.floor(maxMinutes / 60);
  return Array.from({ length: Math.max(0, end - start + 1) }, (_, i) => start + i);
}

function minutesForHour(h: number, minMinutes: number, maxMinutes: number): number[] {
  const low = Math.max(0, minMinutes - h * 60);
  const high = Math.min(59, maxMinutes - h * 60);
  if (low > high) return [];
  return Array.from({ length: high - low + 1 }, (_, i) => low + i);
}

function clampTotal(h: number, m: number, minM: number, maxM: number): number {
  const t = h * 60 + m;
  return Math.max(minM, Math.min(maxM, t));
}

type WheelProps = {
  label: string;
  values: number[];
  selected: number;
  onSelect: (v: number) => void;
  format?: (v: number) => string;
};

function SnapWheel({
  label,
  values,
  selected,
  onSelect,
  format = (v: number) => String(v),
}: WheelProps) {
  const scrollRef = useRef<ScrollView>(null);
  const listKey = useMemo(() => `${label}-${values.join(',')}`, [label, values]);

  const snapToIndex = useCallback(
    (i: number, animated: boolean) => {
      const y = Math.max(0, Math.min(values.length - 1, i)) * ROW_H;
      scrollRef.current?.scrollTo({ y, animated });
    },
    [values.length],
  );

  useEffect(() => {
    const i = Math.max(0, values.indexOf(selected));
    requestAnimationFrame(() => snapToIndex(i, false));
  }, [selected, values, snapToIndex, listKey]);

  function onMomentumEnd(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const raw = e.nativeEvent.contentOffset.y;
    let i = Math.round(raw / ROW_H);
    i = Math.max(0, Math.min(values.length - 1, i));
    snapToIndex(i, true);
    const next = values[i];
    if (next !== undefined) onSelect(next);
  }

  if (values.length === 0) {
    return (
      <View style={wheelStyles.col}>
        <Text style={wheelStyles.axisLabel}>{label}</Text>
        <View style={[wheelStyles.frame, { height: WHEEL_H, justifyContent: 'center' }]}>
          <Text style={wheelStyles.empty}>—</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={wheelStyles.col}>
      <Text style={wheelStyles.axisLabel}>{label}</Text>
      <View style={wheelStyles.frame}>
        <View style={wheelStyles.highlightRail} pointerEvents="none" />
        <ScrollView
          key={listKey}
          ref={scrollRef}
          style={wheelStyles.scrollViewport}
          showsVerticalScrollIndicator={false}
          snapToInterval={ROW_H}
          decelerationRate="fast"
          nestedScrollEnabled
          bounces
          keyboardShouldPersistTaps="handled"
          scrollEventThrottle={16}
          contentContainerStyle={wheelStyles.scrollContent}
          onMomentumScrollEnd={onMomentumEnd}
        >
          {values.map((v) => {
            const active = v === selected;
            return (
              <View key={`${label}-${v}`} style={[wheelStyles.row, { height: ROW_H }]}>
                <Text style={[wheelStyles.rowText, active && wheelStyles.rowTextActive]}>{format(v)}</Text>
              </View>
            );
          })}
        </ScrollView>
      </View>
    </View>
  );
}

export type PremiumDurationPickerModalProps = {
  visible: boolean;
  onClose: () => void;
  /** Total minutes — will be clamped to [min, max] when opening */
  valueMinutes: number;
  minMinutes?: number;
  maxMinutes?: number;
  onConfirm: (totalMinutes: number) => void;
  title?: string;
  /** Subtitle e.g. "Weekdays" */
  subtitle?: string;
};

export function PremiumDurationPickerModal({
  visible,
  onClose,
  valueMinutes,
  minMinutes = 0,
  maxMinutes = 240,
  onConfirm,
  title = 'Set time',
  subtitle,
}: PremiumDurationPickerModalProps) {
  const insets = useSafeAreaInsets();
  const minM = Math.max(0, minMinutes);
  const maxM = Math.max(minM, maxMinutes);

  const [h, setH] = useState(0);
  const [m, setM] = useState(0);

  const hours = useMemo(() => hourRange(minM, maxM), [minM, maxM]);
  const minutes = useMemo(() => minutesForHour(h, minM, maxM), [h, minM, maxM]);

  const syncFromProp = useCallback(() => {
    const clamped = Math.max(minM, Math.min(maxM, valueMinutes));
    const nh = Math.floor(clamped / 60);
    const nm = clamped % 60;
    setH(nh);
    let allowed = minutesForHour(nh, minM, maxM);
    if (allowed.includes(nm)) setM(nm);
    else setM(allowed[allowed.length - 1] ?? allowed[0] ?? 0);
  }, [valueMinutes, minM, maxM]);

  useEffect(() => {
    if (visible) syncFromProp();
  }, [visible, syncFromProp]);

  const applyHour = useCallback(
    (nh: number) => {
      setH(nh);
      const allowed = minutesForHour(nh, minM, maxM);
      setM((prev) => (allowed.includes(prev) ? prev : allowed[allowed.length - 1] ?? allowed[0] ?? 0));
    },
    [minM, maxM],
  );

  const handleApply = () => {
    const total = clampTotal(h, m, minM, maxM);
    onConfirm(total);
    onClose();
  };

  const totalPreview = clampTotal(h, m, minM, maxM);
  const ch = Math.floor(totalPreview / 60);
  const cm = totalPreview % 60;
  const previewText = totalPreview === 0 ? '' : `${ch}h ${cm.toString().padStart(2, '0')}m`;

  return (
    <Modal visible={visible} animationType="fade" transparent statusBarTranslucent onRequestClose={onClose}>
      <GestureHandlerRootView style={pickerStyles.modalRoot}>
        <Pressable style={pickerStyles.overlay} onPress={onClose} accessibilityLabel="Dismiss time picker" />
        <View style={[pickerStyles.sheetWrap, { paddingBottom: insets.bottom + SPACING[4] }]}>
          <View collapsable={false}>
            <LinearGradient
              colors={[...PREMIUM_BG]}
              locations={[...PREMIUM_LOC]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={pickerStyles.sheet}
            >
            <View style={pickerStyles.sheetTopRule} />

            <Text style={pickerStyles.sheetTitle}>{title}</Text>
            {subtitle ? <Text style={pickerStyles.sheetSub}>{subtitle}</Text> : null}

            <View style={pickerStyles.heroRing}>
              <LinearGradient
                colors={['rgba(59,130,246,0.2)', 'rgba(236,72,153,0.12)', 'rgba(16,185,129,0.14)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={pickerStyles.heroInner}
              >
                <Text style={pickerStyles.heroLabel}>Total play time</Text>
                <Text style={pickerStyles.heroValue}>
                  {totalPreview === 0 ? 'Off (no limit)' : `${totalPreview} min`}
                </Text>
                {previewText.length > 0 ? <Text style={pickerStyles.heroDetail}>{previewText}</Text> : null}
              </LinearGradient>
            </View>

            <View style={pickerStyles.wheelsRow}>
              <SnapWheel label="Hour" values={hours} selected={h} onSelect={(v) => applyHour(Number(v))} />
              <View style={pickerStyles.sep}>
                <Text style={pickerStyles.sepText}>∶</Text>
              </View>
              <SnapWheel
                label="Minute"
                values={minutes}
                selected={m}
                onSelect={(v) => setM(Number(v))}
                format={(v) => v.toString().padStart(2, '0')}
              />
            </View>

            <Text style={pickerStyles.hint}>Scroll each column. Minute steps are 1 min. Hour can be 0.</Text>

            <View style={pickerStyles.actions}>
              <Pressable style={pickerStyles.secondaryBtn} onPress={onClose}>
                <Text style={pickerStyles.secondaryText}>Cancel</Text>
              </Pressable>
              <Pressable style={pickerStyles.primaryBtnWrap} onPress={handleApply}>
                <LinearGradient
                  colors={['#60A5FA', '#2563EB']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={pickerStyles.primaryBtn}
                >
                  <Text style={pickerStyles.primaryText}>Apply</Text>
                </LinearGradient>
              </Pressable>
            </View>
          </LinearGradient>
          </View>
      </View>
      </GestureHandlerRootView>
    </Modal>
  );
}

const pickerStyles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(92,61,46,0.42)',
  },
  sheetWrap: {
    paddingHorizontal: SPACING[4],
    zIndex: 2,
    width: '100%',
  },
  sheet: {
    borderRadius: 24,
    paddingHorizontal: SPACING[5],
    paddingTop: SPACING[4],
    paddingBottom: SPACING[5],
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.85)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.18,
        shadowRadius: 24,
        shadowOffset: { width: 0, height: -4 },
      },
      android: { elevation: 12 },
    }),
  },
  sheetTopRule: {
    alignSelf: 'center',
    width: 42,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(92,61,46,0.14)',
    marginBottom: SPACING[3],
  },
  sheetTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 20,
    color: COLORS.parent.textPrimary,
    textAlign: 'center',
  },
  sheetSub: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    color: COLORS.parent.textMuted,
    textAlign: 'center',
    marginTop: 4,
  },
  heroRing: {
    marginTop: SPACING[4],
    marginBottom: SPACING[2],
    borderRadius: 18,
    padding: 2,
    backgroundColor: 'rgba(255,255,255,0.45)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.72)',
  },
  heroInner: {
    borderRadius: 16,
    paddingVertical: SPACING[4],
    paddingHorizontal: SPACING[4],
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.65)',
  },
  heroLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    color: COLORS.parent.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.9,
    marginBottom: 4,
  },
  heroValue: {
    fontFamily: 'Inter_700Bold',
    fontSize: 26,
    color: COLORS.parent.textPrimary,
  },
  heroDetail: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    color: COLORS.parent.textSecondary,
    marginTop: SPACING[1],
  },
  wheelsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: SPACING[2],
    marginTop: SPACING[2],
  },
  sep: {
    width: 20,
    height: WHEEL_H,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 22,
  },
  sepText: {
    fontSize: 28,
    fontFamily: 'Inter_700Bold',
    color: COLORS.parent.textMuted,
  },
  hint: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: COLORS.parent.textMuted,
    textAlign: 'center',
    marginTop: SPACING[4],
    lineHeight: 17,
    fontStyle: 'italic',
  },
  actions: {
    flexDirection: 'row',
    gap: SPACING[3],
    marginTop: SPACING[5],
  },
  secondaryBtn: {
    flex: 1,
    height: 50,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(59,130,246,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.72)',
  },
  secondaryText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
    color: COLORS.parent.primary,
  },
  primaryBtnWrap: {
    flex: 1,
    borderRadius: 14,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#2563EB',
        shadowOpacity: 0.28,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
      },
      android: { elevation: 4 },
    }),
  },
  primaryBtn: {
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 16,
    color: '#FFFFFF',
  },
});

const wheelStyles = StyleSheet.create({
  col: { alignItems: 'center', width: 116 },
  axisLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    color: COLORS.parent.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.85,
    marginBottom: SPACING[2],
  },
  frame: {
    height: WHEEL_H,
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.55)',
    borderWidth: 1,
    borderColor: 'rgba(92,61,46,0.1)',
    position: 'relative',
  },
  scrollViewport: {
    height: WHEEL_H,
    width: '100%',
  },
  scrollContent: {
    paddingVertical: WHEEL_PAD,
  },
  highlightRail: {
    position: 'absolute',
    left: 4,
    right: 4,
    top: WHEEL_PAD,
    height: ROW_H,
    borderRadius: 12,
    backgroundColor: 'rgba(59,130,246,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(59,130,246,0.22)',
    zIndex: 0,
  },
  row: {
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  rowText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 20,
    color: COLORS.parent.textMuted,
  },
  rowTextActive: {
    fontFamily: 'Inter_700Bold',
    fontSize: 24,
    color: COLORS.parent.textPrimary,
  },
  empty: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 18,
    color: COLORS.parent.textMuted,
  },
});
