import React, { useMemo, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Image, Platform, useWindowDimensions } from 'react-native';
import { ScrollView as GHScrollView } from 'react-native-gesture-handler';
import { LinearGradient } from 'expo-linear-gradient';
import { addDays, addMinutes, format, isSameDay, parseISO, startOfWeek } from 'date-fns';
import { COLORS } from '../../../constants/colors';
import { Spacing, Shadow } from '../../../constants/spacing';
import { Typography } from '../../../constants/typography';
import type {
  FamilyCalendarEventAssignee,
  FamilyCalendarEventInstance,
} from '@parentingmykid/shared-types';
import { assigneeFallbackAvatarColors } from '../../../utils/assigneeAvatarColors';

const W_START = 0;
/** Minimum width of each event card (side-by-side layout uses day width ≥ n × this + gaps). */
const MIN_EVENT_INNER_W = 88;
/** Floor so day headers (dow + date) stay readable; single-event days stay narrower than multi-overlap days. */
const MIN_DAY_COL_W = 108;
const COL_INSET = 4;
const EVENT_COL_GAP = 3;
const TIME_RAIL_W = 44;
const HEADER_H = 76;
const MIN_GRID_H = 300;
/** Used only for the empty-state placeholder grid. Week with events sizes from duration scale (parent scrolls). */
const MAX_GRID_H_EMPTY = 720;
const PX_PER_SLOT = 58;
/** Target height (px) for the *shortest* event duration in the week so time + 1-line title + avatars fit. */
const MIN_DURATION_EVENT_H = 86;

const DEFAULT_LABEL_MINUTES = [8, 10, 12, 15, 18].map((h) => h * 60);

const DAY_COL_BG: readonly string[] = [
  'rgba(59, 130, 246, 0.1)',
  'rgba(16, 185, 129, 0.08)',
  'rgba(139, 92, 246, 0.08)',
  'rgba(245, 158, 11, 0.1)',
  'rgba(236, 72, 153, 0.07)',
  'rgba(14, 165, 233, 0.1)',
  'rgba(100, 116, 139, 0.08)',
] as const;

const HEADER_GRADIENT: [string, string][] = [
  ['#EFF6FF', '#DBEAFE'],
  ['#ECFDF5', '#D1FAE5'],
  ['#F5F3FF', '#EDE9FE'],
  ['#FFFBEB', '#FEF3C7'],
  ['#FDF2F8', '#FCE7F3'],
  ['#F0F9FF', '#E0F2FE'],
  ['#F8FAFC', '#E2E8F0'],
];

const TIME_RAIL_BG = '#F4EFE8';
const ROW_BAND_A = 'rgba(92, 61, 46, 0.05)';
const ROW_BAND_B = 'rgba(37, 99, 235, 0.035)';

function mins(d: Date): number {
  return d.getHours() * 60 + d.getMinutes();
}

function formatClockParts(totalMinutes: number): { time: string; ap: 'AM' | 'PM' } {
  const h = Math.floor(totalMinutes / 60) % 24;
  const m = totalMinutes % 60;
  const d = new Date(2000, 0, 1, h, m);
  return { time: format(d, 'h:mm'), ap: h >= 12 ? 'PM' : 'AM' };
}

type Scale = { tMin: number; tMax: number; labelMinutes: number[]; gridH: number };

function shortestEventDurationMins(events: FamilyCalendarEventInstance[]): number {
  let shortest = Infinity;
  for (const e of events) {
    const s = parseISO(e.startAt);
    const en = e.endAt ? parseISO(e.endAt) : addMinutes(s, 60);
    const d = mins(en) - mins(s);
    if (d > 0) shortest = Math.min(shortest, d);
  }
  if (!Number.isFinite(shortest)) return 60;
  return Math.max(5, shortest);
}

