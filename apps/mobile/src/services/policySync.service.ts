import { AppState, AppStateStatus, Platform } from 'react-native';
import { apiClient } from './api.client';
import { API_ENDPOINTS } from '../constants/api';
import { useAuthStore } from '../store/auth.store';
import { usePolicyStore } from '../store/policy.store';
import { UserRole } from '@parentingmykid/shared-types';
import { notifyParentalPolicyUpdated } from '../native/parentalEnforcement';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ACTIVE_KID_POLICY_KEY = '@pmk_active_kid_policy';

/** API / Prisma may return Json fields as arrays or need normalizing */
function asStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === 'string');
}

type ControlsPayload = {
  blockedApps?: string[];
  appGuardEnabled?: boolean;
  dailyLimitMinutes?: number | null;
  stopInternetEnabled?: boolean;
  blockedDomains?: unknown;
  allowedDomains?: unknown;
};

/**
 * Push parental policy into SharedPreferences + optional VPN so
 * ParentalAccessibilityService / VPN see the same rules as the server.
 * Must run on the child device after each policy fetch (was previously never called).
 */
export async function pushPolicyToNativeAndroid(data: ControlsPayload): Promise<void> {
  if (Platform.OS !== 'android') return;
  try {
    const policyJson = JSON.stringify({
      blockedApps: data.blockedApps ?? [],
      appGuardEnabled: data.appGuardEnabled ?? false,
      dailyLimitMinutes: data.dailyLimitMinutes ?? null,
      stopInternetEnabled: data.stopInternetEnabled ?? false,
      blockedDomains: asStringArray(data.blockedDomains),
      allowedDomains: asStringArray(data.allowedDomains),
    });
    await AsyncStorage.setItem(ACTIVE_KID_POLICY_KEY, policyJson);

    try {
      const ParentalControlModule = require('../../modules/parental-control/src/ParentalControlModule');
      await ParentalControlModule.setPolicyCache(policyJson);
      if (data.stopInternetEnabled) {
        await ParentalControlModule.startVpn(asStringArray(data.blockedDomains));
      } else {
        await ParentalControlModule.stopVpn().catch(() => {});
      }
    } catch {
      /* custom native module not in this binary */
    }
  } catch {
    /* offline / storage */
  }
}

const POLL_MS_FOREGROUND = 60_000;

let interval: ReturnType<typeof setInterval> | null = null;
let appSub: { remove: () => void } | null = null;

export function startPolicySync(): void {
  stopPolicySync();

  async function tick() {
    const { user, isAuthenticated } = useAuthStore.getState();
    if (!isAuthenticated || user?.role !== UserRole.CHILD || !user?.childProfileId) return;
    if (AppState.currentState !== 'active') return;
    try {
      const { data } = await apiClient.get<import('@parentingmykid/shared-types').ScreenTimeControls>(
        API_ENDPOINTS.safety.controlsSelf(user.childProfileId),
      );
      usePolicyStore.getState().setControls(data);
      notifyParentalPolicyUpdated(data.controlsVersion);
      await pushPolicyToNativeAndroid({
        blockedApps: data.blockedApps,
        appGuardEnabled: data.appGuardEnabled,
        dailyLimitMinutes: data.dailyLimitMinutes,
        stopInternetEnabled: data.stopInternetEnabled,
        blockedDomains: data.blockedDomains,
        allowedDomains: data.allowedDomains,
      });
    } catch {
      /* offline */
    }
  }

  void tick();
  interval = setInterval(tick, POLL_MS_FOREGROUND);

  const onChange = (s: AppStateStatus) => {
    if (s === 'active') void tick();
  };
  const sub = AppState.addEventListener('change', onChange);
  appSub = { remove: () => sub.remove() };
}

export function stopPolicySync(): void {
  if (interval) {
    clearInterval(interval);
    interval = null;
  }
  appSub?.remove();
  appSub = null;
  usePolicyStore.getState().setControls(null);
}
