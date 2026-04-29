/**
 * KidIdentityModal — "Who are you?" modal shown on app open or after 10-min idle.
 *
 * Flow:
 * - Shows all registered kids as large colorful cards
 * - Correct kid → confetti welcome + quick-launch content tiles (dismissable)
 * - Different kid → gentle message "You're in [X]'s app. Ask a parent to switch."
 *   Kids cannot switch accounts independently.
 * - Dual identity tracking: logs claimedKidId vs activeKidId for parent review.
 */
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Dimensions,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeInDown,
  FadeInUp,
  BounceIn,
  SlideInUp,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useFamilyStore } from '../../store/family.store';
import { apiClient } from '../../services/api.client';
import { SPACING } from '../../constants/spacing';

const { width: SCREEN_W } = Dimensions.get('window');

const KID_GRADIENTS: [string, string][] = [
  ['#667EEA', '#764BA2'],
  ['#F7971E', '#FFD200'],
  ['#11998E', '#38EF7D'],
  ['#DA22FF', '#9733EE'],
  ['#FF512F', '#DD2476'],
  ['#2193B0', '#6DD5ED'],
];

function ConfettiPiece({ delay, x }: { delay: number; x: number }) {
  const colors = ['#FF6B6B', '#FFE66D', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7'];
  const color = colors[Math.floor(Math.random() * colors.length)];
  const translateY = useSharedValue(-30);
  const opacity = useSharedValue(1);

  useEffect(() => {
    setTimeout(() => {
      translateY.value = withTiming(SCREEN_W * 1.5, { duration: 2000 });
      opacity.value = withTiming(0, { duration: 2000 });
    }, delay);
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
    position: 'absolute',
    left: x,
    top: -30,
  }));

  return (
    <Animated.View style={style}>
      <Text style={{ fontSize: 18 }}>{['🎉', '⭐', '✨', '🌟', '💫'][Math.floor(Math.random() * 5)]}</Text>
    </Animated.View>
  );
}

function ConfettiOverlay() {
  const pieces = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    delay: Math.random() * 800,
    x: Math.random() * SCREEN_W,
  }));

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {pieces.map((p) => (
        <ConfettiPiece key={p.id} delay={p.delay} x={p.x} />
      ))}
    </View>
  );
}

type ModalState = 'selecting' | 'welcome' | 'wrong-kid';

