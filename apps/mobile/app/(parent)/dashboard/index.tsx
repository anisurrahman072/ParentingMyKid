/**
 * @module (parent)/dashboard/index.tsx
 * @description Parent home dashboard — the "cockpit" of the family.
 *              At a glance, parent sees everything about all their children in under 10 seconds:
 *              - Each child's today's mission progress
 *              - Wellbeing scores
 *              - Active safety alerts (urgent red panel)
 *              - Current mood
 *              - Streak counts
 *              - Quick actions: pause internet, add mission, view location
 *
 * @design Light mint–blush shell with glass cards. Data is beautiful and actionable.
 *         Never overwhelming — only show what matters RIGHT NOW.
 */

import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
  AppState,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Animated, { FadeInDown, FadeInRight } from 'react-native-reanimated';
import { router } from 'expo-router';
import { Colors } from '../../../src/constants/colors';
import { Typography } from '../../../src/constants/typography';
import { Spacing, Shadow } from '../../../src/constants/spacing';
import { useFamilyStore } from '../../../src/store/family.store';
import { useAuthStore } from '../../../src/store/auth.store';
import { apiClient } from '../../../src/services/api.client';
import { API_ENDPOINTS } from '../../../src/constants/api';
import { FamilyDashboard, ChildDashboardCard } from '@parentingmykid/shared-types';
import { ParentHomeEngagementCard } from '../../../src/components/parent/ParentHomeEngagementCard';
import { ParentHomeScheduleCard } from '../../../src/components/parent/ParentHomeScheduleCard';
import { ParentHomeSetupTiles } from '../../../src/components/parent/ParentHomeSetupTiles';
import { ParentHomeSetupTilesLoadingRow } from '../../../src/components/parent/ui/LoadingComponent';
import { ParentPairedDevicesCard } from '../../../src/components/parent/ParentPairedDevicesCard';

const { width } = Dimensions.get('window');

