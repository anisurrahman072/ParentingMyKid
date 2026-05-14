import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  TextInput,
  ActivityIndicator,
  Switch,
  Image,
  Platform,
} from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { router, useLocalSearchParams } from 'expo-router';
import { apiClient } from '../../../src/services/api.client';
import { useFamilyStore } from '../../../src/store/family.store';
import { COLORS } from '../../../src/constants/colors';
import { SPACING } from '../../../src/constants/spacing';
import { PremiumDurationPickerModal } from '../../../src/components/parent/game-settings/PremiumDurationPickerModal';
import { childIdFromGlobalParams } from '../../../src/utils/kidHandoffSession';
import {
  type PersistedVideoManager,
  type VideoFilterSettings,
  type VideoPlatformId,
  type VideoScheduleMode,
  DEFAULT_VIDEO_FILTERS,
  coercePersistedVideoManager,
  defaultPersistedVideoManager,
  extractYoutubeVideoId,
  extractYoutubeChannelId,
  mergePerPlatformInherited,
  youtubeBlockedChannelIds,
  buildNativeVideoPolicy,
  buildYoutubeNetworkFilter,
} from '../../../src/utils/videoManagerPolicy';
import { fetchAndPushParentalPolicyForChild, pushPolicyToNativeAndroid } from '../../../src/services/policySync.service';

const TIME_STEP = 15;
const TIME_MAX = 300;

const PLATFORM_ORDER: VideoPlatformId[] = ['youtube', 'instagram', 'tiktok', 'facebook', 'other_video'];

const PLATFORM_LABEL: Record<VideoPlatformId, string> = {
  youtube: 'YouTube',
  instagram: 'Instagram',
  tiktok: 'TikTok',
  facebook: 'Facebook',
  other_video: 'More video apps',
};

function normalizeYoutubeSearchList(payload: unknown): YoutubeSearchRow[] {
  if (!payload) return [];
  if (Array.isArray(payload)) {
    const out: YoutubeSearchRow[] = [];
    for (const row of payload) {
      if (!row || typeof row !== 'object') continue;
      const o = row as Record<string, unknown>;
      const id = typeof o.id === 'string' ? o.id : '';
      if (!id) continue;
      out.push({
        id,
        title: typeof o.title === 'string' ? o.title : id,
        thumbnail: typeof o.thumbnail === 'string' ? o.thumbnail : undefined,
        channelTitle: typeof o.channelTitle === 'string' ? o.channelTitle : '',
        channelId: typeof o.channelId === 'string' ? o.channelId : undefined,
      });
    }
    return out;
  }
  if (typeof payload === 'object' && payload !== null && 'items' in payload) {
    return normalizeYoutubeSearchList((payload as { items?: unknown }).items);
  }
  return [];
}

type YoutubeSearchRow = {
  id: string;
  title: string;
  thumbnail?: string;
  channelTitle: string;
  channelId?: string;
};

type CartoonStyle = PersistedVideoManager['cartoonStyle'];

const FILTER_PICKER_OPTIONS: Record<keyof VideoFilterSettings, { label: string; value: string }[]> = {
  ageGroup: [
    { label: 'Toddler (0–4)', value: 'TODDLER' },
    { label: 'Child (5–11)', value: 'CHILD' },
    { label: 'Teen (12+)', value: 'TEEN' },
    { label: 'All Ages', value: 'ALL' },
  ],
  music: [
    { label: 'No Music', value: 'NONE' },
    { label: 'Nasheeds Only', value: 'NASHEEDS_ONLY' },
    { label: 'All Music', value: 'ALL' },
  ],
  language: [
    { label: 'English', value: 'EN' },
    { label: 'Bengali', value: 'BN' },
    { label: 'Arabic', value: 'AR' },
    { label: 'All Languages', value: 'ALL' },
  ],
  contentType: [
    { label: 'Strict Halal', value: 'STRICT_HALAL' },
    { label: 'General Islamic', value: 'GENERAL_ISLAMIC' },
    { label: 'Normal', value: 'NORMAL' },
  ],
  genderFilter: [
    { label: 'Boys', value: 'BOYS' },
    { label: 'Girls', value: 'GIRLS' },
    { label: 'Both', value: 'BOTH' },
  ],
  theme: [
    { label: 'Educational', value: 'EDUCATIONAL' },
    { label: 'Entertainment', value: 'ENTERTAINMENT' },
    { label: 'Both', value: 'BOTH' },
  ],
};

const CARTOON_OPTIONS: { label: string; value: CartoonStyle }[] = [
  { label: 'Any style', value: 'ANY' },
  { label: 'Calmer live-action', value: 'LIVE_ACTION_OK' },
  { label: 'Cartoon-forward', value: 'CARTOON_FORWARD' },
  { label: 'Short learning clips', value: 'EDUCATIONAL_CLIPS' },
];

const FILTER_LABELS: Record<keyof VideoFilterSettings, string> = {
  ageGroup: 'Age Group',
  music: 'Music',
  language: 'Language',
  contentType: 'Content Type',
  genderFilter: 'Gender Filter',
  theme: 'Theme',
};

