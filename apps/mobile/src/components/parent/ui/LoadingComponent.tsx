import { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, useWindowDimensions, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Spacing, Shadow } from '../../../constants/spacing';
import { PARENT_HOME_SETUP_TILE_MIN_HEIGHT } from '../ParentHomeSetupTiles';

/** Pulsing icon colors: pink → green → yellow → blue */
const CYCLE_COLORS = ['#EC4899', '#10B981', '#EAB308', '#3B82F6'] as const;

const COLOR_STEP_MS = 820;
const PULSE_MS = 480;

const COMPACT_MIN_HEIGHT = 56;
const PREMIUM_INNER_MIN_HEIGHT = 204;
const SHIMMER_SWEEP_PX = 160;

/**
 * Premium gradient background used for EVERY LoadingComponent variant.
 * Diagonal: warm peach (TL) → rose → lilac → cool mint (BR).
 * Defined here so every loading box is always colorful — no plain white.
 */
const PREMIUM_BG_COLORS = ['#FFF6ED', '#FFF2F7', '#F5F1FF', '#EDFAF6'] as const;
const PREMIUM_BG_LOCATIONS = [0, 0.34, 0.68, 1] as const;

/** Kept for any external imports — now forwards to PREMIUM_BG_COLORS */
export const LOADING_PREMIUM_BOX_GRADIENT = PREMIUM_BG_COLORS;

const SETUP_TILES_GAP = Spacing.md;
const SETUP_TILES_PAD = Spacing.screenPadding * 2;

export type LoadingComponentVariant = 'compact' | 'premiumCard' | 'setupTile';

type Props = {
  variant: LoadingComponentVariant;
  accessibilityLabel?: string;
  /** Set false when a parent row already exposes progress (avoids duplicate VoiceOver). */
  accessibilityAnnounce?: boolean;
  /** Merged into the root gradient (e.g. `marginBottom: 0` when nested in a card). */
  style?: StyleProp<ViewStyle>;
};

/**
 * Shimmer placeholder — every variant uses PREMIUM_BG_COLORS so no loading
 * box ever renders as plain white.
 */
export function LoadingComponent({
  variant,
  accessibilityLabel = 'Loading',
  accessibilityAnnounce = true,
  style,
}: Props) {
  const [colorIdx, setColorIdx] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setColorIdx((i) => (i + 1) % CYCLE_COLORS.length);
    }, COLOR_STEP_MS);
    return () => clearInterval(id);
  }, []);

  const a11y = accessibilityAnnounce
    ? {
        accessibilityRole: 'progressbar' as const,
        accessibilityLabel,
        accessibilityState: { busy: true as const },
      }
    : {};

  if (variant === 'compact') {
    return (
      <LinearGradient
        colors={[...PREMIUM_BG_COLORS]}
        locations={[...PREMIUM_BG_LOCATIONS]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.compactShell, style]}
        {...a11y}
      >
        <SuspenseStyleShimmer />
        <View style={styles.boxIconCenter} pointerEvents="box-none">
          <GrowHighIcon color={CYCLE_COLORS[colorIdx]!} size={28} />
        </View>
      </LinearGradient>
    );
  }

  if (variant === 'setupTile') {
    return (
      <LinearGradient
        colors={[...PREMIUM_BG_COLORS]}
        locations={[...PREMIUM_BG_LOCATIONS]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.setupTileShell, style]}
        {...a11y}
      >
        <SuspenseStyleShimmer />
        <View style={styles.boxIconCenter} pointerEvents="box-none">
          <GrowHighIcon color={CYCLE_COLORS[colorIdx]!} size={36} />
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={[...PREMIUM_BG_COLORS]}
      locations={[...PREMIUM_BG_LOCATIONS]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.premiumCardShell, style]}
      {...a11y}
    >
      <SuspenseStyleShimmer />
      <View style={styles.boxIconCenter} pointerEvents="box-none">
        <GrowHighIcon color={CYCLE_COLORS[colorIdx]!} size={44} />
      </View>
    </LinearGradient>
  );
}

