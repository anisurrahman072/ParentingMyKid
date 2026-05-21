/**
 * KidIdentityModal — "Who are you?" modal shown on app open or after 10-min idle.
 *
 * Flow:
 * - Shows all registered kids as large colorful cards
 * - Correct kid → immediate continue into Kid screen
 * - Different kid → gentle message "You're in [X]'s app. Ask a parent to switch."
 *   Kids cannot switch accounts independently.
 * - Dual identity tracking: logs claimedKidId vs activeKidId for parent review.
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeInDown,
  SlideInUp,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { useFamilyStore } from '../../store/family.store';
import { apiClient } from '../../services/api.client';
import { SPACING } from '../../constants/spacing';
import { COLORS } from '../../constants/colors';

const { width: SCREEN_W } = Dimensions.get('window');

const KID_GRADIENTS: [string, string][] = [
  ['#667EEA', '#764BA2'],
  ['#F7971E', '#FFD200'],
  ['#11998E', '#38EF7D'],
  ['#DA22FF', '#9733EE'],
  ['#FF512F', '#DD2476'],
  ['#2193B0', '#6DD5ED'],
];

type ModalState = 'selecting' | 'wrong-kid';

export function KidIdentityModal({
  activeKidId,
  onDismiss,
  onConfirmed,
}: {
  activeKidId: string;
  onDismiss: () => void;
  onConfirmed: () => void;
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
      onConfirmed();
      onDismiss();
    } else {
      setState('wrong-kid');
    }
  }

  if (kids.length === 0) return null;

  return (
    <Modal visible transparent animationType="none">
      <View style={styles.overlay}>
        <LinearGradient
          colors={['rgba(59,130,246,0.18)', 'rgba(168,85,247,0.16)', 'rgba(16,185,129,0.14)']}
          style={StyleSheet.absoluteFill}
        />

        <Animated.View
          entering={SlideInUp.springify()}
          style={styles.sheet}
        >
          <LinearGradient
            colors={['rgba(255,255,255,0.96)', 'rgba(238,246,255,0.96)', 'rgba(245,238,255,0.96)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.sheetGradient}
          />

          <TouchableOpacity
            style={styles.closeButton}
            onPress={onDismiss}
            accessibilityRole="button"
            accessibilityLabel="Close"
          >
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>

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
                <TouchableOpacity
                  style={styles.wrongKidContinue}
                  onPress={() => {
                    onConfirmed();
                    onDismiss();
                  }}
                >
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
    backgroundColor: 'transparent',
    paddingBottom: 48,
    paddingTop: SPACING[6],
    paddingHorizontal: SPACING[5],
    maxHeight: '90%',
    borderWidth: 1,
    borderColor: 'rgba(59,130,246,0.22)',
    overflow: 'hidden',
  },
  sheetGradient: {
    ...StyleSheet.absoluteFillObject,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
  },
  closeButton: {
    position: 'absolute',
    right: SPACING[4],
    top: SPACING[4],
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.88)',
    borderWidth: 1,
    borderColor: COLORS.parent.surfaceBorder,
    zIndex: 5,
  },
  closeText: {
    fontSize: 18,
    color: COLORS.parent.textPrimary,
    fontFamily: 'Inter_700Bold',
  },
  sheetHeader: {
    alignItems: 'center',
    marginBottom: SPACING[6],
  },
  sheetEmoji: { fontSize: 52, marginBottom: SPACING[3] },
  sheetTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 28,
    color: COLORS.parent.textPrimary,
    marginBottom: SPACING[2],
  },
  sheetSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 16,
    color: COLORS.parent.textSecondary,
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
    backgroundColor: 'rgba(255,255,255,0.4)',
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
    color: 'rgba(255,255,255,0.85)',
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
    color: COLORS.parent.textPrimary,
    textAlign: 'center',
  },
  wrongKidDesc: {
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    color: COLORS.parent.textSecondary,
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
    backgroundColor: COLORS.parent.surface,
    borderRadius: 14,
    paddingVertical: SPACING[4],
    paddingHorizontal: SPACING[6],
    borderWidth: 1,
    borderColor: COLORS.parent.surfaceBorder,
    width: '100%',
    alignItems: 'center',
  },
  wrongKidContinueText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
    color: COLORS.parent.textPrimary,
  },
  wrongKidOr: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: COLORS.parent.textMuted,
  },
  wrongKidAskParent: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    color: COLORS.parent.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});
