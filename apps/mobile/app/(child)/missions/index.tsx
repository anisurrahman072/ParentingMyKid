/**
 * @module (child)/missions/index.tsx
 * @description The Kids Daily Missions Screen — the HEART of the entire app.
 *
 *              Design philosophy: This must feel like a VIDEO GAME, not an app.
 *              Every tap must be satisfying. Every completion must celebrate.
 *              If kids LOVE this screen, parents keep paying.
 *
 *              Features:
 *              - Full-screen swipeable mission cards (one per card)
 *              - GIANT colorful CHECK button (minimum 64dp height)
 *              - Character mascot that reacts to each completion
 *              - Coin shower animation on all-missions-complete
 *              - Streak fire badge
 *              - Daily progress bar at top
 *              - Morning mood check-in (5 emoji faces)
 *              - Photo proof option (Cloudinary upload)
 *              - Voice check-in via AI (Whisper API)
 *              - One-tap completion for default missions
 *
 * @business-rule Mission completion = XP + coins + badge check + streak update.
 *               The reward feedback loop must be INSTANT — < 500ms from tap to celebration.
 */

import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  Alert,
} from 'react-native';
import { useState, useCallback } from 'react';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withSequence,
  runOnJS,
  FadeInDown,
  BounceIn,
} from 'react-native-reanimated';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import * as ImagePicker from 'expo-image-picker';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Colors } from '../../../src/constants/colors';
import { Typography } from '../../../src/constants/typography';
import { Spacing, Shadow } from '../../../src/constants/spacing';
import { apiClient } from '../../../src/services/api.client';
import { API_ENDPOINTS } from '../../../src/constants/api';
import { useAuthStore } from '../../../src/store/auth.store';
import { Mission, MissionCategory, ProofType } from '@parentingmykid/shared-types';

const { width, height } = Dimensions.get('window');

// Color mapping for mission categories — each category has its own color identity
const CATEGORY_COLORS: Record<MissionCategory, string> = {
  [MissionCategory.ACADEMIC]: Colors.kids.academic,
  [MissionCategory.PHYSICAL]: Colors.kids.physical,
  [MissionCategory.HABIT]: Colors.kids.habit,
  [MissionCategory.SOCIAL]: Colors.kids.social,
  [MissionCategory.ISLAMIC]: Colors.kids.islamic,
  [MissionCategory.CREATIVE]: Colors.kids.creative,
  [MissionCategory.SELF_CARE]: Colors.kids.selfCare,
};

const CATEGORY_EMOJIS: Record<MissionCategory, string> = {
  [MissionCategory.ACADEMIC]: '📚',
  [MissionCategory.PHYSICAL]: '🏃',
  [MissionCategory.HABIT]: '⭐',
  [MissionCategory.SOCIAL]: '💛',
  [MissionCategory.ISLAMIC]: '🕌',
  [MissionCategory.CREATIVE]: '🎨',
  [MissionCategory.SELF_CARE]: '💚',
};

