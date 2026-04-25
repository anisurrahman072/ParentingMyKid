import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

/**
 * “Glass” look using only views + gradient — no expo-blur.
 * Works in dev clients that were built before blur/nav-bar native modules were added;
 * a new development build is only needed if you later add expo-blur back for real blur.
 */
export function ParentGlassTabBarBackground() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <LinearGradient
        colors={['rgba(255, 255, 255, 0.72)', 'rgba(255, 255, 255, 0.45)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: 'rgba(255, 255, 255, 0.22)',
            borderTopWidth: StyleSheet.hairlineWidth,
            borderTopColor: 'rgba(0, 0, 0, 0.06)',
          },
        ]}
      />
      <View
        style={[
          StyleSheet.absoluteFill,
          /* Warm shell tie-in — matches COLORS.parent.tabBarFill at ~0.5 alpha */
          { backgroundColor: 'rgba(243, 237, 230, 0.5)' },
        ]}
      />
    </View>
  );
}