/**
 * Two columns matching `ParentHomeSetupTiles` width and height behavior while the home dashboard loads.
 */
export function ParentHomeSetupTilesLoadingRow(
  props: {
    accessibilityLabel?: string;
  } = {},
) {
  const { accessibilityLabel = 'Loading your family' } = props;
  const { width: screenW } = useWindowDimensions();
  const colW = useMemo(() => (screenW - SETUP_TILES_PAD - SETUP_TILES_GAP) / 2, [screenW]);

  return (
    <View
      style={styles.setupTilesRow}
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ busy: true }}
    >
      <View style={[styles.setupTilesCol, { width: colW }]}>
        <LoadingComponent
          variant="setupTile"
          accessibilityAnnounce={false}
          accessibilityLabel={accessibilityLabel}
        />
      </View>
      <View style={[styles.setupTilesCol, { width: colW }]}>
        <LoadingComponent
          variant="setupTile"
          accessibilityAnnounce={false}
          accessibilityLabel={accessibilityLabel}
        />
      </View>
    </View>
  );
}

/** Soft pulse + sweep on premium-gradient surfaces. */
function SuspenseStyleShimmer() {
  const sweep = useSharedValue(0);
  const breathe = useSharedValue(1);

  useEffect(() => {
    sweep.value = withRepeat(
      withTiming(1, { duration: 2200, easing: Easing.linear }),
      -1,
      false,
    );
    breathe.value = withRepeat(
      withSequence(
        withTiming(0.86, { duration: 700, easing: Easing.inOut(Easing.quad) }),
        withTiming(1, { duration: 700, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
      false,
    );
  }, [sweep, breathe]);

  const bandStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: interpolate(sweep.value, [0, 1], [-SHIMMER_SWEEP_PX, SHIMMER_SWEEP_PX]) },
    ],
  }));

  const tintStyle = useAnimatedStyle(() => ({
    opacity: breathe.value,
  }));

  const tintColor = 'rgba(255,255,255,0.24)';
  const bandColors = [
    'rgba(255,255,255,0)',
    'rgba(255,255,255,0.65)',
    'rgba(255,255,255,0)',
  ] as const;

  return (
    <>
      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFillObject, { backgroundColor: tintColor }, tintStyle]}
      />
      <View style={styles.shimmerClip} pointerEvents="none">
        <Animated.View style={[styles.shimmerBand, bandStyle]}>
          <LinearGradient
            colors={bandColors}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={StyleSheet.absoluteFillObject}
          />
        </Animated.View>
      </View>
    </>
  );
}

function GrowHighIcon({ color, size }: { color: string; size: number }) {
  const scaleY = useSharedValue(1);

  useEffect(() => {
    scaleY.value = withRepeat(
      withSequence(
        withTiming(1.38, {
          duration: PULSE_MS,
          easing: Easing.out(Easing.cubic),
        }),
        withTiming(0.82, {
          duration: PULSE_MS,
          easing: Easing.in(Easing.cubic),
        }),
      ),
      -1,
      false,
    );
  }, [scaleY]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scaleY: scaleY.value }],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <Ionicons name="trending-up" size={size} color={color} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  compactShell: {
    minHeight: COMPACT_MIN_HEIGHT,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.72)',
    overflow: 'hidden',
    position: 'relative',
    ...Shadow.sm,
  },
  premiumCardShell: {
    minHeight: PREMIUM_INNER_MIN_HEIGHT,
    borderRadius: 20,
    marginBottom: Spacing.lg,
    overflow: 'hidden',
    position: 'relative',
    ...Shadow.md,
  },
  boxIconCenter: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  shimmerClip: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
    zIndex: 0,
  },
  shimmerBand: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 100,
    left: '50%',
    marginLeft: -50,
  },
  setupTileShell: {
    height: PARENT_HOME_SETUP_TILE_MIN_HEIGHT,
    borderRadius: 22,
    overflow: 'hidden',
    position: 'relative',
    ...Shadow.md,
  },
  setupTilesRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: SETUP_TILES_GAP,
    marginBottom: Spacing.lg,
  },
  setupTilesCol: {
    minWidth: 0,
  },
});
