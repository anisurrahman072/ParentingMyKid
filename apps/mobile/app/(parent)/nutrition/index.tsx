/**
 * Nutrition & Health Module — parent view.
 * Meal planner, macro/vitamin tracker, allergy tracker, growth chart,
 * sleep tracker, vaccination reminders, medication log.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { COLORS } from '../../../src/constants/colors';
import { SPACING } from '../../../src/constants/spacing';

type NutritionTab = 'today' | 'sleep' | 'health' | 'growth';

function MacroBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <View style={styles.macroRow}>
      <Text style={styles.macroLabel}>{label}</Text>
      <View style={styles.macroTrack}>
        <View style={[styles.macroFill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
      <Text style={styles.macroValue}>{value}/{max}g</Text>
    </View>
  );
}

function StatCard({ icon, value, label, subtext }: { icon: string; value: string | number; label: string; subtext?: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statIcon}>{icon}</Text>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
      {subtext && <Text style={styles.statSubtext}>{subtext}</Text>}
    </View>
  );
}

export default function NutritionScreen() {
  const [activeTab, setActiveTab] = useState<NutritionTab>('today');

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🥗 Health & Nutrition</Text>
      </View>

      {/* Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabScroll} contentContainerStyle={styles.tabScrollContent}>
        {[
          { key: 'today', label: '🍽️ Today' },
          { key: 'sleep', label: '😴 Sleep' },
          { key: 'health', label: '💊 Health' },
          { key: 'growth', label: '📏 Growth' },
        ].map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key as NutritionTab)}
          >
            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>{tab.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Today's Nutrition */}
        {activeTab === 'today' && (
          <Animated.View entering={FadeInDown.springify()} style={{ gap: SPACING[4] }}>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>📊 Today's Macros</Text>
              <Text style={styles.cardChild}>Amir • Target: 1,800 kcal</Text>

              <MacroBar label="Protein" value={45} max={60} color="#4F46E5" />
              <MacroBar label="Carbs" value={180} max={225} color="#EA580C" />
              <MacroBar label="Fat" value={40} max={60} color="#059669" />
              <MacroBar label="Fibre" value={18} max={25} color="#7C3AED" />

              <View style={styles.calorieCircle}>
                <Text style={styles.calorieValue}>1,240</Text>
                <Text style={styles.calorieLabel}>/ 1,800 kcal</Text>
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>🍽️ Meals Today</Text>
              {[
                { meal: 'Breakfast', icon: '🌅', food: 'Oats, banana, milk', kcal: 320 },
                { meal: 'Lunch', icon: '☀️', food: 'Chicken rice & salad', kcal: 520 },
                { meal: 'Snack', icon: '🍎', food: 'Apple & peanut butter', kcal: 200 },
              ].map((item) => (
                <View key={item.meal} style={styles.mealRow}>
                  <Text style={styles.mealIcon}>{item.icon}</Text>
                  <View style={styles.mealInfo}>
                    <Text style={styles.mealName}>{item.meal}</Text>
                    <Text style={styles.mealFood}>{item.food}</Text>
                  </View>
                  <Text style={styles.mealKcal}>{item.kcal} kcal</Text>
                </View>
              ))}
              <TouchableOpacity style={styles.addButton}>
                <Text style={styles.addButtonText}>+ Log Meal</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>⚠️ Allergies</Text>
              <View style={styles.allergyChips}>
                {['Peanuts', 'Shellfish'].map((allergy) => (
                  <View key={allergy} style={styles.allergyChip}>
                    <Text style={styles.allergyText}>{allergy}</Text>
                  </View>
                ))}
                <TouchableOpacity style={styles.addAllergyChip}>
                  <Text style={styles.addAllergyText}>+ Add</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Animated.View>
        )}

        {/* Sleep Tracker */}
        {activeTab === 'sleep' && (
          <Animated.View entering={FadeInDown.springify()} style={{ gap: SPACING[4] }}>
            <View style={styles.statsRow}>
              <StatCard icon="🛏️" value="9h 20m" label="Last night" subtext="Recommended: 9-11h" />
              <StatCard icon="⭐" value="4.2" label="Sleep quality" subtext="Out of 5.0" />
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>📅 Sleep This Week</Text>
              <View style={styles.sleepChart}>
                {[
                  { day: 'Mon', hours: 9.5 },
                  { day: 'Tue', hours: 8.5 },
                  { day: 'Wed', hours: 10 },
                  { day: 'Thu', hours: 9 },
                  { day: 'Fri', hours: 7.5 },
                  { day: 'Sat', hours: 11 },
                  { day: 'Sun', hours: 9 },
                ].map((day) => (
                  <View key={day.day} style={styles.sleepBar}>
                    <View style={[styles.sleepBarFill, { height: `${(day.hours / 12) * 100}%` }]} />
                    <Text style={styles.sleepBarDay}>{day.day}</Text>
                    <Text style={styles.sleepBarValue}>{day.hours}h</Text>
                  </View>
                ))}
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>🌙 Bedtime Routine</Text>
              <Text style={styles.cardDesc}>Target bedtime: 9:00 PM — Actual: 9:35 PM</Text>
              <TouchableOpacity style={styles.addButton}>
                <Text style={styles.addButtonText}>Set Bedtime Reminder</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        )}

        {/* Health Records */}
        {activeTab === 'health' && (
          <Animated.View entering={FadeInDown.springify()} style={{ gap: SPACING[4] }}>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>💊 Medications</Text>
              <Text style={styles.cardDesc}>No current medications logged.</Text>
              <TouchableOpacity style={styles.addButton}>
                <Text style={styles.addButtonText}>+ Add Medication</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>💉 Vaccinations</Text>
              {[
                { vaccine: 'MMR Booster', due: 'Due in 3 months', status: 'upcoming' },
                { vaccine: 'Influenza', due: 'Sep 2024', status: 'complete' },
                { vaccine: 'HPV (Dose 1)', due: 'Jan 2025', status: 'upcoming' },
              ].map((v) => (
                <View key={v.vaccine} style={styles.vaccineRow}>
                  <Text style={styles.vaccineEmoji}>{v.status === 'complete' ? '✅' : '📅'}</Text>
                  <View style={styles.vaccineInfo}>
                    <Text style={styles.vaccineName}>{v.vaccine}</Text>
                    <Text style={styles.vaccineDue}>{v.due}</Text>
                  </View>
                </View>
              ))}
              <TouchableOpacity style={styles.addButton}>
                <Text style={styles.addButtonText}>+ Add Vaccination</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        )}

        {/* Growth Chart */}
        {activeTab === 'growth' && (
          <Animated.View entering={FadeInDown.springify()} style={{ gap: SPACING[4] }}>
            <View style={styles.statsRow}>
              <StatCard icon="📏" value="138 cm" label="Height" subtext="75th percentile" />
              <StatCard icon="⚖️" value="32 kg" label="Weight" subtext="65th percentile" />
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>📈 Growth Timeline</Text>
              <Text style={styles.cardDesc}>
                Height and weight logged at each doctor's visit. Add a new measurement below.
              </Text>
              <TouchableOpacity style={styles.addButton}>
                <Text style={styles.addButtonText}>+ Log Measurement</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>🏃 Physical Activity</Text>
              {[
                { activity: 'Football training', duration: '60 min', day: 'Yesterday' },
                { activity: 'Walking to school', duration: '20 min', day: 'Today' },
              ].map((a, i) => (
                <View key={i} style={styles.activityRow}>
                  <Text style={styles.activityEmoji}>⚡</Text>
                  <View style={styles.activityInfo}>
                    <Text style={styles.activityName}>{a.activity}</Text>
                    <Text style={styles.activityMeta}>{a.day} • {a.duration}</Text>
                  </View>
                </View>
              ))}
              <TouchableOpacity style={styles.addButton}>
                <Text style={styles.addButtonText}>+ Log Activity</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.parent.background },
  header: {
    paddingHorizontal: SPACING[5],
    paddingVertical: SPACING[4],
  },
  headerTitle: {
    fontSize: 22,
    fontFamily: 'Inter',
    fontWeight: '700',
    color: COLORS.parent.text,
  },
  tabScroll: { maxHeight: 48 },
  tabScrollContent: {
    paddingHorizontal: SPACING[5],
    gap: SPACING[2],
    alignItems: 'center',
  },
  tab: {
    paddingVertical: SPACING[2],
    paddingHorizontal: SPACING[4],
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  tabActive: { backgroundColor: COLORS.parent.primary },
  tabText: {
    fontSize: 13,
    fontFamily: 'Inter',
    fontWeight: '600',
    color: COLORS.parent.textMuted,
  },
  tabTextActive: { color: '#FFFFFF' },
  scrollContent: { padding: SPACING[5], paddingBottom: SPACING[10] },
  card: {
    backgroundColor: COLORS.parent.card,
    borderRadius: 16,
    padding: SPACING[5],
    gap: SPACING[3],
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
  },
  cardTitle: {
    fontSize: 16,
    fontFamily: 'Inter',
    fontWeight: '700',
    color: COLORS.parent.text,
  },
  cardChild: {
    fontSize: 13,
    fontFamily: 'Inter',
    color: COLORS.parent.textMuted,
  },
  cardDesc: {
    fontSize: 14,
    fontFamily: 'Inter',
    color: COLORS.parent.textMuted,
    lineHeight: 20,
  },
  macroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[3],
  },
  macroLabel: {
    fontSize: 13,
    fontFamily: 'Inter',
    color: COLORS.parent.textSecondary,
    width: 60,
  },
  macroTrack: {
    flex: 1,
    height: 10,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 5,
    overflow: 'hidden',
  },
  macroFill: { height: '100%', borderRadius: 5 },
  macroValue: {
    fontSize: 12,
    fontFamily: 'Inter',
    color: COLORS.parent.textMuted,
    width: 60,
    textAlign: 'right',
  },
  calorieCircle: {
    alignSelf: 'center',
    alignItems: 'center',
    paddingVertical: SPACING[3],
  },
  calorieValue: {
    fontSize: 36,
    fontFamily: 'Inter',
    fontWeight: '800',
    color: COLORS.parent.primary,
  },
  calorieLabel: {
    fontSize: 14,
    fontFamily: 'Inter',
    color: COLORS.parent.textMuted,
  },
  mealRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[3],
    paddingVertical: SPACING[2],
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  mealIcon: { fontSize: 20 },
  mealInfo: { flex: 1 },
  mealName: {
    fontSize: 14,
    fontFamily: 'Inter',
    fontWeight: '600',
    color: COLORS.parent.text,
  },
  mealFood: {
    fontSize: 12,
    fontFamily: 'Inter',
    color: COLORS.parent.textMuted,
  },
  mealKcal: {
    fontSize: 13,
    fontFamily: 'Inter',
    fontWeight: '600',
    color: COLORS.parent.primary,
  },
  addButton: {
    borderWidth: 1,
    borderColor: COLORS.parent.primary,
    borderRadius: 10,
    paddingVertical: SPACING[3],
    alignItems: 'center',
    borderStyle: 'dashed',
  },
  addButtonText: {
    fontSize: 14,
    fontFamily: 'Inter',
    fontWeight: '600',
    color: COLORS.parent.primary,
  },
  allergyChips: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING[2] },
  allergyChip: {
    backgroundColor: 'rgba(220,38,38,0.15)',
    borderRadius: 12,
    paddingHorizontal: SPACING[3],
    paddingVertical: SPACING[1],
    borderWidth: 1,
    borderColor: 'rgba(220,38,38,0.3)',
  },
  allergyText: {
    fontSize: 13,
    fontFamily: 'Inter',
    fontWeight: '600',
    color: '#F87171',
  },
  addAllergyChip: {
    borderRadius: 12,
    paddingHorizontal: SPACING[3],
    paddingVertical: SPACING[1],
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    borderStyle: 'dashed',
  },
  addAllergyText: {
    fontSize: 13,
    fontFamily: 'Inter',
    color: COLORS.parent.textMuted,
  },
  statsRow: {
    flexDirection: 'row',
    gap: SPACING[3],
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.parent.card,
    borderRadius: 16,
    padding: SPACING[5],
    alignItems: 'center',
    gap: SPACING[1],
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
  },
  statIcon: { fontSize: 32 },
  statValue: {
    fontSize: 22,
    fontFamily: 'Inter',
    fontWeight: '800',
    color: COLORS.parent.primary,
  },
  statLabel: {
    fontSize: 13,
    fontFamily: 'Inter',
    fontWeight: '600',
    color: COLORS.parent.text,
  },
  statSubtext: {
    fontSize: 11,
    fontFamily: 'Inter',
    color: COLORS.parent.textMuted,
    textAlign: 'center',
  },
  sleepChart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 120,
    gap: SPACING[2],
  },
  sleepBar: {
    flex: 1,
    alignItems: 'center',
    height: '100%',
    justifyContent: 'flex-end',
    gap: 3,
  },
  sleepBarFill: {
    width: '100%',
    backgroundColor: COLORS.parent.primary,
    borderRadius: 4,
    minHeight: 10,
  },
  sleepBarDay: {
    fontSize: 10,
    fontFamily: 'Inter',
    color: COLORS.parent.textMuted,
  },
  sleepBarValue: {
    fontSize: 9,
    fontFamily: 'Inter',
    color: COLORS.parent.primary,
    fontWeight: '600',
  },
  vaccineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[3],
    paddingVertical: SPACING[2],
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  vaccineEmoji: { fontSize: 20 },
  vaccineInfo: { flex: 1 },
  vaccineName: {
    fontSize: 14,
    fontFamily: 'Inter',
    fontWeight: '600',
    color: COLORS.parent.text,
  },
  vaccineDue: {
    fontSize: 12,
    fontFamily: 'Inter',
    color: COLORS.parent.textMuted,
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[3],
    paddingVertical: SPACING[2],
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  activityEmoji: { fontSize: 20 },
  activityInfo: { flex: 1 },
  activityName: {
    fontSize: 14,
    fontFamily: 'Inter',
    fontWeight: '600',
    color: COLORS.parent.text,
  },
  activityMeta: {
    fontSize: 12,
    fontFamily: 'Inter',
    color: COLORS.parent.textMuted,
  },
});
