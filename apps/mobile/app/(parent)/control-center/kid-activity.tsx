/**
 * Kid Activity view for parents.
 * Tabs: TODAY | HISTORY | LIVE
 * - Today: section time bar chart, screenshot timeline, search history
 * - History: last 7 days date picker + same layout
 * - Live: real-time feed using Socket.IO (useKidLiveMonitor)
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useLocalSearchParams, router } from 'expo-router';
import { useFamilyStore } from '../../../src/store/family.store';
import { apiClient } from '../../../src/services/api.client';
import { useKidLiveMonitor, LiveEvent } from '../../../src/hooks/useKidLiveMonitor';
import { COLORS } from '../../../src/constants/colors';
import { SPACING } from '../../../src/constants/spacing';

type Tab = 'today' | 'history' | 'live';

const SECTION_COLORS: Record<string, string> = {
  videos: '#667EEA',
  dua: '#11998E',
  quran: '#1A6633',
  stories: '#F2994A',
  science: '#2193B0',
  maths: '#00B4DB',
  habits: '#56AB2F',
  default: '#8B5CF6',
};

const EVENT_ICONS: Record<string, string> = {
  'section-enter': '📂',
  'section-exit': '📁',
  'video-play': '▶️',
  search: '🔍',
  'url-visit': '🌐',
  screenshot: '📸',
  'camera-photo': '📷',
  'screen-time-update': '⏱️',
  'app-foreground': '📱',
  online: '🟢',
  offline: '⚫',
};

function timeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp;
  if (diff < 60000) return 'just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

function formatMinutes(min: number): string {
  if (min < 60) return `${min}m`;
  return `${Math.floor(min / 60)}h ${min % 60}m`;
}

function SectionTimeCard({ section, minutes, totalMinutes }: {
  section: string;
  minutes: number;
  totalMinutes: number;
}) {
  const pct = totalMinutes > 0 ? minutes / totalMinutes : 0;
  const color = SECTION_COLORS[section.toLowerCase()] ?? SECTION_COLORS.default;

  return (
    <View style={styles.sectionRow}>
      <Text style={styles.sectionName} numberOfLines={1}>{section}</Text>
      <View style={styles.sectionBarTrack}>
        <View style={[styles.sectionBarFill, { width: `${pct * 100}%` as any, backgroundColor: color }]} />
      </View>
      <Text style={styles.sectionTime}>{formatMinutes(minutes)}</Text>
    </View>
  );
}

function ScreenshotCard({ url, createdAt }: { url: string; createdAt: string }) {
  return (
    <View style={styles.screenshotCard}>
      <Image source={{ uri: url }} style={styles.screenshotThumb} />
      <Text style={styles.screenshotTime}>
        {new Date(createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </Text>
    </View>
  );
}

function LiveEventCard({ event }: { event: LiveEvent }) {
  const icon = EVENT_ICONS[event.type] ?? '•';

  const description = (() => {
    switch (event.type) {
      case 'section-enter': return `Opened ${event.payload.section ?? 'section'}`;
      case 'section-exit': return `Left ${event.payload.section ?? 'section'} after ${Math.round((event.payload.durationMs ?? 0) / 60000)}m`;
      case 'video-play': return `Watching: ${event.payload.title ?? event.payload.videoId}`;
      case 'search': return `Searched: "${event.payload.query}"`;
      case 'url-visit': return `Visited: ${event.payload.domain ?? event.payload.url}`;
      case 'screenshot': return 'Screenshot captured';
      case 'camera-photo': return 'Front camera photo captured';
      case 'screen-time-update': return `Screen time: ${Math.round(event.payload.minutesUsed ?? 0)}m used`;
      case 'app-foreground': return `Using app: ${event.payload.appName ?? event.payload.packageName}`;
      case 'online': return 'Kid came online';
      case 'offline': return 'Kid went offline';
      default: return event.type;
    }
  })();

  const isMedia = event.type === 'screenshot' || event.type === 'camera-photo';

  return (
    <View style={styles.liveEventCard}>
      <Text style={styles.liveEventIcon}>{icon}</Text>
      <View style={styles.liveEventBody}>
        <Text style={styles.liveEventDesc}>{description}</Text>
        <Text style={styles.liveEventTime}>{timeAgo(event.timestamp)}</Text>
      </View>
      {isMedia && event.payload.cloudinaryUrl && (
        <Image source={{ uri: event.payload.cloudinaryUrl }} style={styles.liveEventThumb} />
      )}
    </View>
  );
}

export default function KidActivityScreen() {
  const { childId } = useLocalSearchParams<{ childId: string }>();
  const { dashboard, activeFamilyId } = useFamilyStore();
  const kid = dashboard?.children?.find((c) => c.childId === childId);

  const [activeTab, setActiveTab] = useState<Tab>('today');
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [todayData, setTodayData] = useState<any>(null);
  const [loadingToday, setLoadingToday] = useState(true);

  const { events, isKidOnline, clearEvents } = useKidLiveMonitor(
    activeFamilyId,
    activeTab === 'live' ? childId : null,
  );

  useEffect(() => {
    if (childId) loadTodayData();
  }, [childId]);

  async function loadTodayData() {
    setLoadingToday(true);
    try {
      const { data } = await apiClient.get(`/activity/${childId}/today`);
      setTodayData(data);
    } catch {}
    finally { setLoadingToday(false); }
  }

  const sectionTimeLogs: any[] = todayData?.sectionTimeLogs ?? [];
  const screenshots: any[] = (todayData?.activityLogs ?? []).filter(
    (l: any) => l.type === 'SCREENSHOT' && l.screenshotUrl
  );
  const searches: any[] = (todayData?.activityLogs ?? []).filter(
    (l: any) => l.type === 'SEARCH_QUERY'
  );

  const totalMinutes = sectionTimeLogs.reduce((acc: number, l: any) => acc + (l.minutes ?? 0), 0);

  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    return d.toISOString().split('T')[0];
  });

  return (
    <LinearGradient colors={['#E8F4EC', '#F2E8E9']} style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <View>
            <Text style={styles.headerTitle}>Activity</Text>
            {kid && <Text style={styles.headerSub}>{kid.name}</Text>}
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabRow}>
          {(['today', 'history', 'live'] as Tab[]).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.tabActive]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                {tab.toUpperCase()}
                {tab === 'live' && (
                  <Text style={[styles.onlineDot, { color: isKidOnline ? '#10B981' : '#6B7280' }]}>
                    {' '}●
                  </Text>
                )}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* TODAY */}
        {activeTab === 'today' && (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
            {loadingToday ? (
              <ActivityIndicator color={COLORS.parent.primary} style={{ marginTop: 40 }} />
            ) : (
              <>
                {/* Section Time */}
                <Animated.View entering={FadeInDown.delay(100)} style={styles.card}>
                  <Text style={styles.cardTitle}>⏱️ Time by Section — {formatMinutes(totalMinutes)} total</Text>
                  {sectionTimeLogs.length === 0 ? (
                    <Text style={styles.emptyText}>No activity tracked yet today.</Text>
                  ) : (
                    sectionTimeLogs.map((log: any) => (
                      <SectionTimeCard
                        key={log.id ?? log.section}
                        section={log.section}
                        minutes={log.minutes}
                        totalMinutes={totalMinutes}
                      />
                    ))
                  )}
                </Animated.View>

                {/* Screenshots */}
                {screenshots.length > 0 && (
                  <Animated.View entering={FadeInDown.delay(200)} style={styles.card}>
                    <Text style={styles.cardTitle}>📸 Screenshots ({screenshots.length})</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.screenshotsRow}>
                      {screenshots.map((s: any) => (
                        <ScreenshotCard key={s.id} url={s.screenshotUrl} createdAt={s.createdAt} />
                      ))}
                    </ScrollView>
                  </Animated.View>
                )}

                {/* Search history */}
                {searches.length > 0 && (
                  <Animated.View entering={FadeInDown.delay(300)} style={styles.card}>
                    <Text style={styles.cardTitle}>🔍 Search History</Text>
                    {searches.map((s: any) => (
                      <View key={s.id} style={styles.searchRow}>
                        <Text style={styles.searchIcon}>🔍</Text>
                        <Text style={styles.searchQuery}>{s.payload?.query ?? 'Unknown search'}</Text>
                        <Text style={styles.searchTime}>
                          {new Date(s.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                      </View>
                    ))}
                  </Animated.View>
                )}
              </>
            )}
            <View style={{ height: 40 }} />
          </ScrollView>
        )}

        {/* HISTORY */}
        {activeTab === 'history' && (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
            {/* Date picker */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.datesRow}>
              {last7Days.map((date) => (
                <TouchableOpacity
                  key={date}
                  style={[styles.dateChip, selectedDate === date && styles.dateChipActive]}
                  onPress={() => setSelectedDate(date)}
                >
                  <Text style={[styles.dateChipText, selectedDate === date && styles.dateChipTextActive]}>
                    {date === new Date().toISOString().split('T')[0]
                      ? 'Today'
                      : new Date(date).toLocaleDateString('en', { weekday: 'short', day: 'numeric' })}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>📅 {selectedDate}</Text>
              <Text style={styles.emptyText}>
                Historical data for past dates is shown here. Select a different date above.
              </Text>
            </View>
            <View style={{ height: 40 }} />
          </ScrollView>
        )}

        {/* LIVE */}
        {activeTab === 'live' && (
          <View style={styles.liveContainer}>
            <View style={styles.liveHeader}>
              <View style={styles.onlineStatus}>
                <View style={[styles.onlineDotView, { backgroundColor: isKidOnline ? '#10B981' : '#6B7280' }]} />
                <Text style={styles.onlineText}>
                  {kid?.name ?? 'Kid'} is {isKidOnline ? 'online' : 'offline'}
                </Text>
              </View>
              <TouchableOpacity onPress={clearEvents} style={styles.clearButton}>
                <Text style={styles.clearButtonText}>Clear</Text>
              </TouchableOpacity>
            </View>

            {events.length === 0 ? (
              <View style={styles.liveEmpty}>
                <Text style={styles.liveEmptyEmoji}>👁️</Text>
                <Text style={styles.liveEmptyText}>
                  {isKidOnline ? 'Waiting for activity...' : "Kid isn't active right now"}
                </Text>
              </View>
            ) : (
              <FlatList
                data={events}
                renderItem={({ item }) => <LiveEventCard event={item} />}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.liveList}
                showsVerticalScrollIndicator={false}
              />
            )}
          </View>
        )}
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  scroll: { paddingHorizontal: SPACING[5], paddingTop: SPACING[3] },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[3],
    paddingHorizontal: SPACING[5],
    paddingVertical: SPACING[3],
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: { fontSize: 18, color: COLORS.parent.textPrimary },
  headerTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 22,
    color: COLORS.parent.textPrimary,
  },
  headerSub: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: COLORS.parent.textMuted,
  },

  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: SPACING[5],
    marginBottom: SPACING[3],
    gap: SPACING[2],
  },
  tab: {
    flex: 1,
    paddingVertical: SPACING[3],
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.5)',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  tabActive: {
    backgroundColor: COLORS.parent.primary,
    borderColor: COLORS.parent.primary,
  },
  tabText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    color: COLORS.parent.textMuted,
  },
  tabTextActive: { color: '#FFFFFF' },
  onlineDot: { fontSize: 10 },

  card: {
    backgroundColor: 'rgba(255,255,255,0.72)',
    borderRadius: 16,
    padding: SPACING[4],
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.55)',
    marginBottom: SPACING[4],
    gap: SPACING[3],
  },
  cardTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 15,
    color: COLORS.parent.textPrimary,
  },
  emptyText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: COLORS.parent.textMuted,
  },

  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[3],
    minHeight: 28,
  },
  sectionName: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    color: COLORS.parent.textPrimary,
    width: 80,
  },
  sectionBarTrack: {
    flex: 1,
    height: 8,
    backgroundColor: 'rgba(92,61,46,0.1)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  sectionBarFill: {
    height: '100%',
    borderRadius: 4,
    minWidth: 2,
  },
  sectionTime: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: COLORS.parent.textMuted,
    width: 40,
    textAlign: 'right',
  },

  screenshotsRow: { paddingVertical: SPACING[2] },
  screenshotCard: {
    marginRight: SPACING[3],
    alignItems: 'center',
    gap: SPACING[1],
  },
  screenshotThumb: {
    width: 80,
    height: 60,
    borderRadius: 8,
    backgroundColor: COLORS.parent.textMuted,
  },
  screenshotTime: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: COLORS.parent.textMuted,
  },

  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
    paddingVertical: SPACING[2],
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(92,61,46,0.06)',
  },
  searchIcon: { fontSize: 14 },
  searchQuery: {
    flex: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: COLORS.parent.textPrimary,
  },
  searchTime: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: COLORS.parent.textMuted,
  },

  datesRow: { paddingHorizontal: SPACING[5], marginBottom: SPACING[3] },
  dateChip: {
    paddingHorizontal: SPACING[4],
    paddingVertical: SPACING[2],
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.6)',
    marginRight: SPACING[2],
    borderWidth: 1,
    borderColor: 'transparent',
  },
  dateChipActive: {
    backgroundColor: COLORS.parent.primary,
    borderColor: COLORS.parent.primary,
  },
  dateChipText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    color: COLORS.parent.textMuted,
  },
  dateChipTextActive: { color: '#FFFFFF' },

  liveContainer: { flex: 1, paddingHorizontal: SPACING[5] },
  liveHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING[3],
    marginBottom: SPACING[2],
  },
  onlineStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
  },
  onlineDotView: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  onlineText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: COLORS.parent.textPrimary,
  },
  clearButton: {
    paddingHorizontal: SPACING[3],
    paddingVertical: SPACING[2],
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderRadius: 10,
  },
  clearButtonText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    color: COLORS.parent.textMuted,
  },
  liveList: { paddingBottom: 40 },
  liveEmpty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING[3],
  },
  liveEmptyEmoji: { fontSize: 60 },
  liveEmptyText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 16,
    color: COLORS.parent.textMuted,
    textAlign: 'center',
  },
  liveEventCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.72)',
    borderRadius: 12,
    padding: SPACING[3],
    marginBottom: SPACING[2],
    gap: SPACING[2],
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.55)',
  },
  liveEventIcon: { fontSize: 20, width: 28, textAlign: 'center' },
  liveEventBody: { flex: 1, gap: 3 },
  liveEventDesc: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    color: COLORS.parent.textPrimary,
  },
  liveEventTime: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: COLORS.parent.textMuted,
  },
  liveEventThumb: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: COLORS.parent.textMuted,
  },
});