function buildScale(events: FamilyCalendarEventInstance[] | undefined): Scale {
  if (!events || events.length === 0) {
    const tMin = DEFAULT_LABEL_MINUTES[0]!;
    const tMax = DEFAULT_LABEL_MINUTES[DEFAULT_LABEL_MINUTES.length - 1]!;
    const gridH = Math.max(
      MIN_GRID_H,
      Math.min(MAX_GRID_H_EMPTY, (DEFAULT_LABEL_MINUTES.length - 1) * PX_PER_SLOT),
    );
    return { tMin, tMax, labelMinutes: DEFAULT_LABEL_MINUTES, gridH };
  }
  const u = new Set<number>();
  for (const e of events) {
    const s = parseISO(e.startAt);
    const en = e.endAt ? parseISO(e.endAt) : addMinutes(s, 60);
    u.add(mins(s));
    u.add(mins(en));
  }
  const labelMinutes = [...u].sort((a, b) => a - b);
  let tMin = labelMinutes[0]! - 30;
  let tMax = labelMinutes[labelMinutes.length - 1]! + 30;
  tMin = Math.max(0, tMin);
  tMax = Math.min(24 * 60, tMax);
  if (tMax <= tMin) tMax = tMin + 60;
  const spanMinutes = tMax - tMin;
  const minDur = shortestEventDurationMins(events);
  const pixelsPerMinute = MIN_DURATION_EVENT_H / minDur;
  const idealH = spanMinutes * pixelsPerMinute;
  const gridH = Math.max(MIN_GRID_H, idealH);
  return { tMin, tMax, labelMinutes, gridH };
}

function yForMinute(t: number, scale: Scale): number {
  const span = scale.tMax - scale.tMin;
  if (span <= 0) return 0;
  const r = (t - scale.tMin) / span;
  return Math.max(0, Math.min(scale.gridH, r * scale.gridH));
}

/** Column width for one day from max concurrent events that day (not global max across the week). */
function dayColumnWidthForOverlap(maxOverlapCols: number): number {
  const n = Math.max(1, maxOverlapCols);
  const innerNeed = n * MIN_EVENT_INNER_W + Math.max(0, n - 1) * EVENT_COL_GAP;
  const w = COL_INSET * 2 + innerNeed;
  return Math.min(320, Math.max(MIN_DAY_COL_W, w));
}

function typeColor(type: string): string {
  const m: Record<string, string> = {
    SCHOOL: '#2563EB',
    SPORTS: '#059669',
    APPOINTMENT: '#D97706',
    EXAM: '#DC2626',
    BIRTHDAY: '#DB2777',
    TRIP: '#7C3AED',
    TUITION: '#0D9488',
    EID: '#EA580C',
    CUSTOM: COLORS.parent.primary,
  };
  return m[type] ?? COLORS.parent.primary;
}

function dayEventLayout(
  dayEvents: FamilyCalendarEventInstance[],
): Map<string, { col: number; cols: number }> {
  const map = new Map<string, { col: number; cols: number }>();
  if (dayEvents.length === 0) return map;
  const n = dayEvents.length;
  const adj: number[][] = Array.from({ length: n }, () => []);
  for (let i = 0; i < n; i++) {
    const ei = dayEvents[i]!;
    const si = parseISO(ei.startAt);
    const eni = ei.endAt ? parseISO(ei.endAt) : addMinutes(si, 60);
    for (let j = i + 1; j < n; j++) {
      const ej = dayEvents[j]!;
      const sj = parseISO(ej.startAt);
      const enj = ej.endAt ? parseISO(ej.endAt) : addMinutes(sj, 60);
      if (si < enj && sj < eni) {
        adj[i]!.push(j);
        adj[j]!.push(i);
      }
    }
  }
  const seen = new Set<number>();
  const groups: FamilyCalendarEventInstance[][] = [];
  function dfs(i: number, acc: FamilyCalendarEventInstance[]) {
    seen.add(i);
    acc.push(dayEvents[i]!);
    for (const k of adj[i]!) {
      if (!seen.has(k)) dfs(k, acc);
    }
  }
  for (let i = 0; i < n; i++) {
    if (!seen.has(i)) {
      const acc: FamilyCalendarEventInstance[] = [];
      dfs(i, acc);
      groups.push(acc);
    }
  }
  for (const group of groups) {
    const sorted = [...group].sort(
      (a, b) => parseISO(a.startAt).getTime() - parseISO(b.startAt).getTime(),
    );
    type P = { ev: FamilyCalendarEventInstance; col: number; s: Date; e: Date };
    const placements: P[] = [];
    let maxCols = 1;
    for (const ev of sorted) {
      const s = parseISO(ev.startAt);
      const e = ev.endAt ? parseISO(ev.endAt) : addMinutes(s, 60);
      const used = new Set<number>();
      for (const p of placements) {
        if (s < p.e && p.s < e) used.add(p.col);
      }
      let col = 0;
      while (used.has(col)) col++;
      placements.push({ ev, col, s, e });
      maxCols = Math.max(maxCols, col + 1);
    }
    for (const p of placements) {
      map.set(p.ev.id, { col: p.col, cols: maxCols });
    }
  }
  return map;
}

