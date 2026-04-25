import React from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  ViewStyle,
  StyleProp,
  Platform,
} from 'react-native';
import { APP_DISPLAY_NAME, LOGO_PNG } from '../../constants/branding';
import { COLORS } from '../../constants/colors';

type Props = {
  /** Width/height of the square logo (default 112). */
  size?: number;
  /** Show "Parenting My Kid" under the mark. */
  showWordmark?: boolean;
  /** `light` = white text (on gradients); `dark` = brown (parent light UI). */
  wordmarkColor?: 'light' | 'dark';
  style?: StyleProp<ViewStyle>;
};

/**
 * Official logo with optional wordmark, soft shadow for a premium look.
 */
export function AppLogoMark({
  size = 112,
  showWordmark = true,
  wordmarkColor = 'light',
  style,
}: Props) {
  return (
    <View style={[styles.wrap, style]}>
      <View style={[styles.halo, { width: size + 8, height: size + 8, borderRadius: (size + 8) / 2 }]}>
        <Image
          source={LOGO_PNG}
          style={{ width: size, height: size, borderRadius: size * 0.2 }}
          resizeMode="cover"
          accessibilityLabel={`${APP_DISPLAY_NAME} logo`}
          accessibilityRole="image"
        />
      </View>
      {showWordmark && (
        <Text
          style={[
            styles.wordmark,
            wordmarkColor === 'light' ? styles.wordmarkLight : styles.wordmarkDark,
          ]}
        >
          {APP_DISPLAY_NAME}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center' },
  halo: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.35)',
    ...Platform.select({
      ios: {
        shadowColor: 'rgba(5, 60, 40, 0.25)',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 1,
        shadowRadius: 20,
      },
      android: { elevation: 8 },
    }),
  },
  wordmark: {
    marginTop: 14,
    textAlign: 'center',
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 22,
    letterSpacing: 0.3,
  },
  wordmarkLight: { color: '#FFFFFF' },
  wordmarkDark: { color: COLORS.parent.textPrimary },
});
