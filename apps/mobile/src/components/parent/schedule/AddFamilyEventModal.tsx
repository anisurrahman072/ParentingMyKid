import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Switch,
  Platform,
  Modal,
  Pressable,
  ImageBackground,
} from 'react-native';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { FamilyCalendarEventInstance, MyFamilyListItem } from '@parentingmykid/shared-types';
import { addMinutes, parseISO } from 'date-fns';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../../../constants/colors';
import { Spacing, Shadow } from '../../../constants/spacing';
import { Typography } from '../../../constants/typography';
import { API_ENDPOINTS } from '../../../constants/api';
import { apiClient } from '../../../services/api.client';
import { ParentPrimaryButton } from '../ui/ParentPrimaryButton';
import { colorWithAlpha } from '../../../utils/colorAlpha';
import { useThemeStore, GRADIENT_PRESETS } from '../../../store/theme.store';

const TYPES: Array<{ value: string; label: string }> = [
  { value: 'SCHOOL', label: 'School' },
  { value: 'SPORTS', label: 'Sports' },
  { value: 'APPOINTMENT', label: 'Appointment' },
  { value: 'EXAM', label: 'Exam' },
  { value: 'BIRTHDAY', label: 'Birthday' },
  { value: 'TRIP', label: 'Trip' },
  { value: 'TUITION', label: 'Tuition' },
  { value: 'EID', label: 'Eid / holiday' },
  { value: 'CUSTOM', label: 'Custom' },
];

const WDAY: Array<{ v: number; l: string }> = [
  { v: 0, l: 'Sun' },
  { v: 1, l: 'Mon' },
  { v: 2, l: 'Tue' },
  { v: 3, l: 'Wed' },
  { v: 4, l: 'Thu' },
  { v: 5, l: 'Fri' },
  { v: 6, l: 'Sat' },
];

function mergeCalendarDateKeepTime(dateFromPicker: Date, keepTimeFrom: Date): Date {
  const n = new Date(keepTimeFrom);
  n.setFullYear(dateFromPicker.getFullYear(), dateFromPicker.getMonth(), dateFromPicker.getDate());
  return n;
}

function mergeTimeFromSource(into: Date, timeSource: Date): Date {
  const n = new Date(into);
  n.setHours(timeSource.getHours(), timeSource.getMinutes(), 0, 0);
  return n;
}

type Props = {
  visible: boolean;
  onClose: () => void;
  familyId: string;
  defaultDate: Date;
  /** Edit existing plan (PATCH uses `baseEventId`). */
  editEvent?: FamilyCalendarEventInstance | null;
};

