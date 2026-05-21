/**
 * Parent Control Center — the new post-login landing page for parents.
 * Shows: greeting, live clock, kid selector bar, Switch to Kid Mode CTA, feature cards.
 */
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
  Dimensions,
} from 'react-native';

const QUICK_TILE_W = Math.floor((Dimensions.get('window').width - 40) / 2.22);
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  FadeInDown,
  FadeInRight,
  Easing,
  Extrapolation,
  interpolate,
  interpolateColor,
  type SharedValue,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
  withDelay,
} from 'react-native-reanimated';
import { router, useFocusEffect, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Line, Defs, ClipPath, Rect as SvgRect } from 'react-native-svg';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../../src/store/auth.store';
import { useFamilyStore } from '../../../src/store/family.store';
import { apiClient } from '../../../src/services/api.client';
import { API_ENDPOINTS } from '../../../src/constants/api';
import { COLORS } from '../../../src/constants/colors';
import type {
  ChildDashboardCard,
  FamilyDashboard,
  PairedDeviceSummary,
} from '@parentingmykid/shared-types';
import { SPACING } from '../../../src/constants/spacing';
import { setKidModeActive, stopVpn } from '../../../modules/parental-control/src/index';
import { buildParentDevicePermissionDefinitions } from '../../../src/services/parentDevicePermissions.definitions';
import { useParentDevicePermissionStatus } from '../../../src/hooks/useParentDevicePermissionStatus';
import { useTimeOfDayTheme } from '../../../src/utils/timeOfDayTheme';
import { useWeatherCondition } from '../../../src/utils/weatherCondition';
import { RainOverlay, SnowOverlay } from '../../../src/components/parent/WeatherOverlay';
import { useAllKidsPresence } from '../../../src/hooks/useFamilyKidPresence';
import * as Device from 'expo-device';

/** LinearGradient wrapped once so Reanimated can drive its style (animated border color). */
const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);

const FEATURE_CARDS = [
  {
    id: 'block-apps',
    emoji: '🚫',
    title: 'Block Apps',
    desc: 'Control which apps kids can use',
    gradient: ['#FF7A70', '#FF9B6F'] as const,
  },
  {
    id: 'website-blocker',
    emoji: '🌐',
    title: 'Website Blocker',
    desc: 'Filter websites & browsing',
    gradient: ['#F8BF4A', '#F5D66D'] as const,
  },
  {
    id: 'watch-limit',
    emoji: '⏱️',
    title: 'Watch Limit',
    desc: 'Daily screen time controls',
    gradient: ['#5DA8FF', '#62C9FF'] as const,
  },
  {
    id: 'game-settings',
    emoji: '🎮',
    title: 'Game Settings',
    desc: 'Manage gaming access',
    gradient: ['#9E7CFF', '#C190FF'] as const,
  },
  {
    id: 'video-manager',
    emoji: '📹',
    title: 'Video Manager',
    desc: 'Curate what kids watch',
    gradient: ['#37D4B0', '#4DC7E8'] as const,
  },
  {
    id: 'app-guard',
    emoji: '🛡️',
    title: 'App Guard',
    desc: 'Keep kids in the app',
    gradient: ['#58B8FF', '#6F9CFF'] as const,
  },
  {
    id: 'stop-internet',
    emoji: '📵',
    title: 'Stop Internet',
    desc: 'Pause internet access',
    gradient: ['#FF79B6', '#FF8B98'] as const,
  },
  {
    id: 'network-lock',
    emoji: '📡',
    title: 'Network Lock',
    desc: 'Block Wi-Fi & data toggles in Kid Mode',
    gradient: ['#7E8BFF', '#A587FF'] as const,
  },
  {
    id: 'troubleshoot',
    emoji: '🔧',
    title: 'Troubleshoot',
    desc: 'Fix permission issues',
    gradient: ['#9CA3AF', '#6B7280'] as const,
  },
];

function formatRelativeTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 2) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return 'Yesterday';
  return `${days}d ago`;
}

/**
 * Kid Mode is usually on the parent's phone — prefer merged activity timestamps + today's usage flag.
 */
function resolveKidHandoffActivity(
  kid: ChildDashboardCard,
  pairedForKid: PairedDeviceSummary[],
  parentPhoneName: string,
): {
  labelLine: string;
  deviceLine: string;
  lastAtIso: string | undefined;
  isLive: boolean;
  /** Right-side text when we know they used the app today but have no precise ISO yet */
  timeFallback: string;
  hintMode: boolean;
} {
  const first = kid.name.trim().split(/\s+/)[0] ?? kid.name;
  let mergedTs = kid.lastDeviceActivityAt ? new Date(kid.lastDeviceActivityAt).getTime() : 0;
  const hasUsageSignal = mergedTs > 0 || kid.hasScreenUsageToday;

  const LIVE_MS = 5 * 60 * 1000;
  const DRIFT_MS = 5 * 60 * 1000;

  const sortedPaired = [...pairedForKid].sort((a, b) =>
    (b.lastActiveAt ?? '').localeCompare(a.lastActiveAt ?? ''),
  );
  const top = sortedPaired[0];
  const pairedTs = top?.lastActiveAt ? new Date(top.lastActiveAt).getTime() : 0;

  let deviceLine: string;
  let hintMode = false;
  let timeFallback = '';

  if (mergedTs > 0) {
    if (!top || mergedTs > pairedTs + DRIFT_MS) {
      deviceLine = parentPhoneName;
    } else {
      deviceLine = (top.deviceName && top.deviceName.trim()) || parentPhoneName;
    }
  } else if (kid.hasScreenUsageToday) {
    deviceLine = parentPhoneName;
    timeFallback = 'Today';
  } else {
    hintMode = true;
    deviceLine = `First switch to Kid Mode below, then choose ${first}.`;
  }

  const isLive = mergedTs > 0 && Date.now() - mergedTs < LIVE_MS;

  let labelLine: string;
  if (isLive) {
    labelLine = `${first} · active now`;
  } else if (hasUsageSignal) {
    labelLine = `${first} last logged in`;
  } else {
    labelLine = `Ready for ${first}?`;
  }

  return {
    labelLine,
    deviceLine,
    lastAtIso: mergedTs > 0 ? kid.lastDeviceActivityAt : undefined,
    isLive,
    timeFallback,
    hintMode,
  };
}