export default function MissionsScreen() {
  const { user } = useAuthStore();
  const childId = user?.sub ?? '';
  const queryClient = useQueryClient();

  const [currentMissionIndex, setCurrentMissionIndex] = useState(0);
  const [showMoodCheck, setShowMoodCheck] = useState(true); // Show mood check first thing

  const { data: missions = [], isLoading } = useQuery({
    queryKey: ['missions-today', childId],
    queryFn: async () => {
      const response = await apiClient.get<{ missions: Mission[] }>(
        API_ENDPOINTS.missions.today(childId),
      );
      return response.data.missions ?? [];
    },
  });

  const completeMutation = useMutation({
    mutationFn: async ({
      missionId,
      proofType,
      proofUrl,
    }: {
      missionId: string;
      proofType: ProofType;
      proofUrl?: string;
    }) => {
      await apiClient.post(API_ENDPOINTS.missions.complete(missionId, childId), {
        proofType,
        proofUrl,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['missions-today', childId] });
    },
  });

  const completedCount = missions.filter((m) => m.isCompleted).length;
  const totalCount = missions.length;
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
  const allComplete = completedCount === totalCount && totalCount > 0;

  // Show mood check at start of day if not yet done
  if (showMoodCheck) {
    return (
      <MoodCheckScreen
        childId={childId}
        onComplete={() => setShowMoodCheck(false)}
      />
    );
  }

  if (isLoading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={styles.loadingText}>Loading your missions... 🚀</Text>
      </View>
    );
  }

  if (allComplete) {
    return <AllCompleteCelebration completedCount={completedCount} />;
  }

  const currentMission = missions[currentMissionIndex] ?? missions.find((m) => !m.isCompleted);

  return (
    <View style={styles.container}>
      {/* Progress bar at top */}
      <View style={styles.progressContainer}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressText}>{completedCount} of {totalCount} missions ✓</Text>
          <Text style={styles.streakText}>🔥 Keep going!</Text>
        </View>
        <View style={styles.progressBar}>
          <Animated.View
            style={[styles.progressFill, { width: `${progress}%` }]}
          />
        </View>
      </View>

      {/* Mascot */}
      <View style={styles.mascotContainer}>
        <Text style={styles.mascot}>🦸</Text>
        <Text style={styles.mascotSpeech}>
          {completedCount === 0 ? "Let's GO! You've got this! 💪" : `Amazing! ${completedCount} done! Keep it up! 🌟`}
        </Text>
      </View>

      {/* Mission Cards - Swipeable */}
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.missionCardsContainer}
        onMomentumScrollEnd={(e) => {
          const index = Math.round(e.nativeEvent.contentOffset.x / width);
          setCurrentMissionIndex(index);
        }}
      >
        {missions.map((mission, index) => (
          <MissionCard
            key={mission.id}
            mission={mission}
            onComplete={(proofType, proofUrl) => {
              completeMutation.mutate({ missionId: mission.id, proofType, proofUrl });
            }}
            isCompleting={completeMutation.isPending}
          />
        ))}
      </ScrollView>

      {/* Page indicators */}
      <View style={styles.pageIndicators}>
        {missions.map((_, index) => (
          <View
            key={index}
            style={[
              styles.pageIndicator,
              index === currentMissionIndex ? styles.pageIndicatorActive : {},
              missions[index]?.isCompleted ? styles.pageIndicatorComplete : {},
            ]}
          />
        ))}
      </View>
    </View>
  );
}

// ─── Mission Card Component ───────────────────────────────────────────────────

