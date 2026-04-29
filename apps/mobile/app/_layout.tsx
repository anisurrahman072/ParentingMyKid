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

import { useEffect } from 'react';
import { Stack, router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
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
import { AppState, InteractionManager, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useAuthStore } from '../src/store/auth.store';
import { UserRole } from '@parentingmykid/shared-types';
import { apiClient } from '../src/services/api.client';
import { API_ENDPOINTS } from '../src/constants/api';
import { deviceSessionService, CHILD_ID_KEY } from '../src/store/deviceSession.store';
import { startPolicySync, stopPolicySync } from '../src/services/policySync.service';
import { useThemeStore } from '../src/store/theme.store';

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
  const loadPersistedAuth = useAuthStore((s) => s.loadPersistedAuth);
  const { isLoading, isAuthenticated, user } = useAuthStore();
  const loadTheme = useThemeStore((s) => s.load);

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

  // Load auth state from SecureStore on startup
  useEffect(() => {
    void loadPersistedAuth();
  }, [loadPersistedAuth]);

  useEffect(() => {
    void loadTheme();
  }, [loadTheme]);

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
    if (isLoading || !fontsLoaded) return;

    if (!isAuthenticated) {
      // Check if language has been selected on first launch
      void (async () => {
        const langSelected = await AsyncStorage.getItem(LANGUAGE_SELECTED_KEY);
        if (!langSelected) {
          router.replace('/auth/language');
        } else {
          router.replace('/auth');
        }
      })();
      return;
    }

    void (async () => {
      if (user?.role === UserRole.PARENT) {
        // Check if parental PIN has been set up
        if (user?.parentalPinSet === false) {
          router.replace('/auth/setup-parental-security-pin');
          return;
        }

        const childPaired = await SecureStore.getItemAsync(CHILD_ID_KEY);
        const hasPin = await deviceSessionService.hasUnlockPin();
        if (childPaired && !hasPin) {
          router.replace('/auth/setup-unlock-pin');
          return;
        }
      }

      switch (user?.role) {
        case UserRole.PARENT:
          // Route to Control Center (Milestone 1 new parent home)
          router.replace('/(parent)/control-center');
          break;
        case UserRole.CHILD:
          router.replace('/(child)/missions');
          break;
        case UserRole.TUTOR:
          router.replace('/(tutor)/portal');
          break;
        default:
          router.replace('/auth');
      }
    })();
  }, [isAuthenticated, isLoading, fontsLoaded, user?.role]);

  if (!fontsLoaded || isLoading) {
    return null; // Splash screen still visible
  }

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
