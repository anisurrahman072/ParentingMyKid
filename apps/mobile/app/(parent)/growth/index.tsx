/**
 * Growth & AI Plans screen (parent view).
 * Shows the AI-generated weekly growth plan for selected child,
 * habit tracking, skills assessment, and AI coaching scripts.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { apiClient } from '../../../src/services/api.client';
import { API_ENDPOINTS } from '../../../src/constants/api';
import { useFamilyStore } from '../../../src/store/family.store';
import { COLORS } from '../../../src/constants/colors';
import { SPACING } from '../../../src/constants/spacing';
import { WellbeingScoreRing } from '../../../src/components/parent/WellbeingScoreRing';
import type { AiGrowthPlan, AiRecommendation } from '@parentingmykid/shared-types';

function SectionCard({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <View style={styles.sectionCard}>
      <Text style={styles.sectionTitle}>{icon} {title}</Text>
      {children}
    </View>
  );
}

function PriorityChip({ label, priority }: { label: string; priority: 'HIGH' | 'MEDIUM' | 'LOW' }) {
  const colors = {
    HIGH: { bg: 'rgba(220,38,38,0.18)', text: '#F87171' },
    MEDIUM: { bg: 'rgba(251,146,60,0.18)', text: '#FB923C' },
    LOW: { bg: 'rgba(74,222,128,0.15)', text: '#4ADE80' },
  };
  const c = colors[priority];
  return (
    <View style={[styles.chip, { backgroundColor: c.bg }]}>
      <Text style={[styles.chipText, { color: c.text }]}>{label}</Text>
    </View>
  );
}

export default function GrowthScreen() {
  const { activeChild } = useFamilyStore();
  const [activeTab, setActiveTab] = useState<'plan' | 'habits' | 'coach'>('plan');

  const { data: growthPlan, isLoading: planLoading } = useQuery({
    queryKey: ['growth-plan', activeChild?.id],
    queryFn: () =>
      apiClient.post(API_ENDPOINTS.ai.growthPlan, { childId: activeChild?.id }).then((r) => r.data),
    enabled: !!activeChild?.id && activeTab === 'plan',
    staleTime: 1000 * 60 * 60, // 1 hour — plan only regenerates daily
  });

  const { data: coachScript, isLoading: coachLoading } = useQuery({
    queryKey: ['coach-script', activeChild?.id],
    queryFn: () =>
      apiClient
        .post(API_ENDPOINTS.ai.coachScript, {
          childId: activeChild?.id,
          concern: 'General behaviour and motivation',
        })
        .then((r) => r.data),
    enabled: !!activeChild?.id && activeTab === 'coach',
    staleTime: 1000 * 60 * 30,
  });

  if (!activeChild) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>👶</Text>
          <Text style={styles.emptyText}>Select a child from the dashboard</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerLabel}>Growth & AI Plans</Text>
          <Text style={styles.headerChild}>{activeChild.name}'s Profile</Text>
        </View>
        <WellbeingScoreRing score={activeChild.wellbeingScore ?? 72} size={64} strokeWidth={6} />
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        {[
          { key: 'plan', label: '📋 Growth Plan' },
          { key: 'habits', label: '✅ Habits' },
          { key: 'coach', label: '🧠 AI Coach' },
        ].map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key as typeof activeTab)}
          >
            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Growth Plan Tab */}
        {activeTab === 'plan' && (
          <Animated.View entering={FadeInDown.springify()}>
            {planLoading ? (
              <View style={styles.loading}>
                <ActivityIndicator color={COLORS.parent.primary} />
                <Text style={styles.loadingText}>Generating weekly plan with AI...</Text>
              </View>
            ) : growthPlan ? (
              <>
                <SectionCard title="This Week's Focus" icon="🎯">
                  {(growthPlan.weeklyPriorities as string[] ?? []).map((priority: string, i: number) => (
                    <View key={i} style={styles.priorityItem}>
                      <Text style={styles.bullet}>•</Text>
                      <Text style={styles.priorityText}>{priority}</Text>
                    </View>
                  ))}
                </SectionCard>

                <SectionCard title="AI Recommendations" icon="💡">
                  {(growthPlan.recommendations as AiRecommendation[] ?? []).slice(0, 4).map((rec: AiRecommendation, i: number) => (
                    <View key={i} style={styles.recCard}>
                      <View style={styles.recHeader}>
                        <Text style={styles.recCategory}>{rec.category}</Text>
                        <PriorityChip label={rec.priority} priority={rec.priority as any} />
                      </View>
                      <Text style={styles.recTitle}>{rec.title}</Text>
                      <Text style={styles.recDesc}>{rec.description}</Text>
                    </View>
                  ))}
                </SectionCard>

                {growthPlan.parentNote && (
                  <SectionCard title="Note for You" icon="📝">
                    <Text style={styles.parentNote}>{growthPlan.parentNote}</Text>
                  </SectionCard>
                )}
              </>
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyEmoji}>🤖</Text>
                <Text style={styles.emptyText}>
                  Complete baseline assessment to unlock AI growth plans
                </Text>
              </View>
            )}
          </Animated.View>
        )}

        {/* Habits Tab */}
        {activeTab === 'habits' && (
          <Animated.View entering={FadeInDown.springify()}>
            <SectionCard title="Daily Habits" icon="🌱">
              <Text style={styles.comingSoon}>
                Habit tracking coming soon — add habits from the child's profile settings.
              </Text>
            </SectionCard>
          </Animated.View>
        )}

        {/* AI Coach Tab */}
        {activeTab === 'coach' && (
          <Animated.View entering={FadeInDown.springify()}>
            {coachLoading ? (
              <View style={styles.loading}>
                <ActivityIndicator color={COLORS.parent.primary} />
                <Text style={styles.loadingText}>Preparing coaching script...</Text>
              </View>
            ) : coachScript ? (
              <SectionCard title="How to Talk to Your Child" icon="💬">
                <Text style={styles.scriptLabel}>Opening</Text>
                <Text style={styles.scriptText}>{coachScript.script?.opening}</Text>

                {(coachScript.script?.keyPoints as string[] ?? []).map((point: string, i: number) => (
                  <View key={i} style={styles.keyPoint}>
                    <Text style={styles.keyPointNumber}>{i + 1}</Text>
                    <Text style={styles.keyPointText}>{point}</Text>
                  </View>
                ))}

                <Text style={styles.scriptLabel}>Closing</Text>
                <Text style={styles.scriptText}>{coachScript.script?.closing}</Text>

                {coachScript.script?.avoidPhrases && (
                  <>
                    <Text style={styles.scriptLabel}>❌ Avoid saying</Text>
                    {(coachScript.script.avoidPhrases as string[]).map((phrase: string, i: number) => (
                      <Text key={i} style={styles.avoidPhrase}>• "{phrase}"</Text>
                    ))}
                  </>
                )}
              </SectionCard>
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyEmoji}>🧠</Text>
                <Text style={styles.emptyText}>Could not load coaching script. Try again.</Text>
              </View>
            )}
          </Animated.View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.parent.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING[5],
    paddingVertical: SPACING[4],
  },
  headerLabel: {
    fontSize: 13,
    fontFamily: 'Inter',
    fontWeight: '600',
    color: COLORS.parent.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  headerChild: {
    fontSize: 22,
    fontFamily: 'Inter',
    fontWeight: '700',
    color: COLORS.parent.text,
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: SPACING[5],
    gap: SPACING[2],
    marginBottom: SPACING[4],
  },
  tab: {
    flex: 1,
    paddingVertical: SPACING[3],
    alignItems: 'center',
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  tabActive: { backgroundColor: COLORS.parent.primary },
  tabText: {
    fontSize: 12,
    fontFamily: 'Inter',
    fontWeight: '600',
    color: COLORS.parent.textMuted,
  },
  tabTextActive: { color: '#FFFFFF' },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: SPACING[5], paddingBottom: SPACING[8] },
  sectionCard: {
    backgroundColor: COLORS.parent.card,
    borderRadius: 16,
    padding: SPACING[5],
    marginBottom: SPACING[4],
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    gap: SPACING[3],
  },
  sectionTitle: {
    fontSize: 15,
    fontFamily: 'Inter',
    fontWeight: '700',
    color: COLORS.parent.text,
  },
  priorityItem: {
    flexDirection: 'row',
    gap: SPACING[2],
    alignItems: 'flex-start',
  },
  bullet: {
    color: COLORS.parent.primary,
    fontSize: 16,
    lineHeight: 22,
  },
  priorityText: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Inter',
    color: COLORS.parent.textSecondary,
    lineHeight: 22,
  },
  recCard: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 12,
    padding: SPACING[4],
    gap: SPACING[1],
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  recHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  recCategory: {
    fontSize: 11,
    fontFamily: 'Inter',
    fontWeight: '700',
    color: COLORS.parent.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  chip: {
    paddingHorizontal: SPACING[2],
    paddingVertical: 2,
    borderRadius: 8,
  },
  chipText: {
    fontSize: 10,
    fontFamily: 'Inter',
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  recTitle: {
    fontSize: 14,
    fontFamily: 'Inter',
    fontWeight: '700',
    color: COLORS.parent.text,
  },
  recDesc: {
    fontSize: 13,
    fontFamily: 'Inter',
    color: COLORS.parent.textMuted,
    lineHeight: 19,
  },
  parentNote: {
    fontSize: 14,
    fontFamily: 'Inter',
    color: COLORS.parent.textSecondary,
    lineHeight: 22,
    fontStyle: 'italic',
  },
  loading: {
    alignItems: 'center',
    paddingVertical: SPACING[10],
    gap: SPACING[3],
  },
  loadingText: {
    fontSize: 14,
    fontFamily: 'Inter',
    color: COLORS.parent.textMuted,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: SPACING[10],
    gap: SPACING[3],
  },
  emptyEmoji: { fontSize: 56 },
  emptyText: {
    fontSize: 15,
    fontFamily: 'Inter',
    color: COLORS.parent.textMuted,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 260,
  },
  comingSoon: {
    fontSize: 14,
    fontFamily: 'Inter',
    color: COLORS.parent.textMuted,
    fontStyle: 'italic',
  },
  scriptLabel: {
    fontSize: 12,
    fontFamily: 'Inter',
    fontWeight: '700',
    color: COLORS.parent.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: SPACING[2],
  },
  scriptText: {
    fontSize: 14,
    fontFamily: 'Inter',
    color: COLORS.parent.textSecondary,
    lineHeight: 22,
  },
  keyPoint: {
    flexDirection: 'row',
    gap: SPACING[3],
    alignItems: 'flex-start',
  },
  keyPointNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.parent.primary,
    textAlign: 'center',
    fontSize: 13,
    fontFamily: 'Inter',
    fontWeight: '700',
    color: '#FFFFFF',
    lineHeight: 24,
  },
  keyPointText: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Inter',
    color: COLORS.parent.textSecondary,
    lineHeight: 22,
  },
  avoidPhrase: {
    fontSize: 13,
    fontFamily: 'Inter',
    color: '#F87171',
    fontStyle: 'italic',
    lineHeight: 20,
  },
});
