/**
 * @module _layout.tsx
 * @description Root layout for the Expo Router app.
 *              Handles:
 *              - Font loading (Nunito + Inter)
 *              - Splash screen management
 *              - Auth state initialization from SecureStore
 *              - Role-based routing (parent → parent UI, child → child UI, tutor → tutor UI)
 *              - TanStack Query provider setup
 *              - Global notification registration
 *
 * @business-rule Role determination happens HERE at the root.
 *               Once authenticated, the user is routed to the correct UI:
 *               - PARENT → /(parent)/ → Premium adult dashboard
 *               - CHILD → /(child)/ → Colorful gamified missions
 *               - TUTOR → /(tutor)/ → Lightweight scoped view
 */

import { useEffect, useCallback, useRef } from 'react';
import { Stack, router, useRootNavigationState } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LANGUAGE_SELECTED_KEY } from './auth/language';
import { useFonts } from 'expo-font';
import {
  Nunito_400Regular,
  Nunito_500Medium,
  Nunito_600SemiBold,
  Nunito_700Bold,
  Nunito_800ExtraBold,
  Nunito_900Black,
} from '@expo-google-fonts/nunito';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AppState, InteractionManager, Platform, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useAuthStore } from '../src/store/auth.store';
import { UserRole } from '@parentingmykid/shared-types';
import { apiClient } from '../src/services/api.client';
import { API_ENDPOINTS } from '../src/constants/api';
import { fetchAndPushParentalPolicyForChild, startPolicySync, stopPolicySync } from '../src/services/policySync.service';
import { useThemeStore } from '../src/store/theme.store';
import { useParentGuardStore } from '../src/store/parentGuardSettings.store';
import { useAutoKidMode } from '../src/hooks/useAutoKidMode';
import { consumePendingModeSwitch, setApplyRulesToParent, setKidModeActive, stopVpn } from '../modules/parental-control/src/index';

/**
 * Dev-only: this module re-executes on Fast Refresh, so the flag resets and we can
 * re-read SecureStore + refresh when the zustand store was wiped in memory.
 */
let __pmkDevSessionRecovery = false;

// Keep splash screen visible while fonts are loading
SplashScreen.preventAutoHideAsync();

// Remote push + full expo-notifications APIs are not available in Expo Go (SDK 53+).
// Only configure the native module in dev builds / production binaries.
if (Constants.executionEnvironment !== ExecutionEnvironment.StoreClient) {
  try {
    const Notifications = require('expo-notifications');
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
  } catch {
    // Module unavailable in some environments
  }
}

// TanStack Query client — shared across all screens
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes — reduces unnecessary re-fetches
      retry: 2,
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 30000),
    },
  },
});

