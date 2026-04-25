import { useNavigationState } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { PlatformPressable } from '@react-navigation/elements';
import type { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import { Platform, StyleSheet, View } from 'react-native';
import { COLORS } from '../../constants/colors';
import { TAB_PILL_GLASS_GRADIENTS, useThemeStore } from '../../store/theme.store';

function tabRouteMatches(focusedName: string | undefined, target: string) {
  if (!focusedName) return false;
  if (focusedName === target) return true;
  const withoutIndex = target.replace(/\/index$/, '');
  return focusedName === withoutIndex;
}

function useRouteFocused(routeName: string) {
  return useNavigationState((state) => {
    if (!state?.routes || state.index == null) return false;
    const r = state.routes[state.index] as { name?: string } | undefined;
    return tabRouteMatches(r?.name, routeName);
  });
}

type InnerProps = BottomTabBarButtonProps & { selected: boolean };

function ParentTabBarButtonInner({ children, style, selected, ...rest }: InnerProps) {
  const gradientPreset = useThemeStore((s) => s.gradientPreset);
  const pillGlass = TAB_PILL_GLASS_GRADIENTS[gradientPreset];

  return (
    <PlatformPressable
      {...rest}
      style={[
        style,
        {
          backgroundColor: 'transparent',
          justifyContent: 'center',
          alignItems: 'center',
        },
        styles.nukeDefaultBg,
      ]}
    >
      {selected ? (
        <View style={styles.pillActive}>
          <LinearGradient
            colors={[...pillGlass]}
            locations={[0, 1]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.pillGradientFill}
          />
          <LinearGradient
            colors={[
              'rgba(255, 255, 255, 0.28)',
              'rgba(255, 255, 255, 0)',
              'rgba(255, 255, 255, 0)',
            ]}
            locations={[0, 0.38, 1]}
            start={{ x: 0.12, y: 0 }}
            end={{ x: 0.88, y: 0.5 }}
            style={styles.pillShine}
            pointerEvents="none"
          />
          {children}
        </View>
      ) : (
        <View style={styles.pillIdle}>{children}</View>
      )}
    </PlatformPressable>
  );
}

/**
 * Factory: each main tab must pass the exact `name=` used on its `Tabs.Screen`, e.g. `dashboard/index`.
 * React Native does not set `accessibilityState.selected` on the default bottom-tab button, so
 * we compare navigation state to this route.
 */
export function createParentTabButton(routeName: string) {
  return function ParentTabButton(props: BottomTabBarButtonProps) {
    const selected = useRouteFocused(routeName);
    return <ParentTabBarButtonInner {...props} selected={selected} />;
  };
}

const PILL_RADIUS = 20;

const styles = StyleSheet.create({
  nukeDefaultBg: { backgroundColor: 'transparent' },
  pillGradientFill: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: PILL_RADIUS,
  },
  /** Diagonal highlight — same corner radius as pill to avoid a flat “box” in the middle */
  pillShine: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: PILL_RADIUS,
    opacity: 0.55,
  },
  pillActive: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: PILL_RADIUS,
    paddingVertical: 6,
    paddingHorizontal: 6,
    minWidth: 58,
    width: '90%',
    maxWidth: 88,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: 'rgba(255, 255, 255, 0.88)',
    ...Platform.select({
      ios: {
        shadowColor: '#7CB9D6',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.12,
        shadowRadius: 8,
      },
      android: { elevation: 2 },
      default: {},
    }),
  },
  pillIdle: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingVertical: 6,
  },
});

export const parentTabLabelColors = {
  active: COLORS.parent.tabBarPillForeground,
  inactive: COLORS.parent.textMuted,
};
