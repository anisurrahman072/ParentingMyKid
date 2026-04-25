/**
 * Parent settings screen.
 * Profile, subscription, family management, notifications, privacy.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useAuthStore } from '../../../src/store/auth.store';
import { useFamilyStore } from '../../../src/store/family.store';
import { COLORS } from '../../../src/constants/colors';
import { SPACING } from '../../../src/constants/spacing';
import { CHILD_ID_KEY } from '../../../src/store/deviceSession.store';

interface SettingsRowProps {
  icon: string;
  label: string;
  value?: string | boolean;
  onPress?: () => void;
  type?: 'chevron' | 'toggle' | 'badge';
  badge?: string;
  danger?: boolean;
}

function SettingsRow({ icon, label, value, onPress, type = 'chevron', badge, danger }: SettingsRowProps) {
  return (
    <TouchableOpacity style={styles.settingsRow} onPress={onPress} disabled={type === 'toggle' && !onPress}>
      <Text style={styles.settingsIcon}>{icon}</Text>
      <Text style={[styles.settingsLabel, danger && styles.settingsDanger]}>{label}</Text>
      {type === 'chevron' && (
        <View style={styles.settingsRight}>
          {value && <Text style={styles.settingsValue}>{value as string}</Text>}
          <Text style={styles.settingsChevron}>›</Text>
        </View>
      )}
      {type === 'toggle' && typeof value === 'boolean' && (
        <Switch
          value={value}
          onValueChange={() => onPress?.()}
          trackColor={{ true: COLORS.parent.primary }}
          thumbColor="#FFFFFF"
        />
      )}
      {type === 'badge' && badge && (
        <View style={[styles.badge, { backgroundColor: COLORS.parent.primary }]}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

function SettingsSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Animated.View entering={FadeInDown.delay(100)} style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionCard}>{children}</View>
    </Animated.View>
  );
}

export default function SettingsScreen() {
  const { user, logout } = useAuthStore();
  const { subscription } = useFamilyStore();
  const [emailNotifs, setEmailNotifs] = useState(true);
  const [pushNotifs, setPushNotifs] = useState(true);
  const [safetyAlerts, setSafetyAlerts] = useState(true);

  const isPremium = subscription?.plan !== 'FREE';

  function handleLogout() {
    Alert.alert('Sign out?', 'You will need to sign in again.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => logout() },
    ]);
  }

  function handDeviceToChild() {
    const go = async () => {
      const childId = await SecureStore.getItemAsync(CHILD_ID_KEY);
      if (!childId) {
        Alert.alert('Pair this device', 'Set up a child profile on this device from Add child device first.');
        return;
      }
      await logout();
      router.replace('/auth/child-pin');
    };
    Alert.alert('Hand to child?', 'You will be signed out so your child can enter their PIN.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Continue', onPress: () => void go() },
    ]);
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Profile header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarInitial}>
              {user?.name?.[0]?.toUpperCase() ?? 'P'}
            </Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>
              {user?.name ?? 'Parent'}
            </Text>
            <Text style={styles.profileEmail}>{user?.email}</Text>
            <View style={[styles.planBadge, isPremium ? styles.planBadgePremium : styles.planBadgeFree]}>
              <Text style={styles.planBadgeText}>
                {isPremium ? '⭐ Premium' : '🆓 Free Trial'}
              </Text>
            </View>
          </View>
        </View>

        {/* Subscription */}
        {!isPremium && (
          <TouchableOpacity style={styles.upgradeBanner}>
            <Text style={styles.upgradeIcon}>👑</Text>
            <View style={styles.upgradeText}>
              <Text style={styles.upgradeTitle}>Upgrade to Premium</Text>
              <Text style={styles.upgradeSubtitle}>Unlock all safety & AI features</Text>
            </View>
            <Text style={styles.upgradeArrow}>→</Text>
          </TouchableOpacity>
        )}

        <SettingsSection title="Family & device">
          <SettingsRow
            icon="📱"
            label="Add child device"
            onPress={() => router.push('/(parent)/settings/add-device')}
          />
          <SettingsRow
            icon="🎨"
            label="Appearance"
            onPress={() => router.push('/(parent)/settings/theme-picker')}
          />
          <SettingsRow icon="👧" label="Hand device to child" onPress={handDeviceToChild} />
        </SettingsSection>

        {/* Account */}
        <SettingsSection title="Account">
          <SettingsRow icon="👤" label="Edit Profile" onPress={() => Alert.alert('Profile', 'Edit profile coming soon!')} />
          <SettingsRow icon="🔑" label="Change Password" onPress={() => Alert.alert('Password', 'Coming soon!')} />
          <SettingsRow icon="💳" label="Subscription" value={isPremium ? 'Premium' : 'Free'} onPress={() => Alert.alert('Subscription', 'Manage via App Store/Play Store.')} />
          <SettingsRow icon="👶" label="Manage Children" onPress={() => Alert.alert('Children', 'Child management coming soon!')} />
        </SettingsSection>

        {/* Notifications */}
        <SettingsSection title="Notifications">
          <SettingsRow
            icon="📱"
            label="Push Notifications"
            value={pushNotifs}
            type="toggle"
            onPress={() => setPushNotifs(!pushNotifs)}
          />
          <SettingsRow
            icon="📧"
            label="Weekly Email Report"
            value={emailNotifs}
            type="toggle"
            onPress={() => setEmailNotifs(!emailNotifs)}
          />
          <SettingsRow
            icon="🚨"
            label="Safety Alerts"
            value={safetyAlerts}
            type="toggle"
            onPress={() => setSafetyAlerts(!safetyAlerts)}
          />
        </SettingsSection>

        {/* Privacy */}
        <SettingsSection title="Privacy & Safety">
          <SettingsRow icon="🔒" label="Data & Privacy" onPress={() => Alert.alert('Privacy', 'Full GDPR/COPPA compliance. Your data is never sold.')} />
          <SettingsRow icon="🧹" label="Delete Child Data" danger onPress={() => Alert.alert('Delete', 'Contact support to request data deletion.')} />
          <SettingsRow icon="📄" label="Terms of Service" onPress={() => Alert.alert('Terms', 'Terms of Service screen coming soon!')} />
          <SettingsRow icon="🛡️" label="Privacy Policy" onPress={() => Alert.alert('Privacy Policy', 'Privacy Policy screen coming soon!')} />
        </SettingsSection>

        {/* Support */}
        <SettingsSection title="Support">
          <SettingsRow icon="💬" label="Chat Support" onPress={() => Alert.alert('Support', 'Chat support coming soon!')} />
          <SettingsRow icon="📚" label="Help Center" onPress={() => Alert.alert('Help', 'Help center coming soon!')} />
          <SettingsRow icon="⭐" label="Rate the App" onPress={() => Alert.alert('Rate', 'Thank you! Opening App Store...')} />
          <SettingsRow icon="🐛" label="Report a Bug" onPress={() => Alert.alert('Bug', 'Bug reporting coming soon!')} />
        </SettingsSection>

        {/* App info */}
        <View style={styles.appInfo}>
          <Text style={styles.appVersion}>ParentingMyKid v1.0.0</Text>
          <Text style={styles.appTagline}>Building better families, one day at a time 💙</Text>
        </View>

        {/* Sign out */}
        <TouchableOpacity style={styles.signOutButton} onPress={handleLogout}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.parent.background },
  scrollContent: { paddingBottom: SPACING[10] },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[4],
    paddingHorizontal: SPACING[5],
    paddingVertical: SPACING[5],
  },
  avatarPlaceholder: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.parent.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: 32,
    fontFamily: 'Inter',
    fontWeight: '800',
    color: '#FFFFFF',
  },
  profileInfo: { flex: 1, gap: 3 },
  profileName: {
    fontSize: 20,
    fontFamily: 'Inter',
    fontWeight: '700',
    color: COLORS.parent.text,
  },
  profileEmail: {
    fontSize: 13,
    fontFamily: 'Inter',
    color: COLORS.parent.textMuted,
  },
  planBadge: {
    alignSelf: 'flex-start',
    borderRadius: 10,
    paddingHorizontal: SPACING[2],
    paddingVertical: 3,
    marginTop: 4,
  },
  planBadgePremium: { backgroundColor: 'rgba(99,102,241,0.2)' },
  planBadgeFree: { backgroundColor: 'rgba(255,255,255,0.08)' },
  planBadgeText: {
    fontSize: 12,
    fontFamily: 'Inter',
    fontWeight: '700',
    color: COLORS.parent.primary,
  },
  upgradeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[3],
    backgroundColor: 'rgba(99,102,241,0.15)',
    borderRadius: 14,
    marginHorizontal: SPACING[5],
    marginBottom: SPACING[4],
    padding: SPACING[4],
    borderWidth: 1,
    borderColor: 'rgba(99,102,241,0.3)',
  },
  upgradeIcon: { fontSize: 28 },
  upgradeText: { flex: 1 },
  upgradeTitle: {
    fontSize: 15,
    fontFamily: 'Inter',
    fontWeight: '700',
    color: COLORS.parent.text,
  },
  upgradeSubtitle: {
    fontSize: 13,
    fontFamily: 'Inter',
    color: COLORS.parent.textMuted,
  },
  upgradeArrow: {
    fontSize: 20,
    color: COLORS.parent.primary,
  },
  section: {
    paddingHorizontal: SPACING[5],
    marginBottom: SPACING[5],
  },
  sectionTitle: {
    fontSize: 13,
    fontFamily: 'Inter',
    fontWeight: '700',
    color: COLORS.parent.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: SPACING[2],
    paddingHorizontal: SPACING[2],
  },
  sectionCard: {
    backgroundColor: COLORS.parent.card,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING[4],
    paddingHorizontal: SPACING[5],
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
    gap: SPACING[3],
  },
  settingsIcon: { fontSize: 20, width: 26 },
  settingsLabel: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'Inter',
    fontWeight: '500',
    color: COLORS.parent.text,
  },
  settingsDanger: { color: '#F87171' },
  settingsRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[1],
  },
  settingsValue: {
    fontSize: 14,
    fontFamily: 'Inter',
    color: COLORS.parent.textMuted,
  },
  settingsChevron: {
    fontSize: 22,
    color: 'rgba(255,255,255,0.25)',
  },
  badge: {
    borderRadius: 10,
    paddingHorizontal: SPACING[2],
    paddingVertical: 2,
  },
  badgeText: {
    fontSize: 12,
    fontFamily: 'Inter',
    fontWeight: '700',
    color: '#FFFFFF',
  },
  appInfo: {
    alignItems: 'center',
    paddingVertical: SPACING[4],
    gap: SPACING[1],
  },
  appVersion: {
    fontSize: 13,
    fontFamily: 'Inter',
    color: COLORS.parent.textMuted,
  },
  appTagline: {
    fontSize: 13,
    fontFamily: 'Inter',
    color: 'rgba(255,255,255,0.3)',
  },
  signOutButton: {
    marginHorizontal: SPACING[5],
    marginTop: SPACING[2],
    paddingVertical: SPACING[4],
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(248,113,113,0.3)',
  },
  signOutText: {
    fontSize: 15,
    fontFamily: 'Inter',
    fontWeight: '600',
    color: '#F87171',
  },
});