function PickerRow<K extends keyof VideoFilterSettings>({
  label,
  field,
  value,
  onChange,
}: {
  label: string;
  field: K;
  value: string;
  onChange: (v: string) => void;
}) {
  const options = FILTER_PICKER_OPTIONS[field];
  return (
    <View style={pickerStyles.row}>
      <Text style={pickerStyles.label}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={pickerStyles.options}>
        {options.map((opt) => (
          <TouchableOpacity
            key={opt.value}
            style={[pickerStyles.option, value === opt.value && pickerStyles.optionActive]}
            onPress={() => onChange(opt.value)}
          >
            <Text style={[pickerStyles.optionText, value === opt.value && pickerStyles.optionTextActive]}>{opt.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const pickerStyles = StyleSheet.create({
  row: { marginBottom: SPACING[4] },
  label: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    color: COLORS.parent.textSecondary,
    marginBottom: SPACING[2],
  },
  options: { flexDirection: 'row', gap: SPACING[2] },
  option: {
    paddingHorizontal: SPACING[3],
    paddingVertical: SPACING[2],
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(92,61,46,0.15)',
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  optionActive: {
    borderColor: COLORS.parent.primary,
    backgroundColor: 'rgba(59,130,246,0.1)',
  },
  optionText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    color: COLORS.parent.textSecondary,
  },
  optionTextActive: {
    color: COLORS.parent.primary,
    fontFamily: 'Inter_600SemiBold',
  },
});

function formatMinutes(mins: number) {
  if (mins === 0) return '0m';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function Stepper({
  value,
  min,
  max,
  step,
  onChange,
  pickerSubtitle,
}: {
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  pickerSubtitle?: string;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  function applyStep(delta: number) {
    setPickerOpen(false);
    onChange(Math.max(min, Math.min(max, value + delta)));
  }
  return (
    <>
      <PremiumDurationPickerModal
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        valueMinutes={value}
        minMinutes={min}
        maxMinutes={max}
        onConfirm={(minutes) => onChange(minutes)}
        title="Set minutes"
        subtitle={pickerSubtitle}
      />
      <View style={stepperStyles.row}>
        <TouchableOpacity
          style={[stepperStyles.btn, value <= min && stepperStyles.btnDisabled]}
          onPress={() => applyStep(-step)}
          disabled={value <= min}
        >
          <Text style={stepperStyles.btnText}>−</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={stepperStyles.valueTouchable}
          onPress={() => setPickerOpen(true)}
          activeOpacity={0.72}
          accessibilityRole="button"
        >
          <Text style={stepperStyles.value}>{formatMinutes(value)}</Text>
          <Text style={stepperStyles.editCue}>tap to set</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[stepperStyles.btn, value >= max && stepperStyles.btnDisabled]}
          onPress={() => applyStep(step)}
          disabled={value >= max}
        >
          <Text style={stepperStyles.btnText}>+</Text>
        </TouchableOpacity>
      </View>
    </>
  );
}

const stepperStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING[4],
    marginTop: SPACING[3],
  },
  btn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.parent.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnDisabled: { backgroundColor: '#D1D5DB' },
  btnText: { fontSize: 22, color: '#FFFFFF', lineHeight: 26 },
  valueTouchable: {
    minWidth: 100,
    alignItems: 'center',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(59,130,246,0.35)',
  },
  editCue: {
    fontFamily: 'Inter_400Regular',
    fontSize: 10,
    color: COLORS.parent.textMuted,
    marginTop: 2,
  },
  value: {
    fontFamily: 'Inter_700Bold',
    fontSize: 22,
    color: COLORS.parent.textPrimary,
  },
});

function ScheduleSegment({
  value,
  onChange,
}: {
  value: VideoScheduleMode;
  onChange: (m: VideoScheduleMode) => void;
}) {
  return (
    <View style={segStyles.track}>
      <TouchableOpacity
        style={[segStyles.option, value === 'same_every_day' && segStyles.optionActive]}
        onPress={() => onChange('same_every_day')}
      >
        <Text style={[segStyles.optionText, value === 'same_every_day' && segStyles.optionTextActive]} numberOfLines={2}>
          Same limit every day
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[segStyles.option, value === 'weekday_weekend' && segStyles.optionActive]}
        onPress={() => onChange('weekday_weekend')}
      >
        <Text style={[segStyles.optionText, value === 'weekday_weekend' && segStyles.optionTextActive]} numberOfLines={2}>
          Weekdays vs weekend
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const segStyles = StyleSheet.create({
  track: { flexDirection: 'row', gap: SPACING[2], marginTop: SPACING[2], marginBottom: SPACING[2] },
  option: {
    flex: 1,
    minHeight: 52,
    paddingVertical: SPACING[2],
    paddingHorizontal: SPACING[2],
    borderRadius: 12,
    backgroundColor: 'rgba(92,61,46,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(92,61,46,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionActive: {
    backgroundColor: 'rgba(59,130,246,0.12)',
    borderColor: COLORS.parent.primary,
  },
  optionText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    color: COLORS.parent.textMuted,
    textAlign: 'center',
  },
  optionTextActive: {
    fontFamily: 'Inter_600SemiBold',
    color: COLORS.parent.primary,
  },
});

function PlaybackModeRow({
  value,
  onChange,
}: {
  value: PersistedVideoManager['playbackMode'];
  onChange: (m: PersistedVideoManager['playbackMode']) => void;
}) {
  return (
    <View style={segStyles.track}>
      <TouchableOpacity
        style={[segStyles.option, value === 'IN_APP_CURATED' && segStyles.optionActive]}
        onPress={() => onChange('IN_APP_CURATED')}
      >
        <Text style={[segStyles.optionText, value === 'IN_APP_CURATED' && segStyles.optionTextActive]} numberOfLines={3}>
          Curated inside ParentingMyKid
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[segStyles.option, value === 'EXTERNAL_GUIDED' && segStyles.optionActive]}
        onPress={() => onChange('EXTERNAL_GUIDED')}
      >
        <Text style={[segStyles.optionText, value === 'EXTERNAL_GUIDED' && segStyles.optionTextActive]} numberOfLines={3}>
          Guided use of official apps
        </Text>
      </TouchableOpacity>
    </View>
  );
}

function serializeVideoSettingsBlob(vm: PersistedVideoManager): Record<string, unknown> {
  return { ...vm } as unknown as Record<string, unknown>;
}

export default function VideoManagerScreen() {
  const params = useLocalSearchParams<{ childId?: string | string[] }>();
  const childId = useMemo(() => childIdFromGlobalParams(params.childId), [params.childId]);
  const { dashboard } = useFamilyStore();
  const kid = dashboard?.children?.find((c) => c.childId === childId);

  const [loading, setLoading] = useState(true);
  const [hasSuccessfulLoad, setHasSuccessfulLoad] = useState(false);
  const [saving, setSaving] = useState(false);
  const [vm, setVm] = useState<PersistedVideoManager>(() => defaultPersistedVideoManager());
  const [urlInput, setUrlInput] = useState('');
  const [activePlatform, setActivePlatform] = useState<VideoPlatformId>('youtube');

  const [youtubeSearchTab, setYoutubeSearchTab] = useState<'channel' | 'video'>('channel');
  const [youtubeSearchQuery, setYoutubeSearchQuery] = useState('');
  const [youtubeSearching, setYoutubeSearching] = useState(false);
  const [youtubeHits, setYoutubeHits] = useState<YoutubeSearchRow[]>([]);
  const [manualBlockInput, setManualBlockInput] = useState('');

  const load = useCallback(async () => {
    if (!childId) {
      setLoading(false);
      setHasSuccessfulLoad(false);
      return;
    }
    setLoading(true);
    setHasSuccessfulLoad(false);
    try {
      const { data } = await apiClient.get(`/safety/${childId}/parental-controls`);
      const rawVs = data?.videoSettings;
      let merged = coercePersistedVideoManager(rawVs ?? DEFAULT_VIDEO_FILTERS);
      const serverCh: unknown = (data as { youtubeBlockedChannelIds?: unknown })?.youtubeBlockedChannelIds;
      if (merged.youtubeBlocked.length === 0 && Array.isArray(serverCh)) {
        const ids = serverCh.filter((x): x is string => typeof x === 'string' && x.trim().length > 0);
        if (ids.length > 0) {
          merged = {
            ...merged,
            youtubeBlocked: ids.map((id) => ({
              id: id.trim(),
              label: id.trim(),
              kind: 'CHANNEL' as const,
              sublabel: 'Synced from device rules',
            })),
          };
        }
      }
      setVm(merged);
      setHasSuccessfulLoad(true);
    } catch {
      Alert.alert('Error', 'Failed to load settings.');
      setHasSuccessfulLoad(false);
    } finally {
      setLoading(false);
    }
  }, [childId]);

  useEffect(() => {
    void load();
  }, [load]);

  function updateFilter<K extends keyof VideoFilterSettings>(key: K, value: string) {
    setVm((prev) => ({ ...prev, [key]: value } as PersistedVideoManager));
  }

  function patchPlatform(id: VideoPlatformId, patch: Partial<PersistedVideoManager['platformToggles'][typeof id]>) {
    setVm((prev) => ({
      ...prev,
      platformToggles: {
        ...prev.platformToggles,
        [id]: { ...prev.platformToggles[id], ...patch },
      },
    }));
  }

  function handleAddUrl() {
    const trimmed = urlInput.trim();
    if (!trimmed) return;
    if (!trimmed.startsWith('http')) {
      Alert.alert('Invalid URL', 'Please enter a valid URL starting with http.');
      return;
    }
    if (vm.customUrls.includes(trimmed)) {
      Alert.alert('Already added', 'This URL is already in the list.');
      return;
    }
    setVm((p) => ({ ...p, customUrls: [...p.customUrls, trimmed] }));
    setUrlInput('');
  }

  function handleManualBlockAdd() {
    const t = manualBlockInput.trim();
    if (!t) return;
    const asVideo = extractYoutubeVideoId(t);
    if (asVideo) {
      if (vm.youtubeBlocked.some((e) => e.id === asVideo)) {
        Alert.alert('Already blocked', 'This video is already on the list.');
        return;
      }
      setVm((p) => ({
        ...p,
        youtubeBlocked: [...p.youtubeBlocked, { id: asVideo, label: asVideo, kind: 'VIDEO', sublabel: 'Manual ID / link' }],
      }));
      setManualBlockInput('');
      return;
    }
    const asCh = extractYoutubeChannelId(t);
    if (asCh) {
      if (vm.youtubeBlocked.some((e) => e.kind === 'CHANNEL' && e.id === asCh)) {
        Alert.alert('Already blocked', 'This channel is already on the list.');
        return;
      }
      setVm((p) => ({
        ...p,
        youtubeBlocked: [...p.youtubeBlocked, { id: asCh, label: asCh, kind: 'CHANNEL', sublabel: 'Manual channel id' }],
      }));
      setManualBlockInput('');
      return;
    }
    Alert.alert('Unrecognized', 'Paste a watch URL, youtu.be link, shorts link, or a channel id starting with UC.');
  }

  const runYoutubeSearch = useCallback(async () => {
    const q = youtubeSearchQuery.trim();
    if (!q) return;
    setYoutubeSearching(true);
    try {
      const paramsQs = new URLSearchParams({
        q,
        safeSearch: 'strict',
        resultType: youtubeSearchTab === 'channel' ? 'channel' : 'video',
      });
      const { data } = await apiClient.get(`/media/youtube-search?${paramsQs.toString()}`);
      setYoutubeHits(normalizeYoutubeSearchList(data));
    } catch {
      setYoutubeHits([]);
      Alert.alert('Search failed', 'Check your connection and that the server has a YouTube API key configured.');
    } finally {
      setYoutubeSearching(false);
    }
  }, [youtubeSearchQuery, youtubeSearchTab]);

  function addBlockedFromSearch(row: YoutubeSearchRow) {
    if (youtubeSearchTab === 'channel') {
      if (vm.youtubeBlocked.some((e) => e.kind === 'CHANNEL' && e.id === row.id)) {
        Alert.alert('Already on list', 'This channel is already blocked.');
        return;
      }
      setVm((p) => ({
        ...p,
        youtubeBlocked: [
          ...p.youtubeBlocked,
          {
            id: row.id,
            label: row.title,
            kind: 'CHANNEL',
            thumbnail: row.thumbnail,
            sublabel: row.channelTitle,
          },
        ],
      }));
      return;
    }
    if (vm.youtubeBlocked.some((e) => e.kind === 'VIDEO' && e.id === row.id)) {
      Alert.alert('Already on list', 'This video is already blocked.');
      return;
    }
    const ch = row.channelId ?? row.channelTitle;
    setVm((p) => ({
      ...p,
      youtubeBlocked: [
        ...p.youtubeBlocked,
        {
          id: row.id,
          label: row.title,
          kind: 'VIDEO',
          thumbnail: row.thumbnail,
          sublabel: ch ? `Channel: ${ch}` : undefined,
        },
      ],
    }));
  }

  function removeBlocked(i: number) {
    setVm((p) => ({ ...p, youtubeBlocked: p.youtubeBlocked.filter((_, j) => j !== i) }));
  }

  async function handleSave() {
    if (!childId) return;
    if (!hasSuccessfulLoad || loading) {
      Alert.alert('Please wait', 'Finish loading settings, then tap Save.');
      return;
    }
    setSaving(true);
    try {
      const merged = mergePerPlatformInherited(vm.timeBudget);
      const snapshot: PersistedVideoManager = { ...vm, timeBudget: merged };
      const payload = serializeVideoSettingsBlob(snapshot);
      await apiClient.patch(`/safety/${childId}/parental-controls`, {
        videoSettings: payload,
        youtubeBlockedChannelIds: youtubeBlockedChannelIds(snapshot.youtubeBlocked),
      });
      setVm(snapshot);
      if (Platform.OS === 'android') {
        // Push video-policy changes to native immediately from the local snapshot — do NOT wait
        // for a server re-fetch which could lag and leave the old policy in SharedPreferences.
        // fetchAndPushParentalPolicyForChild runs in the background to keep other fields in sync.
        try {
          const videoPolicy = buildNativeVideoPolicy(payload);
          const ytNetworkFilter = buildYoutubeNetworkFilter(payload);
          await pushPolicyToNativeAndroid(
            {
              videoSettings: payload,
              // Pass zeroed placeholders; the native module merges these with the existing
              // SharedPreferences policy — only videoPolicy + youtubeNetworkFilter fields matter here.
              blockedApps: [],
              appGuardEnabled: false,
              blockAllAppsEnabled: false,
              stopInternetEnabled: false,
              websiteFilteringEnabled: false,
              gamesEnabled: true,
              blockNetworkChanges: false,
            },
            { websiteDnsGatesOnKidMode: true },
          );
          void fetchAndPushParentalPolicyForChild(childId, { clearEnforcementPause: true });
        } catch {
          /* offline — try server fetch as fallback */
          try {
            await fetchAndPushParentalPolicyForChild(childId, { clearEnforcementPause: true });
          } catch {
            /* offline entirely */
          }
        }
      }
      Alert.alert('Saved', 'Video Manager settings updated.');
    } catch {
      Alert.alert('Error', 'Failed to save settings.');
    } finally {
      setSaving(false);
    }
  }

  const pt = vm.platformToggles[activePlatform];

  if (loading) {
    return (
      <LinearGradient colors={['#E8F4EC', '#F2E8E9']} style={styles.container}>
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <ActivityIndicator size="large" color={COLORS.parent.primary} style={{ flex: 1 }} />
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={['#E8F4EC', '#F2E8E9']} style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <Animated.View entering={FadeInDown.delay(50).springify()} style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backIcon}>‹</Text>
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Video Manager</Text>
            {kid?.name ? <Text style={styles.headerSubtitle}>{kid.name}</Text> : null}
          </View>
          <View style={styles.headerRight} />
        </Animated.View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          <Animated.View entering={FadeInDown.delay(70).springify()} style={styles.heroCard}>
            <Text style={styles.heroTitle}>Two ways to keep video time healthy</Text>
            <Text style={styles.heroBody}>
              <Text style={styles.infoBold}>Inside the app</Text> we can keep a kid-safe library aligned with your filters.{' '}
              <Text style={styles.infoBold}>Official apps</Text> stay available on Android with limits you set here — deep
              blocking of Shorts/Reels often needs the same Accessibility + Usage access stack as Game Settings on a child
              device profile.
            </Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(80).springify()} style={styles.truthCard}>
            <Text style={styles.truthTitle}>What applies on this device</Text>
            <Text style={styles.truthBody}>
              • Kid Mode YouTube lists and the in-app player use your blocked channels/videos and safer search after you tap Save.{'\n'}
              • Search requires a valid YOUTUBE_API_KEY on your backend.{'\n'}
              • Official social/video apps: rules are stored and mirrored to Android; Shorts disruption for the YouTube app is
              experimental when you pick &quot;Guided use&quot; and turn Shorts off. Heuristics can change with app updates.{'\n'}
              • Developers: see VIDEO_ENFORCEMENT_STATUS.md in the mobile app docs folder.
            </Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(90).springify()}>
            <Text style={styles.sectionLabel}>PLAYBACK APPROACH</Text>
            <View style={styles.card}>
              <Text style={styles.cardLead}>Choose the primary experience for this child</Text>
              <PlaybackModeRow
                value={vm.playbackMode}
                onChange={(playbackMode) => setVm((p) => ({ ...p, playbackMode }))}
              />
              <Text style={styles.microHint}>
                {vm.playbackMode === 'IN_APP_CURATED'
                  ? 'Kid Mode video boxes use your filters + allowlisted URLs.'
                  : 'Prioritize timers and URL rules while kids use YouTube, TikTok, Instagram, or Facebook.'}
              </Text>
            </View>
          </Animated.View>

          {vm.playbackMode === 'EXTERNAL_GUIDED' && (
            <Animated.View entering={FadeInDown.delay(110).springify()}>
              <Text style={styles.sectionLabel}>VIDEO APPS</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabRow}>
                {PLATFORM_ORDER.map((id) => (
                  <TouchableOpacity
                    key={id}
                    style={[styles.tabChip, activePlatform === id && styles.tabChipOn]}
                    onPress={() => setActivePlatform(id)}
                  >
                    <Text style={[styles.tabChipText, activePlatform === id && styles.tabChipTextOn]}>{PLATFORM_LABEL[id]}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <View style={styles.card}>
                <View style={styles.toggleRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.toggleTitle}>Allow {PLATFORM_LABEL[activePlatform]}</Text>
                    <Text style={styles.toggleDesc}>Turn off to discourage this app family during kid sessions.</Text>
                  </View>
                  <Switch
                    value={pt.allowApp}
                    onValueChange={(allowApp) => patchPlatform(activePlatform, { allowApp })}
                    trackColor={{ false: '#D1D5DB', true: COLORS.parent.primary }}
                    thumbColor="#FFFFFF"
                  />
                </View>
                <View style={[styles.toggleRow, styles.toggleRowSpaced]}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.toggleTitle}>Shorts / Reels / vertical feed</Text>
                    <Text style={styles.toggleDesc}>
                      {pt.allowApp && !pt.allowShorts
                        ? '🔴 BLOCKING — exits Shorts via Accessibility + DNS (VPN)'
                        : 'Blocked via Accessibility service + DNS when turned off.'}
                    </Text>
                  </View>
                  <Switch
                    value={pt.allowShorts}
                    onValueChange={(allowShorts) => patchPlatform(activePlatform, { allowShorts })}
                    disabled={!pt.allowApp}
                    trackColor={{ false: '#EF4444', true: COLORS.parent.primary }}
                    thumbColor="#FFFFFF"
                  />
                </View>
              </View>
            </Animated.View>
          )}

          <Animated.View entering={FadeInDown.delay(130).springify()}>
            <Text style={styles.sectionLabel}>GLOBAL TIME BUDGET</Text>
            <View style={styles.card}>
              <Text style={styles.cardLead}>Cap total video time per day (all apps above)</Text>
              <ScheduleSegment
                value={vm.timeBudget.scheduleMode}
                onChange={(scheduleMode) => setVm((p) => ({ ...p, timeBudget: { ...p.timeBudget, scheduleMode } }))}
              />
              {vm.timeBudget.scheduleMode === 'same_every_day' ? (
                <>
                  <Text style={styles.cardTitleMuted}>Every day</Text>
                  <Stepper
                    value={vm.timeBudget.globalSameMinutes}
                    min={0}
                    max={TIME_MAX}
                    step={TIME_STEP}
                    pickerSubtitle="Total video · daily"
                    onChange={(globalSameMinutes) =>
                      setVm((p) => ({
                        ...p,
                        timeBudget: mergePerPlatformInherited({ ...p.timeBudget, globalSameMinutes }),
                      }))
                    }
                  />
                  <Text style={styles.limitCaption}>
                    0 = no scripted cap here (use Screen Time for hard stops). Mirrors Game Settings cadence.
                  </Text>
                </>
              ) : (
                <>
                  <Text style={styles.cardTitleMuted}>Monday – Friday</Text>
                  <Stepper
                    value={vm.timeBudget.globalWeekdayMinutes}
                    min={0}
                    max={TIME_MAX}
                    step={TIME_STEP}
                    pickerSubtitle="Total video · weekdays"
                    onChange={(globalWeekdayMinutes) =>
                      setVm((p) => ({
                        ...p,
                        timeBudget: mergePerPlatformInherited({ ...p.timeBudget, globalWeekdayMinutes }),
                      }))
                    }
                  />
                  <Text style={styles.cardTitleMuted}>Weekend</Text>
                  <Stepper
                    value={vm.timeBudget.globalWeekendMinutes}
                    min={0}
                    max={TIME_MAX}
                    step={TIME_STEP}
                    pickerSubtitle="Total video · weekend"
                    onChange={(globalWeekendMinutes) =>
                      setVm((p) => ({
                        ...p,
                        timeBudget: mergePerPlatformInherited({ ...p.timeBudget, globalWeekendMinutes }),
                      }))
                    }
                  />
                </>
              )}

              <Text style={[styles.cardTitleMuted, { marginTop: SPACING[4] }]}>
                {PLATFORM_LABEL[activePlatform]} · per-app override
              </Text>
              <View style={styles.inheritRow}>
                <TouchableOpacity
                  style={[
                    styles.miniChip,
                    (vm.timeBudget.perPlatform[activePlatform]?.limitMode ?? 'inherit') === 'inherit' && styles.miniChipOn,
                  ]}
                  onPress={() =>
                    setVm((p) => ({
                      ...p,
                      timeBudget: {
                        ...p.timeBudget,
                        perPlatform: {
                          ...p.timeBudget.perPlatform,
                          [activePlatform]: {
                            limitMode: 'inherit',
                            sameMinutes: p.timeBudget.globalSameMinutes,
                            weekdayMinutes: p.timeBudget.globalWeekdayMinutes,
                            weekendMinutes: p.timeBudget.globalWeekendMinutes,
                          },
                        },
                      },
                    }))
                  }
                >
                  <Text
                    style={[
                      styles.miniChipText,
                      (vm.timeBudget.perPlatform[activePlatform]?.limitMode ?? 'inherit') === 'inherit' && styles.miniChipTextOn,
                    ]}
                  >
                    Use global cap
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.miniChip,
                    vm.timeBudget.perPlatform[activePlatform]?.limitMode === 'custom' && styles.miniChipOn,
                  ]}
                  onPress={() =>
                    setVm((p) => ({
                      ...p,
                      timeBudget: {
                        ...p.timeBudget,
                        perPlatform: {
                          ...p.timeBudget.perPlatform,
                          [activePlatform]: {
                            limitMode: 'custom',
                            sameMinutes: p.timeBudget.perPlatform[activePlatform]?.sameMinutes ?? p.timeBudget.globalSameMinutes,
                            weekdayMinutes:
                              p.timeBudget.perPlatform[activePlatform]?.weekdayMinutes ?? p.timeBudget.globalWeekdayMinutes,
                            weekendMinutes:
                              p.timeBudget.perPlatform[activePlatform]?.weekendMinutes ?? p.timeBudget.globalWeekendMinutes,
                          },
                        },
                      },
                    }))
                  }
                >
                  <Text
                    style={[
                      styles.miniChipText,
                      vm.timeBudget.perPlatform[activePlatform]?.limitMode === 'custom' && styles.miniChipTextOn,
                    ]}
                  >
                    Custom
                  </Text>
                </TouchableOpacity>
              </View>
              {vm.timeBudget.perPlatform[activePlatform]?.limitMode === 'custom' ? (
                vm.timeBudget.scheduleMode === 'same_every_day' ? (
                  <Stepper
                    value={vm.timeBudget.perPlatform[activePlatform]?.sameMinutes ?? vm.timeBudget.globalSameMinutes}
                    min={0}
                    max={TIME_MAX}
                    step={TIME_STEP}
                    pickerSubtitle={`${PLATFORM_LABEL[activePlatform]} · daily`}
                    onChange={(sameMinutes) =>
                      setVm((p) => ({
                        ...p,
                        timeBudget: {
                          ...p.timeBudget,
                          perPlatform: {
                            ...p.timeBudget.perPlatform,
                            [activePlatform]: {
                              ...(p.timeBudget.perPlatform[activePlatform] ?? {
                                limitMode: 'custom',
                                sameMinutes,
                                weekdayMinutes: p.timeBudget.globalWeekdayMinutes,
                                weekendMinutes: p.timeBudget.globalWeekendMinutes,
                              }),
                              limitMode: 'custom',
                              sameMinutes,
                            },
                          },
                        },
                      }))
                    }
                  />
                ) : (
                  <>
                    <Text style={styles.miniHint}>Monday – Friday</Text>
                    <Stepper
                      value={vm.timeBudget.perPlatform[activePlatform]?.weekdayMinutes ?? vm.timeBudget.globalWeekdayMinutes}
                      min={0}
                      max={TIME_MAX}
                      step={TIME_STEP}
                      pickerSubtitle={`${PLATFORM_LABEL[activePlatform]} · Mon–Fri`}
                      onChange={(weekdayMinutes) =>
                        setVm((p) => ({
                          ...p,
                          timeBudget: {
                            ...p.timeBudget,
                            perPlatform: {
                              ...p.timeBudget.perPlatform,
                              [activePlatform]: {
                                ...(p.timeBudget.perPlatform[activePlatform] ?? {
                                  limitMode: 'custom',
                                  sameMinutes: p.timeBudget.globalSameMinutes,
                                  weekdayMinutes,
                                  weekendMinutes: p.timeBudget.globalWeekendMinutes,
                                }),
                                limitMode: 'custom',
                                weekdayMinutes,
                              },
                            },
                          },
                        }))
                      }
                    />
                    <Text style={styles.miniHint}>Weekend</Text>
                    <Stepper
                      value={vm.timeBudget.perPlatform[activePlatform]?.weekendMinutes ?? vm.timeBudget.globalWeekendMinutes}
                      min={0}
                      max={TIME_MAX}
                      step={TIME_STEP}
                      pickerSubtitle={`${PLATFORM_LABEL[activePlatform]} · weekend`}
                      onChange={(weekendMinutes) =>
                        setVm((p) => ({
                          ...p,
                          timeBudget: {
                            ...p.timeBudget,
                            perPlatform: {
                              ...p.timeBudget.perPlatform,
                              [activePlatform]: {
                                ...(p.timeBudget.perPlatform[activePlatform] ?? {
                                  limitMode: 'custom',
                                  sameMinutes: p.timeBudget.globalSameMinutes,
                                  weekdayMinutes: p.timeBudget.globalWeekdayMinutes,
                                  weekendMinutes,
                                }),
                                limitMode: 'custom',
                                weekendMinutes,
                              },
                            },
                          },
                        }))
                      }
                    />
                  </>
                )
              ) : null}
            </View>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(150).springify()}>
            <Text style={styles.sectionLabel}>GLOBAL VIDEO FILTERS</Text>
            <View style={styles.card}>
              {(Object.keys(FILTER_LABELS) as (keyof VideoFilterSettings)[]).map((field) => (
                <PickerRow
                  key={field}
                  label={FILTER_LABELS[field]}
                  field={field}
                  value={vm[field]}
                  onChange={(v) => updateFilter(field, v)}
                />
              ))}
              <Text style={pickerStyles.label}>Visual style & pacing</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={pickerStyles.options}>
                {CARTOON_OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt.value}
                    style={[pickerStyles.option, vm.cartoonStyle === opt.value && pickerStyles.optionActive]}
                    onPress={() => setVm((p) => ({ ...p, cartoonStyle: opt.value }))}
                  >
                    <Text
                      style={[pickerStyles.optionText, vm.cartoonStyle === opt.value && pickerStyles.optionTextActive]}
                    >
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(170).springify()}>
            <Text style={styles.sectionLabel}>LEARNING NUDGES</Text>
            <View style={styles.card}>
              <View style={styles.toggleRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.toggleTitle}>Conversation prompts</Text>
                  <Text style={styles.toggleDesc}>Suggest quick chats after watching (UI rollout).</Text>
                </View>
                <Switch
                  value={vm.learningNudges.discussAfterWatch}
                  onValueChange={(discussAfterWatch) =>
                    setVm((p) => ({ ...p, learningNudges: { ...p.learningNudges, discussAfterWatch } }))
                  }
                  trackColor={{ false: '#D1D5DB', true: COLORS.parent.primary }}
                  thumbColor="#FFFFFF"
                />
              </View>
              <View style={[styles.toggleRow, styles.toggleRowSpaced]}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.toggleTitle}>Focus session hints</Text>
                  <Text style={styles.toggleDesc}>Gentle reminders for homework-before-scroll routines.</Text>
                </View>
                <Switch
                  value={vm.learningNudges.focusSessionHints}
                  onValueChange={(focusSessionHints) =>
                    setVm((p) => ({ ...p, learningNudges: { ...p.learningNudges, focusSessionHints } }))
                  }
                  trackColor={{ false: '#D1D5DB', true: COLORS.parent.primary }}
                  thumbColor="#FFFFFF"
                />
              </View>
              <View style={[styles.toggleRow, styles.toggleRowSpaced]}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.toggleTitle}>Celebrate reflection</Text>
                  <Text style={styles.toggleDesc}>Kids tap what they learned before the next clip.</Text>
                </View>
                <Switch
                  value={vm.learningNudges.rewardReflectionPrompt}
                  onValueChange={(rewardReflectionPrompt) =>
                    setVm((p) => ({ ...p, learningNudges: { ...p.learningNudges, rewardReflectionPrompt } }))
                  }
                  trackColor={{ false: '#D1D5DB', true: COLORS.parent.primary }}
                  thumbColor="#FFFFFF"
                />
              </View>
            </View>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(190).springify()}>
            <Text style={styles.sectionLabel}>CUSTOM VIDEO URLS</Text>
            <View style={styles.card}>
              <View style={styles.inputRow}>
                <TextInput
                  style={styles.urlInput}
                  value={urlInput}
                  onChangeText={setUrlInput}
                  placeholder="https://youtube.com/watch?v=..."
                  placeholderTextColor={COLORS.parent.textMuted}
                  autoCapitalize="none"
                  keyboardType="url"
                  onSubmitEditing={handleAddUrl}
                  returnKeyType="done"
                />
                <TouchableOpacity style={styles.addBtn} onPress={handleAddUrl}>
                  <Text style={styles.addBtnText}>Add</Text>
                </TouchableOpacity>
              </View>
              {vm.customUrls.length === 0 ? (
                <Text style={styles.emptyText}>No URLs yet — add playlists or single videos you trust.</Text>
              ) : (
                vm.customUrls.map((url, i) => (
                  <View key={`${url}-${i}`} style={styles.urlRow}>
                    <Text style={styles.urlText} numberOfLines={1}>
                      {url}
                    </Text>
                    <TouchableOpacity style={styles.removeButton} onPress={() => setVm((p) => ({ ...p, customUrls: p.customUrls.filter((_, j) => j !== i) }))}>
                      <Text style={styles.removeIcon}>×</Text>
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </View>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(210).springify()}>
            <Text style={styles.sectionLabel}>YOUTUBE BLOCK LIST</Text>
            <View style={styles.card}>
              <Text style={styles.cardLead}>
                Search with your server YouTube key, or paste ids manually. Removing an entry unblocks again.
              </Text>
              <View style={styles.inheritRow}>
                <TouchableOpacity
                  style={[styles.miniChip, youtubeSearchTab === 'channel' && styles.miniChipOn]}
                  onPress={() => setYoutubeSearchTab('channel')}
                >
                  <Text style={[styles.miniChipText, youtubeSearchTab === 'channel' && styles.miniChipTextOn]}>Channels</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.miniChip, youtubeSearchTab === 'video' && styles.miniChipOn]}
                  onPress={() => setYoutubeSearchTab('video')}
                >
                  <Text style={[styles.miniChipText, youtubeSearchTab === 'video' && styles.miniChipTextOn]}>Videos</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.inputRow}>
                <TextInput
                  style={styles.urlInput}
                  value={youtubeSearchQuery}
                  onChangeText={setYoutubeSearchQuery}
                  placeholder={`Search ${youtubeSearchTab === 'channel' ? 'channels' : 'videos'}…`}
                  placeholderTextColor={COLORS.parent.textMuted}
                  autoCapitalize="none"
                  onSubmitEditing={() => void runYoutubeSearch()}
                  returnKeyType="search"
                />
                <TouchableOpacity style={styles.addBtn} onPress={() => void runYoutubeSearch()} disabled={youtubeSearching}>
                  {youtubeSearching ? <ActivityIndicator color="#FFF" /> : <Text style={styles.addBtnText}>Search</Text>}
                </TouchableOpacity>
              </View>
              {youtubeHits.length > 0 ? (
                <View style={styles.hitList}>
                  {youtubeHits.slice(0, 8).map((row) => (
                    <View key={`${youtubeSearchTab}-${row.id}`} style={styles.hitRow}>
                      {row.thumbnail ? <Image source={{ uri: row.thumbnail }} style={styles.hitThumb} /> : <View style={styles.hitThumbPh} />}
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={styles.hitTitle} numberOfLines={2}>
                          {row.title}
                        </Text>
                        {row.channelTitle ? (
                          <Text style={styles.hitSub} numberOfLines={1}>
                            {row.channelTitle}
                          </Text>
                        ) : null}
                      </View>
                      <TouchableOpacity style={styles.blockHitBtn} onPress={() => addBlockedFromSearch(row)}>
                        <Text style={styles.blockHitBtnText}>Block</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              ) : null}

              <Text style={[styles.cardTitleMuted, { marginTop: SPACING[3] }]}>Paste video or channel link</Text>
              <View style={styles.inputRow}>
                <TextInput
                  style={styles.urlInput}
                  value={manualBlockInput}
                  onChangeText={setManualBlockInput}
                  placeholder="Video URL, Shorts URL, or UC… channel id"
                  placeholderTextColor={COLORS.parent.textMuted}
                  autoCapitalize="none"
                  onSubmitEditing={handleManualBlockAdd}
                />
                <TouchableOpacity style={styles.addBtn} onPress={handleManualBlockAdd}>
                  <Text style={styles.addBtnText}>Add</Text>
                </TouchableOpacity>
              </View>

              {vm.youtubeBlocked.length === 0 ? (
                <Text style={styles.emptyText}>Nothing blocked yet — your filters still apply for in-app search.</Text>
              ) : (
                vm.youtubeBlocked.map((e, i) => (
                  <View key={`${e.kind}-${e.id}-${i}`} style={styles.blockedRow}>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={styles.blockedKind}>{e.kind === 'CHANNEL' ? 'Channel' : 'Video'}</Text>
                      <Text style={styles.blockedTitle} numberOfLines={2}>
                        {e.label}
                      </Text>
                      <Text style={styles.blockedId} numberOfLines={1}>
                        {e.id}
                      </Text>
                    </View>
                    <TouchableOpacity onPress={() => removeBlocked(i)} style={styles.unblockBtn}>
                      <Text style={styles.unblockBtnText}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </View>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(230).springify()}>
            <Text style={styles.sectionLabel}>PARENT CONTENT</Text>
            <View style={styles.card}>
              <Text style={styles.parentContentDesc}>Create a personal message or clip your child sees inside the app.</Text>
              <TouchableOpacity
                style={styles.parentContentButton}
                onPress={() => childId && router.push(`/(parent)/control-center/parent-content?childId=${childId}`)}
              >
                <Text style={styles.parentContentButtonText}>Open Parent Content →</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(250).springify()} style={styles.saveWrap}>
            <TouchableOpacity
              style={[styles.saveButton, (saving || loading || !hasSuccessfulLoad || !childId) && styles.saveButtonDisabled]}
              onPress={() => void handleSave()}
              disabled={saving || loading || !hasSuccessfulLoad || !childId}
            >
              {saving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.saveButtonText}>Save Settings</Text>}
            </TouchableOpacity>
          </Animated.View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, backgroundColor: 'transparent' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING[5],
    paddingVertical: SPACING[4],
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.parent.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.parent.surfaceBorder,
  },
  backIcon: { fontSize: 26, color: COLORS.parent.textPrimary, lineHeight: 30 },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 18,
    color: COLORS.parent.textPrimary,
  },
  headerSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: COLORS.parent.textMuted,
    marginTop: 2,
  },
  headerRight: { width: 40 },

  scroll: { paddingHorizontal: SPACING[5], paddingTop: SPACING[2] },

  heroCard: {
    backgroundColor: 'rgba(59,130,246,0.08)',
    borderRadius: 14,
    padding: SPACING[4],
    marginBottom: SPACING[4],
    borderWidth: 1,
    borderColor: 'rgba(59,130,246,0.2)',
  },
  heroTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 15,
    color: COLORS.parent.textPrimary,
    marginBottom: SPACING[2],
  },
  heroBody: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: COLORS.parent.textSecondary,
    lineHeight: 18,
  },
  infoBold: { fontFamily: 'Inter_600SemiBold', color: COLORS.parent.textPrimary },

  truthCard: {
    backgroundColor: 'rgba(92,61,46,0.06)',
    borderRadius: 14,
    padding: SPACING[4],
    marginBottom: SPACING[4],
    borderWidth: 1,
    borderColor: 'rgba(92,61,46,0.12)',
  },
  truthTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 13,
    color: COLORS.parent.textPrimary,
    marginBottom: SPACING[2],
  },
  truthBody: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: COLORS.parent.textSecondary,
    lineHeight: 17,
  },

  sectionLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    color: COLORS.parent.textMuted,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: SPACING[2],
    marginTop: SPACING[2],
  },

  card: {
    backgroundColor: COLORS.parent.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.parent.surfaceBorder,
    padding: SPACING[4],
    marginBottom: SPACING[4],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  cardLead: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: COLORS.parent.textSecondary,
    marginBottom: SPACING[2],
    lineHeight: 19,
  },
  cardTitleMuted: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    color: COLORS.parent.textSecondary,
    marginTop: SPACING[2],
  },
  microHint: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: COLORS.parent.textMuted,
    marginTop: SPACING[2],
    lineHeight: 17,
  },
  limitCaption: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: COLORS.parent.textMuted,
    textAlign: 'center',
    marginTop: SPACING[3],
  },

  tabRow: { flexDirection: 'row', gap: SPACING[2], marginBottom: SPACING[2], paddingRight: SPACING[2] },
  tabChip: {
    paddingHorizontal: SPACING[3],
    paddingVertical: SPACING[2],
    borderRadius: 999,
    backgroundColor: 'rgba(92,61,46,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(92,61,46,0.12)',
  },
  tabChipOn: {
    borderColor: COLORS.parent.primary,
    backgroundColor: 'rgba(59,130,246,0.12)',
  },
  tabChipText: { fontFamily: 'Inter_600SemiBold', fontSize: 13, color: COLORS.parent.textMuted },
  tabChipTextOn: { color: COLORS.parent.primary },

  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: SPACING[3] },
  toggleRowSpaced: { marginTop: SPACING[4] },
  toggleTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: COLORS.parent.textPrimary,
    marginBottom: 3,
  },
  toggleDesc: { fontFamily: 'Inter_400Regular', fontSize: 12, color: COLORS.parent.textMuted, lineHeight: 17 },

  inheritRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING[2], marginTop: SPACING[2] },
  miniChip: {
    paddingHorizontal: SPACING[3],
    paddingVertical: SPACING[1],
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(92,61,46,0.14)',
    backgroundColor: 'rgba(92,61,46,0.04)',
  },
  miniChipOn: { borderColor: COLORS.parent.primary, backgroundColor: 'rgba(59,130,246,0.1)' },
  miniChipText: { fontFamily: 'Inter_500Medium', fontSize: 12, color: COLORS.parent.textMuted },
  miniChipTextOn: { fontFamily: 'Inter_700Bold', color: COLORS.parent.primary },
  miniHint: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: COLORS.parent.textMuted,
    marginTop: SPACING[2],
    marginBottom: SPACING[1],
  },

  inputRow: { flexDirection: 'row', gap: SPACING[2], marginBottom: SPACING[3] },
  urlInput: {
    flex: 1,
    height: 44,
    backgroundColor: 'rgba(92,61,46,0.05)',
    borderRadius: 10,
    paddingHorizontal: SPACING[3],
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: COLORS.parent.textPrimary,
    borderWidth: 1,
    borderColor: 'rgba(92,61,46,0.1)',
  },
  addBtn: {
    height: 44,
    minWidth: 88,
    paddingHorizontal: SPACING[3],
    borderRadius: 10,
    backgroundColor: COLORS.parent.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnText: { fontFamily: 'Inter_600SemiBold', fontSize: 14, color: '#FFFFFF' },

  emptyText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: COLORS.parent.textMuted,
    textAlign: 'center',
    paddingVertical: SPACING[3],
    fontStyle: 'italic',
  },
  urlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING[3],
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(92,61,46,0.08)',
    gap: SPACING[2],
  },
  urlText: { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 12, color: COLORS.parent.textPrimary },
  removeButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(220,38,38,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeIcon: { fontSize: 18, color: COLORS.parent.danger, lineHeight: 22 },

  hitList: { marginTop: SPACING[2] },
  hitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
    paddingVertical: SPACING[2],
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(92,61,46,0.06)',
  },
  hitThumb: { width: 56, height: 56, borderRadius: 8, backgroundColor: 'rgba(92,61,46,0.06)' },
  hitThumbPh: { width: 56, height: 56, borderRadius: 8, backgroundColor: 'rgba(92,61,46,0.06)' },
  hitTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 13, color: COLORS.parent.textPrimary },
  hitSub: { fontFamily: 'Inter_400Regular', fontSize: 11, color: COLORS.parent.textMuted, marginTop: 2 },
  blockHitBtn: {
    paddingHorizontal: SPACING[3],
    paddingVertical: SPACING[2],
    borderRadius: 8,
    backgroundColor: 'rgba(220,38,38,0.12)',
  },
  blockHitBtnText: { fontFamily: 'Inter_600SemiBold', fontSize: 12, color: COLORS.parent.danger },

  blockedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
    paddingVertical: SPACING[3],
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(92,61,46,0.08)',
  },
  blockedKind: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 10,
    color: COLORS.parent.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  blockedTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 13, color: COLORS.parent.textPrimary, marginTop: 2 },
  blockedId: { fontFamily: 'Inter_400Regular', fontSize: 11, color: COLORS.parent.textMuted, marginTop: 2 },
  unblockBtn: { paddingVertical: SPACING[2], paddingHorizontal: SPACING[2] },
  unblockBtnText: { fontFamily: 'Inter_600SemiBold', fontSize: 13, color: COLORS.parent.primary },

  parentContentDesc: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: COLORS.parent.textSecondary,
    lineHeight: 20,
    marginBottom: SPACING[3],
  },
  parentContentButton: {
    backgroundColor: 'rgba(59,130,246,0.08)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(59,130,246,0.2)',
    paddingVertical: SPACING[3],
    paddingHorizontal: SPACING[4],
    alignItems: 'center',
  },
  parentContentButtonText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: COLORS.parent.primary,
  },

  saveWrap: { marginTop: SPACING[2] },
  saveButton: {
    backgroundColor: COLORS.parent.primary,
    borderRadius: 14,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.parent.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  saveButtonDisabled: { opacity: 0.7 },
  saveButtonText: { fontFamily: 'Inter_700Bold', fontSize: 16, color: '#FFFFFF' },
});
