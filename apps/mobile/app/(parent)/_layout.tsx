/**
 * Parent area layout.
 *
 * Stack (not Tabs) so `router.push` / `router.back()` keep real history — e.g. Control Center → Settings → back returns to Control Center.
 *
 * Bottom tab bar was already hidden for Milestone 1 (`display: 'none'`). Tab-specific UI lives in
 * `ParentTabBarButton.tsx` for when tabs are re-enabled behind a Stack in a future milestone.
 */

import { DefaultTheme, ThemeProvider, type Theme } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { View, StyleSheet, ImageBackground } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect } from 'react';
import { UserRole } from '@parentingmykid/shared-types';
import { DeviceContextBanner } from '../../src/components/parent/DeviceContextBanner';
import { KidSessionRibbon } from '../../src/components/parent/KidSessionRibbon';
import { useThemeStore, GRADIENT_PRESETS } from '../../src/store/theme.store';
import { useAuthStore } from '../../src/store/auth.store';
import { useParentGuardStore } from '../../src/store/parentGuardSettings.store';
import { syncPendingUsageForChild } from '../../src/services/kidUsageSync.service';

const parentNavTheme: Theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: 'transparent',
    card: 'transparent',
  },
};

export default function ParentLayout() {
  const { gradientPreset, customBackgroundUri, hydrated } = useThemeStore();
  const gradient = GRADIENT_PRESETS[gradientPreset];
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const userRole = useAuthStore((s) => s.user?.role);

  useEffect(() => {
    if (!isAuthenticated || userRole !== UserRole.PARENT) return;
    let cancelled = false;
    void (async () => {
      await useParentGuardStore.getState().load();
      const cid = useParentGuardStore.getState().lastActiveChildId?.trim();
      if (!cancelled && cid) void syncPendingUsageForChild(cid);
    })();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, userRole]);

  if (!hydrated) {
    return (
      <View style={{ flex: 1, backgroundColor: gradient[0] }}>
        <LinearGradient colors={gradient} style={StyleSheet.absoluteFill} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {customBackgroundUri ? (
        <ImageBackground
          source={{ uri: customBackgroundUri }}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
        />
      ) : (
        <LinearGradient colors={gradient} style={StyleSheet.absoluteFill} />
      )}
      <DeviceContextBanner />
      <KidSessionRibbon />
      <ThemeProvider value={parentNavTheme}>
        <View style={styles.stack}>
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: 'transparent' },
            }}
          />
        </View>
      </ThemeProvider>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#E8F4EC' },
  stack: { flex: 1 },
});
