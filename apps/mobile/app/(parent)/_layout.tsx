/**
 * Parent area layout.
 *
 * Stack (not Tabs) so `router.push` / `router.back()` keep real history — e.g. Control Center → Settings → back returns to Control Center.
 *
 * Bottom tab bar was already hidden for Milestone 1 (`display: 'none'`). Tab-specific UI lives in
 * `ParentTabBarButton.tsx` for when tabs are re-enabled behind a Stack in a future milestone.
 */

import { DefaultTheme, ThemeProvider, type Theme } from '@react-navigation/native';
import { Stack, router, usePathname, useGlobalSearchParams } from 'expo-router';
import { View, StyleSheet, ImageBackground, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useMemo } from 'react';
import { UserRole } from '@parentingmykid/shared-types';
import { DeviceContextBanner } from '../../src/components/parent/DeviceContextBanner';
import { KidSessionRibbon } from '../../src/components/parent/KidSessionRibbon';
import { useThemeStore, GRADIENT_PRESETS } from '../../src/store/theme.store';
import { useAuthStore } from '../../src/store/auth.store';
import { useFamilyStore } from '../../src/store/family.store';
import { useParentGuardStore } from '../../src/store/parentGuardSettings.store';
import { syncPendingUsageForChild } from '../../src/services/kidUsageSync.service';
import {
  connectFamilyMonitor,
  disconnectFamilyMonitor,
} from '../../src/services/familyMonitorSocket.service';
import { LoggedInTopHeader } from '../../src/components/navigation/LoggedInTopHeader';
import { childIdFromGlobalParams, isParentKidHandoffPath } from '../../src/utils/kidHandoffSession';

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
  const userName = useAuthStore((s) => s.user?.name);
  const accessToken = useAuthStore((s) => s.accessToken);
  const dashboard = useFamilyStore((s) => s.dashboard);
  const activeFamilyId = useFamilyStore((s) => s.activeFamilyId);
  const selectedChildId = useFamilyStore((s) => s.selectedChildId);
  const lastActiveChildId = useParentGuardStore((s) => s.lastActiveChildId);
  const pathname = usePathname();
  const params = useGlobalSearchParams<{ childId?: string | string[] }>();
  const childId = childIdFromGlobalParams(params.childId);
  const isKidModeRoute = pathname?.includes('/control-center/kid-mode');
  const isKidHandoffRoute = isParentKidHandoffPath(pathname, childId);
  const parentFirstName = userName?.split(' ')[0]?.trim() || 'You';
  const managingLabel =
    dashboard?.children.find((child) => child.childId === selectedChildId)?.name ?? parentFirstName;

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

  // All kid IDs for the active family — derived from dashboard so it updates automatically
  const familyKidIds = useMemo(
    () => dashboard?.children?.map((c) => c.childId) ?? [],
    [dashboard],
  );

  // Connect the parent to the family socket channel so we receive kid:online / kid:offline
  // for ALL kids in real-time, regardless of which screen the parent is on.
  useEffect(() => {
    if (!isAuthenticated || userRole !== UserRole.PARENT) {
      disconnectFamilyMonitor();
      return;
    }
    if (!activeFamilyId || !accessToken || familyKidIds.length === 0) return;
    connectFamilyMonitor(activeFamilyId, familyKidIds, accessToken);
  }, [isAuthenticated, userRole, activeFamilyId, accessToken, familyKidIds]);

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
      {!isKidHandoffRoute && <KidSessionRibbon />}
      <LoggedInTopHeader
        mode="parent"
        managingLabel={managingLabel}
        switchLabel={isKidModeRoute ? '🔒 Parent' : 'Kid'}
        switchStyle={isKidModeRoute ? 'lightBlue' : 'primary'}
        showSettingsButton={!isKidModeRoute}
        onSettingsPress={() => router.push('/(parent)/settings')}
        onSwitchPress={() => {
          if (isKidModeRoute) {
            router.push('/auth/switch-to-parent');
            return;
          }
          if (!lastActiveChildId) {
            Alert.alert(
              'No child selected',
              'Select a child first from Control Center, then switch to Kid Mode.',
            );
            router.push('/(parent)/control-center');
            return;
          }
          router.push(`/(parent)/control-center/kid-mode?childId=${lastActiveChildId}`);
        }}
      />
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
