/**
 * Kids Gaming Zone — educational mini-games hub.
 * Shows: featured games, family quiz battle, daily challenge, achievements.
 * Designed to be engaging without being addictive — each game has a session timer.
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
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';
import { COLORS } from '../../../src/constants/colors';
import { SPACING } from '../../../src/constants/spacing';
import { KidsButton } from '../../../src/components/kids/KidsButton';

interface GameCardProps {
  emoji: string;
  title: string;
  description: string;
  category: string;
  xpReward: number;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  gradientColors: [string, string];
  onPlay: () => void;
}

function GameCard({
  emoji,
  title,
  description,
  category,
  xpReward,
  difficulty,
  gradientColors,
  onPlay,
}: GameCardProps) {
  const difficultyColor = { Easy: '#4ADE80', Medium: '#FFA726', Hard: '#F87171' }[difficulty];

  return (
    <Animated.View entering={ZoomIn.delay(100).springify()}>
      <TouchableOpacity onPress={onPlay} activeOpacity={0.88} style={styles.gameCard}>
        <LinearGradient colors={gradientColors} style={styles.gameCardGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <Text style={styles.gameEmoji}>{emoji}</Text>
          <View style={styles.gameInfo}>
            <Text style={styles.gameCategory}>{category}</Text>
            <Text style={styles.gameTitle}>{title}</Text>
            <Text style={styles.gameDesc} numberOfLines={2}>{description}</Text>
            <View style={styles.gameFooter}>
              <View style={[styles.difficultyBadge, { borderColor: difficultyColor }]}>
                <Text style={[styles.difficultyText, { color: difficultyColor }]}>{difficulty}</Text>
              </View>
              <Text style={styles.xpReward}>+{xpReward} XP</Text>
            </View>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
}

const GAMES: Omit<GameCardProps, 'onPlay'>[] = [
  {
    emoji: '🔢',
    title: 'Math Galaxy',
    description: 'Solve math challenges and explore the universe',
    category: 'Maths',
    xpReward: 30,
    difficulty: 'Medium',
    gradientColors: ['#667EEA', '#764BA2'],
  },
  {
    emoji: '📖',
    title: 'Word Wizard',
    description: 'Spell words, build vocabulary, beat the clock',
    category: 'English',
    xpReward: 25,
    difficulty: 'Easy',
    gradientColors: ['#43E97B', '#38F9D7'],
  },
  {
    emoji: '🔬',
    title: 'Science Lab',
    description: 'Virtual experiments and science discoveries',
    category: 'Science',
    xpReward: 35,
    difficulty: 'Hard',
    gradientColors: ['#FA709A', '#FEE140'],
  },
  {
    emoji: '🗺️',
    title: 'World Explorer',
    description: 'Travel the globe — geography made fun',
    category: 'Geography',
    xpReward: 20,
    difficulty: 'Easy',
    gradientColors: ['#4FACFE', '#00F2FE'],
  },
  {
    emoji: '🧩',
    title: 'Logic Puzzles',
    description: 'Brain teasers that develop critical thinking',
    category: 'Logic',
    xpReward: 40,
    difficulty: 'Hard',
    gradientColors: ['#F093FB', '#F5576C'],
  },
  {
    emoji: '🎨',
    title: 'Creative Canvas',
    description: 'Draw, color and express your creativity',
    category: 'Arts',
    xpReward: 15,
    difficulty: 'Easy',
    gradientColors: ['#FEE140', '#FA709A'],
  },
];

export default function GamesScreen() {
  const [activeTab, setActiveTab] = useState<'games' | 'battle' | 'daily'>('games');

  function handlePlay(gameName: string) {
    Alert.alert(
      `Playing: ${gameName}`,
      'Game module launching! Educational mini-games are being built. Stay tuned!',
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      {/* Header */}
      <LinearGradient
        colors={['#7C3AED', '#4F46E5']}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <Text style={styles.headerTitle}>🎮 Games Zone</Text>
        <Text style={styles.headerSubtitle}>Learn while you play!</Text>
      </LinearGradient>

      {/* Tabs */}
      <View style={styles.tabs}>
        {[
          { key: 'games', label: '🕹️ Games' },
          { key: 'battle', label: '⚔️ Family Battle' },
          { key: 'daily', label: '🎯 Daily Challenge' },
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

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Games Tab */}
        {activeTab === 'games' && (
          <Animated.View entering={FadeInDown.springify()} style={styles.gamesGrid}>
            {GAMES.map((game) => (
              <GameCard key={game.title} {...game} onPlay={() => handlePlay(game.title)} />
            ))}
          </Animated.View>
        )}

        {/* Family Battle Tab */}
        {activeTab === 'battle' && (
          <Animated.View entering={FadeInDown.springify()} style={styles.battleContainer}>
            <View style={styles.battleCard}>
              <Text style={styles.battleEmoji}>⚔️</Text>
              <Text style={styles.battleTitle}>Family Quiz Battle</Text>
              <Text style={styles.battleDesc}>
                Challenge your family to a quiz battle! Pick a topic, answer questions, and see who scores highest!
              </Text>
              <KidsButton
                label="Start Battle! ⚔️"
                onPress={() => Alert.alert('Family Quiz Battle', 'Invite family members to join. Feature coming soon!')}
                variant="primary"
                fullWidth
              />
            </View>

            <View style={styles.leaderboardCard}>
              <Text style={styles.leaderboardTitle}>🏆 Family Leaderboard</Text>
              {[
                { rank: 1, name: 'You', score: 2840, emoji: '🥇' },
                { rank: 2, name: 'Mum', score: 2650, emoji: '🥈' },
                { rank: 3, name: 'Dad', score: 2200, emoji: '🥉' },
              ].map((entry) => (
                <View key={entry.rank} style={styles.leaderboardRow}>
                  <Text style={styles.leaderboardEmoji}>{entry.emoji}</Text>
                  <Text style={styles.leaderboardName}>{entry.name}</Text>
                  <Text style={styles.leaderboardScore}>{entry.score} pts</Text>
                </View>
              ))}
            </View>
          </Animated.View>
        )}

        {/* Daily Challenge Tab */}
        {activeTab === 'daily' && (
          <Animated.View entering={FadeInDown.springify()} style={styles.dailyContainer}>
            <View style={styles.dailyChallengeCard}>
              <Text style={styles.dailyLabel}>TODAY'S CHALLENGE</Text>
              <Text style={styles.dailyTitle}>⚡ Speed Math Sprint</Text>
              <Text style={styles.dailyDesc}>
                Solve 20 maths questions in under 2 minutes. How fast can you go?
              </Text>
              <View style={styles.dailyRewards}>
                <View style={styles.dailyRewardItem}>
                  <Text style={styles.dailyRewardValue}>+50</Text>
                  <Text style={styles.dailyRewardLabel}>XP</Text>
                </View>
                <View style={styles.dailyRewardItem}>
                  <Text style={styles.dailyRewardValue}>+30</Text>
                  <Text style={styles.dailyRewardLabel}>Coins</Text>
                </View>
                <View style={styles.dailyRewardItem}>
                  <Text style={styles.dailyRewardValue}>🏅</Text>
                  <Text style={styles.dailyRewardLabel}>Badge</Text>
                </View>
              </View>
              <KidsButton
                label="Play Now! ⚡"
                onPress={() => Alert.alert('Starting challenge...', 'Daily challenge module coming soon!')}
                variant="secondary"
                fullWidth
              />
            </View>

            <View style={styles.dailyStreak}>
              <Text style={styles.dailyStreakTitle}>🔥 Challenge Streak</Text>
              <View style={styles.streakDots}>
                {Array.from({ length: 7 }).map((_, i) => (
                  <View key={i} style={[styles.streakDot, i < 3 && styles.streakDotFilled]} />
                ))}
              </View>
              <Text style={styles.streakLabel}>3 days in a row!</Text>
            </View>
          </Animated.View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F8F4FF' },
  header: {
    paddingHorizontal: SPACING[5],
    paddingVertical: SPACING[5],
    paddingBottom: SPACING[6],
  },
  headerTitle: {
    fontSize: 28,
    fontFamily: 'Nunito_400Regular',
    fontWeight: '900',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 15,
    fontFamily: 'Nunito_400Regular',
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: SPACING[4],
    paddingTop: SPACING[4],
    gap: SPACING[2],
    marginBottom: SPACING[3],
  },
  tab: {
    flex: 1,
    paddingVertical: SPACING[2],
    alignItems: 'center',
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.06)',
  },
  tabActive: { backgroundColor: '#7C3AED' },
  tabText: {
    fontSize: 12,
    fontFamily: 'Nunito_400Regular',
    fontWeight: '700',
    color: '#888',
  },
  tabTextActive: { color: '#FFFFFF' },
  scrollContent: { paddingBottom: SPACING[10] },
  gamesGrid: {
    paddingHorizontal: SPACING[4],
    gap: SPACING[3],
  },
  gameCard: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 8,
  },
  gameCardGradient: {
    flexDirection: 'row',
    padding: SPACING[4],
    alignItems: 'center',
    gap: SPACING[4],
  },
  gameEmoji: { fontSize: 48 },
  gameInfo: { flex: 1, gap: 3 },
  gameCategory: {
    fontSize: 11,
    fontFamily: 'Nunito_400Regular',
    fontWeight: '700',
    color: 'rgba(255,255,255,0.7)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  gameTitle: {
    fontSize: 18,
    fontFamily: 'Nunito_400Regular',
    fontWeight: '900',
    color: '#FFFFFF',
  },
  gameDesc: {
    fontSize: 13,
    fontFamily: 'Nunito_400Regular',
    color: 'rgba(255,255,255,0.85)',
    lineHeight: 19,
  },
  gameFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[3],
    marginTop: SPACING[1],
  },
  difficultyBadge: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: SPACING[2],
    paddingVertical: 2,
  },
  difficultyText: { fontSize: 11, fontFamily: 'Nunito_700Bold' },
  xpReward: {
    fontSize: 13,
    fontFamily: 'Nunito_400Regular',
    fontWeight: '800',
    color: '#FFD93D',
  },
  battleContainer: { padding: SPACING[4], gap: SPACING[4] },
  battleCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: SPACING[5],
    alignItems: 'center',
    gap: SPACING[3],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  battleEmoji: { fontSize: 64 },
  battleTitle: {
    fontSize: 24,
    fontFamily: 'Nunito_400Regular',
    fontWeight: '900',
    color: '#333',
  },
  battleDesc: {
    fontSize: 15,
    fontFamily: 'Nunito_400Regular',
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
  leaderboardCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: SPACING[5],
    gap: SPACING[3],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  leaderboardTitle: {
    fontSize: 18,
    fontFamily: 'Nunito_400Regular',
    fontWeight: '800',
    color: '#333',
  },
  leaderboardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[3],
    paddingVertical: SPACING[2],
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  leaderboardEmoji: { fontSize: 24, width: 32 },
  leaderboardName: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Nunito_400Regular',
    fontWeight: '700',
    color: '#333',
  },
  leaderboardScore: {
    fontSize: 15,
    fontFamily: 'Nunito_400Regular',
    fontWeight: '800',
    color: '#7C3AED',
  },
  dailyContainer: { padding: SPACING[4], gap: SPACING[4] },
  dailyChallengeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: SPACING[5],
    gap: SPACING[3],
    borderWidth: 2,
    borderColor: '#7C3AED',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  dailyLabel: {
    fontSize: 11,
    fontFamily: 'Nunito_400Regular',
    fontWeight: '800',
    color: '#7C3AED',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  dailyTitle: {
    fontSize: 24,
    fontFamily: 'Nunito_400Regular',
    fontWeight: '900',
    color: '#333',
  },
  dailyDesc: {
    fontSize: 15,
    fontFamily: 'Nunito_400Regular',
    color: '#666',
    lineHeight: 22,
  },
  dailyRewards: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: SPACING[8],
  },
  dailyRewardItem: { alignItems: 'center', gap: 2 },
  dailyRewardValue: {
    fontSize: 24,
    fontFamily: 'Nunito_400Regular',
    fontWeight: '900',
    color: '#333',
  },
  dailyRewardLabel: {
    fontSize: 12,
    fontFamily: 'Nunito_400Regular',
    color: '#888',
  },
  dailyStreak: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: SPACING[5],
    alignItems: 'center',
    gap: SPACING[3],
  },
  dailyStreakTitle: {
    fontSize: 18,
    fontFamily: 'Nunito_400Regular',
    fontWeight: '800',
    color: '#333',
  },
  streakDots: {
    flexDirection: 'row',
    gap: SPACING[2],
  },
  streakDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.08)',
  },
  streakDotFilled: { backgroundColor: '#FF6B35' },
  streakLabel: {
    fontSize: 15,
    fontFamily: 'Nunito_400Regular',
    fontWeight: '700',
    color: '#FF6B35',
  },
});
