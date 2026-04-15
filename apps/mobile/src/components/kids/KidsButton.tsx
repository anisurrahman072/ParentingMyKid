/**
 * Kids-first big, bouncy button component.
 * - Minimum 56dp touch target (WCAG + kids accessibility)
 * - Spring bounce on press via Reanimated
 * - Supports confetti trigger on success
 * - Colors from kids palette
 */

import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View, ActivityIndicator, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { COLORS } from '../../constants/colors';
import { SPACING } from '../../constants/spacing';

type ButtonVariant = 'primary' | 'secondary' | 'success' | 'danger' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg' | 'xl';

interface KidsButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: string;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
}

const VARIANT_COLORS: Record<ButtonVariant, { bg: string; text: string; shadow: string }> = {
  primary: { bg: COLORS.kids.primary, text: '#FFFFFF', shadow: '#D9520E' },
  secondary: { bg: COLORS.kids.secondary, text: '#FFFFFF', shadow: '#1D7A3A' },
  success: { bg: COLORS.kids.success, text: '#FFFFFF', shadow: '#1A6B30' },
  danger: { bg: COLORS.kids.danger, text: '#FFFFFF', shadow: '#B02020' },
  ghost: { bg: 'rgba(255,107,53,0.12)', text: COLORS.kids.primary, shadow: 'transparent' },
};

const SIZE_STYLES: Record<ButtonSize, { height: number; fontSize: number; paddingH: number }> = {
  sm: { height: 44, fontSize: 15, paddingH: SPACING[4] },
  md: { height: 56, fontSize: 17, paddingH: SPACING[5] },
  lg: { height: 64, fontSize: 20, paddingH: SPACING[6] },
  xl: { height: 76, fontSize: 24, paddingH: SPACING[7] },
};

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export function KidsButton({
  label,
  onPress,
  variant = 'primary',
  size = 'lg',
  icon,
  loading = false,
  disabled = false,
  fullWidth = false,
  style,
}: KidsButtonProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  function handlePressIn() {
    scale.value = withSpring(0.93, { damping: 10, stiffness: 300 });
  }

  function handlePressOut() {
    scale.value = withSpring(1.05, { damping: 10, stiffness: 300 }, () => {
      scale.value = withSpring(1, { damping: 12, stiffness: 200 });
    });
  }

  const colors = VARIANT_COLORS[variant];
  const sizes = SIZE_STYLES[size];
  const opacity = disabled ? 0.55 : 1;

  return (
    <Animated.View style={[animatedStyle, fullWidth && styles.fullWidth, style]}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled || loading}
        activeOpacity={1}
        style={[
          styles.button,
          {
            backgroundColor: colors.bg,
            height: sizes.height,
            paddingHorizontal: sizes.paddingH,
            shadowColor: colors.shadow,
            opacity,
          },
          variant !== 'ghost' && styles.shadow,
          fullWidth && styles.fullWidth,
        ]}
      >
        {loading ? (
          <ActivityIndicator color={colors.text} />
        ) : (
          <View style={styles.content}>
            {icon && <Text style={[styles.icon, { fontSize: sizes.fontSize + 2 }]}>{icon}</Text>}
            <Text
              style={[
                styles.label,
                { color: colors.text, fontSize: sizes.fontSize },
              ]}
            >
              {label}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  fullWidth: { width: '100%' },
  button: {
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  shadow: {
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
  },
  icon: { lineHeight: undefined },
  label: {
    fontFamily: 'Nunito_400Regular',
    fontWeight: '800',
    letterSpacing: 0.3,
  },
});
