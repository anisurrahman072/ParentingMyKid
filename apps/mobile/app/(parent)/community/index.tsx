/**
 * Parent Community & Support Hub.
 * Parenting tips library, crisis scripts, parent mood tracker,
 * community forum by child age group, expert webinar integration.
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../../src/constants/colors';
import { SPACING } from '../../../src/constants/spacing';
import { ParentHouseholdSwitcherCard } from '../../../src/components/parent/ParentHouseholdSwitcherCard';

type CommunityTab = 'tips' | 'crisis' | 'mood' | 'forum' | 'webinars';

const PARENTING_TIPS = [
  {
    id: '1',
    emoji: '💬',
    title: 'The 20-Minute Rule',
    category: 'Connection',
    preview: 'Research shows 20 minutes of uninterrupted one-on-one time daily dramatically improves behaviour.',
    readTime: '3 min',
    saved: false,
  },
  {
    id: '2',
    emoji: '😤',
    title: 'When Your Child Refuses Tasks',
    category: 'Behaviour',
    preview: 'Use the "when-then" approach: "When you finish homework, then you can play." Not "if."',
    readTime: '5 min',
    saved: true,
  },
  {
    id: '3',
    emoji: '📱',
    title: 'Healthy Screen Time Rules',
    category: 'Digital',
    preview: 'Create a family screen time agreement together — kids who helped write the rules are 3x more likely to follow them.',
    readTime: '4 min',
    saved: false,
  },
  {
    id: '4',
    emoji: '🎓',
    title: 'Supporting Exam Stress',
    category: 'Academic',
    preview: 'Focus on effort, not results. "I\'m proud of how hard you worked" is more motivating than "You got an A!"',
    readTime: '6 min',
    saved: false,
  },
];

const CRISIS_SCRIPTS = [
  {
    situation: 'Child having a meltdown',
    emoji: '😤',
    severity: 'Common',
    script: 'Stay calm. Get to their level. Say: "I can see you\'re really upset right now. I\'m here with you." Wait for the storm to pass before trying to talk.',
  },
  {
    situation: 'Child says "I hate you"',
    emoji: '💔',
    severity: 'Stinging',
    script: 'Don\'t react with hurt. Say: "I know you\'re angry right now, and that\'s okay. I love you even when you\'re angry at me." Then set limits calmly.',
  },
  {
    situation: 'Child reveals being bullied',
    emoji: '😢',
    severity: 'Critical',
    script: 'Listen fully first, don\'t jump to solutions. Say: "Thank you for trusting me with this. That took courage. Let\'s figure this out together." Then take notes and report.',
  },
  {
    situation: 'Child seems depressed/withdrawn',
    emoji: '🌧️',
    severity: 'Urgent',
    script: 'Don\'t dismiss it. Say: "I\'ve noticed you seem a bit low lately. I\'m not going anywhere — would you like to talk, or just hang out together?" Seek professional help if it persists.',
  },
];

const FORUM_GROUPS = [
  { emoji: '🍼', age: 'Ages 2-5', members: 12400, posts: 340 },
  { emoji: '🎒', age: 'Ages 6-9', members: 18700, posts: 520 },
  { emoji: '🏫', age: 'Ages 10-13', members: 21000, posts: 680 },
  { emoji: '🎓', age: 'Ages 14-17', members: 15800, posts: 420 },
];

function communityEntryFrom(raw: string | string[] | undefined): string | undefined {
  if (raw == null) return undefined;
  return Array.isArray(raw) ? raw[0] : raw;
}

export default function CommunityScreen() {
  const navigation = useNavigation();
  const { from: fromRaw } = useLocalSearchParams<{ from?: string | string[] }>();
  const entryFrom = communityEntryFrom(fromRaw);
  const [activeTab, setActiveTab] = useState<CommunityTab>('tips');
  const [moodToday, setMoodToday] = useState<number | null>(null);

  const goBack = useCallback(() => {
    if (entryFrom === 'family-space') {
      router.replace('/(parent)/family-space');
      return;
    }
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    router.replace('/(parent)/dashboard');
  }, [navigation, entryFrom]);

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={goBack}
          style={styles.backBtn}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <Ionicons name="chevron-back" size={26} color={COLORS.parent.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={2}>
          Community & Support
        </Text>
        <View style={styles.backBtn} />
      </View>

      <ParentHouseholdSwitcherCard />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabScroll} contentContainerStyle={styles.tabScrollContent}>
        {[
          { key: 'tips', label: '💡 Tips' },
          { key: 'crisis', label: '🆘 Crisis Scripts' },
          { key: 'mood', label: '😊 My Mood' },
          { key: 'forum', label: '👥 Forum' },
          { key: 'webinars', label: '🎤 Webinars' },
        ].map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key as CommunityTab)}
          >
            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>{tab.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Tips */}
        {activeTab === 'tips' && (
          <Animated.View entering={FadeInDown.springify()} style={{ gap: SPACING[3] }}>
            {PARENTING_TIPS.map((tip) => (
              <TouchableOpacity
                key={tip.id}
                style={styles.tipCard}
                onPress={() => Alert.alert(tip.title, tip.preview + '\n\n[Full article coming soon]')}
              >
                <Text style={styles.tipEmoji}>{tip.emoji}</Text>
                <View style={styles.tipBody}>
                  <Text style={styles.tipCategory}>{tip.category}</Text>
                  <Text style={styles.tipTitle}>{tip.title}</Text>
                  <Text style={styles.tipPreview} numberOfLines={2}>{tip.preview}</Text>
                  <Text style={styles.tipReadTime}>⏱ {tip.readTime} read</Text>
                </View>
                {tip.saved && <Text style={styles.savedIcon}>🔖</Text>}
              </TouchableOpacity>
            ))}
          </Animated.View>
        )}

        {/* Crisis Scripts */}
        {activeTab === 'crisis' && (
          <Animated.View entering={FadeInDown.springify()} style={{ gap: SPACING[4] }}>
            <View style={styles.crisisInfo}>
              <Text style={styles.crisisInfoText}>
                💡 These evidence-based scripts help you respond with calm and connection in difficult parenting moments.
              </Text>
            </View>
            {CRISIS_SCRIPTS.map((cs, i) => (
              <View key={i} style={styles.crisisCard}>
                <View style={styles.crisisHeader}>
                  <Text style={styles.crisisEmoji}>{cs.emoji}</Text>
                  <View style={styles.crisisInfo2}>
                    <Text style={styles.crisisSituation}>{cs.situation}</Text>
                    <View style={[
                      styles.severityBadge,
                      {
                        backgroundColor:
                          cs.severity === 'Urgent' ? 'rgba(220,38,38,0.15)' :
                          cs.severity === 'Critical' ? 'rgba(234,88,12,0.15)' :
                          'rgba(59,130,246,0.12)',
                      },
                    ]}>
                      <Text style={[
                        styles.severityText,
                        {
                          color:
                            cs.severity === 'Urgent' ? '#F87171' :
                            cs.severity === 'Critical' ? '#FB923C' :
                            COLORS.parent.primary,
                        },
                      ]}>
                        {cs.severity}
                      </Text>
                    </View>
                  </View>
                </View>
                <Text style={styles.crisisScript}>"{cs.script}"</Text>
              </View>
            ))}
          </Animated.View>
        )}

        {/* Parent Mood Tracker */}
        {activeTab === 'mood' && (
          <Animated.View entering={FadeInDown.springify()} style={{ gap: SPACING[4] }}>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>How are you feeling today?</Text>
              <Text style={styles.cardDesc}>
                Your wellbeing matters too. Tracking your mood helps you notice patterns and seek support when needed.
              </Text>
              <View style={styles.moodRow}>
                {[
                  { emoji: '😢', value: 1, label: 'Struggling' },
                  { emoji: '😕', value: 2, label: 'Low' },
                  { emoji: '😐', value: 3, label: 'Okay' },
                  { emoji: '😊', value: 4, label: 'Good' },
                  { emoji: '😄', value: 5, label: 'Great' },
                ].map((mood) => (
                  <TouchableOpacity
                    key={mood.value}
                    style={[styles.moodButton, moodToday === mood.value && styles.moodButtonSelected]}
                    onPress={() => setMoodToday(mood.value)}
                  >
                    <Text style={styles.moodEmoji}>{mood.emoji}</Text>
                    <Text style={styles.moodLabel}>{mood.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              {moodToday && (
                <TouchableOpacity
                  style={styles.saveMoodButton}
                  onPress={() => Alert.alert('Mood logged', 'Thank you for checking in with yourself 💙')}
                >
                  <Text style={styles.saveMoodText}>Save Today's Mood</Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>This Week</Text>
              <View style={styles.moodWeek}>
                {['😊', '😐', '😊', '😄', '😕', '😊', '😊'].map((emoji, i) => (
                  <View key={i} style={styles.moodDay}>
                    <Text style={styles.moodDayEmoji}>{emoji}</Text>
                    <Text style={styles.moodDayLabel}>{['M', 'T', 'W', 'T', 'F', 'S', 'S'][i]}</Text>
                  </View>
                ))}
              </View>
            </View>
          </Animated.View>
        )}

        {/* Forum */}
        {activeTab === 'forum' && (
          <Animated.View entering={FadeInDown.springify()} style={{ gap: SPACING[4] }}>
            <Text style={styles.sectionTitle}>👥 Parent Groups by Age</Text>
            {FORUM_GROUPS.map((group) => (
              <TouchableOpacity
                key={group.age}
                style={styles.forumCard}
                onPress={() => Alert.alert(`Group: ${group.age}`, 'Community forum coming soon!')}
              >
                <Text style={styles.forumEmoji}>{group.emoji}</Text>
                <View style={styles.forumInfo}>
                  <Text style={styles.forumAge}>{group.age}</Text>
                  <Text style={styles.forumMeta}>{group.members.toLocaleString()} parents • {group.posts} posts today</Text>
                </View>
                <Text style={styles.forumArrow}>›</Text>
              </TouchableOpacity>
            ))}
          </Animated.View>
        )}

        {/* Webinars */}
        {activeTab === 'webinars' && (
          <Animated.View entering={FadeInDown.springify()} style={{ gap: SPACING[4] }}>
            <Text style={styles.sectionTitle}>🎤 Expert Webinars</Text>
            {[
              {
                emoji: '🧠',
                title: 'Raising Emotionally Intelligent Children',
                expert: 'Dr. Sarah Ahmed, Child Psychologist',
                date: 'Apr 18, 2026 • 7:00 PM',
                attendees: 342,
                registered: true,
              },
              {
                emoji: '📱',
                title: 'Digital Parenting in 2026',
                expert: 'Prof. James Wong, Digital Wellness',
                date: 'Apr 25, 2026 • 6:30 PM',
                attendees: 218,
                registered: false,
              },
              {
                emoji: '📚',
                title: 'How to Help Struggling Readers',
                expert: 'Mrs. Fatima Al-Rashid, Literacy Expert',
                date: 'May 2, 2026 • 7:00 PM',
                attendees: 156,
                registered: false,
              },
            ].map((webinar, i) => (
              <View key={i} style={styles.webinarCard}>
                <View style={styles.webinarHeader}>
                  <Text style={styles.webinarEmoji}>{webinar.emoji}</Text>
                  <View style={styles.webinarInfo}>
                    <Text style={styles.webinarTitle}>{webinar.title}</Text>
                    <Text style={styles.webinarExpert}>{webinar.expert}</Text>
                    <Text style={styles.webinarDate}>{webinar.date}</Text>
                    <Text style={styles.webinarAttendees}>{webinar.attendees} registered</Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={[styles.registerButton, webinar.registered && styles.registeredButton]}
                  onPress={() => Alert.alert(webinar.registered ? 'Registered!' : 'Register', webinar.registered ? 'You\'re already registered.' : 'Registration coming soon!')}
                >
                  <Text style={[styles.registerText, webinar.registered && styles.registeredText]}>
                    {webinar.registered ? '✓ Registered' : 'Register Free'}
                  </Text>
                </TouchableOpacity>
              </View>
            ))}
          </Animated.View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.parent.background },
  header: {
    paddingLeft: SPACING[3],
    paddingRight: SPACING[4],
    paddingVertical: SPACING[4],
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  backBtn: { width: 32, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: {
    flex: 1,
    fontSize: 22,
    fontFamily: 'Inter',
    fontWeight: '700',
    color: COLORS.parent.text,
  },
  tabScroll: { maxHeight: 48 },
  tabScrollContent: { paddingHorizontal: SPACING[5], gap: SPACING[2], alignItems: 'center' },
  tab: { paddingVertical: SPACING[2], paddingHorizontal: SPACING[4], borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.06)' },
  tabActive: { backgroundColor: COLORS.parent.primary },
  tabText: { fontSize: 13, fontFamily: 'Inter', fontWeight: '600', color: COLORS.parent.textMuted },
  tabTextActive: { color: '#FFFFFF' },
  scrollContent: { padding: SPACING[5], paddingBottom: SPACING[10] },
  card: { backgroundColor: COLORS.parent.card, borderRadius: 16, padding: SPACING[5], gap: SPACING[3], borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' },
  cardTitle: { fontSize: 16, fontFamily: 'Inter', fontWeight: '700', color: COLORS.parent.text },
  cardDesc: { fontSize: 14, fontFamily: 'Inter', color: COLORS.parent.textMuted, lineHeight: 21 },
  tipCard: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING[3], backgroundColor: COLORS.parent.card, borderRadius: 16, padding: SPACING[4], borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' },
  tipEmoji: { fontSize: 32 },
  tipBody: { flex: 1, gap: SPACING[1] },
  tipCategory: { fontSize: 11, fontFamily: 'Inter', fontWeight: '700', color: COLORS.parent.primary, textTransform: 'uppercase', letterSpacing: 0.5 },
  tipTitle: { fontSize: 15, fontFamily: 'Inter', fontWeight: '700', color: COLORS.parent.text },
  tipPreview: { fontSize: 13, fontFamily: 'Inter', color: COLORS.parent.textMuted, lineHeight: 19 },
  tipReadTime: { fontSize: 11, fontFamily: 'Inter', color: COLORS.parent.textMuted },
  savedIcon: { fontSize: 20 },
  crisisInfo: { backgroundColor: 'rgba(59,130,246,0.1)', borderRadius: 14, padding: SPACING[4] },
  crisisInfoText: { fontSize: 14, fontFamily: 'Inter', color: 'rgba(255,255,255,0.7)', lineHeight: 21 },
  crisisCard: { backgroundColor: COLORS.parent.card, borderRadius: 16, padding: SPACING[5], gap: SPACING[3], borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' },
  crisisHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING[3] },
  crisisEmoji: { fontSize: 32 },
  crisisInfo2: { flex: 1, gap: SPACING[1] },
  crisisSituation: { fontSize: 15, fontFamily: 'Inter', fontWeight: '700', color: COLORS.parent.text },
  severityBadge: { alignSelf: 'flex-start', borderRadius: 8, paddingHorizontal: SPACING[2], paddingVertical: 2 },
  severityText: { fontSize: 11, fontFamily: 'Inter', fontWeight: '700' },
  crisisScript: { fontSize: 14, fontFamily: 'Inter', color: COLORS.parent.textSecondary, lineHeight: 22, fontStyle: 'italic' },
  moodRow: { flexDirection: 'row', justifyContent: 'space-between' },
  moodButton: { alignItems: 'center', gap: SPACING[1], padding: SPACING[2], borderRadius: 12, borderWidth: 2, borderColor: 'transparent' },
  moodButtonSelected: { borderColor: COLORS.parent.primary, backgroundColor: 'rgba(59,130,246,0.1)' },
  moodEmoji: { fontSize: 32 },
  moodLabel: { fontSize: 10, fontFamily: 'Inter', color: COLORS.parent.textMuted, textAlign: 'center' },
  saveMoodButton: { backgroundColor: COLORS.parent.primary, borderRadius: 12, paddingVertical: SPACING[3], alignItems: 'center' },
  saveMoodText: { fontSize: 15, fontFamily: 'Inter', fontWeight: '700', color: '#FFFFFF' },
  moodWeek: { flexDirection: 'row', justifyContent: 'space-between' },
  moodDay: { alignItems: 'center', gap: SPACING[1] },
  moodDayEmoji: { fontSize: 26 },
  moodDayLabel: { fontSize: 11, fontFamily: 'Inter', color: COLORS.parent.textMuted },
  sectionTitle: { fontSize: 18, fontFamily: 'Inter', fontWeight: '700', color: COLORS.parent.text },
  forumCard: { flexDirection: 'row', alignItems: 'center', gap: SPACING[3], backgroundColor: COLORS.parent.card, borderRadius: 16, padding: SPACING[4], borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' },
  forumEmoji: { fontSize: 36 },
  forumInfo: { flex: 1 },
  forumAge: { fontSize: 16, fontFamily: 'Inter', fontWeight: '700', color: COLORS.parent.text },
  forumMeta: { fontSize: 13, fontFamily: 'Inter', color: COLORS.parent.textMuted },
  forumArrow: { fontSize: 22, color: 'rgba(255,255,255,0.25)' },
  webinarCard: { backgroundColor: COLORS.parent.card, borderRadius: 16, padding: SPACING[5], gap: SPACING[4], borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' },
  webinarHeader: { flexDirection: 'row', gap: SPACING[3], alignItems: 'flex-start' },
  webinarEmoji: { fontSize: 40 },
  webinarInfo: { flex: 1, gap: SPACING[1] },
  webinarTitle: { fontSize: 15, fontFamily: 'Inter', fontWeight: '700', color: COLORS.parent.text },
  webinarExpert: { fontSize: 13, fontFamily: 'Inter', color: COLORS.parent.primary },
  webinarDate: { fontSize: 13, fontFamily: 'Inter', color: COLORS.parent.textMuted },
  webinarAttendees: { fontSize: 12, fontFamily: 'Inter', color: COLORS.parent.textMuted },
  registerButton: { backgroundColor: COLORS.parent.primary, borderRadius: 12, paddingVertical: SPACING[3], alignItems: 'center' },
  registeredButton: { backgroundColor: 'rgba(74,222,128,0.15)', borderWidth: 1, borderColor: '#4ADE80' },
  registerText: { fontSize: 15, fontFamily: 'Inter', fontWeight: '700', color: '#FFFFFF' },
  registeredText: { color: '#4ADE80' },
});