function AssigneeCircles({ assignees }: { assignees: FamilyCalendarEventAssignee[] }) {
  const maxShow = 3;
  const list = assignees.slice(0, maxShow);
  const extra = assignees.length - maxShow;
  if (list.length === 0) return null;
  return (
    <View style={styles.evAvatarRow}>
      {list.map((a, i) => {
        const key = `${a.kind}-${a.id}`;
        const fb = assigneeFallbackAvatarColors(key);
        return (
          <View key={key} style={[styles.evAvatarWrap, i > 0 && styles.evAvatarWrapSpacer]}>
            {a.avatarUrl ? (
              <Image source={{ uri: a.avatarUrl }} style={styles.evAvatarImg} />
            ) : (
              <View style={[styles.evAvatarImg, { backgroundColor: fb.backgroundColor }]}>
                <Text style={[styles.evAvatarLetter, { color: fb.letterColor }]}>{initialLetter(a.displayName)}</Text>
              </View>
            )}
          </View>
        );
      })}
      {extra > 0 ? (
        <View style={[styles.evAvatarWrap, styles.evAvatarWrapSpacer, styles.evAvatarMore]}>
          <Text style={styles.evAvatarMoreText}>+{extra}</Text>
        </View>
      ) : null}
    </View>
  );
}

function initialLetter(name: string): string {
  const t = name.trim();
  if (!t) return '?';
  return t[0]!.toUpperCase();
}

type Props = {
  anchorDate: Date;
  events: FamilyCalendarEventInstance[];
  selected: Date;
  onSelectDay: (d: Date) => void;
  /** Tap opens details below the grid (parent scrolls into view). */
  onEventPress: (ev: FamilyCalendarEventInstance) => void;
  onEventLongPress: (ev: FamilyCalendarEventInstance) => void;
};