export default function RootLayout() {
  const rootNavigationState = useRootNavigationState();
  const loadPersistedAuth = useAuthStore((s) => s.loadPersistedAuth);
  const { isLoading, isAuthenticated, user } = useAuthStore();
  const loadTheme = useThemeStore((s) => s.load);
  const {
    load: loadGuardSettings,
    autoKidModeEnabled,
    autoKidModeIdleMinutes,
    isHydrated: guardSettingsHydrated,
    applyBlockRulesToParent,
    lastActiveChildId,
  } = useParentGuardStore();

  const [fontsLoaded] = useFonts({
    Nunito_400Regular,
    Nunito_500Medium,
    Nunito_600SemiBold,
    Nunito_700Bold,
    Nunito_800ExtraBold,
    Nunito_900Black,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  /** True once fonts + auth are ready AND the root Stack has mounted (Expo Router navigator key exists). */
  const navigationReady =
    fontsLoaded &&
    !isLoading &&
    Boolean(rootNavigationState?.key);

  const navigationReadyRef = useRef(false);
  navigationReadyRef.current = navigationReady;

  /**
   * Avoid "navigate before mounting Root Layout":
   * - `router.replace` can reject asynchronously even when `useRootNavigationState` looks ready.
   * - On failure, retry on the next frame until success or a sane attempt cap.
   */
  const navigateReplaceWhenReady = useCallback((href: string) => {
    let attempts = 0;
    const maxAttempts = 240;

    const run = () => {
      attempts += 1;
      if (attempts > maxAttempts) return;
      if (!navigationReadyRef.current) {
        requestAnimationFrame(run);
        return;
      }

      InteractionManager.runAfterInteractions(() => {
        const target = href as Parameters<typeof router.replace>[0];
        try {
          const out = router.replace(target) as unknown;
          if (out != null && typeof (out as Promise<void>).then === 'function') {
            void (out as Promise<void>).catch(() => requestAnimationFrame(run));
            return;
          }
        } catch {
          requestAnimationFrame(run);
        }
      });
    };

    requestAnimationFrame(run);
  }, []);

  // Load auth state from SecureStore on startup
  useEffect(() => {
    void loadPersistedAuth();
  }, [loadPersistedAuth]);

  useEffect(() => {
    void loadTheme();
  }, [loadTheme]);

  // Load parent guard settings (features 1–3)
  useEffect(() => {
    void loadGuardSettings();
  }, [loadGuardSettings]);

  // Native VPN reads `applyToParent` from SharedPreferences — keep in sync after cold start / reinstall.
  useEffect(() => {
    if (!isAuthenticated || user?.role !== UserRole.PARENT || !guardSettingsHydrated) return;
    if (Platform.OS !== 'android') return;
    void setApplyRulesToParent(applyBlockRulesToParent).catch(() => {});
  }, [isAuthenticated, user?.role, guardSettingsHydrated, applyBlockRulesToParent]);

  /**
   * PARENT STARTUP GUARD: Clear any stale kidModeActive=true that may have been left in
   * native SharedPreferences if the app was force-killed while in Kid Mode.
   * Without this, the parent would be blocked by the VPN on every cold start after a crash.
   * Deps intentionally exclude navigation-driven values (lastActiveChildId) so this fires
   * exactly once after hydration and never while the user is already in kid handoff.
   */
  useEffect(() => {
    if (!isAuthenticated || user?.role !== UserRole.PARENT || !guardSettingsHydrated) return;
    if (Platform.OS !== 'android') return;
    void Promise.all([
      setKidModeActive(false),
      stopVpn(),
    ]).catch(() => {});
  }, [isAuthenticated, user?.role, guardSettingsHydrated]);

  // Refresh mirrored child policy on the parent phone so JSON includes `websiteDnsGatesOnKidMode` and matches server.
  useEffect(() => {
    if (!isAuthenticated || user?.role !== UserRole.PARENT || !guardSettingsHydrated) return;
    if (Platform.OS !== 'android') return;
    if (!lastActiveChildId) return;
    void fetchAndPushParentalPolicyForChild(lastActiveChildId);
  }, [isAuthenticated, user?.role, guardSettingsHydrated, lastActiveChildId]);

  // Child: poll screen time / pause policy for in-app soft enforcement
  useEffect(() => {
    if (isAuthenticated && user?.role === UserRole.CHILD) {
      startPolicySync();
    } else {
      stopPolicySync();
    }
    return () => {
      stopPolicySync();
    };
  }, [isAuthenticated, user?.role, user?.childProfileId]);

  // Register Expo push token once authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      registerPushNotifications();
    }
  }, [isAuthenticated]);

  // Resume: refresh access token; background may have let it expire
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      const s = useAuthStore.getState();
      if (s.isAuthenticated) {
        void s.refreshAccessToken();
      } else {
        void s.revalidateFromSecureStore();
      }
    });
    return () => sub.remove();
  }, []);

  // Feature 3: On resume, check if the native overlay has queued a mode switch.
  // The overlay service writes "pendingModeSwitch" to SharedPreferences, then launches
  // the app. We read and clear it here, then navigate to the correct screen.
  useEffect(() => {
    if (!navigationReady || !isAuthenticated || user?.role !== UserRole.PARENT) return;

    const handleOverlaySwitch = async () => {
      try {
        const pending = await consumePendingModeSwitch();
        if (!pending) return;
        if (pending === 'parent') {
          navigateReplaceWhenReady('/(parent)/control-center');
        } else if (pending.startsWith('kid:')) {
          const childId = pending.slice(4);
          if (childId) {
            navigateReplaceWhenReady(`/(parent)/control-center/kid-mode?childId=${childId}`);
          } else {
            navigateReplaceWhenReady('/(parent)/control-center');
          }
        }
      } catch {
        // native module not linked (Expo Go) — silently ignore
      }
    };

    void handleOverlaySwitch();

    const sub = AppState.addEventListener('change', (state) => {
      if (
        state === 'active' &&
        navigationReadyRef.current &&
        useAuthStore.getState().user?.role === UserRole.PARENT
      ) {
        void handleOverlaySwitch();
      }
    });
    return () => sub.remove();
  }, [navigationReady, isAuthenticated, user?.role, navigateReplaceWhenReady]);

  // Feature 2: Auto Kid Mode — when idle/lock threshold exceeded, route to kid mode.
  const handleAutoKidModeExpired = useCallback(() => {
    const { isAuthenticated: auth, user: u } = useAuthStore.getState();
    if (!auth || u?.role !== UserRole.PARENT) return;
    const { lastActiveChildId: childId } = useParentGuardStore.getState();
    if (childId) {
      navigateReplaceWhenReady(`/(parent)/control-center/kid-mode?childId=${childId}`);
    } else {
      // No known child — go to control center where parent can select one
      navigateReplaceWhenReady('/(parent)/control-center');
    }
  }, [navigateReplaceWhenReady]);

  useAutoKidMode({
    enabled: isAuthenticated && user?.role === UserRole.PARENT && autoKidModeEnabled,
    navigationReady,
    idleMinutes: autoKidModeIdleMinutes,
    onIdleExpired: handleAutoKidModeExpired,
  });

  // Dev Fast Refresh: rehydrate in-memory zustand from SecureStore if it was reset
  useEffect(() => {
    if (!__DEV__ || !fontsLoaded || isLoading) return;
    if (__pmkDevSessionRecovery) return;
    __pmkDevSessionRecovery = true;
    const task = InteractionManager.runAfterInteractions(() => {
      const { isAuthenticated, accessToken } = useAuthStore.getState();
      if (isAuthenticated && accessToken) return;
      void useAuthStore.getState().revalidateFromSecureStore();
    });
    return () => task.cancel?.();
  }, [fontsLoaded, isLoading]);

  // Hide splash screen once fonts and auth are ready
  useEffect(() => {
    if (fontsLoaded && !isLoading) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, isLoading]);

  // Route user to correct UI based on authentication state and role
  useEffect(() => {
    if (!navigationReady) return;

    if (!isAuthenticated) {
      // Check if language has been selected on first launch
      void (async () => {
        const langSelected = await AsyncStorage.getItem(LANGUAGE_SELECTED_KEY);
        if (!langSelected) {
          navigateReplaceWhenReady('/auth/language');
        } else {
          navigateReplaceWhenReady('/auth');
        }
      })();
      return;
    }

    void (async () => {
      if (user?.role === UserRole.PARENT) {
        // Check if parental PIN has been set up
        if (user?.parentalPinSet === false) {
          navigateReplaceWhenReady('/auth/setup-parental-security-pin');
          return;
        }

        // Do not block launch on device-local "parent code" (setup-unlock-pin). That hash is often missing
        // after reinstall while the server parental PIN is already set — same screen felt like a duplicate PIN.
        // Child-tab "open parent mode" still uses /auth/switch-to-parent when a cached parent session exists.
      }

      switch (user?.role) {
        case UserRole.PARENT:
          // Route to Control Center (Milestone 1 new parent home)
          navigateReplaceWhenReady('/(parent)/control-center');
          break;
        case UserRole.CHILD:
          navigateReplaceWhenReady('/(child)/missions');
          break;
        case UserRole.TUTOR:
          navigateReplaceWhenReady('/(tutor)/portal');
          break;
        default:
          navigateReplaceWhenReady('/auth');
      }
    })();
  }, [
    navigationReady,
    isAuthenticated,
    user?.role,
    user?.parentalPinSet,
    navigateReplaceWhenReady,
  ]);

  // Expo Router requires a navigator on the first RootLayout render — never return null here.
  // SplashScreen stays up until fonts + auth finish (see hideAsync effect above).
  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <StatusBar style="auto" />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: 'transparent' },
            }}
          >
            <Stack.Screen name="auth" />
            <Stack.Screen name="(parent)" />
            <Stack.Screen name="(child)" />
            <Stack.Screen name="(tutor)" />
          </Stack>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

async function registerPushNotifications(): Promise<void> {
  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) {
    return;
  }
  try {
    const Notifications = require('expo-notifications');
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') return;

    const projectId =
      (Constants.expoConfig as { extra?: { eas?: { projectId?: string } } } | undefined)?.extra
        ?.eas?.projectId;
    const token = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId: String(projectId) } : undefined,
    );

    await apiClient.post(API_ENDPOINTS.notifications.registerToken, {
      expoPushToken: token.data,
    });
  } catch {
    // Push registration failure is non-critical
  }
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
