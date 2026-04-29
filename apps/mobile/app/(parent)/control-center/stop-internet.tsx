import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  TextInput,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { router, useLocalSearchParams } from 'expo-router';
import { apiClient } from '../../../src/services/api.client';
import { useFamilyStore } from '../../../src/store/family.store';
import { COLORS } from '../../../src/constants/colors';
import { SPACING } from '../../../src/constants/spacing';
import { isVpnRunning, requestVpnPermission } from '../../../src/services/ParentalControl';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

type ScheduleSlot = {
  id: string;
  days: string[];
  startTime: string;
  endTime: string;
};

function ScheduleCard({
  slot,
  onUpdate,
  onRemove,
}: {
  slot: ScheduleSlot;
  onUpdate: (s: ScheduleSlot) => void;
  onRemove: () => void;
}) {
  function toggleDay(day: string) {
    const days = slot.days.includes(day) ? slot.days.filter((d) => d !== day) : [...slot.days, day];
    onUpdate({ ...slot, days });
  }

  return (
    <View style={scheduleStyles.card}>
      <View style={scheduleStyles.daysRow}>
        {DAYS.map((d) => (
          <TouchableOpacity
            key={d}
            style={[scheduleStyles.dayChip, slot.days.includes(d) && scheduleStyles.dayChipActive]}
            onPress={() => toggleDay(d)}
          >
            <Text
              style={[
                scheduleStyles.dayText,
                slot.days.includes(d) && scheduleStyles.dayTextActive,
              ]}
            >
              {d}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={scheduleStyles.timeRow}>
        <View style={scheduleStyles.timeField}>
          <Text style={scheduleStyles.timeLabel}>Start</Text>
          <TextInput
            style={scheduleStyles.timeInput}
            value={slot.startTime}
            onChangeText={(v) => onUpdate({ ...slot, startTime: v })}
            placeholder="00:00"
            placeholderTextColor={COLORS.parent.textMuted}
            maxLength={5}
            keyboardType="numbers-and-punctuation"
          />
        </View>
        <Text style={scheduleStyles.timeSep}>→</Text>
        <View style={scheduleStyles.timeField}>
          <Text style={scheduleStyles.timeLabel}>End</Text>
          <TextInput
            style={scheduleStyles.timeInput}
            value={slot.endTime}
            onChangeText={(v) => onUpdate({ ...slot, endTime: v })}
            placeholder="23:59"
            placeholderTextColor={COLORS.parent.textMuted}
            maxLength={5}
            keyboardType="numbers-and-punctuation"
          />
        </View>
        <TouchableOpacity style={scheduleStyles.removeBtn} onPress={onRemove}>
          <Text style={scheduleStyles.removeBtnText}>×</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const scheduleStyles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(92,61,46,0.04)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(92,61,46,0.1)',
    padding: SPACING[3],
    marginBottom: SPACING[3],
  },
  daysRow: {
    flexDirection: 'row',
    gap: SPACING[1],
    marginBottom: SPACING[3],
    flexWrap: 'wrap',
  },
  dayChip: {
    paddingHorizontal: SPACING[2],
    paddingVertical: SPACING[1],
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(92,61,46,0.15)',
  },
  dayChipActive: {
    backgroundColor: COLORS.parent.primary,
    borderColor: COLORS.parent.primary,
  },
  dayText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: COLORS.parent.textSecondary,
  },
  dayTextActive: { color: '#FFFFFF' },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: SPACING[2],
  },
  timeField: { flex: 1 },
  timeLabel: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: COLORS.parent.textMuted,
    marginBottom: 4,
  },
  timeInput: {
    height: 38,
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderRadius: 8,
    paddingHorizontal: SPACING[2],
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
    color: COLORS.parent.textPrimary,
    borderWidth: 1,
    borderColor: 'rgba(92,61,46,0.1)',
    textAlign: 'center',
  },
  timeSep: {
    fontFamily: 'Inter_400Regular',
    fontSize: 16,
    color: COLORS.parent.textMuted,
    marginBottom: SPACING[2],
  },
  removeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(220,38,38,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  removeBtnText: {
    fontSize: 20,
    color: COLORS.parent.danger,
    lineHeight: 24,
  },
});

