import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { COLORS } from '../../../src/constants/colors';
import { SPACING } from '../../../src/constants/spacing';
import { useThemeStore, GRADIENT_PRESETS, GradientPreset } from '../../../src/store/theme.store';

const LABELS: Record<GradientPreset, string> = {
  default: 'Nebula',
  midnight: 'Midnight',
  sunset: 'Sunset',
  ocean: 'Ocean',
  forest: 'Forest',
};

export default function AppearanceScreen() {
  const { gradientPreset, setGradientPreset, setCustomBackground } = useThemeStore();

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <Text style={styles.back}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Appearance</Text>
        <View style={styles.back} />
      </View>
      <Text style={styles.hint}>
        Home screen background for the parent app. (Custom photo can be added in a future update.)
      </Text>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {(Object.keys(GRADIENT_PRESETS) as GradientPreset[]).map((key) => {
          const g = GRADIENT_PRESETS[key];
          const selected = gradientPreset === key;
          return (
            <TouchableOpacity
              key={key}
              onPress={() => {
                setCustomBackground(null);
                setGradientPreset(key);
              }}
              style={[styles.card, selected && styles.cardOn]}
            >
              <LinearGradient colors={g} style={styles.swash} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
              <Text style={styles.label}>{LABELS[key]}</Text>
              {selected && <Text style={styles.check}>✓</Text>}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.parent.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING[5],
    paddingBottom: SPACING[3],
  },
  back: { width: 72, color: COLORS.parent.primary, fontSize: 16, fontWeight: '600' },
  title: { fontSize: 18, fontWeight: '800', color: COLORS.parent.text, fontFamily: 'Inter' },
  hint: {
    color: COLORS.parent.textMuted,
    paddingHorizontal: SPACING[5],
    marginBottom: SPACING[4],
    lineHeight: 20,
  },
  scroll: { paddingHorizontal: SPACING[5], paddingBottom: SPACING[8], gap: SPACING[3] },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
    minHeight: 64,
  },
  cardOn: { borderColor: 'rgba(99,102,241,0.6)' },
  swash: { width: 80, minHeight: 64 },
  label: {
    flex: 1,
    marginLeft: SPACING[4],
    color: COLORS.parent.text,
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Inter',
  },
  check: { color: COLORS.parent.primary, fontSize: 20, fontWeight: '800', marginRight: SPACING[4] },
});
