/**
 * @module auth.store.ts
 * @description Zustand auth store — manages authentication state across the app.
 *              Persists tokens securely using Expo SecureStore (device keychain).
 *
 * Device cache (minimal): SecureStore holds tokens + a slim user snapshot (ids, parentalPinSet, etc.).
 * We do not cache large/dynamic content (usage, articles). On cold start, cached user merges with
 * GET /auth/me when online. Parental PIN digits may come from `parentalPinDigits` on the profile
 * or from `parentPinPlainStorage` after sync.
 *
 * @business-rule Token persistence is critical:
 *   - Access token: Zustand + SecureStore (server default long-lived; restored on launch)
 *   - Refresh token: SecureStore — long-lived (server env), rotated on use; Redis TTL matches JWT
 *   - Cached user profile JSON: SecureStore; if missing, GET /auth/me with access token
 *   - User role: determines which UI the user sees (parent vs child vs tutor)
 */

import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import axios from 'axios';
import { UserProfile } from '@parentingmykid/shared-types';
import { clearParentPinPlain } from '../services/parentPinPlainStorage';
import { useFamilyStore } from './family.store';
import { getResolvedActiveFamilyId } from './activeFamily.persistence';
import { API_BASE_URL, API_ENDPOINTS } from '../constants/api';
import { isAccessTokenUsable, decodeAccessTokenProfile } from '../utils/jwtExpiry';
import { syncNativeOverlayPinHashFromProfile } from '../services/overlayPinSync.service';

const REFRESH_TOKEN_KEY = 'pmk_refresh_token';
const USER_DATA_KEY = 'pmk_user_data';
const ACCESS_TOKEN_KEY = 'pmk_access_token';

