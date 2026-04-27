/**
 * @module api.client.ts
 * @description Axios HTTP client with automatic JWT token injection and refresh.
 *              All API calls in the app use this client — never raw fetch().
 *
 * @business-rule Token refresh flow:
 *   1. Request goes out with access token in Authorization header
 *   2. If server returns 401 (token expired), interceptor silently refreshes
 *   3. Original request is retried with new access token
 *   4. If refresh also fails → user is logged out (session truly expired)
 */

import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL, API_ENDPOINTS } from '../constants/api';
import { useAuthStore, getStoredRefreshToken } from '../store/auth.store';

const REFRESH_TOKEN_KEY = 'pmk_refresh_token';

/** Single flight so parallel requests don’t all hit /auth/refresh at once. */
let ensureTokenPromise: Promise<void> | null = null;

function isPublicUnauthenticatedPath(url: string | undefined) {
  if (!url) return false;
  return (
    url.includes('/auth/login') ||
    url.includes('/auth/register') ||
    url.includes('/auth/refresh') ||
    url.includes('/auth/child-login') ||
    url.includes('pair-device/confirm')
  );
}

async function ensureAccessTokenInMemory(requestUrl: string | undefined) {
  if (isPublicUnauthenticatedPath(requestUrl)) {
    return;
  }
  if (useAuthStore.getState().accessToken) {
    return;
  }
  if (!ensureTokenPromise) {
    ensureTokenPromise = (async () => {
      const rt = await getStoredRefreshToken();
      if (!rt) {
        return;
      }
      await useAuthStore.getState().revalidateFromSecureStore();
    })().finally(() => {
      ensureTokenPromise = null;
    });
  }
  await ensureTokenPromise;
}

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 second timeout — AI endpoints can be slow
  headers: {
    'Content-Type': 'application/json',
  },
});

// ─── Request Interceptor — Attach JWT ─────────────────────────────────────────

apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    await ensureAccessTokenInMemory(config.url);
    const { accessToken } = useAuthStore.getState();
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// ─── Response Interceptor — Handle Token Refresh ──────────────────────────────

let isRefreshing = false;
let refreshQueue: Array<(token: string) => void> = [];

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // Queue this request until refresh completes
        return new Promise((resolve) => {
          refreshQueue.push((token: string) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            resolve(apiClient(originalRequest));
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = await getStoredRefreshToken();
        if (!refreshToken) {
          await useAuthStore.getState().logout();
          return Promise.reject(error);
        }

        const response = await axios.post(`${API_BASE_URL}${API_ENDPOINTS.auth.refresh}`, {
          refreshToken,
        });

        const { accessToken, refreshToken: newRefreshToken } = response.data as {
          accessToken: string;
          refreshToken: string;
        };
        useAuthStore.getState().setAccessToken(accessToken);
        if (newRefreshToken) {
          await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, newRefreshToken);
        }

        // Drain the queue with new token
        refreshQueue.forEach((callback) => callback(accessToken));
        refreshQueue = [];

        // Retry the original request
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return apiClient(originalRequest);
      } catch (refreshErr) {
        // Only clear the session when the server rejects the refresh token — not on network blips
        if (
          axios.isAxiosError(refreshErr) &&
          (refreshErr.response?.status === 401 || refreshErr.response?.status === 403)
        ) {
          await useAuthStore.getState().logout();
        }
        return Promise.reject(error);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

export { apiClient };
