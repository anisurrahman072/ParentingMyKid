import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { APP_DISPLAY_NAME, LOGO_PNG } from '../../constants/branding';
import { COLORS } from '../../constants/colors';
import { SPACING } from '../../constants/spacing';

type Props = {
  mode: 'parent' | 'child';
  switchLabel: string;
  onSwitchPress: () => void;
  onSettingsPress?: () => void;
  showSettingsButton?: boolean;
  switchStyle?: 'primary' | 'surface' | 'lightBlue';
  managingLabel?: string;
};

export function LoggedInTopHeader({
  mode,
  switchLabel,
  onSwitchPress,
  onSettingsPress,
  showSettingsButton = true,
  switchStyle = 'primary',
  managingLabel = 'Myself',
}: Props) {
  const insets = useSafeAreaInsets();
  const isParent = mode === 'parent';
  const useSurfaceStyle = switchStyle === 'surface';
  const useLightBlueStyle = switchStyle === 'lightBlue';
  const shouldBlinkKidButton = isParent && switchLabel.trim().toLowerCase() === 'kid';
  const blinkOpacity = useRef(new Animated.Value(1)).current;
  const shakeX = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!shouldBlinkKidButton) {
      blinkOpacity.setValue(1);
      shakeX.setValue(0);
      return;
    }
    const blinkOnce = Animated.sequence([
      Animated.timing(blinkOpacity, {
        toValue: 0.62,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(blinkOpacity, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }),
    ]);
    const shakeOnce = Animated.sequence([
      Animated.timing(shakeX, {
        toValue: -3,
        duration: 55,
        useNativeDriver: true,
      }),
      Animated.timing(shakeX, {
        toValue: 3,
        duration: 110,
        useNativeDriver: true,
      }),
      Animated.timing(shakeX, {
        toValue: 0,
        duration: 55,
        useNativeDriver: true,
      }),
    ]);

    const loop = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.sequence([blinkOnce, blinkOnce]), // blink twice
          Animated.sequence([shakeOnce, shakeOnce]), // shake twice
        ]),
        Animated.delay(5000), // pause 5 seconds
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [blinkOpacity, shakeX, shouldBlinkKidButton]);

  return (
    <View
      style={[
        styles.wrap,
        { paddingTop: Math.max(insets.top, 6) },
        isParent ? styles.parentWrap : styles.childWrap,
      ]}
    >
      <View style={styles.left}>
        <View style={styles.logoWrap}>
          <Image source={LOGO_PNG} style={styles.logo} resizeMode="cover" />
        </View>
        <View style={styles.titleBlock}>
          <Text
            style={[styles.name, isParent ? styles.parentName : styles.childName]}
            numberOfLines={1}
          >
            {APP_DISPLAY_NAME}
          </Text>
          {isParent && (
            <LinearGradient
              colors={['rgba(249,115,22,0.12)', 'rgba(59,130,246,0.14)', 'rgba(168,85,247,0.12)']}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={styles.managingBadge}
            >
              <Text style={styles.managingText} numberOfLines={1}>
                <Text style={styles.managingLabel}>Managing:</Text>{' '}
                <Text style={styles.managingValue}>{managingLabel}</Text>
              </Text>
            </LinearGradient>
          )}
        </View>
      </View>

      <View style={styles.rightActions}>
        <Animated.View
          style={
            shouldBlinkKidButton
              ? { opacity: blinkOpacity, transform: [{ translateX: shakeX }] }
              : undefined
          }
        >
          <TouchableOpacity
            onPress={onSwitchPress}
            style={[
              styles.switchButton,
              shouldBlinkKidButton && styles.kidSymbolicSwitchButton,
              useLightBlueStyle
                ? styles.lightBlueSwitchButton
                : useSurfaceStyle
                  ? styles.surfaceSwitchButton
                  : isParent
                    ? styles.parentSwitchButton
                    : styles.childSwitchButton,
            ]}
            accessibilityRole="button"
            accessibilityLabel={switchLabel}
          >
            <Text
              style={[
                styles.switchText,
                shouldBlinkKidButton && styles.kidSymbolicSwitchText,
                (useSurfaceStyle || useLightBlueStyle) && styles.surfaceSwitchText,
              ]}
            >
              {switchLabel}
            </Text>
          </TouchableOpacity>
        </Animated.View>

        {isParent && showSettingsButton && onSettingsPress && (
          <TouchableOpacity
            onPress={onSettingsPress}
            accessibilityRole="button"
            accessibilityLabel="Open settings"
            style={styles.topSettingsButton}
          >
            <Text style={styles.topSettingsIcon}>⚙</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING[3],
    paddingBottom: SPACING[2],
    borderTopWidth: 0,
    borderBottomWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: 'transparent',
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
    overflow: 'hidden',
  },
  parentWrap: {
    backgroundColor: 'rgba(255,255,255,0.72)',
    borderBottomColor: 'rgba(92,61,46,0.12)',
    borderLeftColor: 'rgba(92,61,46,0.12)',
    borderRightColor: 'rgba(92,61,46,0.12)',
  },
  childWrap: {
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderBottomColor: 'rgba(255,255,255,0.22)',
    borderLeftColor: 'rgba(255,255,255,0.22)',
    borderRightColor: 'rgba(255,255,255,0.22)',
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[1],
    flex: 1,
    marginRight: SPACING[1],
  },
  logoWrap: {
    width: 52,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginTop: 2,
  },
  titleBlock: {
    flex: 1,
    minHeight: 52,
    justifyContent: 'center',
  },
  logo: {
    width: 44,
    height: 44,
    borderRadius: 12,
  },
  name: {
    fontSize: 14,
    fontFamily: 'Inter_700Bold',
    flexShrink: 1,
  },
  parentName: { color: COLORS.parent.textPrimary },
  childName: { color: '#FFFFFF' },
  managingBadge: {
    marginTop: 2,
    alignSelf: 'flex-start',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(59,130,246,0.2)',
    paddingHorizontal: 7,
    paddingVertical: 1,
  },
  managingText: {
    fontSize: 11,
    fontFamily: 'Inter_500Medium',
    color: COLORS.parent.textSecondary,
  },
  managingLabel: {
    color: '#A66D55',
    fontFamily: 'Inter_600SemiBold',
  },
  managingValue: {
    color: COLORS.parent.primary,
    fontFamily: 'Inter_700Bold',
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
  },
  switchButton: {
    borderRadius: 999,
    paddingHorizontal: SPACING[3],
    paddingVertical: SPACING[1] + 1,
    borderWidth: 1,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kidSymbolicSwitchButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  parentSwitchButton: {
    backgroundColor: '#8B5A3C',
    borderColor: 'rgba(255,255,255,0.55)',
    shadowColor: '#C08457',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.35,
    shadowRadius: 7,
    elevation: 5,
  },
  childSwitchButton: {
    backgroundColor: 'rgba(255,255,255,0.24)',
    borderColor: 'rgba(255,255,255,0.45)',
  },
  surfaceSwitchButton: {
    backgroundColor: COLORS.parent.surface,
    borderColor: COLORS.parent.surfaceBorder,
  },
  lightBlueSwitchButton: {
    backgroundColor: 'rgba(59,130,246,0.18)',
    borderColor: 'rgba(59,130,246,0.35)',
  },
  switchText: {
    color: '#FFFFFF',
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
  },
  kidSymbolicSwitchText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
    letterSpacing: 0.2,
  },
  topSettingsButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#8B5CF6',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 4,
  },
  topSettingsIcon: {
    color: '#FFFFFF',
    fontSize: 18,
    lineHeight: 18,
  },
  surfaceSwitchText: {
    color: COLORS.parent.textPrimary,
  },
});