export default function StopInternetScreen() {
  const { childId } = useLocalSearchParams<{ childId: string }>();
  const { dashboard } = useFamilyStore();
  const kid = dashboard?.children?.find((c) => c.childId === childId);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [stopInternetEnabled, setStopInternetEnabled] = useState(false);
  const [scheduleSlots, setScheduleSlots] = useState<ScheduleSlot[]>([]);
  const [vpnStatus, setVpnStatus] = useState<'granted' | 'required'>('required');

  const load = useCallback(async () => {
    if (!childId) return;
    try {
      const { data } = await apiClient.get(`/safety/${childId}/parental-controls`);
      setStopInternetEnabled(data?.stopInternetEnabled ?? false);
      setScheduleSlots(data?.scheduleSlots ?? []);
    } catch {
      Alert.alert('Error', 'Failed to load settings.');
    } finally {
      setLoading(false);
    }

    if (Platform.OS === 'android') {
      const running = await isVpnRunning();
      setVpnStatus(running ? 'granted' : 'required');
    }
  }, [childId]);

  useEffect(() => {
    load();
  }, [load]);

  function handleToggleInternet(value: boolean) {
    if (!value) {
      setStopInternetEnabled(false);
      return;
    }
    Alert.alert(
      'Stop Internet Access?',
      `This will block all internet access for ${kid?.name ?? 'your child'}'s device.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Block',
          style: 'destructive',
          onPress: () => setStopInternetEnabled(true),
        },
      ],
    );
  }

  function handleAddSchedule() {
    const newSlot: ScheduleSlot = {
      id: `${Date.now()}`,
      days: ['Mon'],
      startTime: '22:00',
      endTime: '06:00',
    };
    setScheduleSlots((prev) => [...prev, newSlot]);
  }

  function handleUpdateSlot(id: string, updated: ScheduleSlot) {
    setScheduleSlots((prev) => prev.map((s) => (s.id === id ? updated : s)));
  }

  function handleRemoveSlot(id: string) {
    setScheduleSlots((prev) => prev.filter((s) => s.id !== id));
  }

  async function handleGrantVpn() {
    if (Platform.OS !== 'android') return;
    const ok = await requestVpnPermission();
    if (!ok) {
      Alert.alert(
        'VPN permission',
        'Use a dev or production build with the Parental Control native module.',
      );
    }
  }

  async function handleSave() {
    if (!childId) return;
    setSaving(true);
    try {
      await apiClient.patch(`/safety/${childId}/parental-controls`, {
        stopInternetEnabled,
        scheduleSlots,
      });
      Alert.alert('Saved', 'Stop Internet settings updated successfully.');
    } catch {
      Alert.alert('Error', 'Failed to save settings.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <LinearGradient colors={['#E8F4EC', '#F2E8E9']} style={styles.container}>
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <ActivityIndicator size="large" color={COLORS.parent.primary} style={{ flex: 1 }} />
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={['#E8F4EC', '#F2E8E9']} style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Header */}
        <Animated.View entering={FadeInDown.delay(50).springify()} style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backIcon}>‹</Text>
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Stop Internet</Text>
            {kid?.name ? <Text style={styles.headerSubtitle}>{kid.name}</Text> : null}
          </View>
          <View style={styles.headerRight} />
        </Animated.View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          {/* Big toggle card */}
          <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.bigToggleWrap}>
            <LinearGradient
              colors={stopInternetEnabled ? ['#EF4444', '#DC2626'] : ['#10B981', '#059669']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.bigToggleCard}
            >
              <View style={styles.bigToggleLeft}>
                <Text style={styles.bigToggleEmoji}>{stopInternetEnabled ? '📵' : '🌐'}</Text>
                <View>
                  <Text style={styles.bigToggleTitle}>
                    {stopInternetEnabled ? 'Internet Blocked' : 'Internet Active'}
                  </Text>
                  <Text style={styles.bigToggleDesc}>
                    {stopInternetEnabled
                      ? `${kid?.name ?? 'Child'} cannot access the internet`
                      : `${kid?.name ?? 'Child'} has internet access`}
                  </Text>
                </View>
              </View>
              <Switch
                value={stopInternetEnabled}
                onValueChange={handleToggleInternet}
                trackColor={{ false: 'rgba(255,255,255,0.3)', true: 'rgba(255,255,255,0.3)' }}
                thumbColor="#FFFFFF"
              />
            </LinearGradient>
          </Animated.View>

          {/* Scheduled Block Times */}
          <Animated.View entering={FadeInDown.delay(180).springify()}>
            <Text style={styles.sectionLabel}>SCHEDULED BLOCK TIMES</Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(220).springify()} style={styles.card}>
            {scheduleSlots.length === 0 ? (
              <Text style={styles.emptyText}>No schedule set. Add a schedule below.</Text>
            ) : (
              scheduleSlots.map((slot) => (
                <ScheduleCard
                  key={slot.id}
                  slot={slot}
                  onUpdate={(s) => handleUpdateSlot(slot.id, s)}
                  onRemove={() => handleRemoveSlot(slot.id)}
                />
              ))
            )}
            <TouchableOpacity style={styles.addButton} onPress={handleAddSchedule}>
              <Text style={styles.addButtonText}>+ Add Schedule</Text>
            </TouchableOpacity>
          </Animated.View>

          {/* VPN Permission */}
          <Animated.View entering={FadeInDown.delay(280).springify()}>
            <Text style={styles.sectionLabel}>VPN PERMISSION</Text>
          </Animated.View>

          {Platform.OS === 'android' ? (
            <Animated.View entering={FadeInDown.delay(320).springify()} style={styles.card}>
              <View style={styles.permRow}>
                <View style={styles.permInfo}>
                  <Text style={styles.permLabel}>VPN Service</Text>
                  <Text style={styles.permDesc}>Required for DNS-based internet filtering</Text>
                </View>
                <View style={styles.permRight}>
                  <View
                    style={[
                      styles.badge,
                      vpnStatus === 'granted' ? styles.badgeGranted : styles.badgeRequired,
                    ]}
                  >
                    <Text
                      style={[
                        styles.badgeText,
                        vpnStatus === 'granted'
                          ? styles.badgeTextGranted
                          : styles.badgeTextRequired,
                      ]}
                    >
                      {vpnStatus === 'granted' ? 'Granted' : 'Required'}
                    </Text>
                  </View>
                  {vpnStatus !== 'granted' && (
                    <TouchableOpacity style={styles.grantBtn} onPress={handleGrantVpn}>
                      <Text style={styles.grantBtnText}>Grant</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </Animated.View>
          ) : (
            <Animated.View entering={FadeInDown.delay(320).springify()} style={styles.infoCard}>
              <Text style={styles.infoText}>
                ℹ️ VPN permission is only available on Android builds.
              </Text>
            </Animated.View>
          )}

          {/* Save */}
          <Animated.View entering={FadeInDown.delay(380).springify()} style={styles.saveWrap}>
            <TouchableOpacity
              style={[styles.saveButton, saving && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.saveButtonText}>Save Settings</Text>
              )}
            </TouchableOpacity>
          </Animated.View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING[5],
    paddingVertical: SPACING[4],
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.55)',
  },
  backIcon: {
    fontSize: 26,
    color: COLORS.parent.textPrimary,
    lineHeight: 30,
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 18,
    color: COLORS.parent.textPrimary,
  },
  headerSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: COLORS.parent.textMuted,
    marginTop: 2,
  },
  headerRight: { width: 40 },

  scroll: { paddingHorizontal: SPACING[5], paddingTop: SPACING[2] },

  sectionLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    color: COLORS.parent.textMuted,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: SPACING[2],
    marginTop: SPACING[2],
  },

  bigToggleWrap: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: SPACING[5],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
  },
  bigToggleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING[5],
  },
  bigToggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[3],
  },
  bigToggleEmoji: { fontSize: 32 },
  bigToggleTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 16,
    color: '#FFFFFF',
  },
  bigToggleDesc: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },

  card: {
    backgroundColor: 'rgba(255,255,255,0.72)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.55)',
    padding: SPACING[4],
    marginBottom: SPACING[4],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },

  emptyText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: COLORS.parent.textMuted,
    textAlign: 'center',
    paddingVertical: SPACING[3],
    fontStyle: 'italic',
  },

  addButton: {
    marginTop: SPACING[2],
    paddingVertical: SPACING[3],
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: COLORS.parent.primary,
    borderStyle: 'dashed',
    alignItems: 'center',
  },
  addButtonText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: COLORS.parent.primary,
  },

  permRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  permInfo: { flex: 1, marginRight: SPACING[3] },
  permLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: COLORS.parent.textPrimary,
    marginBottom: 3,
  },
  permDesc: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: COLORS.parent.textMuted,
  },
  permRight: { alignItems: 'flex-end', gap: SPACING[2] },
  badge: {
    paddingHorizontal: SPACING[2],
    paddingVertical: 3,
    borderRadius: 8,
  },
  badgeGranted: { backgroundColor: 'rgba(5,150,105,0.1)' },
  badgeRequired: { backgroundColor: 'rgba(220,38,38,0.1)' },
  badgeText: { fontFamily: 'Inter_600SemiBold', fontSize: 11 },
  badgeTextGranted: { color: COLORS.parent.success },
  badgeTextRequired: { color: COLORS.parent.danger },
  grantBtn: {
    backgroundColor: COLORS.parent.primary,
    borderRadius: 8,
    paddingHorizontal: SPACING[3],
    paddingVertical: SPACING[1],
  },
  grantBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: '#FFFFFF',
  },

  infoCard: {
    backgroundColor: 'rgba(245,158,11,0.08)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.2)',
    padding: SPACING[4],
    marginBottom: SPACING[4],
  },
  infoText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: COLORS.parent.textSecondary,
    lineHeight: 20,
  },

  saveWrap: { marginTop: SPACING[2] },
  saveButton: {
    backgroundColor: COLORS.parent.primary,
    borderRadius: 14,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.parent.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  saveButtonDisabled: { opacity: 0.7 },
  saveButtonText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 16,
    color: '#FFFFFF',
  },
});