export function WeekRoutineGrid({
  anchorDate,
  events,
  selected,
  onSelectDay,
  onEventPress,
  onEventLongPress,
}: Props) {
  const { height: windowH } = useWindowDimensions();
  /** Own vertical scroll + inner horizontal scroll so one finger can pan diagonally (not page vs grid axis lock). */
  const weekGridMaxViewportH = Math.round(Math.min(580, Math.max(300, windowH * 0.5)));
  const verticalScrollRef = useRef<GHScrollView>(null);
  const horizontalScrollRef = useRef<GHScrollView>(null);

  const weekStart = useMemo(() => startOfWeek(anchorDate, { weekStartsOn: W_START }), [anchorDate]);
  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart],
  );
  const scale = useMemo(() => buildScale(events), [events]);
  const gridH = scale.gridH;

  const layoutByDay = useMemo(() => {
    const m = new Map<string, Map<string, { col: number; cols: number }>>();
    for (const day of days) {
      const k = format(day, 'yyyy-MM-dd');
      const inCol = (events ?? []).filter((e) => isSameDay(parseISO(e.startAt), day));
      m.set(k, dayEventLayout(inCol));
    }
    return m;
  }, [days, events]);

  const { dayColWidths, dayColLefts, scrollW } = useMemo(() => {
    const widths: number[] = [];
    for (const day of days) {
      const k = format(day, 'yyyy-MM-dd');
      const layout = layoutByDay.get(k) ?? new Map();
      let maxC = 1;
      for (const v of layout.values()) maxC = Math.max(maxC, v.cols);
      widths.push(dayColumnWidthForOverlap(maxC));
    }
    const lefts: number[] = [];
    let acc = 0;
    for (const w of widths) {
      lefts.push(acc);
      acc += w;
    }
    return { dayColWidths: widths, dayColLefts: lefts, scrollW: acc };
  }, [days, layoutByDay]);

  return (
    <View style={[styles.cardOuter, { width: '100%' as const }]}>
      <LinearGradient
        colors={['#FDFCFA', '#F0EBE3']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.cardInner}
      >
        <GHScrollView
          ref={verticalScrollRef}
          simultaneousHandlers={horizontalScrollRef}
          nestedScrollEnabled
          directionalLockEnabled={false}
          bounces
          showsVerticalScrollIndicator
          style={{ maxHeight: weekGridMaxViewportH }}
        >
          <View style={styles.mainRow}>
            <View style={styles.railCol}>
              <View style={[styles.corner, { width: TIME_RAIL_W, height: HEADER_H }]}>
                <Text style={styles.cornerText}>Time</Text>
              </View>
              <View
                style={[
                  styles.timeRail,
                  { width: TIME_RAIL_W, backgroundColor: TIME_RAIL_BG, height: gridH },
                ]}
              >
                {scale.labelMinutes.map((m) => {
                  const { time, ap } = formatClockParts(m);
                  const y = yForMinute(m, scale) - 10;
                  return (
                    <View key={m} style={[styles.timeTag, { top: y }]}>
                      <Text style={styles.timeText} numberOfLines={1}>
                        {time}
                      </Text>
                      <Text style={styles.timeMeridiem} numberOfLines={1}>
                        {ap}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>

            <GHScrollView
              ref={horizontalScrollRef}
              simultaneousHandlers={verticalScrollRef}
              horizontal
              nestedScrollEnabled
              directionalLockEnabled={false}
              bounces
              showsHorizontalScrollIndicator
              style={styles.gridHorizontalScroll}
              contentContainerStyle={{ minWidth: scrollW, paddingRight: Spacing.lg }}
            >
              <View>
                <View style={[styles.headerRow, { width: scrollW, height: HEADER_H }]}>
                  {days.map((d, i) => {
                    const isSel = isSameDay(d, selected);
                    const g = HEADER_GRADIENT[i % HEADER_GRADIENT.length]!;
                    return (
                      <Pressable
                        key={d.toISOString()}
                        onPress={() => onSelectDay(d)}
                        style={{ width: dayColWidths[i] }}
                      >
                        <LinearGradient
                          colors={g}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={[styles.headGrad, isSel && styles.headGradOn]}
                        >
                          <Text style={[styles.headDow, isSel && styles.headDowOn]} numberOfLines={1}>
                            {format(d, 'EEE')}
                          </Text>
                          <Text style={[styles.headDom, isSel && styles.headDomOn]}>
                            {format(d, 'd')}
                          </Text>
                        </LinearGradient>
                      </Pressable>
                    );
                  })}
                </View>

                <View style={[styles.gridBlock, { width: scrollW, height: gridH }]}>
                  {scale.labelMinutes.map((m, i) => {
                    const nextM = scale.labelMinutes[i + 1];
                    if (nextM == null) return null;
                    const y = yForMinute(m, scale);
                    const y2 = yForMinute(nextM, scale);
                    const bandH = y2 - y;
                    if (bandH <= 0) return null;
                    return (
                      <View
                        key={`b-${m}`}
                        style={[
                          styles.rowBand,
                          {
                            top: y,
                            height: bandH,
                            width: scrollW,
                            backgroundColor: i % 2 === 0 ? ROW_BAND_A : ROW_BAND_B,
                          },
                        ]}
                      />
                    );
                  })}

                  {days.map((_, i) => (
                    <View
                      // eslint-disable-next-line react/no-array-index-key
                      key={i}
                      style={[
                        styles.colBg,
                        {
                          left: dayColLefts[i],
                          width: dayColWidths[i],
                          height: gridH,
                          backgroundColor: DAY_COL_BG[i],
                        },
                      ]}
                    />
                  ))}

                  {scale.labelMinutes.map((m) => {
                    const y = yForMinute(m, scale);
                    return (
                      <View key={`g-${m}`} style={[styles.hLine, { top: y, width: scrollW }]} />
                    );
                  })}

                  {days.map((_, i) => {
                    const x = dayColLefts[i]! + dayColWidths[i]!;
                    return (
                      <View
                        // eslint-disable-next-line react/no-array-index-key
                        key={`v-${i}`}
                        style={[styles.vLine, { left: x, top: 0, height: gridH }]}
                      />
                    );
                  })}

                  {days.map((day, col) => {
                    const inCol = (events ?? []).filter((e) => isSameDay(parseISO(e.startAt), day));
                    const layout = layoutByDay.get(format(day, 'yyyy-MM-dd')) ?? new Map();
                    const padX = COL_INSET;
                    const dcw = dayColWidths[col]!;
                    const innerW = dcw - padX * 2;
                    return (
                      <View
                        key={dayKey(day)}
                        style={[
                          styles.dayLayer,
                          { left: dayColLefts[col], width: dcw, height: gridH },
                        ]}
                        pointerEvents="box-none"
                      >
                        {inCol.map((ev) => {
                          const s = parseISO(ev.startAt);
                          const en = ev.endAt ? parseISO(ev.endAt) : addMinutes(s, 60);
                          const t0 = mins(s);
                          const t1 = Math.max(mins(en), t0 + 5);
                          const y0 = yForMinute(Math.max(t0, scale.tMin), scale);
                          const y1 = yForMinute(Math.min(t1, scale.tMax), scale);
                          const blockH = Math.max(y1 - y0, 24);
                          const c = typeColor(ev.type);
                          const pos = layout.get(ev.id) ?? { col: 0, cols: 1 };
                          const { col: ci, cols: ncols } = pos;
                          const gap = EVENT_COL_GAP;
                          const cellW = (innerW - gap * (ncols - 1)) / ncols;
                          const left = padX + ci * (cellW + gap);
                          return (
                            <Pressable
                              key={ev.id}
                              onPress={() => onEventPress(ev)}
                              onLongPress={() => onEventLongPress(ev)}
                              delayLongPress={380}
                              style={({ pressed }) => [
                                styles.evBlock,
                                {
                                  top: y0,
                                  height: blockH,
                                  left,
                                  width: cellW,
                                  borderLeftColor: c,
                                  opacity: pressed ? 0.9 : 1,
                                },
                              ]}
                            >
                              <View style={styles.evBlockInner}>
                                <View style={styles.evBlockBody}>
                                  <Text
                                    style={styles.evTime}
                                    numberOfLines={1}
                                    {...(Platform.OS === 'ios'
                                      ? { adjustsFontSizeToFit: true, minimumFontScale: 0.82 }
                                      : {})}
                                  >
                                    {format(s, 'h:mm a')}
                                  </Text>
                                  <Text
                                    style={styles.evTitle}
                                    numberOfLines={1}
                                    ellipsizeMode="tail"
                                  >
                                    {ev.title}
                                  </Text>
                                </View>
                                <View style={styles.evBlockFlexSpacer} />
                                <AssigneeCircles assignees={ev.assignees ?? []} />
                              </View>
                            </Pressable>
                          );
                        })}
                      </View>
                    );
                  })}

                  {(events?.length ?? 0) === 0 && (
                    <View style={styles.emptyOverlay} pointerEvents="none">
                      <Text style={styles.emptyText}>No events this week</Text>
                      <Text style={styles.emptyHint}>Use + to add your routine</Text>
                    </View>
                  )}
                </View>
              </View>
            </GHScrollView>
          </View>
        </GHScrollView>
      </LinearGradient>
    </View>
  );
}

function dayKey(d: Date): string {
  return format(d, 'yyyy-MM-dd');
}

const styles = StyleSheet.create({
  cardOuter: { borderRadius: 22, overflow: 'visible', ...Shadow.md },
  cardInner: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.85)',
    borderRadius: 22,
    paddingTop: 10,
    paddingBottom: 10,
    overflow: 'hidden',
  },
  mainRow: { flexDirection: 'row' },
  gridHorizontalScroll: { flex: 1 },
  railCol: { zIndex: 2 },
  corner: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: TIME_RAIL_BG,
    borderTopLeftRadius: 4,
  },
  cornerText: {
    fontSize: 9,
    fontFamily: Typography.fonts.interBold,
    color: COLORS.parent.textMuted,
    textTransform: 'uppercase',
    textAlign: 'center',
    width: '100%',
  },
  headerRow: { flexDirection: 'row' },
  headGrad: {
    marginHorizontal: 2,
    marginBottom: 4,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 4,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.9)',
    height: HEADER_H - 4,
  },
  headGradOn: {
    borderColor: 'rgba(37, 99, 235, 0.45)',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 2,
  },
  headDow: {
    fontSize: 10,
    fontFamily: Typography.fonts.interBold,
    color: COLORS.parent.textSecondary,
    textTransform: 'uppercase',
  },
  headDowOn: { color: COLORS.parent.primaryDark },
  headDom: {
    fontSize: 17,
    fontFamily: Typography.fonts.interBold,
    color: COLORS.parent.text,
    marginTop: 2,
  },
  headDomOn: { color: COLORS.parent.primaryDark },
  timeRail: { position: 'relative', borderTopWidth: 1, borderColor: 'rgba(92, 61, 46, 0.1)' },
  timeTag: { position: 'absolute', left: 0, width: TIME_RAIL_W, alignItems: 'center' },
  timeText: {
    fontSize: 9,
    lineHeight: 11,
    fontFamily: Typography.fonts.interSemiBold,
    color: COLORS.parent.textSecondary,
    textAlign: 'center',
    width: '100%',
  },
  timeMeridiem: {
    marginTop: 0,
    fontSize: 7,
    lineHeight: 8,
    fontFamily: Typography.fonts.interBold,
    letterSpacing: 0.2,
    color: COLORS.parent.textMuted,
    textAlign: 'center',
    width: '100%',
  },
  gridBlock: { position: 'relative' },
  rowBand: { position: 'absolute', left: 0 },
  colBg: {
    position: 'absolute',
    top: 0,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: 'rgba(255,255,255,0.5)',
  },
  hLine: { position: 'absolute', left: 0, height: 1, backgroundColor: 'rgba(92, 61, 46, 0.14)' },
  vLine: {
    position: 'absolute',
    width: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255, 255, 255, 0.65)',
  },
  dayLayer: { position: 'absolute', top: 0, overflow: 'visible' },
  evBlock: {
    position: 'absolute',
    zIndex: 3,
    flexDirection: 'column',
    borderLeftWidth: 3,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.92)',
    paddingHorizontal: 5,
    paddingVertical: 4,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  evBlockInner: {
    flex: 1,
    minHeight: 0,
    width: '100%',
    flexDirection: 'column',
  },
  evBlockBody: { flexShrink: 0 },
  evBlockFlexSpacer: { flexGrow: 1, flexShrink: 0, minHeight: 0 },
  evTime: {
    fontSize: 9,
    fontFamily: Typography.fonts.interSemiBold,
    color: COLORS.parent.textSecondary,
  },
  evTitle: {
    fontSize: 11,
    fontFamily: Typography.fonts.interBold,
    color: COLORS.parent.text,
    marginTop: 2,
    lineHeight: 14,
  },
  evAvatarRow: { flexDirection: 'row', alignItems: 'center', flexShrink: 0, marginTop: 2 },
  evAvatarWrap: {},
  evAvatarWrapSpacer: { marginLeft: 4 },
  evAvatarImg: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  evAvatarLetter: {
    fontSize: 10,
    fontFamily: Typography.fonts.interBold,
  },
  evAvatarMore: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(92, 61, 46, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  evAvatarMoreText: {
    fontSize: 8,
    fontFamily: Typography.fonts.interBold,
    color: COLORS.parent.textSecondary,
  },
  emptyOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  emptyText: {
    fontSize: 15,
    fontFamily: Typography.fonts.interBold,
    color: COLORS.parent.textSecondary,
  },
  emptyHint: {
    fontSize: 12,
    fontFamily: Typography.fonts.interRegular,
    color: COLORS.parent.textMuted,
    marginTop: 4,
  },
});
