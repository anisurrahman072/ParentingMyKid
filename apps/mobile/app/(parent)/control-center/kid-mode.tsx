/**
 * Kid Mode — the full-screen experience shown when a parent hands the device to a child.
 * Features:
 * - Screen time progress bar at top
 * - Airbnb-style premium gradient category boxes (filtered by religion only)
 * - Switch to Parent Mode via 4-digit PIN modal
 * - Rich entrance animations + confetti on session start
 */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Alert,
  Dimensions,
  Vibration,
  StatusBar,
  AppState,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  FadeInDown,
  FadeInUp,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
  withRepeat,
  interpolate,
  Easing,
  BounceIn,
  SlideInDown,
  ZoomIn,
} from 'react-native-reanimated';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiClient } from '../../../src/services/api.client';
import { API_ENDPOINTS } from '../../../src/constants/api';
import { COLORS } from '../../../src/constants/colors';
import { useFamilyStore } from '../../../src/store/family.store';
import { useAuthStore } from '../../../src/store/auth.store';
import { SPACING } from '../../../src/constants/spacing';
import { KidIdentityModal } from '../../../src/components/kids/KidIdentityModal';
import { useParentGuardStore } from '../../../src/store/parentGuardSettings.store';
import { UserRole } from '@parentingmykid/shared-types';
import {
  setKidModeActive,
  setOverlayChildId,
  stopVpn,
  consumePendingGameQuotaMessage,
} from '../../../modules/parental-control/src/index';
import { hasVpnPermission, requestVpnPermission } from '../../../src/services/ParentalControl';
import { getParentPinPlain } from '../../../src/services/parentPinPlainStorage';
import { fetchAndPushParentalPolicyForChild } from '../../../src/services/policySync.service';
import {
  connectKidMonitor,
  disconnectKidMonitor,
} from '../../../src/services/kidSocketEmitter.service';

const { width: SCREEN_W } = Dimensions.get('window');
const GRID_SIDE_PADDING = SPACING[4];
const GRID_GUTTER = SPACING[4];
const CATEGORY_CARD_WIDTH = (SCREEN_W - GRID_SIDE_PADDING * 2 - GRID_GUTTER) / 2;

const LAST_ACTIVE_KID_KEY = '@pmk_last_active_kid';

// Category definitions — shown/hidden based on religion only (NOT age)
type CategoryDef = {
  id: string;
  emoji: string;
  title: string;
  gradient: [string, string, string?];
  religions: ('ISLAM' | 'CHRISTIAN' | 'OTHER' | 'ALL')[];
  route: string;
};

