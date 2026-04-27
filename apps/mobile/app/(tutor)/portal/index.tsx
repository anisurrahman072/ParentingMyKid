/**
 * Tutor portal — read-only scoped view of assigned students.
 * Tutors access this after accepting an invite via the web form.
 * Shows: student progress, AI-generated question pack, session notes.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useAuthStore } from '../../../src/store/auth.store';
import { apiClient } from '../../../src/services/api.client';
import { COLORS } from '../../../src/constants/colors';
import { SPACING } from '../../../src/constants/spacing';

export default function TutorPortalScreen() {
  const { user } = useAuthStore();

  const { data: studentsData, isLoading } = useQuery({
    queryKey: ['tutor-students', user?.id],
    queryFn: () =>
      apiClient.get('/tutors/my-students').then((r) => r.data.students ?? []),
    enabled: !!user?.id,
  });

  const students = studentsData ?? [];

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.greeting}>Welcome,</Text>
        <Text style={styles.name}>{user?.name?.split(' ')[0] ?? 'Tutor'}</Text>
        <View style={styles.roleBadge}>
          <Text style={styles.roleBadgeText}>🎓 Tutor Portal</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.sectionTitle}>My Students ({students.length})</Text>

        {students.length === 0 ? (
          <Animated.View entering={FadeInDown.springify()} style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>📚</Text>
            <Text style={styles.emptyTitle}>No students yet</Text>
            <Text style={styles.emptyDesc}>
              Once a parent invites you and you accept, their child will appear here.
            </Text>
          </Animated.View>
        ) : (
          students.map((student: any, i: number) => (
            <Animated.View
              key={student.id}
              entering={FadeInDown.delay(i * 100)}
              style={styles.studentCard}
            >
              <View style={styles.studentHeader}>
                <View style={styles.studentAvatarPlaceholder}>
                  <Text style={styles.studentAvatarEmoji}>🧒</Text>
                </View>
                <View style={styles.studentInfo}>
                  <Text style={styles.studentName}>{student.name}</Text>
                  <Text style={styles.studentAge}>Age {student.age}</Text>
                </View>
              </View>

              {/* Focus areas from parent concerns */}
              {student.focusAreas?.length > 0 && (
                <View style={styles.focusAreas}>
                  <Text style={styles.focusLabel}>Focus Areas:</Text>
                  <View style={styles.focusChips}>
                    {student.focusAreas.map((area: string) => (
                      <View key={area} style={styles.focusChip}>
                        <Text style={styles.focusChipText}>{area}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* AI Question Pack */}
              <TouchableOpacity
                style={styles.questionPackButton}
                onPress={() =>
                  Alert.alert(
                    'AI Question Pack',
                    `Viewing question pack for ${student.name}. Full implementation loads AI-generated questions based on parent concerns.`,
                  )
                }
              >
                <Text style={styles.questionPackIcon}>🤖</Text>
                <Text style={styles.questionPackText}>View AI Question Pack</Text>
                <Text style={styles.questionPackArrow}>→</Text>
              </TouchableOpacity>

              {/* Session notes */}
              <TouchableOpacity
                style={styles.notesButton}
                onPress={() => Alert.alert('Session Notes', 'Add session notes coming soon!')}
              >
                <Text style={styles.notesText}>+ Add Session Note</Text>
              </TouchableOpacity>
            </Animated.View>
          ))
        )}

        {/* Info card */}
        <Animated.View entering={FadeInDown.delay(300)} style={styles.infoCard}>
          <Text style={styles.infoTitle}>ℹ️ Tutor Access</Text>
          <Text style={styles.infoText}>
            As a tutor, you have read-only access to your students' academic progress. You cannot see personal data or safety information. Your access is governed by the parent who invited you.
          </Text>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.parent.background },
  header: {
    paddingHorizontal: SPACING[5],
    paddingVertical: SPACING[5],
    gap: SPACING[1],
  },
  greeting: {
    fontSize: 16,
    fontFamily: 'Inter',
    color: COLORS.parent.textMuted,
  },
  name: {
    fontSize: 28,
    fontFamily: 'Inter',
    fontWeight: '700',
    color: COLORS.parent.text,
  },
  roleBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(99,102,241,0.15)',
    borderRadius: 10,
    paddingHorizontal: SPACING[3],
    paddingVertical: SPACING[1],
    marginTop: SPACING[1],
  },
  roleBadgeText: {
    fontSize: 13,
    fontFamily: 'Inter',
    fontWeight: '700',
    color: COLORS.parent.primary,
  },
  scrollContent: {
    paddingHorizontal: SPACING[5],
    paddingBottom: SPACING[10],
    gap: SPACING[4],
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter',
    fontWeight: '700',
    color: COLORS.parent.text,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: SPACING[10],
    gap: SPACING[3],
  },
  emptyEmoji: { fontSize: 64 },
  emptyTitle: {
    fontSize: 20,
    fontFamily: 'Inter',
    fontWeight: '700',
    color: COLORS.parent.text,
  },
  emptyDesc: {
    fontSize: 14,
    fontFamily: 'Inter',
    color: COLORS.parent.textMuted,
    textAlign: 'center',
    maxWidth: 240,
    lineHeight: 22,
  },
  studentCard: {
    backgroundColor: COLORS.parent.card,
    borderRadius: 16,
    padding: SPACING[5],
    gap: SPACING[4],
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  studentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[3],
  },
  studentAvatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  studentAvatarEmoji: { fontSize: 32 },
  studentInfo: { flex: 1 },
  studentName: {
    fontSize: 18,
    fontFamily: 'Inter',
    fontWeight: '700',
    color: COLORS.parent.text,
  },
  studentAge: {
    fontSize: 14,
    fontFamily: 'Inter',
    color: COLORS.parent.textMuted,
  },
  focusAreas: { gap: SPACING[2] },
  focusLabel: {
    fontSize: 12,
    fontFamily: 'Inter',
    fontWeight: '600',
    color: COLORS.parent.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  focusChips: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING[2] },
  focusChip: {
    backgroundColor: 'rgba(99,102,241,0.15)',
    borderRadius: 10,
    paddingHorizontal: SPACING[3],
    paddingVertical: SPACING[1],
  },
  focusChipText: {
    fontSize: 13,
    fontFamily: 'Inter',
    fontWeight: '600',
    color: COLORS.parent.primary,
  },
  questionPackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[3],
    backgroundColor: 'rgba(99,102,241,0.12)',
    borderRadius: 12,
    padding: SPACING[4],
    borderWidth: 1,
    borderColor: 'rgba(99,102,241,0.2)',
  },
  questionPackIcon: { fontSize: 22 },
  questionPackText: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'Inter',
    fontWeight: '600',
    color: COLORS.parent.text,
  },
  questionPackArrow: {
    fontSize: 18,
    color: COLORS.parent.primary,
    fontWeight: '600',
  },
  notesButton: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: 10,
    paddingVertical: SPACING[3],
    alignItems: 'center',
    borderStyle: 'dashed',
  },
  notesText: {
    fontSize: 14,
    fontFamily: 'Inter',
    fontWeight: '600',
    color: COLORS.parent.textMuted,
  },
  infoCard: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 14,
    padding: SPACING[5],
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    gap: SPACING[2],
  },
  infoTitle: {
    fontSize: 14,
    fontFamily: 'Inter',
    fontWeight: '700',
    color: COLORS.parent.text,
  },
  infoText: {
    fontSize: 13,
    fontFamily: 'Inter',
    color: COLORS.parent.textMuted,
    lineHeight: 20,
  },
});
