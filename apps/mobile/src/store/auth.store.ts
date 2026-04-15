/**
 * @module auth.store.ts
 * @description Zustand auth store — manages authentication state across the app.
 *              Persists tokens securely using Expo SecureStore (device keychain).
 *
 * @business-rule Token persistence is critical:
 *   - Access token: kept in memory (Zustand state) — short-lived (15 min)
 *   - Refresh token: stored in SecureStore — long-lived (7 days), rotated on use
 *   - User role: determines which UI the user sees (parent vs child vs tutor)
 */

import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { UserProfile } from '@parentingmykid/shared-types';

const REFRESH_TOKEN_KEY = 'pmk_refresh_token';
const USER_DATA_KEY = 'pmk_user_data';

interface AuthState {
  // Current state
  accessToken: string | null;
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  familyIds: string[];

  // Actions
  login: (accessToken: string, refreshToken: string, user: UserProfile) => Promise<void>;
  logout: () => Promise<void>;
  setAccessToken: (token: string) => void;
  loadPersistedAuth: () => Promise<void>;
  updateUser: (user: Partial<UserProfile>) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  accessToken: null,
  user: null,
  isAuthenticated: false,
  isLoading: true,
  familyIds: [],

  /**
   * Called after successful login or registration.
   * Stores refresh token securely, keeps access token in memory.
   */
  login: async (accessToken: string, refreshToken: string, user: UserProfile) => {
    // Store refresh token securely in device keychain
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
    // Cache user data for faster re-login
    await SecureStore.setItemAsync(USER_DATA_KEY, JSON.stringify(user));

    set({
      accessToken,
      user,
      isAuthenticated: true,
      isLoading: false,
    });
  },

  /**
   * Clears all auth state and removes persisted tokens.
   * Called on logout or when refresh token is invalid.
   */
  logout: async () => {
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
    await SecureStore.deleteItemAsync(USER_DATA_KEY);

    set({
      accessToken: null,
      user: null,
      isAuthenticated: false,
      isLoading: false,
      familyIds: [],
    });
  },

  setAccessToken: (token: string) => {
    set({ accessToken: token });
  },

  /**
   * Called on app startup to restore auth state from SecureStore.
   * If refresh token exists, triggers a silent token refresh.
   */
  loadPersistedAuth: async () => {
    set({ isLoading: true });
    try {
      const userData = await SecureStore.getItemAsync(USER_DATA_KEY);
      const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);

      if (userData && refreshToken) {
        const user = JSON.parse(userData) as UserProfile;
        set({ user, isAuthenticated: true });
        // Access token will be refreshed by the API interceptor on first request
      }
    } catch {
      // SecureStore read failed — user needs to log in again
    } finally {
      set({ isLoading: false });
    }
  },

  updateUser: (updates: Partial<UserProfile>) => {
    const current = get().user;
    if (current) {
      set({ user: { ...current, ...updates } });
    }
  },
}));

// Helper to get the stored refresh token (used by API interceptor)
export const getStoredRefreshToken = (): Promise<string | null> => {
  return SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
};