const CATEGORIES: CategoryDef[] = [
  {
    id: 'videos',
    emoji: '📺',
    title: 'Videos',
    gradient: ['#667EEA', '#764BA2'],
    religions: ['ALL'],
    route: 'category/videos',
  },
  {
    id: 'dua',
    emoji: '🤲',
    title: 'Dua',
    gradient: ['#11998E', '#38EF7D'],
    religions: ['ISLAM'],
    route: 'category/dua',
  },
  {
    id: 'quran',
    emoji: '📖',
    title: 'Quran',
    gradient: ['#1A6633', '#4CAF50'],
    religions: ['ISLAM'],
    route: 'category/quran',
  },
  {
    id: 'nasheed',
    emoji: '🎵',
    title: 'Nasheed',
    gradient: ['#F7971E', '#FFD200'],
    religions: ['ISLAM'],
    route: 'category/nasheed',
  },
  {
    id: 'asmaul-husna',
    emoji: '🌙',
    title: 'Asma ul-Husna',
    gradient: ['#4776E6', '#8E54E9'],
    religions: ['ISLAM'],
    route: 'category/asmaul-husna',
  },
  {
    id: 'sahaba',
    emoji: '⚔️',
    title: 'Sahaba Stories',
    gradient: ['#C94B4B', '#4B134F'],
    religions: ['ISLAM'],
    route: 'category/sahaba',
  },
  {
    id: 'stories',
    emoji: '📚',
    title: 'Stories',
    gradient: ['#F2994A', '#F2C94C'],
    religions: ['ALL'],
    route: 'category/stories',
  },
  {
    id: 'science',
    emoji: '🔬',
    title: 'Science',
    gradient: ['#2193B0', '#6DD5ED'],
    religions: ['ALL'],
    route: 'category/science',
  },
  {
    id: 'history',
    emoji: '🏛️',
    title: 'History',
    gradient: ['#8E2DE2', '#4A00E0'],
    religions: ['ALL'],
    route: 'category/history',
  },
  {
    id: 'maths',
    emoji: '🔢',
    title: 'Learn Maths',
    gradient: ['#00B4DB', '#0083B0'],
    religions: ['ALL'],
    route: 'category/maths',
  },
  {
    id: 'crafts',
    emoji: '✂️',
    title: 'Crafts & Art',
    gradient: ['#FF512F', '#DD2476'],
    religions: ['ALL'],
    route: 'category/crafts',
  },
  {
    id: 'drawing',
    emoji: '🎨',
    title: 'Drawing',
    gradient: ['#DA22FF', '#9733EE'],
    religions: ['ALL'],
    route: 'category/drawing',
  },
  {
    id: 'habits',
    emoji: '💪',
    title: 'Good Habits',
    gradient: ['#56AB2F', '#A8E063'],
    religions: ['ALL'],
    route: 'category/habits',
  },
  {
    id: 'poems-en',
    emoji: '📝',
    title: 'Poems & Literature',
    gradient: ['#E96D2E', '#D66C07'],
    religions: ['ALL'],
    route: 'category/poems-en',
  },
  {
    id: 'bengali-letters',
    emoji: '🔤',
    title: 'Bengali Letters',
    gradient: ['#E44D26', '#F16529'],
    religions: ['ALL'],
    route: 'category/bengali-letters',
  },
  {
    id: 'gallery',
    emoji: '📸',
    title: 'My Gallery',
    gradient: ['#FDBB2D', '#3A1C71'],
    religions: ['ALL'],
    route: 'category/gallery',
  },
  {
    id: 'parent-messages',
    emoji: '💌',
    title: 'Parent Messages',
    gradient: ['#FF6B6B', '#EE0979'],
    religions: ['ALL'],
    route: 'category/parent-messages',
  },
  {
    id: 'screen-time',
    emoji: '⏰',
    title: 'Screen Time Today',
    gradient: ['#525252', '#222222'],
    religions: ['ALL'],
    route: 'category/screen-time',
  },
];

