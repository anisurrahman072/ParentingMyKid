import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { COLORS } from '../../../constants/colors';

type Props = {
  label: string;
  onPress: () => void;
  size?: number;
  style?: StyleProp<ViewStyle>;
};

/**
 * Circular glass key / action — matches child PIN pad aesthetic.
 */
export function KidsGlassButton({ label, onPress, size = 72, style }: Props) {
  const r = size / 2;
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.btn, { width: size, height: size, borderRadius: r }, style]}
    >
      <Text style={styles.text}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    backgroundColor: COLORS.kids.glassButtonBg,
    borderWidth: 1.5,
    borderColor: COLORS.kids.glassButtonBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: COLORS.kids.glassButtonText,
    fontSize: 26,
    fontWeight: '700',
    fontFamily: 'Nunito_700Bold',
  },
});