/** Avoid Android hyphenating long words inside quick-strip titles (e.g. "Per…missions"). */
const quickStripTitleAndroidProps =
  Platform.OS === 'android' ? ({ android_hyphenationFrequency: 'none' } as const) : {};

const PERM_TITLE_BASE = '#8B1A3A';
const PERM_TITLE_BRIGHT = '#C52852';
const PERM_META_BASE = 'rgba(139,26,58,0.72)';
const PERM_META_BRIGHT = 'rgba(197,40,82,0.95)';
const PERM_BORDER_IDLE = 'rgba(255,255,255,0.8)';
const PERM_BORDER_RED = 'rgba(200, 35, 55, 1)';

function permissionBurstBorderStyle(t: number) {
  'worklet';
  const b1 = interpolate(t, [0.025, 0.058, 0.09], [0, 1, 0], Extrapolation.CLAMP);
  const b2 = interpolate(t, [0.105, 0.138, 0.17], [0, 1, 0], Extrapolation.CLAMP);
  return Math.max(b1, b2);
}

/** Two red border flashes while the text block is in the shake phase (t >= 0.2). */
function permissionShakeRedBorderPulse(t: number) {
  'worklet';
  if (t < 0.2) return 0;
  const u = (t - 0.2) / 0.8;
  const r1 = interpolate(u, [0.02, 0.055, 0.09], [0, 1, 0], Extrapolation.CLAMP);
  const r2 = interpolate(u, [0.13, 0.165, 0.2], [0, 1, 0], Extrapolation.CLAMP);
  return Math.max(r1, r2);
}

/**
 * Two quick color “blinks” on the copy, then a short nudge (left → down → up, right → down → up).
 * Driven by shared `burst` from the parent so the card border can sync.
 */
function DevicePermissionsAttentionTexts({
  burst,
  missingCount,
}: {
  burst: SharedValue<number>;
  missingCount: number;
}) {
  const titleAnim = useAnimatedStyle(() => {
    const v = permissionBurstBorderStyle(burst.value);
    return {
      color: interpolateColor(v, [0, 1], [PERM_TITLE_BASE, PERM_TITLE_BRIGHT]),
    };
  });

  const metaAnim = useAnimatedStyle(() => {
    const v = permissionBurstBorderStyle(burst.value);
    return {
      color: interpolateColor(v, [0, 1], [PERM_META_BASE, PERM_META_BRIGHT]),
    };
  });

  const shakeAnim = useAnimatedStyle(() => {
    const t = burst.value;
    let dx = 0;
    let dy = 0;
    if (t >= 0.2) {
      const u = (t - 0.2) / 0.8;
      if (u < 0.09) dx = interpolate(u, [0, 0.09], [0, -4.5]);
      else if (u < 0.2) {
        dx = -4.5;
        dy = interpolate(u, [0.09, 0.2], [0, 3.2]);
      } else if (u < 0.29) {
        dx = -4.5;
        dy = interpolate(u, [0.2, 0.29], [3.2, -0.7]);
      } else if (u < 0.38) {
        dx = interpolate(u, [0.29, 0.38], [-4.5, 0]);
        dy = interpolate(u, [0.29, 0.38], [-0.7, 0]);
      } else if (u < 0.47) dx = interpolate(u, [0.38, 0.47], [0, 4.5]);
      else if (u < 0.58) {
        dx = 4.5;
        dy = interpolate(u, [0.47, 0.58], [0, 3.2]);
      } else if (u < 0.67) {
        dx = 4.5;
        dy = interpolate(u, [0.58, 0.67], [3.2, -0.7]);
      } else if (u < 0.76) {
        dx = interpolate(u, [0.67, 0.76], [4.5, 0]);
        dy = interpolate(u, [0.67, 0.76], [-0.7, 0]);
      }
    }
    return {
      transform: [{ translateX: dx }, { translateY: dy }],
    };
  });

  return (
    <Animated.View style={shakeAnim}>
      <Animated.Text
        {...quickStripTitleAndroidProps}
        style={[styles.quickTileTitle, titleAnim]}
        numberOfLines={2}
      >
        Device{'\n'}Permissions
      </Animated.Text>
      <Animated.Text style={[styles.quickTileMeta, metaAnim]}>
        {missingCount === 1
          ? 'One left to enable for parental controls'
          : `${missingCount} left to enable for parental controls`}
      </Animated.Text>
    </Animated.View>
  );
}

