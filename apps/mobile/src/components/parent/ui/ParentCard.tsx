import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { COLORS } from '../../../constants/colors';
import { SPACING } from '../../../constants/spacing';

type Props = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

/**
 * Standard translucent card on the parent light gradient shell.
 */
export function ParentCard({ children, style }: Props) {
  return <View style={[styles.card, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.parent.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.parent.surfaceBorder,
    padding: SPACING[4],
  },
});