// PIN pad for switching back to parent mode
function ParentalPinModal({
  visible,
  onClose,
  onSuccess,
}: {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [checking, setChecking] = useState(false);
  const login = useAuthStore((s) => s.login);
  const user = useAuthStore((s) => s.user);
  const shakeX = useSharedValue(0);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shakeX.value }] }));

  function shake() {
    shakeX.value = withSequence(
      withTiming(-8, { duration: 50 }),
      withTiming(8, { duration: 50 }),
      withTiming(-6, { duration: 50 }),
      withTiming(6, { duration: 50 }),
      withTiming(0, { duration: 50 }),
    );
  }

  async function handleDigit(d: string) {
    if (pin.length >= 4) return;
    const next = pin + d;
    setPin(next);
    if (next.length === 4) {
      setChecking(true);
      try {
        if (user?.role === UserRole.CHILD) {
          const { data } = await apiClient.post<{
            accessToken: string;
            refreshToken: string;
            user: import('@parentingmykid/shared-types').UserProfile;
          }>(API_ENDPOINTS.auth.switchToParentWithPin, { pin: next });
          await login(data.accessToken, data.refreshToken, data.user);
        } else {
          // Try the locally-stored plain PIN first (works fully offline — critical when
          // Stop Internet is active and the backend is unreachable on this device).
          const localPin = await getParentPinPlain().catch(() => null);
          if (localPin && /^\d{4}$/.test(localPin)) {
            // Local PIN exists: compare directly — no network call needed at all.
            if (localPin !== next) {
              throw new Error('INVALID_PARENT_PIN');
            }
            // Local match — fall through to success path below.
          } else {
            // No local PIN cached yet — fall back to backend verification.
            const { data } = await apiClient.post<{ valid: boolean }>(
              API_ENDPOINTS.auth.verifyParentalPin,
              { pin: next },
            );
            if (!data.valid) {
              throw new Error('INVALID_PARENT_PIN');
            }
          }
        }
        try {
          // Write kidModeActive=false so the VPN gate logic knows we're in parent mode,
          // then immediately kill the VPN service — parent must never be blocked.
          await setKidModeActive(false);
          await stopVpn();
        } catch {}
        setPin('');
        onSuccess();
      } catch {
        Vibration.vibrate(300);
        setError(true);
        shake();
        setTimeout(() => {
          setPin('');
          setError(false);
        }, 600);
      } finally {
        setChecking(false);
      }
    }
  }

  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'];

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.pinOverlay}>
        <Animated.View entering={SlideInDown.springify()} style={styles.pinSheet}>
          <LinearGradient colors={['#1A1035', '#0F0A1E']} style={styles.pinSheetGrad}>
            <Text style={styles.pinTitle}>Switch to Parent Mode</Text>
            <Text style={styles.pinSubtitle}>Enter your 4-digit parental PIN</Text>

            <Animated.View style={[styles.pinDots, animStyle]}>
              {[0, 1, 2, 3].map((i) => (
                <View
                  key={i}
                  style={[
                    styles.pinDot,
                    pin.length > i && styles.pinDotFilled,
                    error && styles.pinDotError,
                  ]}
                />
              ))}
            </Animated.View>

            <View style={styles.pinPad}>
              {keys.map((k, i) => (
                <TouchableOpacity
                  key={i}
                  style={[styles.pinKey, k === '' && styles.pinKeyEmpty]}
                  onPress={() => {
                    if (k === '⌫') setPin((p) => p.slice(0, -1));
                    else if (k !== '' && !checking) handleDigit(k);
                  }}
                  disabled={k === '' || checking}
                >
                  {k !== '' && <Text style={styles.pinKeyText}>{k}</Text>}
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity style={styles.pinCancel} onPress={() => { setPin(''); onClose(); }}>
              <Text style={styles.pinCancelText}>Cancel</Text>
            </TouchableOpacity>
          </LinearGradient>
        </Animated.View>
      </View>
    </Modal>
  );
}

function ScreenTimeBar({ childId }: { childId: string }) {
  const [used, setUsed] = useState(0);
  const [limit, setLimit] = useState(120);

  useEffect(() => {
    const load = async () => {
      try {
        const [controls, todayRes] = await Promise.all([
          apiClient.get(`/safety/${childId}/parental-controls`),
          apiClient.get(`/activity/${childId}/today`),
        ]);
        setLimit(controls.data?.dailyLimitMinutes ?? 120);
        const mins = todayRes.data?.sectionTimeLogs?.reduce(
          (acc: number, l: any) => acc + (l.minutes ?? 0), 0
        ) ?? 0;
        setUsed(mins);
      } catch {}
    };
    load();
  }, [childId]);

  const pct = Math.min(used / limit, 1);
  const remaining = Math.max(limit - used, 0);
  const color = pct > 0.8 ? '#EF4444' : pct > 0.6 ? '#F59E0B' : '#10B981';

  return (
    <View style={styles.screenTimeBar}>
      <View style={styles.screenTimeRow}>
        <Text style={styles.screenTimeLabel}>⏰ Screen Time</Text>
        <Text style={styles.screenTimeValue}>{remaining}m left today</Text>
      </View>
      <View style={styles.screenTimeTrack}>
        <Animated.View
          entering={FadeInDown.delay(200)}
          style={[styles.screenTimeFill, { width: `${pct * 100}%` as any, backgroundColor: color }]}
        />
      </View>
    </View>
  );
}

export default function KidModeScreen() {
  const insets = useSafeAreaInsets();
  const { childId } = useLocalSearchParams<{ childId: string }>();
  const { dashboard } = useFamilyStore();
  const [showPinModal, setShowPinModal] = useState(false);
  const [showIdentityModal, setShowIdentityModal] = useState(true);
  const [kidEntryConfirmed, setKidEntryConfirmed] = useState(false);
  const [gameQuotaSplash, setGameQuotaSplash] = useState<{ title: string; body: string } | null>(null);
  const idlePhase = useSharedValue(0);
  const kid = dashboard?.children?.find((c) => c.childId === childId);
  const religion = (kid as any)?.religion ?? 'OTHER';
  const updateGuardSettings = useParentGuardStore((s) => s.update);

  // Kid-mode native flags + policy mirror run from `control-center/_layout.tsx` so category navigation
  // does not briefly disable blocking. Still persist last active kid here for identity modal / resume UX.
  useEffect(() => {
    if (!childId) return;
    void updateGuardSettings({ lastActiveChildId: childId });
    AsyncStorage.setItem(LAST_ACTIVE_KID_KEY, childId).catch(() => {});
  }, [childId, updateGuardSettings]);

  // Connect this device to the family socket channel as the KID once the identity
  // modal is confirmed. This emits kid:online to the parent's device immediately and
  // keeps the connection alive so the parent's Control Center shows "active now" in
  // real-time. Disconnects (kid:offline) automatically when Kid Mode is exited.
  useEffect(() => {
    if (!kidEntryConfirmed || !childId) return;
    const fid = useFamilyStore.getState().activeFamilyId;
    if (!fid) return;
    connectKidMonitor(fid, childId);
    return () => {
      disconnectKidMonitor();
    };
  }, [kidEntryConfirmed, childId]);

  const refreshGameQuotaSplash = useCallback(() => {
    if (Platform.OS !== 'android') return;
    void consumePendingGameQuotaMessage()
      .then((msg) => {
        if (msg) setGameQuotaSplash(msg);
      })
      .catch(() => {});
  }, []);

  useFocusEffect(
    useCallback(() => {
      refreshGameQuotaSplash();
    }, [refreshGameQuotaSplash]),
  );

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') refreshGameQuotaSplash();
    });
    return () => sub.remove();
  }, [refreshGameQuotaSplash]);

  // Activate kid enforcement only after identity confirmation modal is completed.
  // This avoids applying kid rules while parent is still in the handoff step.
  useEffect(() => {
    if (Platform.OS !== 'android' || !childId || !kidEntryConfirmed) return;
    let mounted = true;
    let waitingForPermission = false;

    void (async () => {
      try {
        const ok = await hasVpnPermission();
        if (ok && mounted) {
          await setKidModeActive(true);
          await setOverlayChildId(childId);
          await fetchAndPushParentalPolicyForChild(childId, { clearEnforcementPause: true });
        } else if (!ok && mounted) {
          waitingForPermission = true;
          await requestVpnPermission();
          // requestVpnPermission shows the system dialog and returns immediately.
          // When the user taps OK and returns, AppState fires 'active' below.
        }
      } catch {}
    })();

    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active' && mounted && waitingForPermission) {
        void (async () => {
          try {
            const ok = await hasVpnPermission();
            if (ok) {
              waitingForPermission = false;
              await setKidModeActive(true);
              await setOverlayChildId(childId);
              await fetchAndPushParentalPolicyForChild(childId, { clearEnforcementPause: true });
            }
          } catch {}
        })();
      }
    });

    return () => {
      mounted = false;
      sub.remove();
    };
  }, [childId, kidEntryConfirmed]);

  const visibleCategories = CATEGORIES.filter(
    (cat) => cat.religions.includes('ALL') || cat.religions.includes(religion as any)
  );
  const rowNeedsTallCard = useMemo(() => {
    const map = new Map<number, boolean>();
    visibleCategories.forEach((cat, index) => {
      const rowIndex = Math.floor(index / 2);
      const likelyWraps = cat.title.length >= 13;
      map.set(rowIndex, Boolean(map.get(rowIndex)) || likelyWraps);
    });
    return map;
  }, [visibleCategories]);

  // One shared native-thread clock for all emoji idle motion (lighter than one loop per card).
  useEffect(() => {
    idlePhase.value = withRepeat(
      withTiming(1, { duration: 2600, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
  }, [idlePhase]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <LinearGradient
        colors={COLORS.parent.gradientHero}
        style={styles.bgGradient}
      />

      <SafeAreaView style={styles.safeArea} edges={[]}>
        {/* Header bar */}
        <Animated.View entering={FadeInDown.delay(50).springify()} style={styles.kidHeader}>
          <View style={styles.kidHeaderLeft}>
            <Text style={styles.kidGreeting}>Hi {kid?.name?.split(' ')[0] ?? 'Explorer'} 👋</Text>
          </View>
        </Animated.View>

        {/* Screen Time Bar */}
        {childId && <ScreenTimeBar childId={childId} />}

        {/* Category Grid */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.categoriesGrid}
        >
          {visibleCategories.map((cat, index) => (
            <CategoryCard
              key={cat.id}
              category={cat}
              index={index}
              childId={childId ?? ''}
              idlePhase={idlePhase}
              rowTall={Boolean(rowNeedsTallCard.get(Math.floor(index / 2)))}
            />
          ))}
          <View style={{ height: Math.max(120, insets.bottom + 96) }} />
        </ScrollView>
      </SafeAreaView>

      {/* Parent PIN Modal */}
      <ParentalPinModal
        visible={showPinModal}
        onClose={() => setShowPinModal(false)}
        onSuccess={() => {
          setShowPinModal(false);
          router.replace('/(parent)/control-center');
        }}
      />

      {/* Kid Identity Modal — shown on first open / after idle */}
      {showIdentityModal && childId && (
        <KidIdentityModal
          activeKidId={childId}
          onDismiss={() => setShowIdentityModal(false)}
          onConfirmed={() => setKidEntryConfirmed(true)}
        />
      )}

      <Modal
        visible={gameQuotaSplash !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setGameQuotaSplash(null)}
      >
        <View style={styles.quotaSplashBackdrop}>
          <LinearGradient colors={['#FFF7ED', '#E0F2FE', '#F5F3FF']} style={styles.quotaSplashCard}>
            <Text style={styles.quotaSplashEmoji}>🌟</Text>
            <Text style={styles.quotaSplashTitle}>{gameQuotaSplash?.title ?? ''}</Text>
            <Text style={styles.quotaSplashBody}>{gameQuotaSplash?.body ?? ''}</Text>
            <TouchableOpacity
              style={styles.quotaSplashBtn}
              onPress={() => setGameQuotaSplash(null)}
              accessibilityRole="button"
            >
              <Text style={styles.quotaSplashBtnText}>Sounds good!</Text>
            </TouchableOpacity>
          </LinearGradient>
        </View>
      </Modal>
    </View>
  );
}

function CategoryCard({
  category,
  index,
  childId,
  idlePhase,
  rowTall,
}: {
  category: CategoryDef;
  index: number;
  childId: string;
  idlePhase: Animated.SharedValue<number>;
  rowTall: boolean;
}) {
  const scale = useSharedValue(1);
  const emojiPress = useSharedValue(0);
  const motionVariant = index % 5;
  const motionOffset = (index * 0.13) % 1;
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const emojiAnimStyle = useAnimatedStyle(() => {
    // Offset each card motion so they don't move in sync.
    const t = (idlePhase.value + motionOffset) % 1;
    const pressBoost = interpolate(emojiPress.value, [0, 1], [1, 1.12]);

    let translateY = 0;
    let translateX = 0;
    let rotate = 0;
    let scaleV = 1;

    if (motionVariant === 0) {
      // Soft bob + tiny tilt
      translateY = interpolate(t, [0, 0.5, 1], [0, -6, 0]);
      rotate = interpolate(t, [0, 0.5, 1], [-1.5, 1.5, -1.5]);
    } else if (motionVariant === 1) {
      // Side sway
      translateX = interpolate(t, [0, 0.5, 1], [-2, 2, -2]);
      rotate = interpolate(t, [0, 0.5, 1], [0, 2, 0]);
      translateY = interpolate(t, [0, 0.5, 1], [0, -2, 0]);
    } else if (motionVariant === 2) {
      // Breathing pulse
      scaleV = interpolate(t, [0, 0.5, 1], [1, 1.08, 1]);
    } else if (motionVariant === 3) {
      // Pop + settle
      translateY = interpolate(t, [0, 0.25, 0.5, 1], [0, -5, -2, 0]);
      scaleV = interpolate(t, [0, 0.25, 0.5, 1], [1, 1.06, 1.02, 1]);
    } else {
      // Tiny wobble
      rotate = interpolate(t, [0, 0.25, 0.5, 0.75, 1], [0, 2, -2, 1, 0]);
      translateY = interpolate(t, [0, 0.5, 1], [0, -3, 0]);
    }

    return {
      transform: [
        { translateX },
        { translateY },
        { rotate: `${rotate}deg` },
        { scale: scaleV * pressBoost },
      ],
    };
  });

  return (
    <Animated.View
      entering={FadeInDown.delay(100 + index * 50).springify()}
      style={[styles.categoryCardWrap, animStyle]}
    >
      <TouchableOpacity
        activeOpacity={0.85}
        onPressIn={() => {
          scale.value = withSpring(0.95);
          emojiPress.value = withTiming(1, { duration: 110 });
        }}
        onPressOut={() => {
          scale.value = withSpring(1);
          emojiPress.value = withTiming(0, { duration: 180 });
        }}
        onPress={() => {
          router.push(`/(parent)/control-center/${category.route}?childId=${childId}`);
        }}
      >
        <LinearGradient
          colors={category.gradient as [string, string]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.categoryCard, rowTall && styles.categoryCardRowTall]}
        >
          <Animated.Text style={[styles.categoryEmoji, emojiAnimStyle]}>{category.emoji}</Animated.Text>
          <Text style={styles.categoryTitle}>{category.title}</Text>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  bgGradient: { ...StyleSheet.absoluteFillObject },
  safeArea: { flex: 1 },

  kidHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingHorizontal: SPACING[5],
    paddingTop: SPACING[1],
    paddingBottom: SPACING[3],
  },
  kidHeaderLeft: {},
  kidGreeting: {
    fontFamily: 'Inter_700Bold',
    fontSize: 22,
    color: COLORS.parent.textPrimary,
  },
  quotaSplashBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15,12,41,0.55)',
    justifyContent: 'center',
    paddingHorizontal: SPACING[5],
  },
  quotaSplashCard: {
    borderRadius: 22,
    padding: SPACING[5],
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.85)',
  },
  quotaSplashEmoji: {
    fontSize: 40,
    textAlign: 'center',
    marginBottom: SPACING[3],
  },
  quotaSplashTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 19,
    color: '#5C3D2E',
    textAlign: 'center',
    marginBottom: SPACING[3],
    lineHeight: 26,
  },
  quotaSplashBody: {
    fontFamily: 'Inter_500Medium',
    fontSize: 15,
    color: '#7C6658',
    textAlign: 'center',
    lineHeight: 23,
    marginBottom: SPACING[5],
  },
  quotaSplashBtn: {
    backgroundColor: '#2563EB',
    borderRadius: 14,
    paddingVertical: SPACING[3],
    alignItems: 'center',
  },
  quotaSplashBtnText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 16,
    color: '#FFFFFF',
  },

  screenTimeBar: {
    marginHorizontal: SPACING[5],
    marginBottom: SPACING[4],
  },
  screenTimeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING[2],
  },
  screenTimeLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    color: COLORS.parent.textSecondary,
  },
  screenTimeValue: {
    fontFamily: 'Inter_700Bold',
    fontSize: 13,
    color: COLORS.parent.textPrimary,
  },
  screenTimeTrack: {
    height: 8,
    backgroundColor: 'rgba(92,61,46,0.14)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  screenTimeFill: {
    height: '100%',
    borderRadius: 4,
  },

  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: GRID_SIDE_PADDING,
    justifyContent: 'space-between',
  },
  categoryCardWrap: {
    width: CATEGORY_CARD_WIDTH,
    marginBottom: GRID_GUTTER,
  },
  categoryCard: {
    borderRadius: 24,
    padding: SPACING[5],
    minHeight: 140,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  categoryCardRowTall: {
    minHeight: 162,
  },
  categoryEmoji: {
    fontSize: 42,
    marginBottom: SPACING[3],
  },
  categoryTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 16,
    color: '#FFFFFF',
    textAlign: 'center',
  },

  // PIN Modal
  pinOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  pinSheet: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    overflow: 'hidden',
  },
  pinSheetGrad: {
    padding: SPACING[6],
    alignItems: 'center',
    paddingBottom: 48,
  },
  pinTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 22,
    color: '#FFFFFF',
    marginBottom: SPACING[2],
  },
  pinSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: SPACING[6],
  },
  pinDots: {
    flexDirection: 'row',
    gap: 18,
    marginBottom: SPACING[8],
  },
  pinDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  pinDotFilled: {
    backgroundColor: '#FFFFFF',
    borderColor: '#FFFFFF',
  },
  pinDotError: {
    borderColor: '#EF4444',
    backgroundColor: '#EF4444',
  },
  pinPad: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: 270,
    gap: 12,
    justifyContent: 'center',
  },
  pinKey: {
    width: 78,
    height: 78,
    borderRadius: 39,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  pinKeyEmpty: {
    backgroundColor: 'transparent',
    borderColor: 'transparent',
  },
  pinKeyText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 26,
    color: '#FFFFFF',
  },
  pinCancel: {
    marginTop: SPACING[6],
    paddingVertical: SPACING[3],
    paddingHorizontal: SPACING[6],
  },
  pinCancelText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 16,
    color: 'rgba(255,255,255,0.55)',
  },
});