function MissionCard({
  mission,
  onComplete,
  isCompleting,
}: {
  mission: Mission;
  onComplete: (proofType: ProofType, proofUrl?: string) => void;
  isCompleting: boolean;
}) {
  const categoryColor = CATEGORY_COLORS[mission.category] ?? Colors.parent.primary;
  const categoryEmoji = CATEGORY_EMOJIS[mission.category] ?? '⭐';

  const scale = useSharedValue(1);
  const checkButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handleComplete = useCallback(() => {
    // Bounce animation on tap
    scale.value = withSequence(
      withSpring(0.9, { damping: 5 }),
      withSpring(1.1, { damping: 5 }),
      withSpring(1, { damping: 8 }),
    );
    onComplete(ProofType.MANUAL);
  }, [onComplete]);

  const handlePhotoProof = useCallback(async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Camera needed', 'Please allow camera access to take photo proof');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      base64: false,
    });

    if (!result.canceled && result.assets[0]) {
      // Upload to Cloudinary via the server
      onComplete(ProofType.PHOTO, result.assets[0].uri);
    }
  }, [onComplete]);

  return (
    <View style={[styles.missionCard, { backgroundColor: categoryColor }]}>
      {/* Completed overlay */}
      {mission.isCompleted && (
        <View style={styles.completedOverlay}>
          <Text style={styles.completedCheckmark}>✅</Text>
          <Text style={styles.completedText}>Done! Amazing!</Text>
        </View>
      )}

      {/* Category badge */}
      <View style={styles.categoryBadge}>
        <Text style={styles.categoryEmoji}>{categoryEmoji}</Text>
        <Text style={styles.categoryLabel}>{mission.category}</Text>
      </View>

      {/* Mission title */}
      <Text style={styles.missionTitle}>{mission.title}</Text>

      {/* Mission description */}
      {mission.description && (
        <Text style={styles.missionDescription}>{mission.description}</Text>
      )}

      {/* Points badge */}
      <View style={styles.pointsBadge}>
        <Text style={styles.pointsText}>🪙 +{mission.pointsValue} coins</Text>
        <Text style={styles.xpText}>⚡ +{mission.xpValue} XP</Text>
      </View>

      {/* Action buttons */}
      {!mission.isCompleted && (
        <View style={styles.actionButtons}>
          {/* BIG CHECK BUTTON — the most important UI element */}
          <Animated.View style={[styles.checkButtonWrapper, checkButtonStyle]}>
            <TouchableOpacity
              style={styles.checkButton}
              onPress={handleComplete}
              disabled={isCompleting}
              activeOpacity={0.7}
            >
              <Text style={styles.checkButtonText}>✓ DONE!</Text>
            </TouchableOpacity>
          </Animated.View>

          {/* Secondary: Photo proof */}
          {mission.proofRequired && (
            <TouchableOpacity
              style={styles.photoButton}
              onPress={handlePhotoProof}
              activeOpacity={0.8}
            >
              <Text style={styles.photoButtonText}>📷 Add Photo Proof</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

// ─── Mood Check Screen ────────────────────────────────────────────────────────

function MoodCheckScreen({ childId, onComplete }: { childId: string; onComplete: () => void }) {
  const MOODS = [
    { score: 5, emoji: '😄', label: 'Very Happy' },
    { score: 4, emoji: '😊', label: 'Happy' },
    { score: 3, emoji: '😐', label: 'Okay' },
    { score: 2, emoji: '😔', label: 'Sad' },
    { score: 1, emoji: '😢', label: 'Very Sad' },
  ];

  const logMoodMutation = useMutation({
    mutationFn: async (moodScore: number) => {
      await apiClient.post(`/children/${childId}/mood`, { moodScore });
    },
    onSuccess: () => onComplete(),
  });

  return (
    <View style={[styles.container, styles.moodContainer]}>
      <Animated.View entering={BounceIn.duration(600)}>
        <Text style={styles.moodTitle}>Good morning! 🌞</Text>
        <Text style={styles.moodQuestion}>How are you feeling today?</Text>
      </Animated.View>

      <View style={styles.moodOptions}>
        {MOODS.map((mood, index) => (
          <Animated.View
            key={mood.score}
            entering={FadeInDown.duration(400).delay(index * 100)}
          >
            <TouchableOpacity
              style={styles.moodButton}
              onPress={() => logMoodMutation.mutate(mood.score)}
              activeOpacity={0.7}
            >
              <Text style={styles.moodEmoji}>{mood.emoji}</Text>
              <Text style={styles.moodLabel}>{mood.label}</Text>
            </TouchableOpacity>
          </Animated.View>
        ))}
      </View>

      <TouchableOpacity onPress={onComplete} style={styles.skipMood}>
        <Text style={styles.skipMoodText}>Skip for now</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── All Complete Celebration ─────────────────────────────────────────────────

function AllCompleteCelebration({ completedCount }: { completedCount: number }) {
  return (
    <View style={[styles.container, styles.celebrationContainer]}>
      <Animated.View entering={BounceIn.duration(800)} style={styles.celebrationContent}>
        <Text style={styles.celebrationEmoji}>🎉</Text>
        <Text style={styles.celebrationTitle}>ALL DONE!</Text>
        <Text style={styles.celebrationSubtitle}>
          You completed all {completedCount} missions today!
        </Text>
        <Text style={styles.celebrationStats}>🪙 Coins earned today</Text>
        <Text style={styles.celebrationPrompt}>Come back tomorrow for new missions!</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.kids.backgroundWarm,
  },
  loadingText: {
    fontFamily: Typography.fonts.bold,
    fontSize: Typography.kids.heading,
    color: Colors.kids.textPrimary,
  },
  progressContainer: {
    paddingHorizontal: Spacing.screenPadding,
    paddingTop: 60,
    paddingBottom: Spacing.md,
    backgroundColor: Colors.white,
    ...Shadow.sm,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  progressText: {
    fontFamily: Typography.fonts.bold,
    fontSize: Typography.kids.body,
    color: Colors.kids.textPrimary,
  },
  streakText: {
    fontFamily: Typography.fonts.bold,
    fontSize: Typography.kids.body,
    color: Colors.kids.streakFire,
  },
  progressBar: {
    height: 12,
    backgroundColor: '#E5E7EB',
    borderRadius: 6,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.kids.physical,
    borderRadius: 6,
  },
  mascotContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
  },
  mascot: { fontSize: 60 },
  mascotSpeech: {
    fontFamily: Typography.fonts.semiBold,
    fontSize: Typography.kids.body,
    color: Colors.kids.textPrimary,
    marginTop: Spacing.sm,
    textAlign: 'center',
  },
  missionCardsContainer: {
    paddingHorizontal: 0,
  },
  missionCard: {
    width: width - Spacing.screenPadding * 2,
    marginHorizontal: Spacing.screenPadding,
    minHeight: height * 0.45,
    borderRadius: Spacing.cardBorderRadiusLg,
    padding: Spacing.xl,
    justifyContent: 'space-between',
    position: 'relative',
    overflow: 'hidden',
  },
  completedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: Spacing.cardBorderRadiusLg,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  completedCheckmark: { fontSize: 64 },
  completedText: {
    fontFamily: Typography.fonts.extraBold,
    fontSize: Typography.kids.heading,
    color: Colors.white,
    marginTop: Spacing.sm,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignSelf: 'flex-start',
    borderRadius: 20,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  categoryEmoji: { fontSize: 20 },
  categoryLabel: {
    fontFamily: Typography.fonts.bold,
    fontSize: Typography.kids.label,
    color: Colors.white,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  missionTitle: {
    fontFamily: Typography.fonts.black,
    fontSize: Typography.kids.heading,
    color: Colors.white,
    marginTop: Spacing.md,
    lineHeight: Typography.kids.heading * 1.3,
  },
  missionDescription: {
    fontFamily: Typography.fonts.semiBold,
    fontSize: Typography.kids.body,
    color: 'rgba(255,255,255,0.85)',
    marginTop: Spacing.sm,
  },
  pointsBadge: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.md,
  },
  pointsText: {
    fontFamily: Typography.fonts.bold,
    fontSize: Typography.kids.body,
    color: Colors.white,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: 12,
  },
  xpText: {
    fontFamily: Typography.fonts.bold,
    fontSize: Typography.kids.body,
    color: Colors.white,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: 12,
  },
  actionButtons: {
    gap: Spacing.md,
    marginTop: Spacing.xl,
  },
  checkButtonWrapper: {},
  // THE MOST IMPORTANT BUTTON IN THE APP
  // Big, colorful, satisfying — minimum 64dp height per design rules
  checkButton: {
    backgroundColor: Colors.white,
    borderRadius: Spacing.kidsBigButtonRadius,
    height: Spacing.kidsBigButtonHeight,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadow.lg,
  },
  checkButtonText: {
    fontFamily: Typography.fonts.black,
    fontSize: Typography.kids.missionTitle,
    color: Colors.kids.textPrimary,
    letterSpacing: 1,
  },
  photoButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: Spacing.kidsBigButtonRadius,
    height: Spacing.kidsTouchTarget,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  photoButtonText: {
    fontFamily: Typography.fonts.bold,
    fontSize: Typography.kids.label,
    color: Colors.white,
  },
  pageIndicators: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
  },
  pageIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#CBD5E1',
  },
  pageIndicatorActive: {
    width: 24,
    backgroundColor: Colors.kids.textPrimary,
  },
  pageIndicatorComplete: {
    backgroundColor: Colors.kids.physical,
  },
  // Mood Check
  moodContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.screenPadding,
  },
  moodTitle: {
    fontFamily: Typography.fonts.black,
    fontSize: Typography.kids.headingLarge,
    color: Colors.kids.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  moodQuestion: {
    fontFamily: Typography.fonts.semiBold,
    fontSize: Typography.kids.missionTitle,
    color: Colors.kids.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.xxxl,
  },
  moodOptions: {
    width: '100%',
    gap: Spacing.md,
  },
  moodButton: {
    backgroundColor: Colors.white,
    borderRadius: Spacing.cardBorderRadiusLg,
    height: Spacing.kidsTouchTarget + 16, // 72dp — larger than minimum for mood
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    gap: Spacing.base,
    ...Shadow.md,
  },
  moodEmoji: { fontSize: 36 },
  moodLabel: {
    fontFamily: Typography.fonts.bold,
    fontSize: Typography.kids.missionTitle,
    color: Colors.kids.textPrimary,
  },
  skipMood: {
    marginTop: Spacing.xl,
    padding: Spacing.md,
  },
  skipMoodText: {
    fontFamily: Typography.fonts.regular,
    fontSize: Typography.kids.body,
    color: Colors.kids.textSecondary,
    textDecorationLine: 'underline',
  },
  // Celebration
  celebrationContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF9F0',
  },
  celebrationContent: {
    alignItems: 'center',
    padding: Spacing.screenPadding,
  },
  celebrationEmoji: { fontSize: 100 },
  celebrationTitle: {
    fontFamily: Typography.fonts.black,
    fontSize: Typography.kids.displayLarge,
    color: Colors.kids.textPrimary,
    marginTop: Spacing.lg,
  },
  celebrationSubtitle: {
    fontFamily: Typography.fonts.bold,
    fontSize: Typography.kids.missionTitle,
    color: Colors.kids.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.md,
  },
  celebrationStats: {
    fontFamily: Typography.fonts.extraBold,
    fontSize: Typography.kids.heading,
    color: Colors.kids.coin,
    marginTop: Spacing.xl,
  },
  celebrationPrompt: {
    fontFamily: Typography.fonts.semiBold,
    fontSize: Typography.kids.body,
    color: Colors.kids.textSecondary,
    marginTop: Spacing.md,
    textAlign: 'center',
  },
});
