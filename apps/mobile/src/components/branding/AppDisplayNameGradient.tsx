/**
 * Large gradient wordmark for the app name (deep green → deep pink).
 * Used on auth landing and sign-in; SVG ensures true gradient on text in RN.
 */

import React, { useId } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  Platform,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Text as SvgText } from 'react-native-svg';
import { APP_DISPLAY_NAME } from '../../constants/branding';
import { COLORS } from '../../constants/colors';
import { Typography } from '../../constants/typography';

type Props = {
  style?: StyleProp<ViewStyle>;
};

export function AppDisplayNameGradient({ style }: Props) {
  const winW = Dimensions.get('window').width;
  const w = Math.min(winW - 32, 400);
  const gradId = useId().replace(/:/g, '_');
  const fontSize = Platform.select({ android: 34, default: 36 });

  return (
    <View
      style={[styles.wrap, style]}
      accessibilityRole="text"
      accessibilityLabel={APP_DISPLAY_NAME}
    >
      <Svg width={w} height={fontSize * 1.35}>
        <Defs>
          <LinearGradient id={gradId} x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor={COLORS.parent.wordmarkGreen} stopOpacity="1" />
            <Stop offset="1" stopColor={COLORS.parent.wordmarkPink} stopOpacity="1" />
          </LinearGradient>
        </Defs>
        <SvgText
          x={w / 2}
          y={fontSize * 0.92}
          textAnchor="middle"
          fontSize={fontSize}
          fontFamily={Typography.fonts.black}
          fill={`url(#${gradId})`}
        >
          {APP_DISPLAY_NAME}
        </SvgText>
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
  },
});
