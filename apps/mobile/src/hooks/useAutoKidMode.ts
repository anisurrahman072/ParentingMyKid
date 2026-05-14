/**
 * @module useAutoKidMode.ts
 * @description Feature 2 — Auto Kid Mode
 *
 * Monitors AppState changes + persists idle timestamps so the app can
 * auto-switch to Kid Mode when the device has been idle / screen-locked for
 * more than the parent-configured number of minutes.
 *
 * Design:
 * - Background / inactive → persist `Date.now()` to AsyncStorage
 * - Active (screen unlock or cold-start resume) → compute elapsed ms
 * - If elapsed >= threshold AND `enabled` → fire `onIdleExpired()`
 * - `_layout.tsx` responds by routing to the kid-mode screen
 *
 * Cold-start: the timestamp written when the app last went to background is
 * checked on first mount, so a force-quit + re-open still triggers correctly.
 */
import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const AUTO_KID_MODE_BG_KEY = '@pmk_auto_km_bg_at';

interface UseAutoKidModeOptions {
  /** Whether the feature is active (parent setting). */
  enabled: boolean;
  /**
   * When false, idle checks are skipped so `onIdleExpired` never calls `router.replace`
   * before the root navigator has mounted (Expo Router).
   */
  navigationReady?: boolean;
  /** Idle threshold in minutes (1–60). */
  idleMinutes: number;
  /** Called once when idle threshold is exceeded. Must be stable (useCallback). */
  onIdleExpired: () => void;
}

export function useAutoKidMode({
  enabled,
  navigationReady = true,
  idleMinutes,
  onIdleExpired,
}: UseAutoKidModeOptions) {
  const enabledRef = useRef(enabled);
  const idleMinutesRef = useRef(idleMinutes);
  const callbackRef = useRef(onIdleExpired);

  // Keep refs fresh so listeners never capture stale closures
  enabledRef.current = enabled;
  idleMinutesRef.current = idleMinutes;
  callbackRef.current = onIdleExpired;

  // Cold-start check: was the app backgrounded long before it opened?
  useEffect(() => {
    if (!enabled || !navigationReady) return;
    void checkIdle(idleMinutesRef.current, callbackRef.current);
  }, [enabled, navigationReady]);

  // Runtime: track background ↔ foreground transitions while the app is open.
  // We ALWAYS save the background timestamp (not gated by `enabled`) so that
  // when the parent later turns the feature on, the elapsed time is already recorded.
  useEffect(() => {
    const handleChange = (next: AppStateStatus) => {
      if (next === 'background' || next === 'inactive') {
        void saveBackgroundTimestamp();
      } else if (next === 'active') {
        if (enabledRef.current) {
          void checkIdle(idleMinutesRef.current, callbackRef.current);
        }
      }
    };

    const sub = AppState.addEventListener('change', handleChange);
    return () => sub.remove();
  }, []);
}

/** Persist the moment the app went to background. */
export async function saveBackgroundTimestamp(): Promise<void> {
  try {
    await AsyncStorage.setItem(AUTO_KID_MODE_BG_KEY, String(Date.now()));
  } catch {
    // storage unavailable — fail silently
  }
}

/** Read the stored background timestamp, compare to now, and fire callback if over threshold. */
async function checkIdle(idleMinutes: number, callback: () => void): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(AUTO_KID_MODE_BG_KEY);
    if (!raw) return;

    const bgAt = Number(raw);
    if (!bgAt || isNaN(bgAt)) return;

    const elapsedMs = Date.now() - bgAt;
    const thresholdMs = idleMinutes * 60 * 1000;

    // Consume the timestamp — only trigger once per idle period
    await AsyncStorage.removeItem(AUTO_KID_MODE_BG_KEY);

    if (elapsedMs >= thresholdMs) {
      callback();
    }
  } catch {
    // storage unavailable
  }
}
