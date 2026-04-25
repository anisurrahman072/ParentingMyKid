/**
 * Child profile screen — "Me" tab.
 * Shows: avatar, name, level, XP, badges count, streak, settings.
 * Kid-friendly design with celebration animations.
 */

import React from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useAuthStore } from '../../../src/store/auth.store';
import { deviceSessionService, CHILD_ID_KEY } from '../../../src/store/deviceSession.store';
import { COLORS } from '../../../src/constants/colors';
import { SPACING } from '../../../src/constants/spacing';
import { LOGO_PNG, APP_DISPLAY_NAME } from '../../../src/constants/branding';
import { XpBar } from '../../../src/components/kids/XpBar';
import { StreakBadge } from '../../../src/components/kids/StreakBadge';

const AVATAR_OPTIONS = ['🐼', '🦁', '🐸', '🦊', '🐧', '🦋', '🐙', '🦄'];

export default function ChildProfileScreen() {
  const { user, logout } = useAuthStore();

  function handleLogout() {
    Alert.alert(
      'Switch User?',
      'This will return to the login screen.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Yes, switch', style: 'destructive', onPress: () => logout() },
      ],
    );
  }

  async function openParentMode() {
    const onPairedChildDevice = await SecureStore.getItemAsync(CHILD_ID_KEY);
    if (!onPairedChildDevice) {
      Alert.alert('Not a child device', 'Use your parent’s phone for parent controls.');
      return;
    }
    const hasSaved = await deviceSessionService.hasParentSession();
    if (hasSaved) {
      router.push('/auth/switch-to-parent');
      return;
    }
    router.push('/auth/login');
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.brandStrip}>
          <Image source={LOGO_PNG} style={styles.brandStripLogo} resizeMode="cover" />
          <Text style={styles.brandStripName}>{APP_DISPLAY_NAME}</Text>
        </View>
        {/* Header banner */}
        <LinearGradient colors={[...COLORS.kids.gradientApp]} style={styles.header}>
          <Animated.View entering={FadeInUp.springify()} style={styles.headerContent}>
            <View style={styles.avatarRing}>
              <Text style={styles.avatarEmoji}>{user?.avatar ?? '🐼'}</Text>
            </View>
            <Text style={styles.name}>{user?.firstName ?? 'Super Kid'}</Text>
            <Text style={styles.username}>Level {user?.level ?? 1} • Explorer</Text>
          </Animated.View>
        </LinearGradient>

        {/* Stats bar */}
        <Animated.View entering={FadeInDown.delay(150)} style={styles.statsBar}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{user?.points ?? 0}</Text>
            <Text style={styles.statLabel}>Points</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statValue}>{user?.coins ?? 0}</Text>
            <Text style={styles.statLabel}>🪙 Coins</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statValue}>{user?.badgesCount ?? 0}</Text>
            <Text style={styles.statLabel}>🏅 Badges</Text>
          </View>
        </Animated.View>

        <View style={styles.body}>
          {/* XP Progress */}
          <Animated.View entering={FadeInDown.delay(200)} style={styles.card}>
            <Text style={styles.cardTitle}>⭐ Level Progress</Text>
            <XpBar xp={user?.xp ?? 0} level={user?.level ?? 1} />
          </Animated.View>

          {/* Streak */}
          <Animated.View entering={FadeInDown.delay(250)} style={styles.streakCard}>
            <Text style={styles.cardTitle}>My Streak</Text>
            <StreakBadge streak={user?.currentStreak ?? 0} />
            <Text style={styles.longestStreak}>
              Longest: {user?.longestStreak ?? 0} days 🏆
            </Text>
          </Animated.View>

          {/* Choose Avatar */}
          <Animated.View entering={FadeInDown.delay(300)} style={styles.card}>
            <Text style={styles.cardTitle}>🎭 My Avatar</Text>
            <View style={styles.avatarGrid}>
              {AVATAR_OPTIONS.map((emoji) => (
                <TouchableOpacity
                  key={emoji}
                  style={[styles.avatarOption, user?.avatar === emoji && styles.avatarOptionSelected]}
                  onPress={() => Alert.alert('Avatar', 'Avatar customisation coming soon!')}
                >
                  <Text style={styles.avatarOptionEmoji}>{emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </Animated.View>

          {/* Settings */}
          <Animated.View entering={FadeInDown.delay(350)} style={styles.settingsCard}>
            {[
              { icon: '👩‍👧', label: 'Parent mode (unlock)', onPress: openParentMode },
              { icon: '🔔', label: 'Notifications', onPress: () => Alert.alert('Notifications', 'Coming soon!') },
              { icon: '🌙', label: 'Theme', onPress: () => Alert.alert('Theme', 'Light/Dark mode coming soon!') },
              { icon: '🌐', label: 'Language', onPress: () => Alert.alert('Language', 'Coming soon!') },
              { icon: '🔒', label: 'Change PIN', onPress: () => Alert.alert('PIN', 'Contact your parent to change your PIN.') },
              { icon: '🚪', label: 'Switch User', onPress: handleLogout, danger: true },
            ].map((item: any) => (
              <TouchableOpacity
                key={item.label}
                style={styles.settingsRow}
                onPress={item.onPress}
              >
                <Text style={styles.settingsIcon}>{item.icon}</Text>
                <Text style={[styles.settingsLabel, item.danger && styles.settingsLabelDanger]}>
                  {item.label}
                </Text>
                <Text style={styles.settingsChevron}>›</Text>
              </TouchableOpacity>
            ))}
          </Animated.View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: 'transparent' },
  scrollContent: { paddingBottom: SPACING[10] },
  brandStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING[3],
    paddingVertical: SPACING[3],
    paddingHorizontal: SPACING[4],
  },
  brandStripLogo: { width: 40, height: 40, borderRadius: 10 },
  brandStripName: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 18,
    color: COLORS.kids.textOnGradient,
  },
  header: {
    paddingTop: SPACING[4],
    paddingBottom: SPACING[8],
  },
  headerContent: { alignItems: 'center', gap: SPACING[2] },
  avatarRing: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  avatarEmoji: { fontSize: 60 },
  name: {
    fontSize: 28,
    fontFamily: 'Nunito_400Regular',
    fontWeight: '900',
    color: '#FFFFFF',
  },
  username: {
    fontSize: 15,
    fontFamily: 'Nunito_400Regular',
    color: 'rgba(255,255,255,0.8)',
  },
  statsBar: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.88)',
    marginHorizontal: SPACING[5],
    marginTop: -SPACING[5],
    borderRadius: 20,
    paddingVertical: SPACING[4],
    shadowColor: '#FF6B6B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  stat: { flex: 1, alignItems: 'center' },
  statValue: {
    fontSize: 22,
    fontFamily: 'Nunito_400Regular',
    fontWeight: '900',
    color: '#333',
  },
  statLabel: {
    fontSize: 12,
    fontFamily: 'Nunito_400Regular',
    color: '#888',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    backgroundColor: 'rgba(0,0,0,0.08)',
  },
  body: {
    padding: SPACING[5],
    gap: SPACING[4],
    marginTop: SPACING[4],
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.88)',
    borderRadius: 20,
    padding: SPACING[5],
    gap: SPACING[3],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 17,
    fontFamily: 'Nunito_400Regular',
    fontWeight: '800',
    color: '#333',
  },
  streakCard: {
    backgroundColor: 'rgba(255,255,255,0.88)',
    borderRadius: 20,
    padding: SPACING[5],
    alignItems: 'center',
    gap: SPACING[3],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  longestStreak: {
    fontSize: 14,
    fontFamily: 'Nunito_400Regular',
    color: '#888',
  },
  avatarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING[2],
  },
  avatarOption: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(0,0,0,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  avatarOptionSelected: {
    borderColor: COLORS.kids.primary,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  avatarOptionEmoji: { fontSize: 30 },
  settingsCard: {
    backgroundColor: 'rgba(255,255,255,0.88)',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING[4],
    paddingHorizontal: SPACING[5],
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
    gap: SPACING[3],
  },
  settingsIcon: { fontSize: 22, width: 28 },
  settingsLabel: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Nunito_400Regular',
    fontWeight: '700',
    color: '#333',
  },
  settingsLabelDanger: { color: '#DC2626' },
  settingsChevron: {
    fontSize: 22,
    color: '#CCC',
    fontWeight: '300',
  },
});
