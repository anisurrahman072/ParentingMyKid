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
import axios from 'axios';
import { UserProfile } from '@parentingmykid/shared-types';
import { useFamilyStore } from './family.store';
import { API_BASE_URL, API_ENDPOINTS } from '../constants/api';

const REFRESH_TOKEN_KEY = 'pmk_refresh_token';
const USER_DATA_KEY = 'pmk_user_data';

type RefreshOutcome = 'success' | 'unauthorized' | 'offline';

/** Single-flight refresh so parallel callers don’t rotate the same refresh token twice. */
let refreshFlight: Promise<RefreshOutcome> | null = null;

async function runTokenRefresh(): Promise<RefreshOutcome> {
  if (refreshFlight) return refreshFlight;
  refreshFlight = (async (): Promise<RefreshOutcome> => {
    try {
      const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
      if (!refreshToken) return 'unauthorized';
      try {
        const response = await axios.post(`${API_BASE_URL}${API_ENDPOINTS.auth.refresh}`, {
          refreshToken,
        });
        const { accessToken, refreshToken: newRt } = response.data as {
          accessToken: string;
          refreshToken?: string;
        };
        useAuthStore.getState().setAccessToken(accessToken);
        if (newRt) {
          await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, newRt);
        }
        return 'success';
      } catch (e) {
        if (axios.isAxiosError(e) && (e.response?.status === 401 || e.response?.status === 403)) {
          return 'unauthorized';
        }
        return 'offline';
      }
    } finally {
      refreshFlight = null;
    }
  })();
  return refreshFlight;
}

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
  loadPersistedAuth: (opts?: { silent?: boolean }) => Promise<void>;
  /**
   * Re-apply user + access token from SecureStore (no full loading screen).
   * Use after Fast Refresh or when the zustand store was reset in memory but the device still has a session.
   */
  revalidateFromSecureStore: () => Promise<void>;
  updateUser: (user: Partial<UserProfile>) => void;
  /** Sets access (and optional rotated refresh) from refresh token — used when only SecureStore is hydrated. */
  refreshAccessToken: () => Promise<boolean>;
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
      familyIds: user.familyIds ?? [],
    });

    if (user.familyIds && user.familyIds.length > 0) {
      useFamilyStore.getState().setActiveFamilyId(user.familyIds[0]);
    }
  },

  /**
   * Clears all auth state and removes persisted tokens.
   * Called on logout or when refresh token is invalid.
   */
  logout: async () => {
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
    await SecureStore.deleteItemAsync(USER_DATA_KEY);

    useFamilyStore.getState().clearFamilyContext();

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
   * Fetches a new access token so requests don’t 401 and trigger accidental logout.
   * @param silent - if true, does not flip `isLoading` (e.g. background revalidation)
   */
  loadPersistedAuth: async (opts?: { silent?: boolean }) => {
    const silent = opts?.silent === true;
    if (!silent) {
      set({ isLoading: true });
    }
    try {
      const userData = await SecureStore.getItemAsync(USER_DATA_KEY);
      const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);

      if (userData && refreshToken) {
        const user = JSON.parse(userData) as UserProfile;
        set({ user, isAuthenticated: true, familyIds: user.familyIds ?? [] });
        if (user.familyIds && user.familyIds.length > 0) {
          useFamilyStore.getState().setActiveFamilyId(user.familyIds[0]);
        }
        const outcome = await runTokenRefresh();
        if (outcome === 'unauthorized') {
          await get().logout();
        }
      }
    } catch {
      if (!silent) {
        // SecureStore read failed — clear stuck loading only when not silent
      }
    } finally {
      if (!silent) {
        set({ isLoading: false });
      }
    }
  },

  revalidateFromSecureStore: async () => {
    const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
    const userData = await SecureStore.getItemAsync(USER_DATA_KEY);
    if (!refreshToken || !userData) {
      return;
    }
    try {
      const user = JSON.parse(userData) as UserProfile;
      set({ user, isAuthenticated: true, familyIds: user.familyIds ?? [] });
      if (user.familyIds && user.familyIds.length > 0) {
        useFamilyStore.getState().setActiveFamilyId(user.familyIds[0]);
      }
      const outcome = await runTokenRefresh();
      if (outcome === 'unauthorized') {
        await get().logout();
      }
    } catch {
      // ignore
    }
  },

  updateUser: (updates: Partial<UserProfile>) => {
    const current = get().user;
    if (current) {
      set({ user: { ...current, ...updates } });
    }
  },

  refreshAccessToken: async () => (await runTokenRefresh()) === 'success',
}));

// Helper to get the stored refresh token (used by API interceptor)
export const getStoredRefreshToken = (): Promise<string | null> => {
  return SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
};
