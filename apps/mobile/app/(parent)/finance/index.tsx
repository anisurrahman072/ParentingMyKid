/**
 * Family Finance Module.
 * Budget overview, kids allowance, tuition tracker, savings goals, Zakat calculator.
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

type FinanceTab = 'overview' | 'allowance' | 'tuition' | 'savings' | 'zakat';

export default function FinanceScreen() {
  const [activeTab, setActiveTab] = useState<FinanceTab>('overview');

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>💰 Family Finance</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabScroll} contentContainerStyle={styles.tabScrollContent}>
        {[
          { key: 'overview', label: '📊 Overview' },
          { key: 'allowance', label: '🪙 Allowance' },
          { key: 'tuition', label: '📚 Tuition' },
          { key: 'savings', label: '🏦 Savings' },
          { key: 'zakat', label: '🕌 Zakat' },
        ].map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key as FinanceTab)}
          >
            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>{tab.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Overview */}
        {activeTab === 'overview' && (
          <Animated.View entering={FadeInDown.springify()} style={{ gap: SPACING[4] }}>
            <View style={styles.budgetCard}>
              <Text style={styles.budgetLabel}>Monthly Family Budget</Text>
              <Text style={styles.budgetAmount}>$3,200</Text>
              <View style={styles.budgetBar}>
                <View style={[styles.budgetFill, { width: '67%' }]} />
              </View>
              <Text style={styles.budgetMeta}>$2,140 spent of $3,200 this month</Text>
            </View>

            {[
              { category: 'Education & Tuition', icon: '📚', amount: 800, budget: 900, color: '#4F46E5' },
              { category: 'Food & Groceries', icon: '🛒', amount: 650, budget: 700, color: '#059669' },
              { category: 'Kids Activities', icon: '⚽', amount: 200, budget: 250, color: '#EA580C' },
              { category: 'Healthcare', icon: '💊', amount: 120, budget: 200, color: '#DC2626' },
              { category: 'Savings', icon: '🏦', amount: 370, budget: 400, color: '#7C3AED' },
            ].map((cat) => (
              <View key={cat.category} style={styles.categoryCard}>
                <View style={styles.categoryHeader}>
                  <Text style={styles.categoryIcon}>{cat.icon}</Text>
                  <Text style={styles.categoryName}>{cat.category}</Text>
                  <Text style={[styles.categoryAmount, { color: cat.color }]}>
                    ${cat.amount}/${cat.budget}
                  </Text>
                </View>
                <View style={styles.categoryBar}>
                  <View
                    style={[
                      styles.categoryFill,
                      { width: `${(cat.amount / cat.budget) * 100}%`, backgroundColor: cat.color },
                    ]}
                  />
                </View>
              </View>
            ))}
          </Animated.View>
        )}

        {/* Allowance */}
        {activeTab === 'allowance' && (
          <Animated.View entering={FadeInDown.springify()} style={{ gap: SPACING[4] }}>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>🪙 Amir's Allowance</Text>
              <Text style={styles.allowanceAmount}>$5.00 / week</Text>
              <Text style={styles.cardDesc}>Next payment: Sunday</Text>
              <TouchableOpacity style={styles.editButton}>
                <Text style={styles.editButtonText}>Edit Allowance</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>📋 Allowance Rules</Text>
              <Text style={styles.cardDesc}>
                Link allowance to mission completion to incentivise daily habits.
              </Text>
              {[
                'Complete all 5 daily missions: +$1 bonus',
                '7-day streak: +$2 bonus',
                'Missed day: No deduction (grace policy)',
              ].map((rule, i) => (
                <View key={i} style={styles.ruleRow}>
                  <Text style={styles.ruleBullet}>→</Text>
                  <Text style={styles.ruleText}>{rule}</Text>
                </View>
              ))}
            </View>
          </Animated.View>
        )}

        {/* Tuition */}
        {activeTab === 'tuition' && (
          <Animated.View entering={FadeInDown.springify()} style={{ gap: SPACING[4] }}>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>📚 Tuition Records</Text>
              {[
                { name: 'Maths Tutor — Mr. Khan', amount: 200, date: 'Monthly', status: 'active' },
                { name: 'Arabic Classes', amount: 80, date: 'Monthly', status: 'active' },
                { name: 'School Fees', amount: 450, date: 'Termly', status: 'paid' },
              ].map((t, i) => (
                <View key={i} style={styles.tuitionRow}>
                  <View style={styles.tuitionInfo}>
                    <Text style={styles.tuitionName}>{t.name}</Text>
                    <Text style={styles.tuitionDate}>{t.date}</Text>
                  </View>
                  <View>
                    <Text style={styles.tuitionAmount}>${t.amount}</Text>
                    <Text style={[styles.tuitionStatus, { color: t.status === 'paid' ? '#4ADE80' : COLORS.parent.primary }]}>
                      {t.status}
                    </Text>
                  </View>
                </View>
              ))}
              <TouchableOpacity style={styles.addDashedButton}>
                <Text style={styles.addDashedText}>+ Add Tuition Record</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        )}

        {/* Savings Goals */}
        {activeTab === 'savings' && (
          <Animated.View entering={FadeInDown.springify()} style={{ gap: SPACING[4] }}>
            {[
              { name: "Amir's Laptop Fund", current: 850, target: 1200, emoji: '💻' },
              { name: 'Family Holiday', current: 2100, target: 5000, emoji: '✈️' },
              { name: 'Emergency Fund', current: 3200, target: 5000, emoji: '🛡️' },
            ].map((goal) => {
              const pct = (goal.current / goal.target) * 100;
              return (
                <View key={goal.name} style={styles.card}>
                  <View style={styles.goalHeader}>
                    <Text style={styles.goalEmoji}>{goal.emoji}</Text>
                    <Text style={styles.goalName}>{goal.name}</Text>
                    <Text style={styles.goalPct}>{Math.round(pct)}%</Text>
                  </View>
                  <View style={styles.goalBar}>
                    <View style={[styles.goalFill, { width: `${pct}%` }]} />
                  </View>
                  <Text style={styles.goalMeta}>
                    ${goal.current.toLocaleString()} / ${goal.target.toLocaleString()}
                  </Text>
                </View>
              );
            })}
            <TouchableOpacity style={styles.addDashedButton}>
              <Text style={styles.addDashedText}>+ New Savings Goal</Text>
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* Zakat */}
        {activeTab === 'zakat' && (
          <Animated.View entering={FadeInDown.springify()} style={{ gap: SPACING[4] }}>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>🕌 Zakat Calculator</Text>
              <Text style={styles.cardDesc}>
                Calculate your annual Zakat obligation based on your savings and assets.
              </Text>

              <View style={styles.zakatRow}>
                <Text style={styles.zakatLabel}>Total Savings</Text>
                <Text style={styles.zakatValue}>$18,500</Text>
              </View>
              <View style={styles.zakatRow}>
                <Text style={styles.zakatLabel}>Gold & Silver Value</Text>
                <Text style={styles.zakatValue}>$3,200</Text>
              </View>
              <View style={styles.zakatRow}>
                <Text style={styles.zakatLabel}>Nisab Threshold (Gold)</Text>
                <Text style={styles.zakatValue}>$4,800</Text>
              </View>
              <View style={styles.zakatDivider} />
              <View style={styles.zakatResultRow}>
                <Text style={styles.zakatResultLabel}>Zakat Due (2.5%)</Text>
                <Text style={styles.zakatResultValue}>$543.75</Text>
              </View>

              <TouchableOpacity
                style={styles.zakatButton}
                onPress={() => Alert.alert('Zakat', 'Full Zakat calculator with asset inputs coming soon!')}
              >
                <Text style={styles.zakatButtonText}>Edit Assets & Recalculate</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>📋 Zakat Records</Text>
              <Text style={styles.cardDesc}>Track your Zakat payments for the past years.</Text>
              {[
                { year: '2024', amount: 510, paid: true },
                { year: '2023', amount: 480, paid: true },
              ].map((record) => (
                <View key={record.year} style={styles.zakatRecord}>
                  <Text style={styles.zakatRecordYear}>Zakat {record.year}</Text>
                  <Text style={styles.zakatRecordAmount}>${record.amount}</Text>
                  <Text style={styles.zakatRecordPaid}>{record.paid ? '✅ Paid' : '⏳ Pending'}</Text>
                </View>
              ))}
            </View>
          </Animated.View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.parent.background },
  header: { paddingHorizontal: SPACING[5], paddingVertical: SPACING[4] },
  headerTitle: { fontSize: 22, fontFamily: 'Inter', fontWeight: '700', color: COLORS.parent.text },
  tabScroll: { maxHeight: 48 },
  tabScrollContent: { paddingHorizontal: SPACING[5], gap: SPACING[2], alignItems: 'center' },
  tab: { paddingVertical: SPACING[2], paddingHorizontal: SPACING[4], borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.06)' },
  tabActive: { backgroundColor: COLORS.parent.primary },
  tabText: { fontSize: 13, fontFamily: 'Inter', fontWeight: '600', color: COLORS.parent.textMuted },
  tabTextActive: { color: '#FFFFFF' },
  scrollContent: { padding: SPACING[5], paddingBottom: SPACING[10] },
  budgetCard: {
    backgroundColor: COLORS.parent.primary,
    borderRadius: 20,
    padding: SPACING[5],
    gap: SPACING[3],
  },
  budgetLabel: { fontSize: 13, fontFamily: 'Inter', fontWeight: '600', color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: 0.5 },
  budgetAmount: { fontSize: 42, fontFamily: 'Inter', fontWeight: '800', color: '#FFFFFF' },
  budgetBar: { height: 10, backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 5, overflow: 'hidden' },
  budgetFill: { height: '100%', backgroundColor: '#FFFFFF', borderRadius: 5 },
  budgetMeta: { fontSize: 13, fontFamily: 'Inter', color: 'rgba(255,255,255,0.7)' },
  categoryCard: {
    backgroundColor: COLORS.parent.card,
    borderRadius: 14,
    padding: SPACING[4],
    gap: SPACING[3],
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
  },
  categoryHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING[3] },
  categoryIcon: { fontSize: 22 },
  categoryName: { flex: 1, fontSize: 14, fontFamily: 'Inter', fontWeight: '600', color: COLORS.parent.text },
  categoryAmount: { fontSize: 14, fontFamily: 'Inter', fontWeight: '700' },
  categoryBar: { height: 8, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 4, overflow: 'hidden' },
  categoryFill: { height: '100%', borderRadius: 4 },
  card: { backgroundColor: COLORS.parent.card, borderRadius: 16, padding: SPACING[5], gap: SPACING[3], borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' },
  cardTitle: { fontSize: 16, fontFamily: 'Inter', fontWeight: '700', color: COLORS.parent.text },
  cardDesc: { fontSize: 14, fontFamily: 'Inter', color: COLORS.parent.textMuted, lineHeight: 20 },
  allowanceAmount: { fontSize: 32, fontFamily: 'Inter', fontWeight: '800', color: COLORS.parent.primary },
  editButton: { backgroundColor: COLORS.parent.primary, borderRadius: 12, paddingVertical: SPACING[3], alignItems: 'center' },
  editButtonText: { fontSize: 15, fontFamily: 'Inter', fontWeight: '700', color: '#FFFFFF' },
  ruleRow: { flexDirection: 'row', gap: SPACING[2], alignItems: 'flex-start' },
  ruleBullet: { color: COLORS.parent.primary, fontWeight: '700', fontSize: 15 },
  ruleText: { flex: 1, fontSize: 14, fontFamily: 'Inter', color: COLORS.parent.textSecondary, lineHeight: 20 },
  tuitionRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: SPACING[3], borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  tuitionInfo: { flex: 1 },
  tuitionName: { fontSize: 14, fontFamily: 'Inter', fontWeight: '600', color: COLORS.parent.text },
  tuitionDate: { fontSize: 12, fontFamily: 'Inter', color: COLORS.parent.textMuted },
  tuitionAmount: { fontSize: 16, fontFamily: 'Inter', fontWeight: '700', color: COLORS.parent.text, textAlign: 'right' },
  tuitionStatus: { fontSize: 12, fontFamily: 'Inter', textAlign: 'right' },
  addDashedButton: { borderWidth: 1, borderColor: COLORS.parent.primary, borderRadius: 12, paddingVertical: SPACING[3], alignItems: 'center', borderStyle: 'dashed' },
  addDashedText: { fontSize: 14, fontFamily: 'Inter', fontWeight: '600', color: COLORS.parent.primary },
  goalHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING[3] },
  goalEmoji: { fontSize: 28 },
  goalName: { flex: 1, fontSize: 16, fontFamily: 'Inter', fontWeight: '700', color: COLORS.parent.text },
  goalPct: { fontSize: 16, fontFamily: 'Inter', fontWeight: '800', color: COLORS.parent.primary },
  goalBar: { height: 12, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 6, overflow: 'hidden' },
  goalFill: { height: '100%', backgroundColor: COLORS.parent.primary, borderRadius: 6 },
  goalMeta: { fontSize: 13, fontFamily: 'Inter', color: COLORS.parent.textMuted, textAlign: 'right' },
  zakatRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: SPACING[2], borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  zakatLabel: { fontSize: 14, fontFamily: 'Inter', color: COLORS.parent.textSecondary },
  zakatValue: { fontSize: 14, fontFamily: 'Inter', fontWeight: '600', color: COLORS.parent.text },
  zakatDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.15)', marginVertical: SPACING[2] },
  zakatResultRow: { flexDirection: 'row', justifyContent: 'space-between' },
  zakatResultLabel: { fontSize: 16, fontFamily: 'Inter', fontWeight: '700', color: COLORS.parent.text },
  zakatResultValue: { fontSize: 22, fontFamily: 'Inter', fontWeight: '800', color: COLORS.parent.success },
  zakatButton: { backgroundColor: COLORS.parent.primary, borderRadius: 12, paddingVertical: SPACING[3], alignItems: 'center' },
  zakatButtonText: { fontSize: 15, fontFamily: 'Inter', fontWeight: '700', color: '#FFFFFF' },
  zakatRecord: { flexDirection: 'row', alignItems: 'center', gap: SPACING[3], paddingVertical: SPACING[2], borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  zakatRecordYear: { flex: 1, fontSize: 14, fontFamily: 'Inter', color: COLORS.parent.text },
  zakatRecordAmount: { fontSize: 15, fontFamily: 'Inter', fontWeight: '700', color: COLORS.parent.text },
  zakatRecordPaid: { fontSize: 13, fontFamily: 'Inter', color: '#4ADE80' },
});