export function KidIdentityModal({
  activeKidId,
  onDismiss,
}: {
  activeKidId: string;
  onDismiss: () => void;
}) {
  const { dashboard } = useFamilyStore();
  const [state, setState] = useState<ModalState>('selecting');
  const [claimedKidId, setClaimedKidId] = useState<string | null>(null);
  const kids = dashboard?.children ?? [];

  const activeKid = kids.find((k) => k.childId === activeKidId);
  const claimedKid = kids.find((k) => k.childId === claimedKidId);

  async function logIdentityClaim(claimed: string) {
    try {
      await apiClient.post('/activity/identity-claimed', {
        activeKidId,
        claimedKidId: claimed,
      });
    } catch {
      // best effort
    }
  }

  function handleKidSelected(kidId: string) {
    setClaimedKidId(kidId);
    void logIdentityClaim(kidId);

    if (kidId === activeKidId) {
      setState('welcome');
    } else {
      setState('wrong-kid');
    }
  }

  if (kids.length === 0) return null;

  return (
    <Modal visible transparent animationType="none">
      <View style={styles.overlay}>
        <LinearGradient
          colors={['rgba(15,12,41,0.97)', 'rgba(48,43,99,0.97)']}
          style={StyleSheet.absoluteFill}
        />

        {state === 'welcome' && <ConfettiOverlay />}

        <Animated.View
          entering={SlideInUp.springify()}
          style={styles.sheet}
        >
          {/* State: selecting */}
          {state === 'selecting' && (
            <>
              <Animated.View entering={FadeInDown.delay(100)} style={styles.sheetHeader}>
                <Text style={styles.sheetEmoji}>👋</Text>
                <Text style={styles.sheetTitle}>Who are you?</Text>
                <Text style={styles.sheetSubtitle}>
                  Tap your name to start exploring
                </Text>
              </Animated.View>

              <View style={styles.kidsGrid}>
                {kids.map((kid, index) => (
                  <KidCard
                    key={kid.childId}
                    kid={{ id: kid.childId, name: kid.name }}
                    index={index}
                    onSelect={() => handleKidSelected(kid.childId)}
                  />
                ))}
              </View>
            </>
          )}

          {/* State: welcome (correct kid) */}
          {state === 'welcome' && claimedKid && (
            <Animated.View entering={BounceIn.delay(100)} style={styles.welcomeSection}>
              <Text style={styles.welcomeEmoji}>🎉</Text>
              <Text style={styles.welcomeTitle}>
                Welcome, {claimedKid.name}!
              </Text>
              <Text style={styles.welcomeSubtitle}>
                So great to see you today! What would you like to explore?
              </Text>

              <View style={styles.quickLaunch}>
                {['📺 Videos', '📚 Stories', '🔢 Maths', '🎨 Drawing'].map((item) => (
                  <TouchableOpacity key={item} style={styles.quickLaunchChip} onPress={onDismiss}>
                    <Text style={styles.quickLaunchText}>{item}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity style={styles.dismissButton} onPress={onDismiss}>
                <Text style={styles.dismissText}>Let's Go! →</Text>
              </TouchableOpacity>
            </Animated.View>
          )}

          {/* State: wrong kid */}
          {state === 'wrong-kid' && (
            <Animated.View entering={FadeInDown.delay(100)} style={styles.wrongKidSection}>
              <Text style={styles.wrongKidEmoji}>🤔</Text>
              <Text style={styles.wrongKidTitle}>
                You're in {activeKid?.name ?? 'another'}'s app
              </Text>
              <Text style={styles.wrongKidDesc}>
                This device is set up for {activeKid?.name}. Only a parent can switch accounts.
              </Text>

              <View style={styles.wrongKidActions}>
                <TouchableOpacity style={styles.wrongKidContinue} onPress={onDismiss}>
                  <Text style={styles.wrongKidContinueText}>
                    Continue in {activeKid?.name}'s view
                  </Text>
                </TouchableOpacity>
                <Text style={styles.wrongKidOr}>or</Text>
                <Text style={styles.wrongKidAskParent}>
                  Ask a parent to switch using their PIN 🔐
                </Text>
              </View>
            </Animated.View>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

function KidCard({
  kid,
  index,
  onSelect,
}: {
  kid: { id: string; name: string };
  index: number;
  onSelect: () => void;
}) {
  const gradient = KID_GRADIENTS[index % KID_GRADIENTS.length];
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View
      entering={FadeInDown.delay(200 + index * 100).springify()}
      style={[styles.kidCardWrap, animStyle]}
    >
      <TouchableOpacity
        onPress={onSelect}
        onPressIn={() => { scale.value = withSpring(0.93); }}
        onPressOut={() => { scale.value = withSpring(1); }}
        activeOpacity={0.85}
      >
        <LinearGradient
          colors={gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.kidCard}
        >
          <View style={styles.kidAvatarCircle}>
            <Text style={styles.kidAvatarText}>
              {kid.name[0].toUpperCase()}
            </Text>
          </View>
          <Text style={styles.kidCardName}>{kid.name}</Text>
          <Text style={styles.kidCardTap}>Tap to continue →</Text>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    backgroundColor: 'rgba(30,25,60,0.98)',
    paddingBottom: 48,
    paddingTop: SPACING[6],
    paddingHorizontal: SPACING[5],
    maxHeight: '90%',
  },
  sheetHeader: {
    alignItems: 'center',
    marginBottom: SPACING[6],
  },
  sheetEmoji: { fontSize: 52, marginBottom: SPACING[3] },
  sheetTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 28,
    color: '#FFFFFF',
    marginBottom: SPACING[2],
  },
  sheetSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 16,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
  },
  kidsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING[4],
    justifyContent: 'center',
  },
  kidCardWrap: {
    width: (SCREEN_W - SPACING[5] * 2 - SPACING[4]) / 2 - 4,
  },
  kidCard: {
    borderRadius: 24,
    padding: SPACING[5],
    alignItems: 'center',
    gap: SPACING[3],
    minHeight: 160,
    justifyContent: 'center',
  },
  kidAvatarCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  kidAvatarText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 30,
    color: '#FFFFFF',
  },
  kidCardName: {
    fontFamily: 'Inter_700Bold',
    fontSize: 18,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  kidCardTap: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
  },

  // Welcome state
  welcomeSection: {
    alignItems: 'center',
    paddingTop: SPACING[4],
    gap: SPACING[4],
  },
  welcomeEmoji: { fontSize: 72 },
  welcomeTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 28,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  welcomeSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 16,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    lineHeight: 24,
  },
  quickLaunch: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING[3],
    justifyContent: 'center',
  },
  quickLaunchChip: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 20,
    paddingHorizontal: SPACING[4],
    paddingVertical: SPACING[2],
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  quickLaunchText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
    color: '#FFFFFF',
  },
  dismissButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 16,
    paddingVertical: SPACING[4],
    paddingHorizontal: SPACING[8],
    marginTop: SPACING[2],
  },
  dismissText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 17,
    color: '#FFFFFF',
  },

  // Wrong kid state
  wrongKidSection: {
    alignItems: 'center',
    paddingTop: SPACING[4],
    gap: SPACING[4],
  },
  wrongKidEmoji: { fontSize: 64 },
  wrongKidTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 22,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  wrongKidDesc: {
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    lineHeight: 22,
  },
  wrongKidActions: {
    width: '100%',
    gap: SPACING[3],
    alignItems: 'center',
    marginTop: SPACING[2],
  },
  wrongKidContinue: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 14,
    paddingVertical: SPACING[4],
    paddingHorizontal: SPACING[6],
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    width: '100%',
    alignItems: 'center',
  },
  wrongKidContinueText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
    color: '#FFFFFF',
  },
  wrongKidOr: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: 'rgba(255,255,255,0.4)',
  },
  wrongKidAskParent: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    lineHeight: 20,
  },
});