function DevicePermissionsQuickStripCard({
  missingCount,
  onPress,
}: {
  missingCount: number;
  onPress: () => void;
}) {
  const burst = useSharedValue(0);

  useEffect(() => {
    burst.value = withRepeat(
      withSequence(
        withDelay(4000, withTiming(0, { duration: 0 })),
        withTiming(1, { duration: 980, easing: Easing.linear }),
        withTiming(0, { duration: 0 }),
      ),
      -1,
      false,
    );
  }, []);

  /**
   * Animate ONLY the gradient border color. Shadow stays on a plain outer View
   * (same structure as the other quick tiles) so the iOS drop shadow renders at
   * full strength instead of being weakened by a 1px translucent ring on the
   * shadow-casting layer.
   */
  const gradientBorderAnim = useAnimatedStyle(() => {
    const v = permissionShakeRedBorderPulse(burst.value);
    return {
      borderColor: interpolateColor(v, [0, 1], [PERM_BORDER_IDLE, PERM_BORDER_RED]),
    };
  });

  return (
    <View style={styles.quickTileShadowWrap}>
      <TouchableOpacity activeOpacity={1} onPress={onPress} style={styles.quickTileInner}>
        <AnimatedLinearGradient
          colors={['#FFE8ED', '#FFC9D6', '#FFB0C8']}
          locations={[0, 0.5, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.08, y: 1 }}
          style={[styles.quickTileGradient, gradientBorderAnim]}
        >
          <View
            style={[
              styles.quickTileArrowCircle,
              styles.quickTileArrowTopRight,
              { backgroundColor: 'rgba(139,26,58,0.18)', borderColor: 'rgba(139,26,58,0.28)' },
            ]}
          >
            <Ionicons name="arrow-forward" size={11} color="#6B1530" />
          </View>
          <DevicePermissionsAttentionTexts burst={burst} missingCount={missingCount} />
        </AnimatedLinearGradient>
      </TouchableOpacity>
    </View>
  );
}

function getMyKidsQuickStripCopy(kidCount: number) {
  if (kidCount === 0) {
    return { title: 'My Kids', meta: 'Add a child to get started' };
  }
  if (kidCount === 1) {
    return { title: 'My Kids', meta: '1 child · screen time & profile' };
  }
  return { title: 'My Kids', meta: `${kidCount} children · screen time & profiles` };
}

function getKidsLiveActivityQuickStripCopy(
  kids: ChildDashboardCard[],
  activeKid: ChildDashboardCard | undefined,
) {
  if (kids.length === 0) {
    return { meta: 'Add a kid to see live activity' };
  }
  if (!activeKid) {
    return {
      meta:
        kids.length === 1
          ? `See ${kids[0].name}'s live activity`
          : "See who's on their device now",
    };
  }
  if (activeKid.hasScreenUsageToday) {
    return { meta: `${activeKid.name} · on device now` };
  }
  return { meta: `${activeKid.name} · no activity yet today` };
}

function getYouTubeQuickStripCopy(
  kids: ChildDashboardCard[],
  activeKid: ChildDashboardCard | undefined,
) {
  if (kids.length === 0) {
    return { meta: 'Add a kid to manage videos & Shorts' };
  }
  if (activeKid) {
    return { meta: `Manage ${activeKid.name}'s videos & Shorts` };
  }
  return { meta: 'Manage videos & Shorts for you & kids' };
}

/** Shadow lives on outer wrapper; inner clips gradient so borders/shadows are not cut off. */
function QuickStripTile({ onPress, children }: { onPress: () => void; children: React.ReactNode }) {
  return (
    <View style={styles.quickTileShadowWrap}>
      <TouchableOpacity activeOpacity={1} onPress={onPress} style={styles.quickTileInner}>
        {children}
      </TouchableOpacity>
    </View>
  );
}