export function AddFamilyEventModal({ visible, onClose, familyId, defaultDate, editEvent = null }: Props) {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { gradientPreset, customBackgroundUri } = useThemeStore();
  const gradient = GRADIENT_PRESETS[gradientPreset];

  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('');
  const [assigneeUserIds, setAssigneeUserIds] = useState<Set<string>>(() => new Set());
  const [assigneeChildIds, setAssigneeChildIds] = useState<Set<string>>(() => new Set());
  const [type, setType] = useState('SCHOOL');
  const [start, setStart] = useState(() => new Date(defaultDate.getTime()));
  const [hasEnd, setHasEnd] = useState(false);
  const [end, setEnd] = useState(() => addMinutes(new Date(), 60));
  const [weekly, setWeekly] = useState(false);
  /** 0=Sun … 6=Sat; at least one day when repeat is on */
  const [weekdays, setWeekdays] = useState<number[]>(() => [new Date().getDay()]);

  const [androidDateOpen, setAndroidDateOpen] = useState(false);
  const [androidStartTimeOpen, setAndroidStartTimeOpen] = useState(false);
  const [androidEndTimeOpen, setAndroidEndTimeOpen] = useState(false);

  const [iosDateOpen, setIosDateOpen] = useState(false);
  const [iosDateDraft, setIosDateDraft] = useState(() => new Date());

  const [iosStartTimeOpen, setIosStartTimeOpen] = useState(false);
  const [iosStartTimeDraft, setIosStartTimeDraft] = useState(() => new Date());

  const [iosEndTimeOpen, setIosEndTimeOpen] = useState(false);
  const [iosEndTimeDraft, setIosEndTimeDraft] = useState(() => new Date());

  const { data: myFamilies } = useQuery({
    queryKey: ['my-families'],
    queryFn: async () => {
      const { data } = await apiClient.get<MyFamilyListItem[]>(API_ENDPOINTS.families.mine);
      return data;
    },
    enabled: visible && !!familyId,
  });
  const roster = useMemo(() => myFamilies?.find((f) => f.id === familyId), [myFamilies, familyId]);

  const toggleAssigneeUser = useCallback((userId: string) => {
    setAssigneeUserIds((prev) => {
      const n = new Set(prev);
      if (n.has(userId)) n.delete(userId);
      else n.add(userId);
      return n;
    });
  }, []);

  const toggleAssigneeChild = useCallback((childId: string) => {
    setAssigneeChildIds((prev) => {
      const n = new Set(prev);
      if (n.has(childId)) n.delete(childId);
      else n.add(childId);
      return n;
    });
  }, []);

  useEffect(() => {
    if (!visible) return;
    if (editEvent) {
      setTitle(editEvent.title);
      setLocation(editEvent.location ?? '');
      setType(editEvent.type);
      const s = parseISO(editEvent.startAt);
      setStart(s);
      if (editEvent.endAt) {
        setHasEnd(true);
        setEnd(parseISO(editEvent.endAt));
      } else {
        setHasEnd(false);
        setEnd(addMinutes(s, 60));
      }
      setWeekly(editEvent.recurrenceKind === 'WEEKLY');
      const wd =
        editEvent.recurrenceByWeekdays.length > 0
          ? [...new Set(editEvent.recurrenceByWeekdays)].sort((a, b) => a - b)
          : editEvent.recurrenceByWeekday != null
            ? [editEvent.recurrenceByWeekday]
            : [s.getDay()];
      setWeekdays(wd);
      const u = new Set<string>();
      const c = new Set<string>();
      for (const a of editEvent.assignees ?? []) {
        if (a.kind === 'user') u.add(a.id);
        else c.add(a.id);
      }
      setAssigneeUserIds(u);
      setAssigneeChildIds(c);
      return;
    }
    const d = new Date(defaultDate.getFullYear(), defaultDate.getMonth(), defaultDate.getDate(), 9, 0, 0, 0);
    setTitle('');
    setStart(d);
    setEnd(addMinutes(d, 60));
    setHasEnd(false);
    setWeekly(false);
    setWeekdays([d.getDay()]);
    setLocation('');
    setType('SCHOOL');
    setAssigneeUserIds(new Set());
    setAssigneeChildIds(new Set());
  }, [visible, defaultDate, editEvent?.id, editEvent?.baseEventId]);

  const toggleWeekday = useCallback((v: number) => {
    setWeekdays((prev) => {
      const s = new Set(prev);
      if (s.has(v)) {
        if (s.size <= 1) return prev;
        s.delete(v);
      } else {
        s.add(v);
      }
      return [...s].sort((a, b) => a - b);
    });
  }, []);

  const create = useMutation({
    mutationFn: async () => {
      if (!title.trim()) throw new Error('Title is required');
      const endIso = hasEnd && end > start ? end.toISOString() : undefined;
      const loc = location.trim();
      const au = [...assigneeUserIds];
      const ac = [...assigneeChildIds];
      await apiClient.post(API_ENDPOINTS.calendar.events(familyId), {
        title: title.trim(),
        type,
        location: loc.length > 0 ? loc : undefined,
        assigneeUserIds: au.length > 0 ? au : undefined,
        assigneeChildIds: ac.length > 0 ? ac : undefined,
        startAt: start.toISOString(),
        endAt: endIso,
        recurrenceKind: weekly ? 'WEEKLY' : 'NONE',
        recurrenceByWeekdays: weekly ? weekdays : undefined,
        recurrenceByWeekday: weekly && weekdays.length > 0 ? weekdays[0] : undefined,
      });
    },
    onSuccess: () => {
      setTitle('');
      setLocation('');
      setAssigneeUserIds(new Set());
      setAssigneeChildIds(new Set());
      void queryClient.invalidateQueries({ queryKey: ['family-calendar', familyId] });
      onClose();
    },
  });

  const update = useMutation({
    mutationFn: async () => {
      if (!editEvent) throw new Error('Nothing to edit');
      if (!title.trim()) throw new Error('Title is required');
      const endIso = hasEnd && end > start ? end.toISOString() : null;
      const loc = location.trim();
      const au = [...assigneeUserIds];
      const ac = [...assigneeChildIds];
      await apiClient.patch(API_ENDPOINTS.calendar.event(familyId, editEvent.baseEventId), {
        title: title.trim(),
        type,
        location: loc.length > 0 ? loc : null,
        assigneeUserIds: au,
        assigneeChildIds: ac,
        startAt: start.toISOString(),
        endAt: endIso,
        recurrenceKind: weekly ? 'WEEKLY' : 'NONE',
        recurrenceByWeekdays: weekly ? weekdays : null,
        recurrenceByWeekday: weekly && weekdays.length > 0 ? weekdays[0]! : null,
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['family-calendar', familyId] });
      onClose();
    },
  });

  const openStartDate = useCallback(() => {
    setIosDateDraft(new Date(start));
    if (Platform.OS === 'android') setAndroidDateOpen(true);
    else setIosDateOpen(true);
  }, [start]);

  const openStartTime = useCallback(() => {
    setIosStartTimeDraft(new Date(start));
    if (Platform.OS === 'android') setAndroidStartTimeOpen(true);
    else setIosStartTimeOpen(true);
  }, [start]);

  const openEndTime = useCallback(() => {
    setIosEndTimeDraft(new Date(end));
    if (Platform.OS === 'android') setAndroidEndTimeOpen(true);
    else setIosEndTimeOpen(true);
  }, [end]);

  const onAndroidDateChange = useCallback((event: DateTimePickerEvent, date?: Date) => {
    setAndroidDateOpen(false);
    if (event.type === 'dismissed' || !date) return;
    setStart((prev) => mergeCalendarDateKeepTime(date, prev));
  }, []);

  const onAndroidStartTimeChange = useCallback((event: DateTimePickerEvent, date?: Date) => {
    setAndroidStartTimeOpen(false);
    if (event.type === 'dismissed' || !date) return;
    setStart((prev) => mergeTimeFromSource(prev, date));
  }, []);

  const onAndroidEndTimeChange = useCallback((event: DateTimePickerEvent, date?: Date) => {
    setAndroidEndTimeOpen(false);
    if (event.type === 'dismissed' || !date) return;
    setEnd((prev) => mergeTimeFromSource(prev, date));
  }, []);

  const confirmIosDate = useCallback(() => {
    setStart((prev) => mergeCalendarDateKeepTime(iosDateDraft, prev));
    setIosDateOpen(false);
  }, [iosDateDraft]);

  const confirmIosStartTime = useCallback(() => {
    setStart((prev) => mergeTimeFromSource(prev, iosStartTimeDraft));
    setIosStartTimeOpen(false);
  }, [iosStartTimeDraft]);

  const confirmIosEndTime = useCallback(() => {
    setEnd((prev) => mergeTimeFromSource(prev, iosEndTimeDraft));
    setIosEndTimeOpen(false);
  }, [iosEndTimeDraft]);

  useEffect(() => {
    if (hasEnd && end <= start) setEnd(addMinutes(start, 60));
  }, [start, hasEnd, end]);

  if (!visible) return null;

  return (
    <View style={[styles.overlay, { paddingTop: insets.top }]}>
      {customBackgroundUri ? (
        <ImageBackground source={{ uri: customBackgroundUri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
      ) : (
        <LinearGradient colors={gradient} style={StyleSheet.absoluteFill} />
      )}

      <View style={styles.sheet}>
        <View style={styles.grab} />
        <View style={styles.headerRow}>
          <Text style={styles.title}>{editEvent ? 'Edit event' : 'Add event'}</Text>
          <TouchableOpacity
            onPress={onClose}
            hitSlop={14}
            accessibilityRole="button"
            accessibilityLabel="Close"
            style={styles.closeBtn}
          >
            <Ionicons name="close" size={28} color={COLORS.parent.primary} />
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={[styles.body, { paddingBottom: 40 + insets.bottom }]} keyboardShouldPersistTaps="handled">
          <Text style={styles.label}>What&apos;s happening?</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="e.g. Football practice"
            placeholderTextColor="rgba(0,0,0,0.35)"
            maxLength={200}
          />

          <Text style={styles.label}>Type</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
            contentContainerStyle={styles.typeRow}
          >
            {TYPES.map((t) => (
              <TouchableOpacity
                key={t.value}
                onPress={() => setType(t.value)}
                style={[styles.typeChip, type === t.value && styles.typeChipOn]}
              >
                <Text style={[styles.typeChipText, type === t.value && styles.typeChipTextOn]}>{t.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={styles.label}>Location</Text>
          <Text style={styles.hintOptional}>Optional — e.g. school name or address</Text>
          <TextInput
            style={styles.input}
            value={location}
            onChangeText={setLocation}
            placeholder="e.g. Riverside Elementary"
            placeholderTextColor="rgba(0,0,0,0.35)"
            maxLength={300}
          />

          {roster && (roster.members.length > 0 || roster.children.length > 0) ? (
            <View style={styles.involveBox}>
              <Text style={styles.involveBoxHeading}>Who&apos;s involved?</Text>
              <Text style={styles.involveBoxHint}>Optional — parents and kids this event is for</Text>
              {roster.members.length > 0 ? (
                <>
                  <Text style={styles.subLabelInBox}>Family members</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    nestedScrollEnabled
                    keyboardShouldPersistTaps="handled"
                    contentContainerStyle={styles.assigneeRowInBox}
                  >
                    {roster.members.map((m) => {
                      const on = assigneeUserIds.has(m.userId);
                      return (
                        <TouchableOpacity
                          key={m.userId}
                          onPress={() => toggleAssigneeUser(m.userId)}
                          style={[styles.assigneeChip, on && styles.assigneeChipOn]}
                        >
                          <Text style={[styles.assigneeChipText, on && styles.assigneeChipTextOn]} numberOfLines={1}>
                            {m.name}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </>
              ) : null}
              {roster.children.length > 0 ? (
                <>
                  <Text style={styles.subLabelInBoxChildren}>Children</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    nestedScrollEnabled
                    keyboardShouldPersistTaps="handled"
                    contentContainerStyle={styles.assigneeRowInBox}
                  >
                    {roster.children.map((c) => {
                      const on = assigneeChildIds.has(c.id);
                      return (
                        <TouchableOpacity
                          key={c.id}
                          onPress={() => toggleAssigneeChild(c.id)}
                          style={[styles.assigneeChip, on && styles.assigneeChipOn]}
                        >
                          <Text style={[styles.assigneeChipText, on && styles.assigneeChipTextOn]} numberOfLines={1}>
                            {c.name}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </>
              ) : null}
            </View>
          ) : null}

          <Text style={styles.label}>Date</Text>
          <TouchableOpacity style={styles.timeBtn} onPress={openStartDate} accessibilityLabel="Choose start date">
            <Text style={styles.timeBtnText}>
              {start.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
            </Text>
            <View style={styles.timeBtnIconWrap}>
              <Ionicons name="calendar-outline" size={22} color={COLORS.parent.primary} />
            </View>
          </TouchableOpacity>

          <Text style={styles.label}>Start Time</Text>
          <TouchableOpacity style={styles.timeBtn} onPress={openStartTime} accessibilityLabel="Choose start time">
            <Text style={styles.timeBtnText}>
              {start.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
            </Text>
            <View style={styles.timeBtnIconWrap}>
              <Ionicons name="time-outline" size={22} color={COLORS.parent.primary} />
            </View>
          </TouchableOpacity>

          <View style={styles.rowBetween}>
            <Text style={styles.label}>End time</Text>
            <Switch value={hasEnd} onValueChange={setHasEnd} trackColor={{ true: COLORS.parent.primary }} />
          </View>
          {hasEnd && (
            <TouchableOpacity style={styles.timeBtn} onPress={openEndTime} accessibilityLabel="Choose end time">
              <Text style={styles.timeBtnText}>
                {end.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </TouchableOpacity>
          )}

          <View style={styles.rowBetween}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text style={styles.label}>Repeat every week</Text>
              <Text style={styles.hint}>Same time on each chosen day — pick one or more</Text>
            </View>
            <Switch
              value={weekly}
              onValueChange={(v) => {
                setWeekly(v);
                if (v) setWeekdays((prev) => (prev.length > 0 ? prev : [start.getDay()]));
              }}
              trackColor={{ true: COLORS.parent.primary }}
            />
          </View>
          {weekly && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled
              contentContainerStyle={styles.wdayRow}
            >
              {WDAY.map((d) => {
                const on = weekdays.includes(d.v);
                return (
                  <TouchableOpacity
                    key={d.v}
                    onPress={() => toggleWeekday(d.v)}
                    style={[styles.wday, on && styles.wdayOn]}
                  >
                    <Text style={[styles.wdayTxt, on && styles.wdayTxtOn]}>{d.l}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}

          {(create.isError || update.isError) && (
            <Text style={styles.err}>Could not save. Check details and try again.</Text>
          )}

          <ParentPrimaryButton
            label={editEvent ? 'Save changes' : 'Save event'}
            loadingLabel={editEvent ? 'Saving changes…' : 'Saving event…'}
            loading={create.isPending || update.isPending}
            onPress={() => (editEvent ? update.mutate() : create.mutate())}
            disabled={
              !title.trim() ||
              create.isPending ||
              update.isPending ||
              (weekly && weekdays.length === 0)
            }
          />
        </ScrollView>
      </View>

      {Platform.OS === 'android' && androidDateOpen && (
        <DateTimePicker value={start} mode="date" display="calendar" onChange={onAndroidDateChange} />
      )}
      {Platform.OS === 'android' && androidStartTimeOpen && (
        <DateTimePicker value={start} mode="time" display="default" onChange={onAndroidStartTimeChange} />
      )}
      {Platform.OS === 'android' && hasEnd && androidEndTimeOpen && (
        <DateTimePicker value={end} mode="time" display="default" onChange={onAndroidEndTimeChange} />
      )}

      <Modal
        visible={iosDateOpen}
        animationType="slide"
        transparent
        presentationStyle="overFullScreen"
        onRequestClose={() => setIosDateOpen(false)}
      >
        <View style={styles.pickerModalRoot}>
          <Pressable style={styles.backdrop} onPress={() => setIosDateOpen(false)} />
          <View style={[styles.pickerSheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Start date</Text>
            <Text style={styles.sheetHint}>Pick the day this event begins.</Text>
            <View style={styles.pickerShell}>
              <DateTimePicker
                value={iosDateDraft}
                mode="date"
                display="inline"
                themeVariant="light"
                onChange={(_, d) => {
                  if (d) setIosDateDraft(d);
                }}
                style={styles.iosPicker}
              />
            </View>
            <ParentPrimaryButton label="OK" onPress={confirmIosDate} />
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setIosDateOpen(false)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={iosStartTimeOpen}
        animationType="slide"
        transparent
        presentationStyle="overFullScreen"
        onRequestClose={() => setIosStartTimeOpen(false)}
      >
        <View style={styles.pickerModalRoot}>
          <Pressable style={styles.backdrop} onPress={() => setIosStartTimeOpen(false)} />
          <View style={[styles.pickerSheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Start time</Text>
            <Text style={styles.sheetHint}>When does it begin?</Text>
            <View style={styles.pickerShell}>
              <DateTimePicker
                value={iosStartTimeDraft}
                mode="time"
                display="spinner"
                themeVariant="light"
                onChange={(_, d) => {
                  if (d) setIosStartTimeDraft(d);
                }}
                style={styles.iosTimePicker}
              />
            </View>
            <ParentPrimaryButton label="OK" onPress={confirmIosStartTime} />
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setIosStartTimeOpen(false)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={iosEndTimeOpen}
        animationType="slide"
        transparent
        presentationStyle="overFullScreen"
        onRequestClose={() => setIosEndTimeOpen(false)}
      >
        <View style={styles.pickerModalRoot}>
          <Pressable style={styles.backdrop} onPress={() => setIosEndTimeOpen(false)} />
          <View style={[styles.pickerSheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>End time</Text>
            <Text style={styles.sheetHint}>When does it finish?</Text>
            <View style={styles.pickerShell}>
              <DateTimePicker
                value={iosEndTimeDraft}
                mode="time"
                display="spinner"
                themeVariant="light"
                onChange={(_, d) => {
                  if (d) setIosEndTimeDraft(d);
                }}
                style={styles.iosTimePicker}
              />
            </View>
            <ParentPrimaryButton label="OK" onPress={confirmIosEndTime} />
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setIosEndTimeOpen(false)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2000,
    elevation: 2000,
  },
  sheet: {
    flex: 1,
    paddingTop: 6,
  },
  grab: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(0,0,0,0.12)',
    marginBottom: 6,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.screenPadding,
    marginBottom: 8,
  },
  title: { fontSize: 20, fontFamily: Typography.fonts.interBold, color: COLORS.parent.text },
  closeBtn: { padding: 4, marginRight: -2 },
  body: { padding: Spacing.screenPadding, paddingBottom: 40, gap: 6 },
  label: { fontSize: 13, fontFamily: Typography.fonts.interMedium, color: COLORS.parent.textSecondary, marginTop: 6 },
  hint: { fontSize: 12, color: COLORS.parent.textMuted, fontFamily: Typography.fonts.interRegular },
  hintOptional: {
    fontSize: 12,
    color: COLORS.parent.textMuted,
    fontFamily: Typography.fonts.interRegular,
    marginTop: -2,
    marginBottom: 4,
  },
  subLabel: {
    fontSize: 12,
    fontFamily: Typography.fonts.interSemiBold,
    color: COLORS.parent.textSecondary,
    marginTop: 8,
    marginBottom: 4,
  },
  involveBox: {
    marginTop: 10,
    backgroundColor: COLORS.parent.surfaceSolid,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.parent.surfaceBorder,
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 12,
    ...Shadow.sm,
  },
  involveBoxHeading: {
    fontSize: 16,
    fontFamily: Typography.fonts.interBold,
    color: COLORS.parent.text,
    letterSpacing: -0.2,
  },
  involveBoxHint: {
    fontSize: 12,
    fontFamily: Typography.fonts.interRegular,
    color: COLORS.parent.textMuted,
    marginTop: 6,
    lineHeight: 17,
  },
  subLabelInBox: {
    fontSize: 12,
    fontFamily: Typography.fonts.interSemiBold,
    color: COLORS.parent.textSecondary,
    marginTop: 14,
    marginBottom: 6,
  },
  subLabelInBoxChildren: {
    fontSize: 12,
    fontFamily: Typography.fonts.interSemiBold,
    color: COLORS.parent.textSecondary,
    marginTop: 12,
    marginBottom: 6,
  },
  assigneeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
    paddingRight: Spacing.screenPadding,
  },
  assigneeRowInBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
    paddingRight: 4,
  },
  assigneeChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
    maxWidth: 160,
  },
  assigneeChipOn: {
    backgroundColor: colorWithAlpha(COLORS.parent.primary, 0.2),
    borderColor: colorWithAlpha(COLORS.parent.primary, 0.45),
  },
  assigneeChipText: {
    fontSize: 13,
    fontFamily: Typography.fonts.interMedium,
    color: COLORS.parent.text,
  },
  assigneeChipTextOn: { color: COLORS.parent.primary },
  input: {
    borderWidth: 1,
    borderColor: COLORS.parent.surfaceBorder,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: Typography.fonts.interRegular,
    color: COLORS.parent.text,
    backgroundColor: COLORS.parent.surface,
  },
  typeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
    paddingRight: Spacing.screenPadding,
  },
  typeChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.45)',
  },
  typeChipOn: { backgroundColor: colorWithAlpha(COLORS.parent.primary, 0.2) },
  typeChipText: { fontSize: 12, fontFamily: Typography.fonts.interMedium, color: COLORS.parent.text },
  typeChipTextOn: { color: COLORS.parent.primary },
  timeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.parent.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.parent.surfaceBorder,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  timeBtnText: { flex: 1, minWidth: 0, fontSize: 16, fontFamily: Typography.fonts.interMedium, color: COLORS.parent.text },
  timeBtnIconWrap: { marginLeft: 10, opacity: 0.95 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  wdayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    marginBottom: 8,
    paddingRight: Spacing.screenPadding,
  },
  wday: { paddingVertical: 8, paddingHorizontal: 10, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.4)' },
  wdayOn: { backgroundColor: COLORS.parent.primary },
  wdayTxt: { fontSize: 12, fontFamily: Typography.fonts.interSemiBold, color: COLORS.parent.text },
  wdayTxtOn: { color: '#fff' },
  err: { color: '#B91C1C', fontSize: 13, fontFamily: Typography.fonts.interRegular, marginTop: 8 },
  pickerModalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(45, 35, 30, 0.45)',
  },
  pickerSheet: {
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
  iosTimePicker: {
    width: '100%',
    height: 200,
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
