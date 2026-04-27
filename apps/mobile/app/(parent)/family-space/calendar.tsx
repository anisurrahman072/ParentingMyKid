import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Pressable,
  Image,
  type LayoutChangeEvent,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Calendar, type DateData } from 'react-native-calendars';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import {
  addDays,
  endOfDay,
  endOfMonth,
  endOfWeek,
  format,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import type { FamilyCalendarEventAssignee, FamilyCalendarEventInstance } from '@parentingmykid/shared-types';
import { useFamilyStore } from '../../../src/store/family.store';
import { API_ENDPOINTS } from '../../../src/constants/api';
import { apiClient } from '../../../src/services/api.client';
import { COLORS } from '../../../src/constants/colors';
import { Spacing, Shadow } from '../../../src/constants/spacing';
import { Typography } from '../../../src/constants/typography';
import { colorWithAlpha } from '../../../src/utils/colorAlpha';
import { assigneeFallbackAvatarColors } from '../../../src/utils/assigneeAvatarColors';
import { AddFamilyEventModal } from '../../../src/components/parent/schedule/AddFamilyEventModal';
import { ParentHouseholdSwitcherCard } from '../../../src/components/parent/ParentHouseholdSwitcherCard';
import { WeekRoutineGrid } from '../../../src/components/parent/schedule/WeekRoutineGrid';

type CalView = 'month' | 'week' | 'day';

const DOT = COLORS.parent.primary;
const WSTART = 0; // Sunday

function dayKey(d: Date): string {
  return format(d, 'yyyy-MM-dd');
}

const WDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

function weeklyRecurrenceLabel(ev: FamilyCalendarEventInstance): string {
  const days =
    ev.recurrenceByWeekdays != null && ev.recurrenceByWeekdays.length > 0
      ? [...new Set(ev.recurrenceByWeekdays)].sort((a, b) => a - b)
      : ev.recurrenceByWeekday != null
        ? [ev.recurrenceByWeekday]
        : [];
  if (days.length === 0) return 'Weekly';
  const part = days.map((d) => WDAY_SHORT[d] ?? '?').join(', ');
  return days.length === 1 ? `Weekly · ${part}` : `Weekly · ${part}`;
}

function typeChipColor(type: string): string {
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

export default function FamilyScheduleScreen() {
  const insets = useSafeAreaInsets();
  const familyId = useFamilyStore((s) => s.activeFamilyId);
  const [view, setView] = useState<CalView>('month');
  const [selected, setSelected] = useState(() => new Date());
  const [addOpen, setAddOpen] = useState(false);
  const [calendarEditEvent, setCalendarEditEvent] = useState<FamilyCalendarEventInstance | null>(
    null,
  );
  const [weekDetailEvent, setWeekDetailEvent] = useState<FamilyCalendarEventInstance | null>(null);
  const mainScrollRef = useRef<ScrollView>(null);
  const weekPlanScrollReady = useRef(true);
  const queryClient = useQueryClient();

  const weekAnchorKey = useMemo(
    () => format(startOfWeek(selected, { weekStartsOn: WSTART }), 'yyyy-MM-dd'),
    [selected],
  );

  useEffect(() => {
    if (view !== 'week') {
      setWeekDetailEvent(null);
    }
  }, [view]);

  useEffect(() => {
    setWeekDetailEvent(null);
  }, [weekAnchorKey]);

  const selectedDayKey = dayKey(selected);
  const prevDayKeyRef = useRef(selectedDayKey);
  useEffect(() => {
    if (view === 'week' && selectedDayKey !== prevDayKeyRef.current) {
      setWeekDetailEvent(null);
    }
    prevDayKeyRef.current = selectedDayKey;
  }, [selectedDayKey, view]);

  const onWeekPlanSectionLayout = useCallback((e: LayoutChangeEvent) => {
    if (!weekPlanScrollReady.current) return;
    weekPlanScrollReady.current = false;
    const y = e.nativeEvent.layout.y;
    requestAnimationFrame(() => {
      mainScrollRef.current?.scrollTo({ y: Math.max(0, y - 16), animated: true });
    });
  }, []);

  const range = useMemo(() => {
    if (view === 'day') {
      const a = startOfDay(selected);
      return { from: a, to: endOfDay(selected) };
    }
    if (view === 'week') {
      return {
        from: startOfWeek(selected, { weekStartsOn: WSTART }),
        to: endOfWeek(selected, { weekStartsOn: WSTART }),
      };
    }
    return {
      from: startOfMonth(selected),
      to: endOfMonth(selected),
    };
  }, [view, selected]);

  const { data: events, isLoading } = useQuery({
    queryKey: ['family-calendar', familyId, range.from.toISOString(), range.to.toISOString()],
    queryFn: async () => {
      if (!familyId) return [] as FamilyCalendarEventInstance[];
      const { data } = await apiClient.get<FamilyCalendarEventInstance[]>(
        API_ENDPOINTS.calendar.events(familyId),
        { params: { from: range.from.toISOString(), to: range.to.toISOString() } },
      );
      return data;
    },
    enabled: !!familyId,
  });

  const byDay = useMemo(() => {
    const m = new Map<string, FamilyCalendarEventInstance[]>();
    for (const e of events ?? []) {
      const k = e.startAt.slice(0, 10);
      const arr = m.get(k) ?? [];
      arr.push(e);
      m.set(k, arr);
    }
    for (const arr of m.values()) {
      arr.sort((a, b) => a.startAt.localeCompare(b.startAt));
    }
    return m;
  }, [events]);

  const markedDates = useMemo(() => {
    const md: Record<string, object> = {};
    for (const k of byDay.keys()) {
      md[k] = { marked: true, dotColor: DOT };
    }
    const s = dayKey(selected);
    md[s] = {
      ...(md[s] ?? {}),
      selected: true,
      selectedColor: COLORS.parent.primary,
      selectedTextColor: '#fff',
    };
    return md;
  }, [byDay, selected]);

  const dayItems = byDay.get(dayKey(selected)) ?? [];

  const goBack = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/(parent)/family-space');
  }, []);

  const del = useMutation({
    mutationFn: async (baseEventId: string) => {
      if (!familyId) return;
      await apiClient.delete(API_ENDPOINTS.calendar.event(familyId, baseEventId));
    },
    onSuccess: (_d, baseEventId) => {
      setWeekDetailEvent((cur) => (cur && cur.baseEventId === baseEventId ? null : cur));
      void queryClient.invalidateQueries({ queryKey: ['family-calendar', familyId] });
    },
  });

  const onDelete = (ev: FamilyCalendarEventInstance) => {
    const msg =
      ev.recurrenceKind === 'WEEKLY'
        ? 'Delete this repeating series? All future week occurrences will be removed.'
        : 'Delete this event?';
    Alert.alert('Remove event', msg, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => del.mutate(ev.baseEventId) },
    ]);
  };

  const onDayPress = (d: DateData) => {
    setSelected(parseISO(d.dateString));
  };

  if (!familyId) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <Text style={styles.muted}>No family selected — go to Family space first.</Text>
        <TouchableOpacity onPress={goBack} style={{ marginTop: 12 }}>
          <Text style={styles.link}>Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={[colorWithAlpha(COLORS.parent.primary, 0.2), 'transparent']}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      <View style={[styles.topBar, { paddingTop: insets.top + 4 }]}>
        <TouchableOpacity
          onPress={goBack}
          style={styles.backBtn}
          hitSlop={12}
          accessibilityLabel="Back"
        >
          <Ionicons name="chevron-back" size={26} color={COLORS.parent.text} />
        </TouchableOpacity>
        <View style={styles.topTitleBlock}>
          <Text style={styles.topTitle}>Family schedule</Text>
        </View>
        <View style={styles.backBtn} />
      </View>

      <ParentHouseholdSwitcherCard invalidateQueryKeysAfterSwitch={[['family-calendar']]} />

      <View style={styles.viewChips}>
        {(['month', 'week', 'day'] as const).map((v) => (
          <Pressable
            key={v}
            onPress={() => setView(v)}
            style={[styles.chip, view === v && styles.chipOn]}
          >
            <Text style={[styles.chipText, view === v && styles.chipTextOn]}>
              {v === 'month' ? 'Month' : v === 'week' ? 'Week' : 'Day'}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView
        ref={mainScrollRef}
        contentContainerStyle={[styles.body, { paddingBottom: 100 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
      >
        {view === 'month' && (
          <View style={styles.card}>
            <Calendar
              firstDay={WSTART}
              current={dayKey(selected)}
              markedDates={markedDates}
              onDayPress={onDayPress}
              style={{ borderRadius: 20 }}
              theme={{
                backgroundColor: 'transparent',
                calendarBackground: 'transparent',
                textSectionTitleColor: COLORS.parent.textSecondary,
                selectedDayBackgroundColor: COLORS.parent.primary,
                todayTextColor: COLORS.parent.primary,
                dayTextColor: COLORS.parent.text,
                textDisabledColor: 'rgba(0,0,0,0.25)',
                dotColor: DOT,
                selectedDotColor: '#fff',
                arrowColor: COLORS.parent.primary,
                monthTextColor: COLORS.parent.text,
                textDayFontFamily: Typography.fonts.interMedium,
                textMonthFontFamily: Typography.fonts.interBold,
                textDayHeaderFontFamily: Typography.fonts.interMedium,
                textDayFontSize: 15,
                textMonthFontSize: 19,
                textDayHeaderFontSize: 12,
              }}
            />
          </View>
        )}

        {view === 'week' && (
          <>
            <View style={styles.routineListHead}>
              <Text style={styles.listHeadTitle}>Weekly routine</Text>
              <Text style={styles.routineSub}>
                Tap a block for details below — long-press to remove
              </Text>
            </View>
            <View style={styles.card}>
              <View style={styles.weekNavRow}>
                <TouchableOpacity
                  onPress={() => setSelected((d) => addDays(d, -7))}
                  style={styles.navPad}
                  hitSlop={8}
                >
                  <Ionicons name="chevron-back" size={20} color={COLORS.parent.primary} />
                </TouchableOpacity>
                <Text style={styles.weekLabel}>
                  {format(startOfWeek(selected, { weekStartsOn: WSTART }), 'MMM d')} –{' '}
                  {format(endOfWeek(selected, { weekStartsOn: WSTART }), 'MMM d, yyyy')}
                </Text>
                <TouchableOpacity
                  onPress={() => setSelected((d) => addDays(d, 7))}
                  style={styles.navPad}
                  hitSlop={8}
                >
                  <Ionicons name="chevron-forward" size={20} color={COLORS.parent.primary} />
                </TouchableOpacity>
              </View>
            </View>
            <WeekRoutineGrid
              anchorDate={selected}
              events={events ?? []}
              selected={selected}
              onSelectDay={setSelected}
              onEventPress={(ev) => {
                weekPlanScrollReady.current = true;
                setWeekDetailEvent(ev);
              }}
              onEventLongPress={onDelete}
            />
            {weekDetailEvent ? (
              <View
                key={weekDetailEvent.id}
                style={styles.weekPlanSection}
                onLayout={onWeekPlanSectionLayout}
              >
                <Text style={styles.weekPlanSectionTitle}>Event plan</Text>
                <EventRow
                  ev={weekDetailEvent}
                  onEdit={() => {
                    setCalendarEditEvent(weekDetailEvent);
                    setAddOpen(true);
                  }}
                  onDelete={() => onDelete(weekDetailEvent)}
                />
              </View>
            ) : null}
          </>
        )}

        {view === 'day' && (
          <View style={styles.card}>
            <View style={styles.weekNavRow}>
              <TouchableOpacity
                onPress={() => setSelected((d) => addDays(d, -1))}
                style={styles.navPad}
                hitSlop={8}
              >
                <Ionicons name="chevron-back" size={20} color={COLORS.parent.primary} />
              </TouchableOpacity>
              <Text style={styles.dayBig}>{format(selected, 'EEEE, MMM d')}</Text>
              <TouchableOpacity
                onPress={() => setSelected((d) => addDays(d, 1))}
                style={styles.navPad}
                hitSlop={8}
              >
                <Ionicons name="chevron-forward" size={20} color={COLORS.parent.primary} />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {view !== 'week' && (
          <>
            <View style={styles.listHead}>
              <Text style={styles.listHeadTitle}>
                {view === 'day' ? "Today's plan" : 'Selected day'}
              </Text>
              {isLoading && <Text style={styles.mutedSm}>Loading…</Text>}
            </View>
            {view === 'day' || view === 'month'
              ? (() => {
                  if (dayItems.length === 0 && !isLoading) {
                    return (
                      <Text style={styles.mutedC}>
                        No events for this day — add something to build your rhythm.
                      </Text>
                    );
                  }
                  return (
                    <View style={{ gap: 10 }}>
                      {dayItems.map((ev) => (
                        <EventRow
                          key={ev.id}
                          ev={ev}
                          onEdit={() => {
                            setCalendarEditEvent(ev);
                            setAddOpen(true);
                          }}
                          onDelete={() => onDelete(ev)}
                        />
                      ))}
                    </View>
                  );
                })()
              : null}
          </>
        )}
      </ScrollView>

      <TouchableOpacity
        style={[styles.fab, { bottom: 24 + insets.bottom }]}
        onPress={() => {
          setCalendarEditEvent(null);
          setAddOpen(true);
        }}
        activeOpacity={0.9}
        accessibilityLabel="Add event"
      >
        <LinearGradient
          colors={[COLORS.parent.primary, '#2563EB']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.fabGrad}
        >
          <Ionicons name="add" size={30} color="#fff" />
        </LinearGradient>
      </TouchableOpacity>

      <AddFamilyEventModal
        visible={addOpen}
        onClose={() => {
          setAddOpen(false);
          setCalendarEditEvent(null);
        }}
        familyId={familyId}
        defaultDate={selected}
        editEvent={calendarEditEvent}
      />

    </View>
  );
}

function planCardInitialLetter(name: string): string {
  const t = name.trim();
  if (!t) return '?';
  return t[0]!.toUpperCase();
}

function PlanCardAssignees({ assignees }: { assignees: FamilyCalendarEventAssignee[] }) {
  const maxShow = 6;
  const list = assignees.slice(0, maxShow);
  const extra = assignees.length - maxShow;
  if (list.length === 0) return null;
  return (
    <View style={styles.eAssigneeRow}>
      {list.map((a, i) => {
        const key = `${a.kind}-${a.id}`;
        const fb = assigneeFallbackAvatarColors(key);
        return (
          <View key={key} style={[styles.eAvatarWrap, i > 0 && styles.eAvatarWrapSpacer]}>
            {a.avatarUrl ? (
              <Image source={{ uri: a.avatarUrl }} style={styles.eAvatarImg} />
            ) : (
              <View style={[styles.eAvatarImg, { backgroundColor: fb.backgroundColor }]}>
                <Text style={[styles.eAvatarLetter, { color: fb.letterColor }]}>
                  {planCardInitialLetter(a.displayName)}
                </Text>
              </View>
            )}
          </View>
        );
      })}
      {extra > 0 ? (
        <View style={[styles.eAvatarWrap, styles.eAvatarWrapSpacer, styles.eAvatarMore]}>
          <Text style={styles.eAvatarMoreText}>+{extra}</Text>
        </View>
      ) : null}
    </View>
  );
}

function EventRow({
  ev,
  onEdit,
  onDelete,
}: {
  ev: FamilyCalendarEventInstance;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const start = parseISO(ev.startAt);
  const end = ev.endAt ? parseISO(ev.endAt) : null;
  const typeLabel = ev.type.toLowerCase().replace(/_/g, ' ');
  return (
    <View style={styles.eRow}>
      <View style={[styles.eBar, { backgroundColor: typeChipColor(ev.type) }]} />
      <View style={styles.eContent}>
        <View style={styles.eHeaderRow}>
          <View style={styles.eHeaderLeft}>
            <Text style={styles.eTime}>
              {format(start, 'h:mm a')}
              {end ? ` – ${format(end, 'h:mm a')}` : ''}
            </Text>
          </View>
          <Text style={styles.eTypeCorner} numberOfLines={2}>
            {typeLabel}
          </Text>
        </View>
        {ev.recurrenceKind === 'WEEKLY' && (
          <View style={styles.badgeR}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              nestedScrollEnabled
              contentContainerStyle={styles.badgeRScrollInner}
            >
              <Ionicons
                name="repeat"
                size={12}
                color={COLORS.parent.primary}
                style={styles.badgeRIcon}
              />
              <Text style={styles.badgeRText} numberOfLines={1}>
                {weeklyRecurrenceLabel(ev)}
              </Text>
            </ScrollView>
          </View>
        )}
        <Text style={styles.eTitle}>{ev.title}</Text>
        {ev.location ? (
          <View style={styles.eLocRow}>
            <Ionicons name="location-outline" size={14} color={COLORS.parent.textSecondary} />
            <Text style={styles.eLoc} numberOfLines={2}>
              {ev.location}
            </Text>
          </View>
        ) : null}
        <View style={styles.eFooterRow}>
          <View style={styles.eAssigneeSide}>
            <PlanCardAssignees assignees={ev.assignees ?? []} />
          </View>
          <View style={styles.eActionsCol}>
            <TouchableOpacity
              onPress={onEdit}
              style={styles.editIconBtn}
              hitSlop={8}
              accessibilityLabel="Edit event"
            >
              <Ionicons name="create-outline" size={20} color={COLORS.parent.primary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={onDelete} style={styles.delBtnInline} hitSlop={8}>
              <Text style={styles.delTxt}>Remove</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.parent.background,
    alignItems: 'stretch',
  },
  screen: { flex: 1, padding: 24, justifyContent: 'center' },
  muted: {
    textAlign: 'center',
    color: COLORS.parent.textSecondary,
    fontFamily: Typography.fonts.interRegular,
  },
  link: {
    textAlign: 'center',
    color: COLORS.parent.primary,
    fontFamily: Typography.fonts.interMedium,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: Spacing.screenPadding,
    marginBottom: 6,
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  topTitleBlock: { flex: 1, minWidth: 0, paddingHorizontal: 4 },
  topTitle: {
    fontSize: 22,
    fontFamily: Typography.fonts.interBold,
    color: COLORS.parent.text,
    letterSpacing: -0.3,
  },
  viewChips: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: Spacing.screenPadding,
    marginBottom: 12,
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  chipOn: { backgroundColor: COLORS.parent.primary },
  chipText: { fontSize: 14, fontFamily: Typography.fonts.interMedium, color: COLORS.parent.text },
  chipTextOn: { color: '#fff' },
  body: { paddingHorizontal: Spacing.screenPadding, gap: 12 },
  card: {
    backgroundColor: COLORS.parent.surfaceSolid,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.parent.surfaceBorder,
    overflow: 'hidden',
    ...Shadow.sm,
  },
  weekNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
  },
  navPad: { padding: 4 },
  weekLabel: {
    fontSize: 15,
    fontFamily: Typography.fonts.interBold,
    color: COLORS.parent.text,
    flex: 1,
    textAlign: 'center',
  },
  dayBig: {
    fontSize: 16,
    fontFamily: Typography.fonts.interBold,
    color: COLORS.parent.text,
    flex: 1,
    textAlign: 'center',
  },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 6,
    paddingBottom: 8,
  },
  weekCell: {
    alignItems: 'center',
    borderRadius: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(0,0,0,0.04)',
  },
  weekCellOn: { backgroundColor: colorWithAlpha(COLORS.parent.primary, 0.2) },
  wdLabel: {
    fontSize: 10,
    color: COLORS.parent.textSecondary,
    fontFamily: Typography.fonts.interMedium,
  },
  wdLabelOn: { color: COLORS.parent.primary },
  wdNum: {
    fontSize: 16,
    fontFamily: Typography.fonts.interBold,
    color: COLORS.parent.text,
    marginTop: 2,
  },
  wdNumOn: { color: COLORS.parent.primary },
  wdDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: DOT, marginTop: 4 },
  timeGridHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingBottom: 10,
  },
  timeGridHintText: {
    flex: 1,
    fontSize: 12,
    color: COLORS.parent.textMuted,
    fontFamily: Typography.fonts.interRegular,
  },
  listHead: { marginTop: 4, marginBottom: 4, flexDirection: 'row', alignItems: 'center', gap: 8 },
  routineListHead: { marginBottom: 0, paddingHorizontal: 2 },
  routineSub: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 16,
    color: COLORS.parent.textMuted,
    fontFamily: Typography.fonts.interRegular,
  },
  weekPlanSection: { marginTop: 4 },
  weekPlanSectionTitle: {
    fontSize: 17,
    fontFamily: Typography.fonts.interBold,
    color: COLORS.parent.text,
    marginBottom: 8,
  },
  listHeadTitle: {
    fontSize: 17,
    fontFamily: Typography.fonts.interBold,
    color: COLORS.parent.text,
  },
  mutedSm: {
    fontSize: 12,
    color: COLORS.parent.textMuted,
    fontFamily: Typography.fonts.interRegular,
  },
  subCard: {
    backgroundColor: COLORS.parent.surfaceSolid,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.parent.surfaceBorder,
    ...Shadow.sm,
  },
  subDate: {
    fontSize: 13,
    fontFamily: Typography.fonts.interMedium,
    color: COLORS.parent.textSecondary,
    marginBottom: 6,
  },
  mutedC: {
    textAlign: 'center',
    color: COLORS.parent.textMuted,
    fontFamily: Typography.fonts.interRegular,
    marginVertical: 12,
  },
  eRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.parent.surfaceSolid,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.parent.surfaceBorder,
    ...Shadow.sm,
  },
  eBar: { width: 4 },
  eContent: { flex: 1, paddingHorizontal: 12, paddingVertical: 10 },
  eHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
    alignSelf: 'stretch',
  },
  eHeaderLeft: { flex: 1, minWidth: 0 },
  eTypeCorner: {
    flexShrink: 0,
    maxWidth: '42%',
    fontSize: 11,
    lineHeight: 14,
    textTransform: 'capitalize',
    textAlign: 'right',
    color: COLORS.parent.textMuted,
    fontFamily: Typography.fonts.interSemiBold,
    marginTop: 1,
  },
  eTime: {
    fontSize: 13,
    fontFamily: Typography.fonts.interMedium,
    color: COLORS.parent.textSecondary,
  },
  badgeR: {
    marginTop: 6,
    alignSelf: 'stretch',
    backgroundColor: colorWithAlpha(COLORS.parent.primary, 0.12),
    borderRadius: 8,
    overflow: 'hidden',
  },
  badgeRScrollInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 5,
    gap: 6,
  },
  badgeRIcon: { flexShrink: 0 },
  badgeRText: {
    flexShrink: 0,
    fontSize: 11,
    fontFamily: Typography.fonts.interMedium,
    color: COLORS.parent.primary,
    lineHeight: 14,
  },
  eTitle: {
    fontSize: 17,
    fontFamily: Typography.fonts.interBold,
    color: COLORS.parent.text,
    marginTop: 6,
  },
  eLocRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 4,
    marginTop: 4,
    paddingRight: 4,
  },
  eLoc: {
    flex: 1,
    fontSize: 13,
    fontFamily: Typography.fonts.interRegular,
    color: COLORS.parent.textSecondary,
    lineHeight: 18,
  },
  eFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    gap: 8,
    minHeight: 32,
  },
  eAssigneeSide: { flex: 1, minWidth: 0, justifyContent: 'flex-start' },
  eAssigneeRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  eAvatarWrap: {},
  eAvatarWrapSpacer: { marginLeft: 6 },
  eAvatarImg: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  eAvatarLetter: {
    fontSize: 12,
    fontFamily: Typography.fonts.interBold,
  },
  eAvatarMore: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(92, 61, 46, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  eAvatarMoreText: {
    fontSize: 10,
    fontFamily: Typography.fonts.interBold,
    color: COLORS.parent.textSecondary,
  },
  eActionsCol: { alignItems: 'flex-end', justifyContent: 'center', gap: 2 },
  editIconBtn: { paddingVertical: 2, paddingHorizontal: 2 },
  delBtnInline: { flexShrink: 0, paddingVertical: 2, paddingLeft: 4 },
  delTxt: { fontSize: 13, color: '#B91C1C', fontFamily: Typography.fonts.interMedium },
  fab: { position: 'absolute', right: Spacing.screenPadding, ...Shadow.md },
  fabGrad: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
