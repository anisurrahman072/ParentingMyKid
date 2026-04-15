/**
 * Islamic Module — Child View.
 * Salah tracker, Quran reading log, daily dua, Islamic stories,
 * Ramadan mode, Islamic values badges.
 *
 * This module is OPTIONAL — enabled per-child by parent in settings.
 * UI uses the Islamic color palette (green, gold, teal).
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';
import { apiClient } from '../../../src/services/api.client';
import { API_ENDPOINTS } from '../../../src/constants/api';
import { useAuthStore } from '../../../src/store/auth.store';
import { COLORS } from '../../../src/constants/colors';
import { SPACING } from '../../../src/constants/spacing';
import { KidsButton } from '../../../src/components/kids/KidsButton';

type IslamicTab = 'salah' | 'quran' | 'dua' | 'stories';

const PRAYER_NAMES = [
  { key: 'fajr', name: 'Fajr', emoji: '🌅', time: 'Dawn' },
  { key: 'dhuhr', name: 'Dhuhr', emoji: '☀️', time: 'Midday' },
  { key: 'asr', name: 'Asr', emoji: '🌤️', time: 'Afternoon' },
  { key: 'maghrib', name: 'Maghrib', emoji: '🌇', time: 'Sunset' },
  { key: 'isha', name: 'Isha', emoji: '🌙', time: 'Night' },
];

const DAILY_DUA = [
  {
    arabic: 'بِسْمِ اللهِ الرَّحْمٰنِ الرَّحِيمِ',
    transliteration: 'Bismillāhir-rahmānir-rahīm',
    english: 'In the name of Allah, the Most Gracious, the Most Merciful',
    occasion: 'Before anything',
  },
  {
    arabic: 'رَبِّ زِدْنِي عِلْمًا',
    transliteration: "Rabbi zid'nī 'ilmā",
    english: 'O my Lord, increase me in knowledge',
    occasion: 'Before studying',
  },
  {
    arabic: 'اللَّهُمَّ إِنِّي أَسْأَلُكَ عِلْمًا نَافِعًا',
    transliteration: "Allāhumma innī as'aluka 'ilman nāfi'ā",
    english: 'O Allah, I ask You for beneficial knowledge',
    occasion: 'Morning dua',
  },
];

const ISLAMIC_STORIES = [
  {
    id: '1',
    emoji: '🌟',
    title: 'The Story of Prophet Yusuf',
    theme: 'Patience & Trust in Allah',
    readingTime: '8 min',
    ageGroup: '7+',
  },
  {
    id: '2',
    emoji: '🐘',
    title: 'The Year of the Elephant',
    theme: 'Allah\'s Protection',
    readingTime: '5 min',
    ageGroup: '6+',
  },
  {
    id: '3',
    emoji: '🕌',
    title: 'Building the Kaaba',
    theme: 'Obedience & Dedication',
    readingTime: '10 min',
    ageGroup: '8+',
  },
  {
    id: '4',
    emoji: '🏹',
    title: 'The Young Companion',
    theme: 'Courage & Faith',
    readingTime: '7 min',
    ageGroup: '9+',
  },
];

export default function IslamicScreen() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<IslamicTab>('salah');
  const [completedPrayers, setCompletedPrayers] = useState<Record<string, boolean>>({});
  const qc = useQueryClient();

  const { data: dailyContent } = useQuery({
    queryKey: ['islamic-daily'],
    queryFn: () => apiClient.get(API_ENDPOINTS.islamic.daily).then((r) => r.data),
    staleTime: 1000 * 60 * 60 * 6, // Refresh every 6 hours
  });

  const salahMutation = useMutation({
    mutationFn: (prayer: string) =>
      apiClient.post(API_ENDPOINTS.islamic.logSalah, {
        childId: user?.childProfileId,
        prayerName: prayer,
        completed: true,
        onTime: true,
      }),
    onSuccess: (_, prayer) => {
      setCompletedPrayers((prev) => ({ ...prev, [prayer]: true }));
      qc.invalidateQueries({ queryKey: ['islamic-daily'] });
    },
  });

  const completedCount = Object.values(completedPrayers).filter(Boolean).length;
  const allComplete = completedCount === 5;

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      {/* Header */}
      <LinearGradient
        colors={['#1A472A', '#2D6A4F', '#40916C']}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Text style={styles.arabicBismillah}>بِسْمِ اللهِ</Text>
        <Text style={styles.headerTitle}>Islamic Growth</Text>
        <View style={styles.headerStats}>
          <Text style={styles.headerStat}>🕌 {completedCount}/5 prayers today</Text>
          {allComplete && <Text style={styles.allCompleteText}>MashaAllah! 🌟</Text>}
        </View>
      </LinearGradient>

      {/* Tabs */}
      <View style={styles.tabs}>
        {[
          { key: 'salah', label: '🕌 Salah' },
          { key: 'quran', label: '📖 Quran' },
          { key: 'dua', label: '🤲 Dua' },
          { key: 'stories', label: '📚 Stories' },
        ].map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key as IslamicTab)}
          >
            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Salah Tracker */}
        {activeTab === 'salah' && (
          <Animated.View entering={FadeInDown.springify()} style={styles.salahContainer}>
            <Text style={styles.salahTitle}>Today's Prayers</Text>

            {PRAYER_NAMES.map((prayer, i) => {
              const isDone = completedPrayers[prayer.key];
              return (
                <Animated.View key={prayer.key} entering={FadeInDown.delay(i * 80)}>
                  <TouchableOpacity
                    style={[styles.prayerCard, isDone && styles.prayerCardDone]}
                    onPress={() => {
                      if (!isDone) salahMutation.mutate(prayer.key);
                    }}
                    disabled={isDone}
                  >
                    <Text style={styles.prayerEmoji}>{prayer.emoji}</Text>
                    <View style={styles.prayerInfo}>
                      <Text style={styles.prayerName}>{prayer.name}</Text>
                      <Text style={styles.prayerTime}>{prayer.time}</Text>
                    </View>
                    {isDone ? (
                      <View style={styles.doneCheck}>
                        <Text style={styles.doneCheckText}>✓</Text>
                      </View>
                    ) : (
                      <Text style={styles.prayerTap}>Tap when done</Text>
                    )}
                  </TouchableOpacity>
                </Animated.View>
              );
            })}

            {allComplete && (
              <View style={styles.allCompleteCard}>
                <Text style={styles.allCompleteEmoji}>🌟</Text>
                <Text style={styles.allCompleteTitle}>MashaAllah!</Text>
                <Text style={styles.allCompleteDesc}>
                  You completed all 5 prayers today! You earned +40 XP and an Islamic badge!
                </Text>
              </View>
            )}
          </Animated.View>
        )}

        {/* Quran Log */}
        {activeTab === 'quran' && (
          <Animated.View entering={FadeInDown.springify()} style={styles.quranContainer}>
            <Text style={styles.sectionTitle}>📖 Quran Reading</Text>
            <Text style={styles.sectionDesc}>
              Log your Quran reading and track your journey through the Holy Book.
            </Text>

            <View style={styles.quranProgress}>
              <Text style={styles.quranProgressLabel}>Memorised Surahs</Text>
              <View style={styles.quranProgressBar}>
                <View style={[styles.quranProgressFill, { width: '25%' }]} />
              </View>
              <Text style={styles.quranProgressValue}>30/114 Surahs</Text>
            </View>

            <KidsButton
              label="Log Reading Session 📖"
              onPress={() => Alert.alert('Quran Log', 'Enter how much you read today. Feature coming soon!')}
              variant="secondary"
              fullWidth
              icon="📖"
            />

            <View style={styles.quranTipsCard}>
              <Text style={styles.tipEmoji}>💡</Text>
              <Text style={styles.tipText}>
                Tip: Reading just one page after each prayer adds up to 5 pages daily — that's 1500 pages in a year!
              </Text>
            </View>
          </Animated.View>
        )}

        {/* Daily Dua */}
        {activeTab === 'dua' && (
          <Animated.View entering={FadeInDown.springify()} style={styles.duaContainer}>
            <Text style={styles.sectionTitle}>🤲 Daily Duas</Text>

            {DAILY_DUA.map((dua, i) => (
              <Animated.View key={i} entering={FadeInDown.delay(i * 100)} style={styles.duaCard}>
                <Text style={styles.duaOccasion}>{dua.occasion}</Text>
                <Text style={styles.duaArabic}>{dua.arabic}</Text>
                <Text style={styles.duaTranslit}>{dua.transliteration}</Text>
                <Text style={styles.duaEnglish}>"{dua.english}"</Text>
                <TouchableOpacity
                  style={styles.listenButton}
                  onPress={() => Alert.alert('Audio', 'Dua audio coming soon!')}
                >
                  <Text style={styles.listenButtonText}>🔊 Listen</Text>
                </TouchableOpacity>
              </Animated.View>
            ))}

            {dailyContent?.dailyDua && (
              <View style={styles.todaysDua}>
                <Text style={styles.todaysDuaLabel}>Today's Featured Dua</Text>
                <Text style={styles.duaArabic}>{dailyContent.dailyDua.arabic}</Text>
                <Text style={styles.duaEnglish}>"{dailyContent.dailyDua.english}"</Text>
              </View>
            )}
          </Animated.View>
        )}

        {/* Islamic Stories */}
        {activeTab === 'stories' && (
          <Animated.View entering={FadeInDown.springify()} style={styles.storiesContainer}>
            <Text style={styles.sectionTitle}>📚 Islamic Stories</Text>
            <Text style={styles.sectionDesc}>Learn from the stories of the Prophets and companions</Text>

            {ISLAMIC_STORIES.map((story, i) => (
              <Animated.View key={story.id} entering={ZoomIn.delay(i * 80)}>
                <TouchableOpacity
                  style={styles.storyCard}
                  onPress={() => Alert.alert(story.title, `Story: ${story.theme}\n\nFull story feature coming soon!`)}
                >
                  <Text style={styles.storyEmoji}>{story.emoji}</Text>
                  <View style={styles.storyInfo}>
                    <Text style={styles.storyTheme}>{story.theme}</Text>
                    <Text style={styles.storyTitle}>{story.title}</Text>
                    <View style={styles.storyMeta}>
                      <Text style={styles.storyMetaText}>⏱ {story.readingTime}</Text>
                      <Text style={styles.storyMetaText}>Age {story.ageGroup}</Text>
                    </View>
                  </View>
                  <Text style={styles.storyArrow}>›</Text>
                </TouchableOpacity>
              </Animated.View>
            ))}
          </Animated.View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F0FFF4' },
  header: {
    paddingVertical: SPACING[5],
    paddingHorizontal: SPACING[5],
    alignItems: 'center',
    gap: SPACING[2],
  },
  arabicBismillah: {
    fontSize: 24,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: SPACING[1],
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: 'Nunito_400Regular',
    fontWeight: '900',
    color: '#FFFFFF',
  },
  headerStats: {
    flexDirection: 'row',
    gap: SPACING[4],
    alignItems: 'center',
  },
  headerStat: {
    fontSize: 15,
    fontFamily: 'Nunito_400Regular',
    fontWeight: '700',
    color: 'rgba(255,255,255,0.9)',
  },
  allCompleteText: {
    fontSize: 15,
    fontFamily: 'Nunito_400Regular',
    fontWeight: '700',
    color: '#FFD700',
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: SPACING[4],
    paddingTop: SPACING[3],
    gap: SPACING[2],
    marginBottom: SPACING[3],
  },
  tab: {
    flex: 1,
    paddingVertical: SPACING[2],
    alignItems: 'center',
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  tabActive: { backgroundColor: '#2D6A4F' },
  tabText: {
    fontSize: 12,
    fontFamily: 'Nunito_400Regular',
    fontWeight: '700',
    color: '#555',
  },
  tabTextActive: { color: '#FFFFFF' },
  scrollContent: { paddingBottom: SPACING[10] },
  salahContainer: {
    paddingHorizontal: SPACING[5],
    gap: SPACING[3],
  },
  salahTitle: {
    fontSize: 20,
    fontFamily: 'Nunito_400Regular',
    fontWeight: '900',
    color: '#1A472A',
  },
  prayerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[3],
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: SPACING[4],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  prayerCardDone: {
    borderColor: '#2D6A4F',
    backgroundColor: '#F0FFF4',
  },
  prayerEmoji: { fontSize: 32 },
  prayerInfo: { flex: 1 },
  prayerName: {
    fontSize: 18,
    fontFamily: 'Nunito_400Regular',
    fontWeight: '800',
    color: '#1A472A',
  },
  prayerTime: {
    fontSize: 13,
    fontFamily: 'Nunito_400Regular',
    color: '#555',
  },
  doneCheck: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#2D6A4F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneCheckText: {
    fontSize: 20,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  prayerTap: {
    fontSize: 12,
    fontFamily: 'Nunito_400Regular',
    color: '#888',
    fontStyle: 'italic',
  },
  allCompleteCard: {
    backgroundColor: '#2D6A4F',
    borderRadius: 20,
    padding: SPACING[6],
    alignItems: 'center',
    gap: SPACING[2],
    marginTop: SPACING[3],
  },
  allCompleteEmoji: { fontSize: 48 },
  allCompleteTitle: {
    fontSize: 24,
    fontFamily: 'Nunito_400Regular',
    fontWeight: '900',
    color: '#FFD700',
  },
  allCompleteDesc: {
    fontSize: 15,
    fontFamily: 'Nunito_400Regular',
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    lineHeight: 22,
  },
  quranContainer: {
    paddingHorizontal: SPACING[5],
    gap: SPACING[4],
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: 'Nunito_400Regular',
    fontWeight: '900',
    color: '#1A472A',
  },
  sectionDesc: {
    fontSize: 14,
    fontFamily: 'Nunito_400Regular',
    color: '#555',
    lineHeight: 21,
  },
  quranProgress: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: SPACING[5],
    gap: SPACING[3],
  },
  quranProgressLabel: {
    fontSize: 15,
    fontFamily: 'Nunito_400Regular',
    fontWeight: '700',
    color: '#1A472A',
  },
  quranProgressBar: {
    height: 12,
    backgroundColor: 'rgba(0,0,0,0.08)',
    borderRadius: 6,
    overflow: 'hidden',
  },
  quranProgressFill: {
    height: '100%',
    backgroundColor: '#2D6A4F',
    borderRadius: 6,
  },
  quranProgressValue: {
    fontSize: 13,
    fontFamily: 'Nunito_400Regular',
    color: '#555',
    textAlign: 'right',
  },
  quranTipsCard: {
    flexDirection: 'row',
    gap: SPACING[3],
    backgroundColor: '#E8F5E9',
    borderRadius: 14,
    padding: SPACING[4],
    alignItems: 'flex-start',
  },
  tipEmoji: { fontSize: 24 },
  tipText: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Nunito_400Regular',
    color: '#2D6A4F',
    lineHeight: 21,
  },
  duaContainer: {
    paddingHorizontal: SPACING[5],
    gap: SPACING[4],
  },
  duaCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: SPACING[5],
    gap: SPACING[3],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderLeftWidth: 4,
    borderLeftColor: '#2D6A4F',
  },
  duaOccasion: {
    fontSize: 12,
    fontFamily: 'Nunito_400Regular',
    fontWeight: '700',
    color: '#2D6A4F',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  duaArabic: {
    fontSize: 22,
    color: '#1A472A',
    textAlign: 'right',
    lineHeight: 36,
    fontWeight: '700',
  },
  duaTranslit: {
    fontSize: 15,
    fontFamily: 'Nunito_400Regular',
    color: '#555',
    fontStyle: 'italic',
  },
  duaEnglish: {
    fontSize: 14,
    fontFamily: 'Nunito_400Regular',
    color: '#333',
    lineHeight: 21,
  },
  listenButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#E8F5E9',
    borderRadius: 10,
    paddingVertical: SPACING[2],
    paddingHorizontal: SPACING[3],
  },
  listenButtonText: {
    fontSize: 13,
    fontFamily: 'Nunito_400Regular',
    fontWeight: '700',
    color: '#2D6A4F',
  },
  todaysDua: {
    backgroundColor: '#2D6A4F',
    borderRadius: 20,
    padding: SPACING[5],
    gap: SPACING[3],
    alignItems: 'center',
  },
  todaysDuaLabel: {
    fontSize: 13,
    fontFamily: 'Nunito_400Regular',
    fontWeight: '700',
    color: '#FFD700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  storiesContainer: {
    paddingHorizontal: SPACING[5],
    gap: SPACING[3],
  },
  storyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[3],
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: SPACING[4],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  storyEmoji: { fontSize: 40 },
  storyInfo: { flex: 1 },
  storyTheme: {
    fontSize: 12,
    fontFamily: 'Nunito_400Regular',
    fontWeight: '700',
    color: '#2D6A4F',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  storyTitle: {
    fontSize: 16,
    fontFamily: 'Nunito_400Regular',
    fontWeight: '800',
    color: '#1A472A',
  },
  storyMeta: {
    flexDirection: 'row',
    gap: SPACING[3],
    marginTop: 3,
  },
  storyMetaText: {
    fontSize: 12,
    fontFamily: 'Nunito_400Regular',
    color: '#888',
  },
  storyArrow: {
    fontSize: 26,
    color: '#2D6A4F',
  },
});