function FeatureCard({
  card,
  index,
  activeKidId,
  rowHeight,
  onMeasureRowHeight,
}: {
  card: (typeof FEATURE_CARDS)[0];
  index: number;
  activeKidId: string | null;
  rowHeight?: number;
  onMeasureRowHeight: (rowIndex: number, height: number) => void;
}) {
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
            Alert.alert(
              'No kid selected',
              'Please select a child first to configure this feature.',
            );
            return;
          }
          router.push(`/(parent)/control-center/${card.id}?childId=${activeKidId}`);
        }}
        onPressIn={() => {
          scale.value = withSpring(0.95);
        }}
        onPressOut={() => {
          scale.value = withSpring(1);
        }}
      >
        <LinearGradient
          colors={card.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.featureCard, rowHeight ? { height: rowHeight } : null]}
          onLayout={(e) => {
            onMeasureRowHeight(Math.floor(index / 2), e.nativeEvent.layout.height);
          }}
        >
          <View style={styles.featureEmojiWrap}>
            <Text style={styles.featureEmoji}>{card.emoji}</Text>
          </View>
          <View style={styles.featureTextBlock}>
            <Text style={styles.featureTitle} numberOfLines={1} adjustsFontSizeToFit>
              {card.title}
            </Text>
            <Text style={styles.featureDesc}>{card.desc}</Text>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function ControlCenterScreen() {
  const { user } = useAuthStore();
  const { activeFamilyId, dashboard, setDashboard, selectedChildId, selectChild } =
    useFamilyStore();
  const [featureRowHeights, setFeatureRowHeights] = useState<Record<number, number>>({});
  const pathname = usePathname();

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
    staleTime: 0,
    gcTime: 5 * 60_000,
  });

  const kids: ChildDashboardCard[] = dashboard?.children ?? [];
  const pairedDevices = dashboard?.pairedDevices ?? [];
  const activeKidId = selectedChildId;
  const activeKid = kids.find((k) => k.childId === activeKidId);

  // Live socket presence — updated in real-time without any API calls.
  // connectFamilyMonitor() is called globally from (parent)/_layout.tsx so this
  // hook just subscribes to the already-open connection.
  const kidPresenceMap = useAllKidsPresence(useMemo(() => kids.map((k) => k.childId), [kids]));
  const parentFirstName = (user?.name ?? 'You').split(' ')[0]?.trim() || 'You';
  const parentDeviceName = Device.deviceName ?? Device.modelName ?? 'This device';
  const myKidsQuickStrip = getMyKidsQuickStripCopy(kids.length);
  const kidsLiveActivityQuickStrip = getKidsLiveActivityQuickStripCopy(kids, activeKid);
  const youtubeQuickStrip = getYouTubeQuickStripCopy(kids, activeKid);
  const timeOfDay = useTimeOfDayTheme();
  const weather = useWeatherCondition();

  // Permission awareness (Android only) — memoize definitions so hook deps stay stable.
  const permDefs = useMemo(
    () =>
      buildParentDevicePermissionDefinitions({
        onAccessibilityHelp: () => {},
      }),
    [],
  );
  const { missingCount, loading: permLoading } = useParentDevicePermissionStatus(
    Platform.OS === 'android' ? permDefs : [],
  );
  const hasPermissionIssue = Platform.OS === 'android' && !permLoading && missingCount > 0;

  // Parent landing only — never tear down VPN while Kid Mode or category handoff is the active route.
  useFocusEffect(
    useCallback(() => {
      if (Platform.OS !== 'android') return;
      const p = pathname ?? '';
      if (p.includes('kid-mode') || p.includes('/category/')) return;
      if (!p.includes('control-center')) return;
      void (async () => {
        try {
          await setKidModeActive(false);
          await stopVpn();
        } catch {
          /* native module missing */
        }
      })();
    }, [pathname]),
  );

  return (
    <LinearGradient colors={timeOfDay.backgroundGradient} style={styles.container}>
      {/* Weather particle overlays — sit above the gradient, below all content */}
      {weather.kind === 'rain' && <RainOverlay />}
      {weather.kind === 'snow' && <SnowOverlay />}

      <SafeAreaView style={styles.safeArea} edges={[]}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          {/* Quick Action Strip */}
          <Animated.View
            entering={FadeInDown.delay(50).springify()}
            style={styles.quickStripSection}
          >
            <View style={styles.greetingRow}>
              {/* Sun / Moon icon with optional weather badge in bottom-right corner */}
              <View
                style={[styles.greetingIconWrap, { backgroundColor: `${timeOfDay.iconColor}22` }]}
              >
                <Ionicons name={timeOfDay.icon} size={20} color={timeOfDay.iconColor} />
                {weather.kind !== 'clear' && (
                  <View style={styles.weatherBadge}>
                    <Ionicons
                      name={weather.kind === 'rain' ? 'rainy' : 'snow'}
                      size={11}
                      color={weather.kind === 'rain' ? '#4A90C8' : '#7AB8D8'}
                    />
                  </View>
                )}
              </View>
              <Text style={styles.greeting} numberOfLines={1}>
                {`${timeOfDay.greeting}, ${(user?.name ?? 'Parent').split(' ')[0] ?? 'Parent'}`}
              </Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              removeClippedSubviews={false}
              style={styles.quickStripCarousel}
              contentContainerStyle={styles.quickStripScroll}
            >
              {/* 1 — Permissions (only when issues exist on Android) */}
              {hasPermissionIssue && (
                <DevicePermissionsQuickStripCard
                  missingCount={missingCount}
                  onPress={() => router.push('/(parent)/control-center/troubleshoot')}
                />
              )}

              {/* 2 — Kids */}
              <QuickStripTile
                onPress={() =>
                  kids.length === 0
                    ? router.push('/(parent)/family-space/add-child')
                    : router.push('/(parent)/family-space')
                }
              >
                <LinearGradient
                  colors={
                    kids.length === 0
                      ? ['#FFF6E5', '#FFE7B8', '#FFD070']
                      : ['#E8F1FF', '#CFE4FF', '#A4CCFF']
                  }
                  locations={[0, 0.5, 1]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0.08, y: 1 }}
                  style={styles.quickTileGradient}
                >
                  <View
                    style={[
                      styles.quickTileArrowCircle,
                      styles.quickTileArrowTopRight,
                      kids.length === 0
                        ? {
                            backgroundColor: 'rgba(122,80,0,0.18)',
                            borderColor: 'rgba(122,80,0,0.28)',
                          }
                        : {
                            backgroundColor: 'rgba(26,61,122,0.18)',
                            borderColor: 'rgba(26,61,122,0.28)',
                          },
                    ]}
                  >
                    <Ionicons
                      name="arrow-forward"
                      size={11}
                      color={kids.length === 0 ? '#5C3D00' : '#153060'}
                    />
                  </View>
                  <Text
                    {...quickStripTitleAndroidProps}
                    style={[
                      styles.quickTileTitle,
                      { color: kids.length === 0 ? '#7A5000' : '#1A3D7A' },
                    ]}
                    numberOfLines={2}
                  >
                    {myKidsQuickStrip.title}
                  </Text>
                  <Text
                    style={[
                      styles.quickTileMeta,
                      {
                        color: kids.length === 0 ? 'rgba(122,80,0,0.72)' : 'rgba(26,61,122,0.72)',
                      },
                    ]}
                  >
                    {myKidsQuickStrip.meta}
                  </Text>
                </LinearGradient>
              </QuickStripTile>

              {/* 3 — Kids live activity */}
              <QuickStripTile
                onPress={() =>
                  activeKidId
                    ? router.push(`/(parent)/control-center/kid-activity?childId=${activeKidId}`)
                    : router.push(
                        `/(parent)/control-center/kid-activity?childId=${kids[0]?.childId ?? ''}`,
                      )
                }
              >
                <LinearGradient
                  colors={['#DDF9F1', '#C5F0E6', '#8EE4D0']}
                  locations={[0, 0.5, 1]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0.08, y: 1 }}
                  style={styles.quickTileGradient}
                >
                  <View
                    style={[
                      styles.quickTileArrowCircle,
                      styles.quickTileArrowTopRight,
                      {
                        backgroundColor: 'rgba(13,80,64,0.18)',
                        borderColor: 'rgba(13,80,64,0.28)',
                      },
                    ]}
                  >
                    <Ionicons name="arrow-forward" size={11} color="#08352A" />
                  </View>
                  <Text
                    {...quickStripTitleAndroidProps}
                    style={[styles.quickTileTitle, { color: '#0D5040' }]}
                    numberOfLines={2}
                  >
                    My Kids{'\n'}Activity · Live
                  </Text>
                  <Text style={[styles.quickTileMeta, { color: 'rgba(13,80,64,0.72)' }]}>
                    {kidsLiveActivityQuickStrip.meta}
                  </Text>
                </LinearGradient>
              </QuickStripTile>

              {/* 4 — YouTube */}
              <QuickStripTile
                onPress={() =>
                  activeKidId
                    ? router.push(`/(parent)/control-center/video-manager?childId=${activeKidId}`)
                    : Alert.alert('Select a kid', 'Tap a kid profile first, then manage YouTube.')
                }
              >
                <LinearGradient
                  colors={['#FFEEE4', '#FFD8C4', '#FFC0A8']}
                  locations={[0, 0.5, 1]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0.08, y: 1 }}
                  style={styles.quickTileGradient}
                >
                  <View
                    style={[
                      styles.quickTileArrowCircle,
                      styles.quickTileArrowTopRight,
                      {
                        backgroundColor: 'rgba(122,44,10,0.18)',
                        borderColor: 'rgba(122,44,10,0.28)',
                      },
                    ]}
                  >
                    <Ionicons name="arrow-forward" size={11} color="#5C2108" />
                  </View>
                  <Text
                    {...quickStripTitleAndroidProps}
                    style={[styles.quickTileTitle, { color: '#7A2C0A' }]}
                    numberOfLines={2}
                  >
                    YouTube
                  </Text>
                  <Text style={[styles.quickTileMeta, { color: 'rgba(122,44,10,0.72)' }]}>
                    {youtubeQuickStrip.meta}
                  </Text>
                </LinearGradient>
              </QuickStripTile>

              {/* 5 — Your Devices */}
              <QuickStripTile onPress={() => router.push('/(parent)/settings/add-device')}>
                <LinearGradient
                  colors={['#EDE8FF', '#DED4FF', '#BEB2FF']}
                  locations={[0, 0.5, 1]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0.08, y: 1 }}
                  style={styles.quickTileGradient}
                >
                  <View
                    style={[
                      styles.quickTileArrowCircle,
                      styles.quickTileArrowTopRight,
                      {
                        backgroundColor: 'rgba(46,24,128,0.18)',
                        borderColor: 'rgba(46,24,128,0.28)',
                      },
                    ]}
                  >
                    <Ionicons name="arrow-forward" size={11} color="#1E1060" />
                  </View>
                  <Text
                    {...quickStripTitleAndroidProps}
                    style={[styles.quickTileTitle, { color: '#2E1880' }]}
                    numberOfLines={2}
                  >
                    Your Devices
                  </Text>
                  <Text style={[styles.quickTileMeta, { color: 'rgba(46,24,128,0.72)' }]}>
                    Usage & track your devices
                  </Text>
                </LinearGradient>
              </QuickStripTile>

              {/* 6 — Parenting Tips */}
              <QuickStripTile
                onPress={() => router.push('/(parent)/control-center/parent-content')}
              >
                <LinearGradient
                  colors={['#F4E8FF', '#E8D2FF', '#D4AEFF']}
                  locations={[0, 0.5, 1]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0.08, y: 1 }}
                  style={styles.quickTileGradient}
                >
                  <View
                    style={[
                      styles.quickTileArrowCircle,
                      styles.quickTileArrowTopRight,
                      {
                        backgroundColor: 'rgba(80,15,122,0.18)',
                        borderColor: 'rgba(80,15,122,0.28)',
                      },
                    ]}
                  >
                    <Ionicons name="arrow-forward" size={11} color="#3D0C5E" />
                  </View>
                  <Text
                    {...quickStripTitleAndroidProps}
                    style={[styles.quickTileTitle, { color: '#500F7A' }]}
                    numberOfLines={2}
                  >
                    Parenting Tips
                  </Text>
                  <Text style={[styles.quickTileMeta, { color: 'rgba(80,15,122,0.72)' }]}>
                    Daily tips picked for you
                  </Text>
                </LinearGradient>
              </QuickStripTile>
            </ScrollView>
          </Animated.View>

          {/* Kid Selector Bar */}
          <Animated.View entering={FadeInDown.delay(150).springify()} style={styles.kidBar}>
            {/* Unified card — header + connector + chips as one premium unit */}
            <View style={styles.kidBarCard}>
              {/* Gradient header */}
              <LinearGradient
                colors={['#3B82F6', '#6366F1']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.kidBarHeaderGradient}
              >
                {/* Diagonal stripes */}
                <Svg
                  style={StyleSheet.absoluteFill}
                  width="100%"
                  height="100%"
                  viewBox="0 0 300 72"
                  preserveAspectRatio="xMaxYMid slice"
                >
                  <Defs>
                    <ClipPath id="cardClip">
                      <SvgRect x="0" y="0" width="300" height="72" rx="0" />
                    </ClipPath>
                  </Defs>
                  {Array.from({ length: 14 }).map((_, i) => (
                    <Line
                      key={i}
                      x1={i * 24 - 20}
                      y1={-10}
                      x2={i * 24 + 50}
                      y2={90}
                      stroke="rgba(255,255,255,0.07)"
                      strokeWidth="10"
                      clipPath="url(#cardClip)"
                    />
                  ))}
                </Svg>

                <View style={styles.kidBarIconCircle}>
                  <Ionicons name="people" size={18} color="#3B82F6" />
                </View>

                <View style={styles.kidBarHeaderText}>
                  <Text style={styles.kidBarTitle}>Choose who to control</Text>
                  <Text style={styles.kidBarSubtitle}>Your profile or one of your kids</Text>
                </View>

                <Ionicons name="chevron-down" size={16} color="rgba(255,255,255,0.45)" />
              </LinearGradient>

              {/* Connector thread */}
              <View style={styles.kidBarConnector}>
                <View style={styles.kidBarConnectorLine} />
                <View style={styles.kidBarConnectorDot} />
              </View>

              {/* Chips row — sits inside the same card surface */}
              <View style={styles.kidBarChipsWrap}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.kidBarScroll}
            >
              {/* Parent profile — same chip pattern as kids (first name, not "Myself"). */}
              <TouchableOpacity
                style={[styles.kidChip, activeKidId === null && styles.kidChipActive]}
                onPress={() => selectChild(null)}
              >
                <View style={[styles.kidAvatar, activeKidId === null && styles.kidAvatarActive]}>
                  <Text style={styles.kidAvatarText}>{(user?.name?.[0] ?? 'Y').toUpperCase()}</Text>
                </View>
                <Text
                  style={[styles.kidChipText, activeKidId === null && styles.kidChipTextActive]}
                >
                  {parentFirstName}
                </Text>
              </TouchableOpacity>

              {kids.map((kid) => (
                <TouchableOpacity
                  key={kid.childId}
                  style={[styles.kidChip, activeKidId === kid.childId && styles.kidChipActive]}
                  onPress={() => selectChild(kid.childId)}
                >
                  <View
                    style={[
                      styles.kidAvatar,
                      activeKidId === kid.childId && styles.kidAvatarActive,
                    ]}
                  >
                    <Text style={styles.kidAvatarText}>{kid.name?.[0]?.toUpperCase()}</Text>
                  </View>
                  <Text
                    style={[
                      styles.kidChipText,
                      activeKidId === kid.childId && styles.kidChipTextActive,
                    ]}
                  >
                    {kid.name}
                  </Text>
                </TouchableOpacity>
              ))}

              {/* Add Kid button */}
              <TouchableOpacity
                style={styles.addKidChip}
                onPress={() => router.push('/(parent)/family-space/add-child')}
              >
                <Text style={styles.addKidChipText}>+ Add Kid</Text>
              </TouchableOpacity>
            </ScrollView>
              </View>{/* kidBarChipsWrap */}

              {/* Device status panel */}
              <View style={styles.deviceStatusWrap}>
                <View style={styles.deviceStatusDivider} />
                {activeKidId === null ? (
                  /* ── Parent selected: show their current device ── */
                  <View style={styles.deviceStatusRow}>
                    <View style={[styles.deviceStatusDot, styles.deviceStatusDotParent]} />
                    <View style={styles.deviceStatusInfo}>
                      <Text style={styles.deviceStatusLabelParent}>Active on</Text>
                      <Text style={styles.deviceStatusNameParent} numberOfLines={1}>
                        {parentDeviceName}
                      </Text>
                    </View>
                    <View style={[styles.deviceStatusBadge, styles.deviceStatusBadgeGreen]}>
                      <View style={styles.deviceStatusLiveDotGreen} />
                      <Text style={[styles.deviceStatusBadgeText, styles.deviceStatusBadgeTextGreen]}>
                        Active now
                      </Text>
                    </View>
                  </View>
                ) : activeKid ? (
                  (() => {
                    const kidDevices = pairedDevices.filter(
                      (d) => String(d.childId) === String(activeKidId),
                    );
                    const act = resolveKidHandoffActivity(activeKid, kidDevices, parentDeviceName);

                    // Override with live socket presence — the kid's device emits kid:online
                    // immediately when they enter Kid Mode, so we can show "active now" even
                    // before the REST dashboard has been refreshed.
                    const socketOnline = Boolean(kidPresenceMap[String(activeKidId)]?.isOnline);
                    const firstName = activeKid.name.trim().split(/\s+/)[0] ?? activeKid.name;
                    const effectiveAct = socketOnline && !act.isLive
                      ? {
                          ...act,
                          isLive: true,
                          hintMode: false,
                          labelLine: `${firstName} · active now`,
                          deviceLine: (() => {
                            const top = [...kidDevices].sort(
                              (a, b) => (b.lastActiveAt ?? '').localeCompare(a.lastActiveAt ?? ''),
                            )[0];
                            return top?.deviceName?.trim() || act.deviceLine;
                          })(),
                        }
                      : act;

                    const rel = formatRelativeTime(effectiveAct.lastAtIso);
                    const rightWhenIdle = !effectiveAct.isLive && (rel.length > 0 ? rel : effectiveAct.timeFallback);
                    return (
                      <View style={styles.deviceStatusRow}>
                        {effectiveAct.isLive ? (
                          <View style={[styles.deviceStatusDot, styles.deviceStatusDotActive]} />
                        ) : (
                          <View style={[styles.deviceStatusDot, styles.deviceStatusDotIdle]} />
                        )}
                        <View style={styles.deviceStatusInfo}>
                          <Text
                            style={
                              effectiveAct.hintMode
                                ? styles.deviceStatusLabelKidHint
                                : effectiveAct.isLive
                                  ? styles.deviceStatusLabelKidLive
                                  : styles.deviceStatusLabelKidIdle
                            }
                          >
                            {effectiveAct.labelLine}
                          </Text>
                          <Text
                            style={
                              effectiveAct.hintMode
                                ? styles.deviceStatusHint
                                : effectiveAct.isLive
                                  ? styles.deviceStatusNameKidLive
                                  : styles.deviceStatusNameKidIdle
                            }
                            numberOfLines={effectiveAct.hintMode ? 3 : 2}
                          >
                            {effectiveAct.deviceLine}
                          </Text>
                        </View>
                        {effectiveAct.isLive ? (
                          <View style={[styles.deviceStatusBadge, styles.deviceStatusBadgeGreen]}>
                            <View style={styles.deviceStatusLiveDotGreen} />
                            <Text
                              style={[styles.deviceStatusBadgeText, styles.deviceStatusBadgeTextGreen]}
                            >
                              Active now
                            </Text>
                          </View>
                        ) : rightWhenIdle ? (
                          <Text style={styles.deviceStatusTimeKidIdle}>{rightWhenIdle}</Text>
                        ) : null}
                      </View>
                    );
                  })()
                ) : null}
              </View>
            </View>{/* kidBarCard */}
          </Animated.View>

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
                  <View style={styles.kidModeTextBlock}>
                    <Text style={styles.kidModeTitle}>Kid Mode</Text>
                    <Text style={styles.kidModeDesc} numberOfLines={2}>
                      Handing device to {activeKid.name}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  activeOpacity={0.88}
                  style={styles.kidModeButton}
                  onPress={() =>
                    router.push(`/(parent)/control-center/kid-mode?childId=${activeKidId}`)
                  }
                >
                  <Text style={styles.kidModeButtonText}>Switch</Text>
                  <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
                </TouchableOpacity>
              </LinearGradient>
            </Animated.View>
          )}

          {/* View Kid Activity */}
          {activeKid && (
            <Animated.View entering={FadeInDown.delay(240).springify()} style={styles.activityRow}>
              <TouchableOpacity
                style={styles.activityButton}
                onPress={() =>
                  router.push(`/(parent)/control-center/kid-activity?childId=${activeKidId}`)
                }
              >
                <Text style={styles.activityButtonEmoji}>📊</Text>
                <Text style={styles.activityButtonText}>View {activeKid.name}'s Activity</Text>
                <Text style={styles.activityArrow}>›</Text>
              </TouchableOpacity>
            </Animated.View>
          )}

          {/* Parental Controls Grid */}
          <Animated.View entering={FadeInDown.delay(260)}>
            <Text style={styles.sectionTitle}>
              {activeKidId === null ? 'Control My Apps & Internet' : 'Parental Controls'}
            </Text>
          </Animated.View>

          <View style={styles.featureGrid}>
            {FEATURE_CARDS.map((card, i) => (
              <FeatureCard
                key={card.id}
                card={card}
                index={i}
                activeKidId={activeKidId}
                rowHeight={featureRowHeights[Math.floor(i / 2)]}
                onMeasureRowHeight={(rowIndex, height) => {
                  setFeatureRowHeights((prev) => {
                    const current = prev[rowIndex] ?? 0;
                    // keep per-row max only, no cross-row coupling
                    if (height <= current + 0.5) return prev;
                    return { ...prev, [rowIndex]: height };
                  });
                }}
              />
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
  scroll: { paddingHorizontal: SPACING[5], paddingTop: SPACING[3] },
  quickStripSection: {
    marginBottom: SPACING[2],
    overflow: 'visible',
  },
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
    marginBottom: SPACING[2],
  },
  greetingIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weatherBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.88)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0.5,
    borderColor: 'rgba(0,0,0,0.08)',
  },
  greeting: {
    flex: 1,
    fontFamily: 'Inter_700Bold',
    fontSize: 18,
    color: COLORS.parent.textPrimary,
    letterSpacing: -0.2,
  },
  /** Bleeds into horizontal screen padding so tile shadows/borders aren’t clipped; inner padding matches so the first card lines up with the greeting. */
  quickStripCarousel: {
    marginHorizontal: -SPACING[4],
  },
  quickStripScroll: {
    gap: SPACING[3],
    paddingTop: SPACING[2],
    paddingBottom: SPACING[4],
    paddingHorizontal: SPACING[4],
  },
  quickTileShadowWrap: {
    width: QUICK_TILE_W,
    borderRadius: 20,
    backgroundColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.11,
    shadowRadius: 10,
    elevation: 5,
  },
  quickTileInner: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  quickTileGradient: {
    paddingTop: 14,
    paddingBottom: 12,
    paddingHorizontal: 14,
    minHeight: 102,
    justifyContent: 'flex-start',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.8)',
    overflow: 'hidden',
  },
  quickTileArrowTopRight: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 2,
  },
  quickTileArrowCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  quickTileTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 12,
    letterSpacing: -0.25,
    lineHeight: 16,
    paddingRight: 38,
    flexShrink: 1,
  },
  quickTileMeta: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    marginTop: 5,
    letterSpacing: 0.1,
    lineHeight: 15,
  },

  kidBar: { marginBottom: SPACING[5] },
  /** Single card that wraps header + connector + chips */
  kidBarCard: {
    borderRadius: 20,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(59,130,246,0.18)',
    overflow: 'hidden',
  },
  kidBarHeaderGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[3],
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  kidBarIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  kidBarHeaderText: {
    flex: 1,
    minWidth: 0,
  },
  kidBarTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
    color: '#FFFFFF',
    letterSpacing: -0.1,
    lineHeight: 19,
  },
  kidBarSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
    lineHeight: 16,
  },
  /** Vertical thread connecting header to chips */
  kidBarConnector: {
    alignItems: 'center',
    paddingVertical: 0,
  },
  kidBarConnectorLine: {
    width: 2,
    height: 10,
    backgroundColor: 'rgba(59,130,246,0.35)',
    borderRadius: 1,
  },
  kidBarConnectorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(59,130,246,0.5)',
    marginTop: 2,
  },
  kidBarChipsWrap: {
    paddingHorizontal: 12,
    paddingBottom: 10,
    paddingTop: 10,
  },
  deviceStatusWrap: {
    paddingHorizontal: 14,
    paddingBottom: 14,
  },
  deviceStatusDivider: {
    height: 1,
    backgroundColor: 'rgba(139,92,246,0.15)',
    marginBottom: 12,
  },
  deviceStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  deviceStatusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    flexShrink: 0,
  },
  deviceStatusDotParent: { backgroundColor: '#14B8A6' },
  deviceStatusDotActive: { backgroundColor: '#22C55E' },
  deviceStatusDotIdle: { backgroundColor: '#F59E0B' },
  deviceStatusInfo: {
    flex: 1,
    minWidth: 0,
  },
  /** Parent row — teal dot, coral label, violet device name */
  deviceStatusLabelParent: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    color: '#EA580C',
    lineHeight: 14,
  },
  deviceStatusNameParent: {
    fontFamily: 'Inter_700Bold',
    fontSize: 13,
    color: '#9333EA',
    lineHeight: 18,
  },
  /** Kid active — amber label, fuchsia device name */
  deviceStatusLabelKidLive: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    color: '#CA8A04',
    lineHeight: 14,
  },
  deviceStatusNameKidLive: {
    fontFamily: 'Inter_700Bold',
    fontSize: 13,
    color: '#DB2777',
    lineHeight: 18,
  },
  /** Kid idle — cyan label, violet device name */
  deviceStatusLabelKidIdle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    color: '#0891B2',
    lineHeight: 14,
  },
  deviceStatusNameKidIdle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 13,
    color: '#7C3AED',
    lineHeight: 18,
  },
  /** No sessions yet — short onboarding line */
  deviceStatusLabelKidHint: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    color: '#DB2777',
    lineHeight: 14,
  },
  deviceStatusHint: {
    fontFamily: 'Inter_400Regular',
    fontSize: 10,
    color: '#9333EA',
    lineHeight: 13,
  },
  deviceStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(59,130,246,0.1)',
    borderRadius: 20,
    paddingHorizontal: 9,
    paddingVertical: 4,
    flexShrink: 0,
  },
  deviceStatusBadgeGreen: {
    backgroundColor: 'rgba(34,197,94,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.28)',
  },
  deviceStatusLiveDotGreen: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#22C55E',
  },
  deviceStatusBadgeText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 11,
    color: '#3B82F6',
    letterSpacing: 0.1,
  },
  deviceStatusBadgeTextGreen: {
    color: '#16A34A',
  },
  deviceStatusTimeKidIdle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: '#EC4899',
    flexShrink: 0,
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

  addKidChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(59,130,246,0.08)',
    borderRadius: 100,
    paddingHorizontal: SPACING[4],
    paddingVertical: SPACING[2],
    borderWidth: 1.5,
    borderColor: COLORS.parent.primary,
    borderStyle: 'dashed',
  },
  addKidChipText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: COLORS.parent.primary,
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
    paddingVertical: SPACING[4],
    paddingHorizontal: SPACING[4],
    gap: SPACING[3],
  },
  kidModeLeft: {
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[3],
  },
  kidModeTextBlock: {
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
  },
  kidModeEmoji: { fontSize: 32, lineHeight: 36 },
  kidModeTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 18,
    color: '#FFFFFF',
    lineHeight: 22,
  },
  kidModeDesc: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 2,
    lineHeight: 17,
  },
  kidModeButton: {
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.28)',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.45)',
    minHeight: 44,
  },
  kidModeButtonText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
    color: '#FFFFFF',
    letterSpacing: 0.2,
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
    justifyContent: 'space-between',
  },
  featureCardWrap: {
    width: '48%',
    marginBottom: SPACING[4],
  },
  featureCard: {
    borderRadius: 20,
    padding: SPACING[5],
    minHeight: 130,
    justifyContent: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    shadowColor: 'rgba(59,130,246,0.24)',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 4,
  },
  featureEmojiWrap: {
    height: 38,
    justifyContent: 'center',
    marginBottom: SPACING[2],
  },
  featureEmoji: {
    fontSize: 32,
    lineHeight: 34,
    includeFontPadding: false,
  },
  featureTextBlock: {
    marginTop: SPACING[1],
  },
  featureTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 15,
    color: '#FFFFFF',
    lineHeight: 20,
    textShadowColor: 'rgba(20,18,35,0.28)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  featureDesc: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: 'rgba(255,255,255,0.95)',
    lineHeight: 18,
    marginTop: 4,
    textShadowColor: 'rgba(20,18,35,0.24)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});
