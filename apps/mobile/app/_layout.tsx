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
import { StyleSheet } from 'react-native';
import { useAuthStore } from '../src/store/auth.store';
import { UserRole } from '@parentingmykid/shared-types';
import { apiClient } from '../src/services/api.client';
import { API_ENDPOINTS } from '../src/constants/api';

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
  const { loadPersistedAuth, isLoading, isAuthenticated, user } = useAuthStore();

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
    loadPersistedAuth();
  }, []);

  // Register Expo push token once authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      registerPushNotifications();
    }
  }, [isAuthenticated]);

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
      router.replace('/auth');
      return;
    }

    // Role-based routing — each role sees a completely different app experience
    switch (user?.role) {
      case UserRole.PARENT:
        router.replace('/(parent)/dashboard');
        break;
      case UserRole.CHILD:
        router.replace('/(child)/missions');
        break;
      case UserRole.TUTOR:
        router.replace('/(tutor)');
        break;
      default:
        router.replace('/auth');
    }
  }, [isAuthenticated, isLoading, fontsLoaded, user?.role]);

  if (!fontsLoaded || isLoading) {
    return null; // Splash screen still visible
  }

  return (
    <GestureHandlerRootView style={styles.root}>
      <QueryClientProvider client={queryClient}>
        <StatusBar style="auto" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="auth" />
          <Stack.Screen name="(parent)" />
          <Stack.Screen name="(child)" />
          <Stack.Screen name="(tutor)" />
        </Stack>
      </QueryClientProvider>
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

    const token = await Notifications.getExpoPushTokenAsync({
      projectId: 'your-expo-project-id', // Set in app.json extra.eas.projectId
    });

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