/** Header clock ticks every second so the line matches the system clock; only this subtree re-renders. */
function ParentDashboardGreetingHeader({ firstName }: { firstName: string }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const tick = () => setNow(new Date());
    tick();
    const id = setInterval(tick, 1000);
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') tick();
    });
    return () => {
      clearInterval(id);
      sub.remove();
    };
  }, []);

  const greetingHour = now.getHours();
  const greeting =
    greetingHour < 12 ? 'Good morning' : greetingHour < 17 ? 'Good afternoon' : 'Good evening';

  const dateSubtitle = now.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
  const timeSubtitle = now.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });

  return (
    <Animated.View entering={FadeInDown.duration(600)} style={styles.header}>
      <View>
        <Text style={styles.greeting}>
          {greeting}, {firstName}!
        </Text>
        <Text style={styles.date}>
          {dateSubtitle} · {timeSubtitle}
        </Text>
      </View>
      <TouchableOpacity
        style={styles.settingsButton}
        onPress={() => router.push('/(parent)/settings')}
        accessibilityLabel="Open settings"
      >
        <Text style={styles.settingsIcon}>⚙️</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function ParentDashboard() {
  const { user, familyIds } = useAuthStore();
  const { activeFamilyId, dashboard, setDashboard, selectChild } = useFamilyStore();
  const queryClient = useQueryClient();

  const { data: pendingFriendInvites } = useQuery({
    queryKey: ['friends-pending', activeFamilyId],
    queryFn: async () => {
      if (!activeFamilyId)
        return [] as { id: string; from: { name: string }; to?: { name: string } | null }[];
      const { data } = await apiClient.get<
        { id: string; from: { name: string }; to?: { name: string } | null }[]
      >(API_ENDPOINTS.friends.pending(activeFamilyId));
      return data;
    },
    enabled: !!activeFamilyId,
  });

  const approveFriend = useMutation({
    mutationFn: async ({ inviteId, approve }: { inviteId: string; approve: boolean }) => {
      if (!activeFamilyId) return;
      await apiClient.post(API_ENDPOINTS.friends.approve(activeFamilyId, inviteId), { approve });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['friends-pending', activeFamilyId] });
    },
  });

  const { refetch, isRefetching, isPending, isError } = useQuery({
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
    refetchInterval: 5 * 60 * 1000, // Refresh every 5 minutes
  });

  const firstName = user?.name.split(' ')[0] ?? 'Parent';
  const urgentAlerts = dashboard?.urgentAlerts ?? [];
  const pairedDevices = dashboard?.pairedDevices ?? [];
  const children = dashboard?.children ?? [];

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={Colors.parent.primary}
          />
        }
      >
        <ParentDashboardGreetingHeader firstName={firstName} />

        {activeFamilyId ? <ParentHomeScheduleCard enteringDelay={100} /> : null}

        {/* Urgent Safety Alerts */}
        {urgentAlerts.length > 0 && (
          <Animated.View entering={FadeInDown.duration(600).delay(100)} style={styles.alertPanel}>
            <Text style={styles.alertPanelTitle}>
              ⚠️ {urgentAlerts.length} Urgent Alert{urgentAlerts.length > 1 ? 's' : ''}
            </Text>
            <Text style={styles.alertPanelSub}>Tap to review — action required</Text>
          </Animated.View>
        )}

        {(pendingFriendInvites?.length ?? 0) > 0 && (
          <Animated.View
            entering={FadeInDown.duration(500).delay(50)}
            style={styles.friendPendingPanel}
          >
            <Text style={styles.friendPendingTitle}>
              {pendingFriendInvites?.length} friend request
              {(pendingFriendInvites?.length ?? 0) > 1 ? 's' : ''} to review
            </Text>
            {(pendingFriendInvites ?? []).map((inv) => (
              <View key={inv.id} style={styles.friendPendingRow}>
                <Text style={styles.friendPendingText} numberOfLines={2}>
                  {inv.from.name}
                  {inv.to?.name ? ` ↔ ${inv.to.name}` : ''}
                </Text>
                <View style={styles.friendPendingActions}>
                  <TouchableOpacity
                    style={styles.friendDecline}
                    onPress={() => approveFriend.mutate({ inviteId: inv.id, approve: false })}
                  >
                    <Text style={styles.friendDeclineText}>Decline</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.friendApprove}
                    onPress={() => approveFriend.mutate({ inviteId: inv.id, approve: true })}
                  >
                    <Text style={styles.friendApproveText}>Approve</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </Animated.View>
        )}

        {activeFamilyId && isPending && !dashboard && <ParentHomeSetupTilesLoadingRow />}

        {dashboard && (
          <>
            <ParentHomeSetupTiles
              familyName={dashboard.familyName}
              familyGroupsCount={familyIds.length}
              childCount={dashboard.children.length}
              onOpenFamily={() => router.push('/(parent)/family-space')}
              onAddKids={() =>
                router.push({
                  pathname: '/(parent)/family-space/add-child',
                  params: { from: 'home' },
                })
              }
            />
            <ParentHomeEngagementCard
              dashboard={dashboard}
              onPairDevice={() => router.push('/(parent)/settings/add-device')}
              onNoUsageCta={() =>
                router.push({ pathname: '/(parent)/chat', params: { from: 'dashboard' } })
              }
            />
          </>
        )}

        <Text style={styles.sectionTitle}>Your children</Text>
        <Text style={styles.sectionSubtitle}>Today at a glance</Text>

        {isError && !dashboard && (
          <Text style={styles.homeErrorText}>We couldn’t load this family. Pull to try again.</Text>
        )}

        {children.map((child, index) => (
          <Animated.View
            key={child.childId}
            entering={FadeInRight.duration(600).delay(index * 100)}
          >
            <ChildDashboardCardView
              child={child}
              onPress={() => {
                selectChild(child.childId);
                router.push(`/(parent)/growth`);
              }}
            />
          </Animated.View>
        ))}

        {dashboard && (
          <ParentPairedDevicesCard
            devices={pairedDevices}
            onAddDevice={() => router.push('/(parent)/settings/add-device')}
          />
        )}

        <Text style={styles.sectionTitle}>Quick actions</Text>
        <Text style={styles.sectionSubtitle}>
          Location, screen-time controls, and growth — the main ways you manage your kid&apos;s
          device from the parent app.
        </Text>
        <View style={styles.quickActions}>
          <QuickActionButton
            icon="📍"
            label="Location"
            onPress={() => router.push('/(parent)/safety')}
            color={Colors.parent.primary}
          />
          <QuickActionButton
            icon="⏸️"
            label="Pause Internet"
            onPress={() => {}}
            color={Colors.parent.warning}
          />
          <QuickActionButton
            icon="📊"
            label="Reports"
            onPress={() => router.push('/(parent)/growth')}
            color={Colors.parent.success}
          />
          <QuickActionButton
            icon="🤖"
            label="AI Coach"
            onPress={() => {}}
            color={Colors.parent.secondary}
          />
        </View>

        {/* Upcoming Events */}
        {(dashboard?.upcomingEvents ?? []).length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Upcoming</Text>
            <View style={styles.eventsContainer}>
              {dashboard?.upcomingEvents.slice(0, 3).map((event) => (
                <View key={event.id} style={styles.eventCard}>
                  <Text style={styles.eventTitle}>{event.title}</Text>
                  <Text style={styles.eventDate}>
                    {new Date(event.startAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </Text>
                </View>
              ))}
            </View>
          </>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

// ─── Child Dashboard Card ────────────────────────────────────────────────────

function ChildDashboardCardView({
  child,
  onPress,
}: {
  child: ChildDashboardCard;
  onPress: () => void;
}) {
  const missionProgress =
    child.todayMissionsTotal > 0
      ? (child.todayMissionsCompleted / child.todayMissionsTotal) * 100
      : 0;

  const wellbeingColor =
    (child.wellbeingScore ?? 0) >= 75
      ? Colors.wellbeing.great
      : (child.wellbeingScore ?? 0) >= 50
        ? Colors.wellbeing.okay
        : Colors.wellbeing.poor;

  const linkedCount = child.linkedDeviceCount ?? 0;
  const hasUsageToday = child.hasScreenUsageToday ?? false;

  return (
    <TouchableOpacity style={styles.childCard} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.childCardHeader}>
        <View style={styles.childAvatarContainer}>
          <Text style={styles.childAvatarText}>{child.name.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={styles.childInfo}>
          <Text style={styles.childName}>{child.name}</Text>
          <Text style={styles.childStreak}>🔥 {child.currentStreak}-day streak</Text>
        </View>
        {child.activeAlerts > 0 && (
          <View style={styles.alertBadge}>
            <Text style={styles.alertBadgeText}>{child.activeAlerts}</Text>
          </View>
        )}
      </View>

      {/* Mission progress bar */}
      <View style={styles.progressSection}>
        <Text style={styles.progressLabel}>
          {child.todayMissionsCompleted}/{child.todayMissionsTotal} missions today
        </Text>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${missionProgress}%` }]} />
        </View>
      </View>

      <View style={styles.deviceHint}>
        <Text style={styles.deviceHintText} numberOfLines={2}>
          {linkedCount > 0
            ? `${linkedCount} device${linkedCount === 1 ? '' : 's'} linked · ${
                hasUsageToday
                  ? 'We’ve seen screen activity today'
                  : 'No screen activity logged yet today'
              }`
            : 'No device linked — add a child device to track usage and controls'}
        </Text>
      </View>

      {/* Bottom stats */}
      <View style={styles.childStats}>
        <StatChip
          icon="😊"
          label="Mood"
          value={child.currentMood ? getMoodEmoji(child.currentMood) : '—'}
        />
        <StatChip
          icon="💪"
          label="Wellbeing"
          value={child.wellbeingScore ? `${child.wellbeingScore}/100` : '—'}
          valueColor={wellbeingColor}
        />
      </View>
    </TouchableOpacity>
  );
}

function getMoodEmoji(score: number): string {
  if (score >= 5) return '😄';
  if (score >= 4) return '😊';
  if (score >= 3) return '😐';
  if (score >= 2) return '😔';
  return '😢';
}

function StatChip({
  icon,
  label,
  value,
  valueColor,
}: {
  icon: string;
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <View style={styles.statChip}>
      <Text style={styles.statIcon}>{icon}</Text>
      <View>
        <Text style={styles.statLabel}>{label}</Text>
        <Text style={[styles.statValue, valueColor ? { color: valueColor } : {}]}>{value}</Text>
      </View>
    </View>
  );
}

function QuickActionButton({
  icon,
  label,
  onPress,
  color,
}: {
  icon: string;
  label: string;
  onPress: () => void;
  color: string;
}) {
  return (
    <TouchableOpacity
      style={[styles.quickAction, { borderColor: color }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={styles.quickActionIcon}>{icon}</Text>
      <Text style={[styles.quickActionLabel, { color }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scrollContent: {
    paddingHorizontal: Spacing.screenPadding,
    paddingTop: 60,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.xl,
  },
  greeting: {
    fontFamily: Typography.fonts.bold,
    fontSize: Typography.parent.headingLarge,
    color: Colors.parent.textPrimary,
  },
  date: {
    fontFamily: Typography.fonts.regular,
    fontSize: Typography.parent.body,
    color: Colors.parent.textSecondary,
    marginTop: 4,
  },
  settingsButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingsIcon: {
    fontSize: 24,
  },
  alertPanel: {
    backgroundColor: Colors.severity.critical,
    borderRadius: Spacing.cardBorderRadius,
    padding: Spacing.base,
    marginBottom: Spacing.lg,
  },
  alertPanelTitle: {
    fontFamily: Typography.fonts.bold,
    fontSize: Typography.parent.bodyLarge,
    color: Colors.white,
  },
  alertPanelSub: {
    fontFamily: Typography.fonts.regular,
    fontSize: Typography.parent.body,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  friendPendingPanel: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.35)',
    borderRadius: Spacing.cardBorderRadius,
    padding: Spacing.base,
    marginBottom: Spacing.lg,
    gap: Spacing.md,
  },
  friendPendingTitle: {
    fontFamily: Typography.fonts.bold,
    fontSize: Typography.parent.bodyLarge,
    color: Colors.parent.textPrimary,
  },
  friendPendingRow: { gap: Spacing.sm },
  friendPendingText: {
    fontFamily: Typography.fonts.regular,
    fontSize: Typography.parent.body,
    color: Colors.parent.textPrimary,
  },
  friendPendingActions: { flexDirection: 'row', gap: Spacing.sm },
  friendDecline: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  friendDeclineText: { color: Colors.parent.textPrimary, fontWeight: '600' },
  friendApprove: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: Colors.parent.primary,
  },
  friendApproveText: { color: '#fff', fontWeight: '700' },
  sectionTitle: {
    fontFamily: Typography.fonts.bold,
    fontSize: Typography.parent.subheading,
    color: Colors.parent.textPrimary,
    marginBottom: 6,
    marginTop: Spacing.lg,
  },
  sectionSubtitle: {
    fontFamily: Typography.fonts.regular,
    fontSize: Typography.parent.small,
    lineHeight: 20,
    color: Colors.parent.textSecondary,
    marginBottom: Spacing.md,
  },
  homeErrorText: {
    fontFamily: Typography.fonts.regular,
    fontSize: Typography.parent.body,
    color: Colors.parent.warning,
    marginBottom: Spacing.md,
  },
  deviceHint: {
    marginBottom: Spacing.md,
    backgroundColor: 'rgba(59, 130, 246, 0.08)',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: Spacing.md,
  },
  deviceHintText: {
    fontFamily: Typography.fonts.regular,
    fontSize: Typography.parent.caption,
    lineHeight: 18,
    color: Colors.parent.textPrimary,
  },
  childCard: {
    backgroundColor: Colors.parent.cardDark,
    borderRadius: Spacing.cardBorderRadius,
    padding: Spacing.cardPadding,
    marginBottom: Spacing.md,
    ...Shadow.md,
  },
  childCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  childAvatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.parent.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  childAvatarText: {
    fontFamily: Typography.fonts.extraBold,
    fontSize: Typography.parent.headingLarge,
    color: Colors.white,
  },
  childInfo: { flex: 1 },
  childName: {
    fontFamily: Typography.fonts.bold,
    fontSize: Typography.parent.bodyLarge,
    color: Colors.parent.textPrimary,
  },
  childStreak: {
    fontFamily: Typography.fonts.regular,
    fontSize: Typography.parent.body,
    color: Colors.parent.warning,
    marginTop: 2,
  },
  alertBadge: {
    backgroundColor: Colors.severity.critical,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  alertBadgeText: {
    fontFamily: Typography.fonts.bold,
    fontSize: Typography.parent.caption,
    color: Colors.white,
  },
  progressSection: { marginBottom: Spacing.md },
  progressLabel: {
    fontFamily: Typography.fonts.regular,
    fontSize: Typography.parent.body,
    color: Colors.parent.textSecondary,
    marginBottom: Spacing.xs,
  },
  progressBar: {
    height: 8,
    backgroundColor: Colors.parent.surfaceDark2,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.parent.success,
    borderRadius: 4,
  },
  childStats: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  statChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.parent.surfaceDark,
    borderRadius: 8,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  statIcon: { fontSize: 16 },
  statLabel: {
    fontFamily: Typography.fonts.regular,
    fontSize: Typography.parent.caption,
    color: Colors.parent.textSecondary,
  },
  statValue: {
    fontFamily: Typography.fonts.bold,
    fontSize: Typography.parent.body,
    color: Colors.parent.textPrimary,
  },
  quickActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  quickAction: {
    flex: 1,
    minWidth: (width - Spacing.screenPadding * 2 - Spacing.sm * 3) / 4,
    backgroundColor: Colors.parent.cardDark,
    borderRadius: Spacing.cardBorderRadius,
    padding: Spacing.md,
    alignItems: 'center',
    borderWidth: 1,
  },
  quickActionIcon: { fontSize: 24, marginBottom: 4 },
  quickActionLabel: {
    fontFamily: Typography.fonts.semiBold,
    fontSize: Typography.parent.caption,
  },
  eventsContainer: {
    gap: Spacing.sm,
  },
  eventCard: {
    backgroundColor: Colors.parent.cardDark,
    borderRadius: Spacing.cardBorderRadius,
    padding: Spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  eventTitle: {
    fontFamily: Typography.fonts.semiBold,
    fontSize: Typography.parent.body,
    color: Colors.parent.textPrimary,
  },
  eventDate: {
    fontFamily: Typography.fonts.regular,
    fontSize: Typography.parent.small,
    color: Colors.parent.textSecondary,
  },
});
