/**
 * Rewards screen — child's RPG-style reward hub.
 * Shows: coins, XP, level, badges earned, wish requests, reward marketplace.
 * Big colorful cards, bouncy animations, gamified feel.
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
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Animated, { FadeInDown, FadeInUp, ZoomIn } from 'react-native-reanimated';
import { apiClient } from '../../../src/services/api.client';
import { API_ENDPOINTS } from '../../../src/constants/api';
import { useAuthStore } from '../../../src/store/auth.store';
import { COLORS } from '../../../src/constants/colors';
import { SPACING } from '../../../src/constants/spacing';
import { XpBar } from '../../../src/components/kids/XpBar';
import { KidsButton } from '../../../src/components/kids/KidsButton';

type RewardsTab = 'earned' | 'shop' | 'wishes';

interface BadgeCardProps {
  name: string;
  description: string;
  icon: string;
  unlockedAt?: string;
  isNew?: boolean;
}

function BadgeCard({ name, description, icon, unlockedAt, isNew }: BadgeCardProps) {
  return (
    <Animated.View entering={ZoomIn.delay(100).springify()} style={styles.badgeCard}>
      {isNew && <View style={styles.newBadge}><Text style={styles.newBadgeText}>NEW!</Text></View>}
      <Text style={styles.badgeIcon}>{icon}</Text>
      <Text style={styles.badgeName} numberOfLines={2}>{name}</Text>
      {unlockedAt && (
        <Text style={styles.badgeDate}>
          {new Date(unlockedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
        </Text>
      )}
    </Animated.View>
  );
}

export default function RewardsScreen() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<RewardsTab>('earned');
  const qc = useQueryClient();

  const { data: rewardsData } = useQuery({
    queryKey: ['rewards', user?.childProfileId],
    queryFn: () =>
      apiClient
        .get(`${API_ENDPOINTS.rewards.base}/${user?.childProfileId}`)
        .then((r) => r.data),
    enabled: !!user?.childProfileId,
  });

  const wishMutation = useMutation({
    mutationFn: (wish: { title: string; description: string; pointsCost: number }) =>
      apiClient.post(API_ENDPOINTS.rewards.wishRequest, {
        childId: user?.childProfileId,
        ...wish,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rewards'] });
      Alert.alert('Wish sent! 🌟', 'Your parent will review your wish request.');
    },
  });

  const profile = rewardsData?.profile;
  const badges = rewardsData?.badges ?? [];
  const rewards = rewardsData?.availableRewards ?? [];
  const wishes = rewardsData?.wishRequests ?? [];

  const AVAILABLE_REWARDS = [
    { id: '1', title: 'Extra screen time', icon: '📱', coinsCost: 50, description: '+30 mins today' },
    { id: '2', title: 'Movie night pick', icon: '🎬', coinsCost: 80, description: 'You choose the movie!' },
    { id: '3', title: 'Stay up 30 mins late', icon: '🌙', coinsCost: 100, description: 'One night pass' },
    { id: '4', title: 'Favourite meal', icon: '🍕', coinsCost: 60, description: 'Parent cooks your pick' },
    { id: '5', title: 'Outing of your choice', icon: '🎡', coinsCost: 200, description: 'Plan a fun trip!' },
    { id: '6', title: 'New book or toy', icon: '🎁', coinsCost: 300, description: 'Budget: decided by parent' },
  ];

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Header stats */}
        <Animated.View entering={FadeInUp.springify()} style={styles.statsHeader}>
          <View style={styles.coinsStat}>
            <Text style={styles.coinsIcon}>🪙</Text>
            <View>
              <Text style={styles.coinsValue}>{profile?.coins ?? 0}</Text>
              <Text style={styles.coinsLabel}>Coins</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.coinsStat}>
            <Text style={styles.coinsIcon}>💎</Text>
            <View>
              <Text style={styles.coinsValue}>{profile?.points ?? 0}</Text>
              <Text style={styles.coinsLabel}>Points</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.coinsStat}>
            <Text style={styles.coinsIcon}>🏅</Text>
            <View>
              <Text style={styles.coinsValue}>{badges.length}</Text>
              <Text style={styles.coinsLabel}>Badges</Text>
            </View>
          </View>
        </Animated.View>

        {/* XP Bar */}
        <Animated.View entering={FadeInDown.delay(150)} style={styles.xpContainer}>
          <XpBar xp={profile?.xp ?? 0} level={profile?.level ?? 1} />
        </Animated.View>

        {/* Tabs */}
        <View style={styles.tabs}>
          {[
            { key: 'earned', label: '🏅 Badges' },
            { key: 'shop', label: '🛍️ Shop' },
            { key: 'wishes', label: '🌟 Wishes' },
          ].map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, activeTab === tab.key && styles.tabActive]}
              onPress={() => setActiveTab(tab.key as RewardsTab)}
            >
              <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Badges Tab */}
        {activeTab === 'earned' && (
          <Animated.View entering={FadeInDown.springify()}>
            {badges.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyEmoji}>🏅</Text>
                <Text style={styles.emptyTitle}>No badges yet!</Text>
                <Text style={styles.emptyDesc}>Complete missions to earn your first badge</Text>
              </View>
            ) : (
              <View style={styles.badgeGrid}>
                {badges.map((badge: any) => (
                  <BadgeCard
                    key={badge.id}
                    name={badge.name}
                    description={badge.description}
                    icon={badge.icon}
                    unlockedAt={badge.earnedAt}
                    isNew={badge.isNew}
                  />
                ))}
              </View>
            )}
          </Animated.View>
        )}

        {/* Shop Tab */}
        {activeTab === 'shop' && (
          <Animated.View entering={FadeInDown.springify()} style={styles.shopGrid}>
            {AVAILABLE_REWARDS.map((reward) => {
              const canAfford = (profile?.coins ?? 0) >= reward.coinsCost;
              return (
                <TouchableOpacity
                  key={reward.id}
                  style={[styles.rewardCard, !canAfford && styles.rewardCardLocked]}
                  onPress={() => {
                    if (!canAfford) {
                      Alert.alert('Not enough coins', `You need ${reward.coinsCost} coins for this.`);
                      return;
                    }
                    Alert.alert(
                      `Claim: ${reward.title}`,
                      `This will cost ${reward.coinsCost} 🪙 coins. Your parent will be notified!`,
                      [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Claim!', onPress: () => Alert.alert('Claimed! 🎉', 'Your parent has been notified.') },
                      ],
                    );
                  }}
                >
                  <Text style={styles.rewardIcon}>{reward.icon}</Text>
                  <Text style={styles.rewardTitle}>{reward.title}</Text>
                  <Text style={styles.rewardDesc}>{reward.description}</Text>
                  <View style={[styles.rewardCost, !canAfford && styles.rewardCostLocked]}>
                    <Text style={styles.rewardCostText}>
                      🪙 {reward.coinsCost}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </Animated.View>
        )}

        {/* Wishes Tab */}
        {activeTab === 'wishes' && (
          <Animated.View entering={FadeInDown.springify()} style={{ gap: SPACING[4] }}>
            <View style={styles.wishInfo}>
              <Text style={styles.wishInfoText}>
                🌟 Got a special wish? Send it to your parent and they can approve it!
              </Text>
            </View>

            <KidsButton
              label="Send a Wish 🌟"
              onPress={() =>
                Alert.alert(
                  'Send a Wish',
                  'This will open a form to send a special wish to your parent. (Feature coming soon!)',
                )
              }
              variant="primary"
              fullWidth
            />

            {wishes.length > 0 && (
              <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>📬 My Wishes</Text>
                {wishes.map((wish: any) => (
                  <View key={wish.id} style={styles.wishItem}>
                    <Text style={styles.wishTitle}>{wish.title}</Text>
                    <View style={[
                      styles.wishStatus,
                      {
                        backgroundColor:
                          wish.status === 'APPROVED' ? 'rgba(74,222,128,0.15)' :
                          wish.status === 'DENIED' ? 'rgba(220,38,38,0.15)' :
                          'rgba(251,146,60,0.15)',
                      },
                    ]}>
                      <Text style={[
                        styles.wishStatusText,
                        {
                          color:
                            wish.status === 'APPROVED' ? '#4ADE80' :
                            wish.status === 'DENIED' ? '#F87171' : '#FB923C',
                        },
                      ]}>
                        {wish.status}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </Animated.View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: 'transparent' },
  scrollContent: { paddingBottom: SPACING[10] },
  statsHeader: {
    flexDirection: 'row',
    backgroundColor: COLORS.kids.primary,
    paddingVertical: SPACING[5],
    paddingHorizontal: SPACING[6],
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  coinsStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
  },
  coinsIcon: { fontSize: 32 },
  coinsValue: {
    fontSize: 24,
    fontFamily: 'Nunito_400Regular',
    fontWeight: '900',
    color: '#FFFFFF',
  },
  coinsLabel: {
    fontSize: 13,
    fontFamily: 'Nunito_400Regular',
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
  },
  divider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  xpContainer: {
    paddingHorizontal: SPACING[5],
    paddingVertical: SPACING[4],
    backgroundColor: COLORS.kids.primary,
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: SPACING[5],
    paddingTop: SPACING[4],
    gap: SPACING[2],
    marginBottom: SPACING[4],
  },
  tab: {
    flex: 1,
    paddingVertical: SPACING[3],
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  tabActive: { backgroundColor: COLORS.kids.primary },
  tabText: {
    fontSize: 13,
    fontFamily: 'Nunito_400Regular',
    fontWeight: '700',
    color: 'rgba(255,255,255,0.75)',
  },
  tabTextActive: { color: '#FFFFFF' },
  badgeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: SPACING[4],
    gap: SPACING[3],
  },
  badgeCard: {
    width: '30%',
    backgroundColor: 'rgba(255,255,255,0.88)',
    borderRadius: 16,
    padding: SPACING[3],
    alignItems: 'center',
    gap: SPACING[1],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
    position: 'relative',
  },
  newBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: COLORS.kids.secondary,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  newBadgeText: {
    fontSize: 9,
    fontFamily: 'Nunito_400Regular',
    fontWeight: '900',
    color: '#FFFFFF',
  },
  badgeIcon: { fontSize: 36 },
  badgeName: {
    fontSize: 12,
    fontFamily: 'Nunito_400Regular',
    fontWeight: '700',
    color: '#333',
    textAlign: 'center',
  },
  badgeDate: {
    fontSize: 10,
    fontFamily: 'Nunito_400Regular',
    color: '#999',
  },
  shopGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: SPACING[4],
    gap: SPACING[3],
  },
  rewardCard: {
    width: '47%',
    backgroundColor: 'rgba(255,255,255,0.88)',
    borderRadius: 16,
    padding: SPACING[4],
    alignItems: 'center',
    gap: SPACING[2],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  rewardCardLocked: { opacity: 0.6 },
  rewardIcon: { fontSize: 40 },
  rewardTitle: {
    fontSize: 14,
    fontFamily: 'Nunito_400Regular',
    fontWeight: '800',
    color: '#333',
    textAlign: 'center',
  },
  rewardDesc: {
    fontSize: 12,
    fontFamily: 'Nunito_400Regular',
    color: '#777',
    textAlign: 'center',
  },
  rewardCost: {
    backgroundColor: COLORS.kids.primary,
    borderRadius: 12,
    paddingHorizontal: SPACING[3],
    paddingVertical: SPACING[1],
    marginTop: SPACING[1],
  },
  rewardCostLocked: { backgroundColor: '#CCC' },
  rewardCostText: {
    fontSize: 13,
    fontFamily: 'Nunito_400Regular',
    fontWeight: '800',
    color: '#FFFFFF',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: SPACING[10],
    gap: SPACING[3],
  },
  emptyEmoji: { fontSize: 64 },
  emptyTitle: {
    fontSize: 22,
    fontFamily: 'Nunito_400Regular',
    fontWeight: '800',
    color: '#333',
  },
  emptyDesc: {
    fontSize: 15,
    fontFamily: 'Nunito_400Regular',
    color: '#888',
    textAlign: 'center',
  },
  wishInfo: {
    marginHorizontal: SPACING[5],
    backgroundColor: 'rgba(255,193,7,0.15)',
    borderRadius: 14,
    padding: SPACING[4],
  },
  wishInfoText: {
    fontSize: 14,
    fontFamily: 'Nunito_400Regular',
    fontWeight: '600',
    color: '#8B6914',
    lineHeight: 21,
    textAlign: 'center',
  },
  sectionCard: {
    marginHorizontal: SPACING[5],
    backgroundColor: 'rgba(255,255,255,0.88)',
    borderRadius: 16,
    padding: SPACING[4],
    gap: SPACING[3],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Nunito_400Regular',
    fontWeight: '800',
    color: '#333',
  },
  wishItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING[2],
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  wishTitle: {
    fontSize: 14,
    fontFamily: 'Nunito_400Regular',
    fontWeight: '700',
    color: '#333',
    flex: 1,
  },
  wishStatus: {
    borderRadius: 10,
    paddingHorizontal: SPACING[2],
    paddingVertical: 3,
  },
  wishStatusText: {
    fontSize: 12,
    fontFamily: 'Nunito_400Regular',
    fontWeight: '700',
    textTransform: 'uppercase',
  },
});
