import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { router, useLocalSearchParams } from 'expo-router';
import { apiClient } from '../../../src/services/api.client';
import { useFamilyStore } from '../../../src/store/family.store';
import { COLORS } from '../../../src/constants/colors';
import { SPACING } from '../../../src/constants/spacing';

function formatMinutes(mins: number) {
  if (mins === 0) return '0m';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function Stepper({
  value,
  min,
  max,
  step,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  return (
    <View style={stepperStyles.row}>
      <TouchableOpacity
        style={[stepperStyles.btn, value <= min && stepperStyles.btnDisabled]}
        onPress={() => onChange(Math.max(min, value - step))}
        disabled={value <= min}
      >
        <Text style={stepperStyles.btnText}>−</Text>
      </TouchableOpacity>
      <View style={stepperStyles.valueWrap}>
        <Text style={stepperStyles.value}>{formatMinutes(value)}</Text>
      </View>
      <TouchableOpacity
        style={[stepperStyles.btn, value >= max && stepperStyles.btnDisabled]}
        onPress={() => onChange(Math.min(max, value + step))}
        disabled={value >= max}
      >
        <Text style={stepperStyles.btnText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const stepperStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING[4],
    marginTop: SPACING[3],
  },
  btn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.parent.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnDisabled: { backgroundColor: '#D1D5DB' },
  btnText: {
    fontSize: 22,
    color: '#FFFFFF',
    lineHeight: 26,
  },
  valueWrap: {
    minWidth: 90,
    alignItems: 'center',
  },
  value: {
    fontFamily: 'Inter_700Bold',
    fontSize: 24,
    color: COLORS.parent.textPrimary,
  },
});

export default function GameSettingsScreen() {
  const { childId } = useLocalSearchParams<{ childId: string }>();
  const { dashboard } = useFamilyStore();
  const kid = dashboard?.children?.find((c) => c.childId === childId);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [gamesEnabled, setGamesEnabled] = useState(true);
  const [gameDailyLimitMinutes, setGameDailyLimitMinutes] = useState(30);

  const load = useCallback(async () => {
    if (!childId) return;
    try {
      const { data } = await apiClient.get(`/safety/${childId}/parental-controls`);
      setGamesEnabled(data?.gamesEnabled ?? true);
      setGameDailyLimitMinutes(data?.gameDailyLimitMinutes ?? 30);
    } catch {
      Alert.alert('Error', 'Failed to load settings.');
    } finally {
      setLoading(false);
    }
  }, [childId]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSave() {
    if (!childId) return;
    setSaving(true);
    try {
      await apiClient.patch(`/safety/${childId}/parental-controls`, {
        gamesEnabled,
        gameDailyLimitMinutes,
      });
      Alert.alert('Saved', 'Game Settings updated successfully.');
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
            <Text style={styles.headerTitle}>Game Settings</Text>
            {kid?.name ? <Text style={styles.headerSubtitle}>{kid.name}</Text> : null}
          </View>
          <View style={styles.headerRight} />
        </Animated.View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          {/* Allow Games Toggle */}
          <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.card}>
            <View style={styles.toggleRow}>
              <View style={styles.toggleInfo}>
                <Text style={styles.toggleTitle}>🎮 Allow Games</Text>
                <Text style={styles.toggleDesc}>Enable access to games on the device</Text>
              </View>
              <Switch
                value={gamesEnabled}
                onValueChange={setGamesEnabled}
                trackColor={{ false: '#D1D5DB', true: COLORS.parent.primary }}
                thumbColor="#FFFFFF"
              />
            </View>
          </Animated.View>

          {/* Daily Game Time Limit */}
          {gamesEnabled && (
            <Animated.View entering={FadeInDown.delay(160).springify()}>
              <Text style={styles.sectionLabel}>DAILY GAME TIME LIMIT</Text>
              <View style={styles.card}>
                <View style={styles.cardRow}>
                  <Text style={styles.cardEmoji}>⏰</Text>
                  <View style={styles.cardInfo}>
                    <Text style={styles.cardTitle}>Game Time Limit</Text>
                    <Text style={styles.cardDesc}>Maximum daily gaming time</Text>
                  </View>
                </View>
                <Stepper
                  value={gameDailyLimitMinutes}
                  min={0}
                  max={120}
                  step={10}
                  onChange={setGameDailyLimitMinutes}
                />
                <Text style={styles.limitCaption}>
                  {gameDailyLimitMinutes === 0
                    ? 'No limit set'
                    : `${formatMinutes(gameDailyLimitMinutes)} per day`}
                </Text>
              </View>
            </Animated.View>
          )}

          {/* Info card */}
          <Animated.View entering={FadeInDown.delay(220).springify()} style={styles.infoCard}>
            <Text style={styles.infoEmoji}>💡</Text>
            <Text style={styles.infoText}>
              Games are identified by their app category. For specific game titles, also configure
              the Block Apps feature.
            </Text>
          </Animated.View>

          {/* Save */}
          <Animated.View entering={FadeInDown.delay(280).springify()} style={styles.saveWrap}>
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

  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[3],
  },
  cardEmoji: { fontSize: 28 },
  cardInfo: { flex: 1 },
  cardTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
    color: COLORS.parent.textPrimary,
  },
  cardDesc: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: COLORS.parent.textMuted,
    marginTop: 2,
  },
  limitCaption: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: COLORS.parent.textMuted,
    textAlign: 'center',
    marginTop: SPACING[3],
  },

  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleInfo: { flex: 1, marginRight: SPACING[4] },
  toggleTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
    color: COLORS.parent.textPrimary,
    marginBottom: 4,
  },
  toggleDesc: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: COLORS.parent.textMuted,
  },

  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(59,130,246,0.08)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(59,130,246,0.2)',
    padding: SPACING[4],
    gap: SPACING[3],
    marginBottom: SPACING[4],
  },
  infoEmoji: { fontSize: 20 },
  infoText: {
    flex: 1,
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