/** Uses store access token; on 401 runs refresh once then retries (raw axios has no apiClient interceptor). */
async function fetchUserProfileWithBearer(): Promise<UserProfile> {
  const tryGet = async (bearer: string) =>
    axios.get<UserProfile>(`${API_BASE_URL}${API_ENDPOINTS.auth.me}`, {
      headers: { Authorization: `Bearer ${bearer}` },
      timeout: 20_000,
    });

  let at = useAuthStore.getState().accessToken;
  if (!at) {
    throw new Error('No access token');
  }
  try {
    const { data } = await tryGet(at);
    return data;
  } catch (e) {
    if (axios.isAxiosError(e) && e.response?.status === 401) {
      const o = await runTokenRefresh();
      if (o !== 'success') {
        throw e;
      }
      at = useAuthStore.getState().accessToken;
      if (!at) {
        throw e;
      }
      const { data } = await tryGet(at);
      return data;
    }
    throw e;
  }
}

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
  /**
   * After creating a new household, merge the id into the cached profile + SecureStore
   * and make it the active family. Call `refreshAccessToken` after so the JWT includes it.
   */
  appendFamilyId: (familyId: string) => Promise<void>;
  /** Sets access (and optional rotated refresh) from refresh token — used when only SecureStore is hydrated. */
  refreshAccessToken: () => Promise<boolean>;
  /**
   * GET /auth/me and merge into zustand + SecureStore — keeps parentalPinSet etc. aligned after server changes
   * or stale on-device snapshots.
   */
  refreshUserProfileFromServer: () => Promise<boolean>;
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
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
    await SecureStore.setItemAsync(USER_DATA_KEY, JSON.stringify(user));
    await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken);

    set({
      accessToken,
      user,
      isAuthenticated: true,
      isLoading: false,
      familyIds: user.familyIds ?? [],
    });

    const fids = user.familyIds ?? [];
    if (fids.length > 0) {
      const toActivate = await getResolvedActiveFamilyId(fids);
      if (toActivate) {
        useFamilyStore.getState().setActiveFamilyId(toActivate);
      }
    }

    void syncNativeOverlayPinHashFromProfile(user);
  },

  /**
   * Clears all auth state and removes persisted tokens.
   * Called on logout or when refresh token is invalid.
   */
  logout: async () => {
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
    await SecureStore.deleteItemAsync(USER_DATA_KEY);
    await clearParentPinPlain();
    try {
      await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
    } catch {
      // ignore
    }

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
    void SecureStore.setItemAsync(ACCESS_TOKEN_KEY, token);
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
      const [userJson, refresh, accessStored] = await Promise.all([
        SecureStore.getItemAsync(USER_DATA_KEY),
        SecureStore.getItemAsync(REFRESH_TOKEN_KEY),
        SecureStore.getItemAsync(ACCESS_TOKEN_KEY),
      ]);

      if (!refresh) {
        if (userJson) await SecureStore.deleteItemAsync(USER_DATA_KEY);
        if (accessStored) await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
        return;
      }

      let user: UserProfile | null = null;
      if (userJson) {
        try {
          user = JSON.parse(userJson) as UserProfile;
        } catch {
          user = null;
        }
      }

      let hadUsableCachedAccess = false;
      let haveAccess = false;

      if (accessStored && isAccessTokenUsable(accessStored)) {
        set({ accessToken: accessStored });
        hadUsableCachedAccess = true;
        haveAccess = true;
      } else {
        const outcome = await runTokenRefresh();
        if (outcome === 'unauthorized') {
          await get().logout();
          return;
        }
        haveAccess = useAuthStore.getState().accessToken != null;
        // Offline / transient: keep last access token in memory so the next request can refresh via interceptor
        if (!haveAccess && accessStored) {
          set({ accessToken: accessStored });
          haveAccess = true;
        }
      }

      let fetchedUserFromApi = false;
      if (!user) {
        const at = get().accessToken;
        if (!at) {
          const shell = decodeAccessTokenProfile(accessStored);
          if (shell) {
            set({
              accessToken: accessStored ?? null,
              user: shell,
              isAuthenticated: true,
              familyIds: shell.familyIds ?? [],
            });
          } else {
            await get().logout();
          }
          return;
        }
        try {
          const profile = await fetchUserProfileWithBearer();
          user = profile;
          await SecureStore.setItemAsync(USER_DATA_KEY, JSON.stringify(user));
          fetchedUserFromApi = true;
        } catch (e) {
          if (axios.isAxiosError(e) && (e.response?.status === 401 || e.response?.status === 403)) {
            await get().logout();
            return;
          }
          const shell = decodeAccessTokenProfile(at);
          if (shell) {
            set({
              accessToken: at,
              user: shell,
              isAuthenticated: true,
              familyIds: shell.familyIds ?? [],
            });
          }
          return;
        }
      }

      // Cached SecureStore snapshot can omit server-driven flags (parentalPinSet). Merge GET /auth/me once.
      if (user && !fetchedUserFromApi) {
        const atMerge = get().accessToken;
        if (atMerge) {
          try {
            user = await fetchUserProfileWithBearer();
            await SecureStore.setItemAsync(USER_DATA_KEY, JSON.stringify(user));
          } catch (e) {
            if (axios.isAxiosError(e) && (e.response?.status === 401 || e.response?.status === 403)) {
              await get().logout();
              return;
            }
            // Offline / flaky network — keep stale cache for UI until next successful refresh
          }
        }
      }

      if (!user) {
        await get().logout();
        return;
      }

      set({ user, isAuthenticated: true, familyIds: user.familyIds ?? [] });
      const fids = user.familyIds ?? [];
      if (fids.length > 0) {
        const toActivate = await getResolvedActiveFamilyId(fids);
        if (toActivate) {
          useFamilyStore.getState().setActiveFamilyId(toActivate);
        }
      }

      void syncNativeOverlayPinHashFromProfile(user);

      if (hadUsableCachedAccess) {
        void (async () => {
          const o = await runTokenRefresh();
          if (o === 'unauthorized' && isAccessTokenUsable(useAuthStore.getState().accessToken)) {
            return;
          }
          if (o === 'unauthorized') {
            await get().logout();
          }
        })();
      }
    } catch {
      // SecureStore or network: avoid leaving user stuck in loading when not silent
    } finally {
      if (!silent) {
        set({ isLoading: false });
      }
    }
  },

  revalidateFromSecureStore: async () => {
    await get().loadPersistedAuth({ silent: true });
  },

  updateUser: (updates: Partial<UserProfile>) => {
    const current = get().user;
    if (current) {
      const user = { ...current, ...updates };
      set({ user });
      void SecureStore.setItemAsync(USER_DATA_KEY, JSON.stringify(user));
    }
  },

  appendFamilyId: async (familyId: string) => {
    const u = get().user;
    if (!u) {
      return;
    }
    const existing = u.familyIds ?? [];
    const familyIds = existing.includes(familyId) ? existing : [...existing, familyId];
    const user: UserProfile = { ...u, familyIds };
    await SecureStore.setItemAsync(USER_DATA_KEY, JSON.stringify(user));
    set({ user, familyIds });
    useFamilyStore.getState().setActiveFamilyId(familyId);
  },

  refreshAccessToken: async () => (await runTokenRefresh()) === 'success',

  refreshUserProfileFromServer: async () => {
    const at = get().accessToken;
    const current = get().user;
    if (!at || !current) return false;
    try {
      const fresh = await fetchUserProfileWithBearer();
      set({ user: fresh, familyIds: fresh.familyIds ?? [] });
      await SecureStore.setItemAsync(USER_DATA_KEY, JSON.stringify(fresh));
      const fids = fresh.familyIds ?? [];
      if (fids.length > 0) {
        const toActivate = await getResolvedActiveFamilyId(fids);
        if (toActivate) useFamilyStore.getState().setActiveFamilyId(toActivate);
      }
      void syncNativeOverlayPinHashFromProfile(fresh);
      return true;
    } catch (e) {
      if (axios.isAxiosError(e) && (e.response?.status === 401 || e.response?.status === 403)) {
        await get().logout();
      }
      return false;
    }
  },
}));

// Helper to get the stored refresh token (used by API interceptor)
export const getStoredRefreshToken = (): Promise<string | null> => {
  return SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
};
