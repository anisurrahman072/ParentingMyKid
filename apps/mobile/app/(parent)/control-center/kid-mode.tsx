/**
 * Kid Mode — the full-screen experience shown when a parent hands the device to a child.
 * Features:
 * - Screen time progress bar at top
 * - Airbnb-style premium gradient category boxes (filtered by religion only)
 * - Switch to Parent Mode via 4-digit PIN modal
 * - Rich entrance animations + confetti on session start
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  FadeInDown,
  FadeInUp,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
  BounceIn,
  SlideInDown,
  ZoomIn,
} from 'react-native-reanimated';
import { router, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiClient } from '../../../src/services/api.client';
import { useFamilyStore } from '../../../src/store/family.store';
import { useAuthStore } from '../../../src/store/auth.store';
import { SPACING } from '../../../src/constants/spacing';
import { KidIdentityModal } from '../../../src/components/kids/KidIdentityModal';

const { width: SCREEN_W } = Dimensions.get('window');

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
  childId,
}: {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  childId: string;
}) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [checking, setChecking] = useState(false);
  const { user } = useAuthStore();
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
        const { data } = await apiClient.post('/auth/verify-parental-pin', {
          pin: next,
          userId: user?.id,
        });
        if (data.valid) {
          setPin('');
          onSuccess();
        } else {
          Vibration.vibrate(300);
          setError(true);
          shake();
          setTimeout(() => { setPin(''); setError(false); }, 600);
        }
      } catch {
        Vibration.vibrate(300);
        shake();
        setTimeout(() => { setPin(''); setError(false); }, 600);
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
  const { childId } = useLocalSearchParams<{ childId: string }>();
  const { dashboard } = useFamilyStore();
  const [showPinModal, setShowPinModal] = useState(false);
  const [showIdentityModal, setShowIdentityModal] = useState(true);
  const kid = dashboard?.children?.find((c) => c.childId === childId);
  const religion = (kid as any)?.religion ?? 'OTHER';

  // Persist last active kid
  useEffect(() => {
    if (childId) {
      AsyncStorage.setItem(LAST_ACTIVE_KID_KEY, childId).catch(() => {});
    }
  }, [childId]);

  const visibleCategories = CATEGORIES.filter(
    (cat) => cat.religions.includes('ALL') || cat.religions.includes(religion as any)
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={['#0F0C29', '#302B63', '#24243E']}
        style={styles.bgGradient}
      />

      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Header bar */}
        <Animated.View entering={FadeInDown.delay(50).springify()} style={styles.kidHeader}>
          <View style={styles.kidHeaderLeft}>
            <Text style={styles.kidGreeting}>Hi {kid?.name?.split(' ')[0] ?? 'Explorer'} 👋</Text>
          </View>
          <TouchableOpacity
            style={styles.parentModeButton}
            onPress={() => setShowPinModal(true)}
          >
            <Text style={styles.parentModeButtonText}>🔒 Parent</Text>
          </TouchableOpacity>
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
            />
          ))}
          <View style={{ height: 40 }} />
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
        childId={childId ?? ''}
      />

      {/* Kid Identity Modal — shown on first open / after idle */}
      {showIdentityModal && childId && (
        <KidIdentityModal
          activeKidId={childId}
          onDismiss={() => setShowIdentityModal(false)}
        />
      )}
    </View>
  );
}

function CategoryCard({
  category,
  index,
  childId,
}: {
  category: CategoryDef;
  index: number;
  childId: string;
}) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View
      entering={FadeInDown.delay(100 + index * 50).springify()}
      style={[styles.categoryCardWrap, animStyle]}
    >
      <TouchableOpacity
        activeOpacity={0.85}
        onPressIn={() => { scale.value = withSpring(0.92); }}
        onPressOut={() => { scale.value = withSpring(1); }}
        onPress={() => {
          router.push(`/(parent)/control-center/${category.route}?childId=${childId}`);
        }}
      >
        <LinearGradient
          colors={category.gradient as [string, string]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.categoryCard}
        >
          <Text style={styles.categoryEmoji}>{category.emoji}</Text>
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
    justifyContent: 'space-between',
    paddingHorizontal: SPACING[5],
    paddingVertical: SPACING[3],
  },
  kidHeaderLeft: {},
  kidGreeting: {
    fontFamily: 'Inter_700Bold',
    fontSize: 22,
    color: '#FFFFFF',
  },
  parentModeButton: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 20,
    paddingHorizontal: SPACING[4],
    paddingVertical: SPACING[2],
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  parentModeButtonText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
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
    color: 'rgba(255,255,255,0.8)',
  },
  screenTimeValue: {
    fontFamily: 'Inter_700Bold',
    fontSize: 13,
    color: '#FFFFFF',
  },
  screenTimeTrack: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.15)',
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
    paddingHorizontal: SPACING[4],
    gap: SPACING[4],
  },
  categoryCardWrap: {
    width: (SCREEN_W - SPACING[4] * 2 - SPACING[4] * 3) / 2 - 2,
  },
  categoryCard: {
    borderRadius: 24,
    padding: SPACING[5],
    minHeight: 140,
    justifyContent: 'flex-end',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  categoryEmoji: {
    fontSize: 42,
    marginBottom: SPACING[3],
  },
  categoryTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 16,
    color: '#FFFFFF',
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
