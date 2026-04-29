/**
 * Parent Control Center — the new post-login landing page for parents.
 * Shows: greeting, live clock, kid selector bar, Switch to Kid Mode CTA, 8 feature cards.
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  FadeInDown,
  FadeInRight,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../../src/store/auth.store';
import { useFamilyStore } from '../../../src/store/family.store';
import { apiClient } from '../../../src/services/api.client';
import { API_ENDPOINTS } from '../../../src/constants/api';
import { COLORS } from '../../../src/constants/colors';
import type { ChildDashboardCard, FamilyDashboard } from '@parentingmykid/shared-types';
import { SPACING } from '../../../src/constants/spacing';

const FEATURE_CARDS = [
  {
    id: 'block-apps',
    emoji: '🚫',
    title: 'Block Apps',
    desc: 'Control which apps kids can use',
    gradient: ['#EF4444', '#F97316'] as const,
  },
  {
    id: 'website-blocker',
    emoji: '🌐',
    title: 'Website Blocker',
    desc: 'Filter websites & browsing',
    gradient: ['#F59E0B', '#EAB308'] as const,
  },
  {
    id: 'watch-limit',
    emoji: '⏱️',
    title: 'Watch Limit',
    desc: 'Daily screen time controls',
    gradient: ['#3B82F6', '#0EA5E9'] as const,
  },
  {
    id: 'game-settings',
    emoji: '🎮',
    title: 'Game Settings',
    desc: 'Manage gaming access',
    gradient: ['#8B5CF6', '#A855F7'] as const,
  },
  {
    id: 'video-manager',
    emoji: '📹',
    title: 'Video Manager',
    desc: 'Curate what kids watch',
    gradient: ['#10B981', '#059669'] as const,
  },
  {
    id: 'app-guard',
    emoji: '🛡️',
    title: 'App Guard',
    desc: 'Keep kids in the app',
    gradient: ['#0EA5E9', '#2563EB'] as const,
  },
  {
    id: 'stop-internet',
    emoji: '📵',
    title: 'Stop Internet',
    desc: 'Pause internet access',
    gradient: ['#EC4899', '#F43F5E'] as const,
  },
  {
    id: 'troubleshoot',
    emoji: '🔧',
    title: 'Troubleshoot',
    desc: 'Fix permission issues',
    gradient: ['#6B7280', '#374151'] as const,
  },
];

function getGreeting(name: string) {
  const hour = new Date().getHours();
  let greeting = 'Good morning';
  if (hour >= 12 && hour < 17) greeting = 'Good afternoon';
  else if (hour >= 17 && hour < 21) greeting = 'Good evening';
  else if (hour >= 21) greeting = 'Good night';
  return `${greeting}, ${name.split(' ')[0]}`;
}

function LiveClock() {
  const [time, setTime] = useState('');

  useEffect(() => {
    const update = () => {
      const now = new Date();
      const h = now.getHours().toString().padStart(2, '0');
      const m = now.getMinutes().toString().padStart(2, '0');
      setTime(`${h}:${m}`);
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);

  return <Text style={styles.clock}>{time}</Text>;
}

function FeatureCard({ card, index, activeKidId }: { card: (typeof FEATURE_CARDS)[0]; index: number; activeKidId: string | null }) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View
      entering={FadeInDown.delay(100 + index * 60).springify()}
      style={[styles.featureCardWrap, animStyle]}
    >
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => {
          if (!activeKidId) {
            Alert.alert('No kid selected', 'Please select a child first to configure this feature.');
            return;
          }
          router.push(`/(parent)/control-center/${card.id}?childId=${activeKidId}`);
        }}
        onPressIn={() => { scale.value = withSpring(0.95); }}
        onPressOut={() => { scale.value = withSpring(1); }}
      >
        <LinearGradient
          colors={card.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.featureCard}
        >
          <Text style={styles.featureEmoji}>{card.emoji}</Text>
          <Text style={styles.featureTitle}>{card.title}</Text>
          <Text style={styles.featureDesc}>{card.desc}</Text>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function ControlCenterScreen() {
  const { user } = useAuthStore();
  const { activeFamilyId, dashboard, setDashboard } = useFamilyStore();
  const [activeKidId, setActiveKidId] = useState<string | null>(null);

  /** Same payload as the legacy dashboard tab — Control Center is the parent landing page, so we must hydrate here or children stay empty. */
  useQuery({
    queryKey: ['family-home', activeFamilyId],
    queryFn: async () => {
      if (!activeFamilyId) return null;
      const response = await apiClient.get<FamilyDashboard>(
        API_ENDPOINTS.children.home(activeFamilyId),
      );
      setDashboard(response.data);
      return response.data;
    },
    enabled: !!activeFamilyId,
    staleTime: 60_000,
  });

  const kids: ChildDashboardCard[] = dashboard?.children ?? [];

  useEffect(() => {
    if (kids.length > 0 && !activeKidId) {
      setActiveKidId(kids[0].childId);
    }
  }, [kids]);

  const activeKid = kids.find((k) => k.childId === activeKidId);

  return (
    <LinearGradient
      colors={['#E8F4EC', '#F2E8E9', '#F0F4FF']}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

          {/* Header */}
          <Animated.View entering={FadeInDown.delay(50).springify()} style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={styles.greeting}>{getGreeting(user?.name ?? 'Parent')}</Text>
              <LiveClock />
            </View>
            <TouchableOpacity
              style={styles.settingsButton}
              onPress={() => router.push('/(parent)/settings')}
            >
              <Text style={styles.settingsIcon}>⚙️</Text>
            </TouchableOpacity>
          </Animated.View>

          {/* Kid Selector Bar */}
          {kids.length > 0 && (
            <Animated.View entering={FadeInDown.delay(150).springify()} style={styles.kidBar}>
              <Text style={styles.kidBarLabel}>Managing</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.kidBarScroll}
              >
                {kids.map((kid) => (
                  <TouchableOpacity
                    key={kid.childId}
                    style={[styles.kidChip, activeKidId === kid.childId && styles.kidChipActive]}
                    onPress={() => setActiveKidId(kid.childId)}
                  >
                    <View style={[styles.kidAvatar, activeKidId === kid.childId && styles.kidAvatarActive]}>
                      <Text style={styles.kidAvatarText}>{kid.name?.[0]?.toUpperCase()}</Text>
                    </View>
                    <Text style={[styles.kidChipText, activeKidId === kid.childId && styles.kidChipTextActive]}>
                      {kid.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </Animated.View>
          )}

          {/* No kids prompt */}
          {kids.length === 0 && (
            <Animated.View entering={FadeInDown.delay(150)} style={styles.noKidsCard}>
              <Text style={styles.noKidsEmoji}>👶</Text>
              <Text style={styles.noKidsTitle}>Add your first child</Text>
              <Text style={styles.noKidsDesc}>Set up a child profile to start protecting them</Text>
              <TouchableOpacity
                style={styles.addKidButton}
                onPress={() => router.push('/(parent)/family-space/add-child')}
              >
                <Text style={styles.addKidButtonText}>+ Add Child</Text>
              </TouchableOpacity>
            </Animated.View>
          )}

          {/* Switch to Kid Mode CTA */}
          {activeKid && (
            <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.kidModeCta}>
              <LinearGradient
                colors={['#6366F1', '#8B5CF6', '#A855F7']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.kidModeGradient}
              >
                <View style={styles.kidModeLeft}>
                  <Text style={styles.kidModeEmoji}>🌟</Text>
                  <View>
                    <Text style={styles.kidModeTitle}>Kid Mode</Text>
                    <Text style={styles.kidModeDesc}>Handing device to {activeKid.name}</Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.kidModeButton}
                  onPress={() => router.push(`/(parent)/control-center/kid-mode?childId=${activeKidId}`)}
                >
                  <Text style={styles.kidModeButtonText}>Switch →</Text>
                </TouchableOpacity>
              </LinearGradient>
            </Animated.View>
          )}

          {/* View Kid Activity */}
          {activeKid && (
            <Animated.View entering={FadeInDown.delay(240).springify()} style={styles.activityRow}>
              <TouchableOpacity
                style={styles.activityButton}
                onPress={() => router.push(`/(parent)/control-center/kid-activity?childId=${activeKidId}`)}
              >
                <Text style={styles.activityButtonEmoji}>📊</Text>
                <Text style={styles.activityButtonText}>View {activeKid.name}'s Activity</Text>
                <Text style={styles.activityArrow}>›</Text>
              </TouchableOpacity>
            </Animated.View>
          )}

          {/* Parental Controls Grid */}
          <Animated.View entering={FadeInDown.delay(260)}>
            <Text style={styles.sectionTitle}>Parental Controls</Text>
          </Animated.View>

          <View style={styles.featureGrid}>
            {FEATURE_CARDS.map((card, i) => (
              <FeatureCard key={card.id} card={card} index={i} activeKidId={activeKidId} />
            ))}
          </View>

          {/* Bottom padding */}
          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  scroll: { paddingHorizontal: SPACING[5], paddingTop: SPACING[4] },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING[5],
  },
  headerLeft: { gap: 4 },
  greeting: {
    fontFamily: 'Inter_700Bold',
    fontSize: 24,
    color: COLORS.parent.textPrimary,
  },
  clock: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
    color: COLORS.parent.textMuted,
  },
  settingsButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(92,61,46,0.1)',
  },
  settingsIcon: { fontSize: 20 },

  kidBar: { marginBottom: SPACING[5] },
  kidBarLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: COLORS.parent.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: SPACING[2],
  },
  kidBarScroll: { gap: SPACING[3] },
  kidChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderRadius: 100,
    paddingHorizontal: SPACING[3],
    paddingVertical: SPACING[2],
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  kidChipActive: {
    backgroundColor: 'rgba(59,130,246,0.12)',
    borderColor: COLORS.parent.primary,
  },
  kidAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.parent.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kidAvatarActive: { backgroundColor: COLORS.parent.primary },
  kidAvatarText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
    color: '#FFFFFF',
  },
  kidChipText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: COLORS.parent.textSecondary,
  },
  kidChipTextActive: { color: COLORS.parent.primary },

  noKidsCard: {
    backgroundColor: 'rgba(255,255,255,0.72)',
    borderRadius: 20,
    padding: SPACING[6],
    alignItems: 'center',
    marginBottom: SPACING[5],
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.55)',
  },
  noKidsEmoji: { fontSize: 48, marginBottom: SPACING[3] },
  noKidsTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 18,
    color: COLORS.parent.textPrimary,
    marginBottom: SPACING[2],
  },
  noKidsDesc: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: COLORS.parent.textMuted,
    textAlign: 'center',
    marginBottom: SPACING[4],
  },
  addKidButton: {
    backgroundColor: COLORS.parent.primary,
    borderRadius: 12,
    paddingVertical: SPACING[3],
    paddingHorizontal: SPACING[6],
  },
  addKidButtonText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 15,
    color: '#FFFFFF',
  },

  kidModeCta: {
    marginBottom: SPACING[3],
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  kidModeGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING[5],
  },
  kidModeLeft: { flexDirection: 'row', alignItems: 'center', gap: SPACING[3] },
  kidModeEmoji: { fontSize: 32 },
  kidModeTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 18,
    color: '#FFFFFF',
  },
  kidModeDesc: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  kidModeButton: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 12,
    paddingVertical: SPACING[2],
    paddingHorizontal: SPACING[4],
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  kidModeButtonText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 15,
    color: '#FFFFFF',
  },

  activityRow: { marginBottom: SPACING[5] },
  activityButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.72)',
    borderRadius: 16,
    padding: SPACING[4],
    gap: SPACING[3],
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.55)',
  },
  activityButtonEmoji: { fontSize: 22 },
  activityButtonText: {
    flex: 1,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
    color: COLORS.parent.textPrimary,
  },
  activityArrow: {
    fontSize: 22,
    color: COLORS.parent.textMuted,
  },

  sectionTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 16,
    color: COLORS.parent.textPrimary,
    marginBottom: SPACING[4],
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  featureGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING[4],
  },
  featureCardWrap: {
    width: '47%',
  },
  featureCard: {
    borderRadius: 20,
    padding: SPACING[5],
    minHeight: 130,
    justifyContent: 'flex-end',
  },
  featureEmoji: {
    fontSize: 32,
    marginBottom: SPACING[3],
  },
  featureTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 15,
    color: '#FFFFFF',
    marginBottom: 4,
  },
  featureDesc: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    lineHeight: 16,
  },
});
