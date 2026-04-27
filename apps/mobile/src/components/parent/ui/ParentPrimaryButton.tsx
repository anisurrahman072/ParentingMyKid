import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  View,
  ViewStyle,
  StyleProp,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../../../constants/colors';
import { SPACING } from '../../../constants/spacing';

type Props = {
  label: string;
  /** Shown next to spinner when `loading` (defaults to "Saving…"). */
  loadingLabel?: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

/**
 * Main parent-app CTA — blue gradient, white label (design system).
 */
export function ParentPrimaryButton({
  label,
  loadingLabel = 'Saving…',
  onPress,
  loading,
  disabled,
  style,
}: Props) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.85}
      style={style}
    >
      <LinearGradient
        colors={[...COLORS.parent.gradientCtaBlue]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.gradient}
      >
        {loading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator color="#FFFFFF" size="small" />
            <Text style={styles.label}>{loadingLabel}</Text>
          </View>
        ) : (
          <Text style={styles.label}>{label}</Text>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  gradient: {
    minHeight: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: SPACING[6],
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  label: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Inter',
  },
});
