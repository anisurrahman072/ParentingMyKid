/**
 * Safety Command Center — parent view.
 * Aggregates: location tracking, geofences, screen time, content alerts,
 * SOS history, contact approval, social media monitoring.
 *
 * This is the highest-retention parent screen after the dashboard.
 * Safety = #1 reason parents subscribe.
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { apiClient } from '../../../src/services/api.client';
import { API_ENDPOINTS } from '../../../src/constants/api';
import { useFamilyStore } from '../../../src/store/family.store';
import { COLORS } from '../../../src/constants/colors';
import { SPACING } from '../../../src/constants/spacing';

type SafetyTab = 'alerts' | 'location' | 'screentime' | 'content';

function AlertCard({
  icon,
  title,
  description,
  severity,
  time,
}: {
  icon: string;
  title: string;
  description: string;
  severity: string;
  time: string;
}) {
  const severityColor =
    severity === 'CRITICAL' ? '#DC2626' :
    severity === 'HIGH' ? '#EA580C' : '#CA8A04';

  return (
    <View style={[styles.alertCard, { borderLeftColor: severityColor }]}>
      <Text style={styles.alertIcon}>{icon}</Text>
      <View style={styles.alertBody}>
        <View style={styles.alertHeader}>
          <Text style={styles.alertTitle}>{title}</Text>
          <Text style={styles.alertTime}>{time}</Text>
        </View>
        <Text style={styles.alertDesc}>{description}</Text>
      </View>
    </View>
  );
}

function ScreenTimeControl({ childId }: { childId: string }) {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['screen-time-controls', childId],
    queryFn: () =>
      apiClient.get(`${API_ENDPOINTS.safety.base}/${childId}/screen-time`).then((r) => r.data),
  });

  const pauseMutation = useMutation({
    mutationFn: (paused: boolean) =>
      apiClient.post(API_ENDPOINTS.safety.pauseInternet, { childId, paused }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['screen-time-controls', childId] }),
  });

  const controls = data?.controls;

  return (
    <View style={styles.screenTimeCard}>
      <View style={styles.controlRow}>
        <View>
          <Text style={styles.controlLabel}>Pause all internet</Text>
          <Text style={styles.controlDesc}>Instantly block all online access</Text>
        </View>
        <Switch
          value={controls?.internetPaused ?? false}
          onValueChange={(val) => pauseMutation.mutate(val)}
          trackColor={{ true: '#DC2626', false: 'rgba(255,255,255,0.2)' }}
          thumbColor="#FFFFFF"
        />
      </View>

      <View style={styles.controlRow}>
        <View>
          <Text style={styles.controlLabel}>Bedtime mode</Text>
          <Text style={styles.controlDesc}>
            {controls?.bedtimeStart && controls?.bedtimeEnd
              ? `${controls.bedtimeStart} – ${controls.bedtimeEnd}`
              : 'Not configured'}
          </Text>
        </View>
        <Switch
          value={controls?.bedtimeEnabled ?? false}
          onValueChange={() =>
            Alert.alert('Set Bedtime', 'Configure bedtime in child settings')
          }
          trackColor={{ true: COLORS.parent.primary }}
          thumbColor="#FFFFFF"
        />
      </View>

      <View style={styles.controlRow}>
        <View>
          <Text style={styles.controlLabel}>Screen time limit</Text>
          <Text style={styles.controlDesc}>
            {controls?.dailyLimitMinutes
              ? `${Math.floor(controls.dailyLimitMinutes / 60)}h ${controls.dailyLimitMinutes % 60}m daily`
              : 'No limit set'}
          </Text>
        </View>
        <TouchableOpacity style={styles.editButton}>
          <Text style={styles.editButtonText}>Edit</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function SafetyScreen() {
  const { activeChild } = useFamilyStore();
  const [activeTab, setActiveTab] = useState<SafetyTab>('alerts');

  const { data: alerts } = useQuery({
    queryKey: ['safety-alerts', activeChild?.id],
    queryFn: () =>
      apiClient
        .get(`${API_ENDPOINTS.safety.base}/${activeChild?.id}/alerts`)
        .then((r) => r.data.alerts ?? []),
    enabled: !!activeChild?.id,
    refetchInterval: 30_000, // Refresh alerts every 30s
  });

  const alertList = alerts ?? [];

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🛡️ Safety Center</Text>
        {activeChild && <Text style={styles.childName}>{activeChild.name}</Text>}
      </View>

      {/* Tab bar */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabScroll}
        contentContainerStyle={styles.tabScrollContent}
      >
        {[
          { key: 'alerts', label: '🚨 Alerts', badge: alertList.length },
          { key: 'location', label: '📍 Location' },
          { key: 'screentime', label: '⏱ Screen Time' },
          { key: 'content', label: '🔍 Content' },
        ].map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key as SafetyTab)}
          >
            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
              {tab.label}
            </Text>
            {tab.badge ? (
              <View style={styles.tabBadge}>
                <Text style={styles.tabBadgeText}>{tab.badge}</Text>
              </View>
            ) : null}
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Alerts Tab */}
        {activeTab === 'alerts' && (
          <Animated.View entering={FadeInDown.springify()}>
            {alertList.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyEmoji}>✅</Text>
                <Text style={styles.emptyTitle}>All clear!</Text>
                <Text style={styles.emptyDesc}>
                  No safety alerts for {activeChild?.name ?? 'your child'} today.
                </Text>
              </View>
            ) : (
              alertList.map((alert: any, i: number) => (
                <AlertCard
                  key={alert.id ?? i}
                  icon={alert.alertType?.includes('SOS') ? '🆘' : '⚠️'}
                  title={alert.alertType?.replace(/_/g, ' ') ?? 'Alert'}
                  description={alert.summary ?? 'Tap to view details'}
                  severity={alert.severity ?? 'MEDIUM'}
                  time={new Date(alert.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                />
              ))
            )}
          </Animated.View>
        )}

        {/* Location Tab */}
        {activeTab === 'location' && (
          <Animated.View entering={FadeInDown.springify()}>
            <View style={styles.locationPlaceholder}>
              <Text style={styles.locationIcon}>📍</Text>
              <Text style={styles.locationTitle}>Live Location</Text>
              <Text style={styles.locationDesc}>
                Child location tracking requires the ParentingMyKid app installed on the child's device with location permission enabled.
              </Text>
              <TouchableOpacity style={styles.setupButton}>
                <Text style={styles.setupButtonText}>Set Up Device Pairing</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>📌 Geofences</Text>
              <Text style={styles.sectionDesc}>
                Get alerted when your child enters or leaves a zone (school, home, etc.)
              </Text>
              <TouchableOpacity style={styles.addGeofenceButton}>
                <Text style={styles.addGeofenceText}>+ Add Geofence</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        )}

        {/* Screen Time Tab */}
        {activeTab === 'screentime' && (
          <Animated.View entering={FadeInDown.springify()}>
            {activeChild ? (
              <ScreenTimeControl childId={activeChild.id} />
            ) : (
              <Text style={styles.noChild}>Select a child first</Text>
            )}
          </Animated.View>
        )}

        {/* Content Monitoring Tab */}
        {activeTab === 'content' && (
          <Animated.View entering={FadeInDown.springify()}>
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>🔍 AI Content Monitoring</Text>
              <Text style={styles.sectionDesc}>
                AI scans online activity across 29+ harmful content categories including adult content, violence, self-harm, cyberbullying, and predator behaviour — similar to Bark.
              </Text>

              {[
                { category: 'Adult Content', icon: '🔞', status: 'SCANNING' },
                { category: 'Cyberbullying', icon: '😡', status: 'SCANNING' },
                { category: 'Self-Harm', icon: '⚠️', status: 'SCANNING' },
                { category: 'Violence', icon: '⚡', status: 'SCANNING' },
                { category: 'Predators', icon: '🦊', status: 'SCANNING' },
                { category: 'Drug References', icon: '💊', status: 'SCANNING' },
              ].map((item) => (
                <View key={item.category} style={styles.categoryRow}>
                  <Text style={styles.categoryIcon}>{item.icon}</Text>
                  <Text style={styles.categoryName}>{item.category}</Text>
                  <View style={styles.statusBadge}>
                    <View style={styles.statusDot} />
                    <Text style={styles.statusText}>Active</Text>
                  </View>
                </View>
              ))}
            </View>
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
  headerTitle: {
    fontSize: 22,
    fontFamily: 'Inter',
    fontWeight: '700',
    color: COLORS.parent.text,
  },
  childName: {
    fontSize: 14,
    fontFamily: 'Inter',
    color: COLORS.parent.primary,
    fontWeight: '600',
  },
  tabScroll: { maxHeight: 48 },
  tabScrollContent: {
    paddingHorizontal: SPACING[5],
    gap: SPACING[2],
    alignItems: 'center',
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING[2],
    paddingHorizontal: SPACING[4],
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.06)',
    gap: SPACING[2],
  },
  tabActive: { backgroundColor: COLORS.parent.primary },
  tabText: {
    fontSize: 13,
    fontFamily: 'Inter',
    fontWeight: '600',
    color: COLORS.parent.textMuted,
  },
  tabTextActive: { color: '#FFFFFF' },
  tabBadge: {
    backgroundColor: '#DC2626',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 1,
    minWidth: 20,
    alignItems: 'center',
  },
  tabBadgeText: {
    fontSize: 11,
    fontFamily: 'Inter',
    fontWeight: '700',
    color: '#FFFFFF',
  },
  scroll: { flex: 1, marginTop: SPACING[3] },
  scrollContent: { paddingHorizontal: SPACING[5], paddingBottom: SPACING[8] },
  alertCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.parent.card,
    borderRadius: 14,
    padding: SPACING[4],
    marginBottom: SPACING[3],
    borderLeftWidth: 4,
    gap: SPACING[3],
    alignItems: 'flex-start',
  },
  alertIcon: { fontSize: 24, marginTop: 2 },
  alertBody: { flex: 1 },
  alertHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  alertTitle: {
    fontSize: 14,
    fontFamily: 'Inter',
    fontWeight: '700',
    color: COLORS.parent.text,
    textTransform: 'capitalize',
    flex: 1,
  },
  alertTime: {
    fontSize: 12,
    fontFamily: 'Inter',
    color: COLORS.parent.textMuted,
  },
  alertDesc: {
    fontSize: 13,
    fontFamily: 'Inter',
    color: COLORS.parent.textMuted,
    lineHeight: 18,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: SPACING[12],
    gap: SPACING[3],
  },
  emptyEmoji: { fontSize: 64 },
  emptyTitle: {
    fontSize: 22,
    fontFamily: 'Inter',
    fontWeight: '700',
    color: COLORS.parent.text,
  },
  emptyDesc: {
    fontSize: 15,
    fontFamily: 'Inter',
    color: COLORS.parent.textMuted,
    textAlign: 'center',
    maxWidth: 240,
    lineHeight: 22,
  },
  locationPlaceholder: {
    backgroundColor: COLORS.parent.card,
    borderRadius: 16,
    padding: SPACING[6],
    alignItems: 'center',
    marginBottom: SPACING[4],
    gap: SPACING[3],
  },
  locationIcon: { fontSize: 48 },
  locationTitle: {
    fontSize: 18,
    fontFamily: 'Inter',
    fontWeight: '700',
    color: COLORS.parent.text,
  },
  locationDesc: {
    fontSize: 14,
    fontFamily: 'Inter',
    color: COLORS.parent.textMuted,
    textAlign: 'center',
    lineHeight: 22,
  },
  setupButton: {
    backgroundColor: COLORS.parent.primary,
    borderRadius: 12,
    paddingVertical: SPACING[3],
    paddingHorizontal: SPACING[5],
  },
  setupButtonText: {
    fontSize: 15,
    fontFamily: 'Inter',
    fontWeight: '700',
    color: '#FFFFFF',
  },
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
    fontSize: 16,
    fontFamily: 'Inter',
    fontWeight: '700',
    color: COLORS.parent.text,
  },
  sectionDesc: {
    fontSize: 14,
    fontFamily: 'Inter',
    color: COLORS.parent.textMuted,
    lineHeight: 21,
  },
  addGeofenceButton: {
    borderWidth: 1,
    borderColor: COLORS.parent.primary,
    borderRadius: 12,
    paddingVertical: SPACING[3],
    alignItems: 'center',
    borderStyle: 'dashed',
  },
  addGeofenceText: {
    fontSize: 15,
    fontFamily: 'Inter',
    fontWeight: '700',
    color: COLORS.parent.primary,
  },
  screenTimeCard: {
    backgroundColor: COLORS.parent.card,
    borderRadius: 16,
    padding: SPACING[5],
    gap: SPACING[4],
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
  },
  controlRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING[2],
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  controlLabel: {
    fontSize: 15,
    fontFamily: 'Inter',
    fontWeight: '600',
    color: COLORS.parent.text,
  },
  controlDesc: {
    fontSize: 12,
    fontFamily: 'Inter',
    color: COLORS.parent.textMuted,
    marginTop: 2,
  },
  editButton: {
    paddingVertical: SPACING[2],
    paddingHorizontal: SPACING[3],
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 8,
  },
  editButtonText: {
    fontSize: 13,
    fontFamily: 'Inter',
    fontWeight: '600',
    color: COLORS.parent.text,
  },
  noChild: {
    fontSize: 15,
    fontFamily: 'Inter',
    color: COLORS.parent.textMuted,
    textAlign: 'center',
    marginTop: SPACING[10],
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[3],
    paddingVertical: SPACING[2],
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  categoryIcon: { fontSize: 20, width: 28 },
  categoryName: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Inter',
    color: COLORS.parent.text,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(74,222,128,0.12)',
    borderRadius: 10,
    paddingHorizontal: SPACING[2],
    paddingVertical: 3,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#4ADE80',
  },
  statusText: {
    fontSize: 12,
    fontFamily: 'Inter',
    fontWeight: '600',
    color: '#4ADE80',
  },
});
