import { AppState, AppStateStatus, Platform } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { apiClient } from './api.client';
import { API_ENDPOINTS, getApiBypassHostnames } from '../constants/api';
import { useAuthStore } from '../store/auth.store';
import { usePolicyStore } from '../store/policy.store';
import { UserRole, normalizeDomainForPolicy } from '@parentingmykid/shared-types';
import { notifyParentalPolicyUpdated } from '../native/parentalEnforcement';

import { buildNativeGameQuota, coercePersistedGameSettings } from '../utils/gameScreenPolicy';
import { buildNativeVideoPolicy, buildYoutubeNetworkFilter } from '../utils/videoManagerPolicy';
import { syncPendingUsageForChild } from './kidUsageSync.service';

import AsyncStorage from '@react-native-async-storage/async-storage';

const ACTIVE_KID_POLICY_KEY = '@pmk_active_kid_policy';
const latestMirroredControlsVersionByChild = new Map<string, number>();

/** When set on the parent app, automatic native policy sync is skipped so VPN/DNS stay off after Troubleshoot "release". */
export const PARENT_DEVICE_ENFORCEMENT_PAUSE_KEY = '@pmk_parent_device_enforcement_paused';

export async function setParentDeviceEnforcementPaused(paused: boolean): Promise<void> {
  if (paused) {
    await AsyncStorage.setItem(PARENT_DEVICE_ENFORCEMENT_PAUSE_KEY, '1');
  } else {
    await AsyncStorage.removeItem(PARENT_DEVICE_ENFORCEMENT_PAUSE_KEY);
  }
}

/** Clears the JS-side mirror of native policy (server + login unchanged). */
export async function clearActiveKidPolicyLocalMirror(): Promise<void> {
  await AsyncStorage.removeItem(ACTIVE_KID_POLICY_KEY);
}

/** API / Prisma Json may return string[] or a JSON string — keep in sync with website-blocker domainsFromApi. */
export function domainsArrayForNative(value: unknown): string[] {
  if (value == null) return [];
  if (Array.isArray(value)) {
    return [...new Set(
      value
        .filter((x): x is string => typeof x === 'string')
        .map((s) => normalizeDomainForPolicy(s))
        .filter(Boolean),
    )];
  }
  if (typeof value === 'string') {
    const t = value.trim();
    if (!t) return [];
    try {
      return domainsArrayForNative(JSON.parse(t) as unknown);
    } catch {
      const one = normalizeDomainForPolicy(t);
      return one ? [one] : [];
    }
  }
  return [];
}

/** Blocked app package ids (not domain names). */
function packageIdArrayFromControlsJson(v: unknown): string[] {
  if (v == null) return [];
  if (Array.isArray(v)) {
    return v
      .filter((x): x is string => typeof x === 'string')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
  }
  if (typeof v === 'string') {
    const t = v.trim();
    if (!t) return [];
    try {
      const parsed = JSON.parse(t) as unknown;
      if (Array.isArray(parsed)) {
        return parsed
          .filter((x): x is string => typeof x === 'string')
          .map((s) => s.trim().toLowerCase())
          .filter(Boolean);
      }
    } catch {
      /* single package name */
    }
    return [t.toLowerCase()];
  }
  return [];
}

/**
 * ScreenTimeControls uses `blockedApps` (String[]); Prisma also has legacy `blockedAppsJson`.
 * Merge + normalize so native enforcement matches the Block Apps UI.
 */
export function blockedPackagesFromControlsPayload(row: {
  blockedApps?: unknown;
  blockedAppsJson?: unknown;
}): string[] {
  const a = packageIdArrayFromControlsJson(row.blockedApps);
  const b = packageIdArrayFromControlsJson(row.blockedAppsJson);
  return [...new Set([...a, ...b])];
}

type ControlsPayload = {
  blockedApps?: unknown;
  blockedAppsJson?: unknown;
  appGuardEnabled?: boolean;
  blockAllAppsEnabled?: boolean;
  dailyLimitMinutes?: number | null;
  stopInternetEnabled?: boolean;
  stopInternetActivation?: string;
  stopInternetDelayedMinutes?: number;
  stopInternetBlockStartsAtUtc?: string | null;
  websiteFilteringEnabled?: boolean;
  websiteFilterMode?: string;
  blockedDomains?: unknown;
  allowedDomains?: unknown;
  blockNetworkChanges?: boolean;
  gamesEnabled?: boolean;
  gamingLimitMinutes?: number | null;
  gameSettings?: Record<string, unknown> | null;
  /** DB `videoSettings` JSON — mirrored as native `videoPolicy`. */
  videoSettings?: unknown;
};

function normalizeWebsiteFilterMode(data: ControlsPayload): 'WHITELIST' | 'BLACKLIST' {
  const m = data.websiteFilterMode;
  if (m === 'WHITELIST' || m === 'BLACKLIST') return m;
  return domainsArrayForNative(data.allowedDomains).length > 0 ? 'WHITELIST' : 'BLACKLIST';
}

/** True when native VPN should enforce full internet block (routes all IPv4 into tunnel). */
export function computeEffectiveStopInternet(data: ControlsPayload): boolean {
  if (data.stopInternetEnabled !== true) return false;
  const mode = (data.stopInternetActivation ?? 'IMMEDIATE').toString().toUpperCase();
  if (mode !== 'DELAYED') return true;
  const raw = data.stopInternetBlockStartsAtUtc;
  if (raw == null || raw === '') return false;
  const ms = typeof raw === 'string' ? Date.parse(raw) : NaN;
  if (!Number.isFinite(ms)) return false;
  return Date.now() >= ms;
}

export type PushPolicyOptions = {
  /**
   * Parent app mirroring a child's policy: website DNS + stop-internet only apply in Kid Mode
   * or when "apply block rules to parent" is on. Child devices must leave this false/omitted.
   */
  websiteDnsGatesOnKidMode?: boolean;
};

/**
 * Push parental policy into SharedPreferences + optional VPN so
 * ParentalAccessibilityService / VPN see the same rules as the server.
 * Must run on the child device after each policy fetch (was previously never called).
 */
export type FetchParentalPolicyOptions = {
  /** Call from Save on Block Apps / Website / Stop Internet so rules apply again on the device. */
  clearEnforcementPause?: boolean;
};

/** Parent device in Kid Handoff: load this child's controls and mirror into native prefs for Accessibility enforcement. */
export async function fetchAndPushParentalPolicyForChild(
  childId: string,
  opts?: FetchParentalPolicyOptions,
): Promise<void> {
  if (!childId) return;
  if (opts?.clearEnforcementPause) {
    await AsyncStorage.removeItem(PARENT_DEVICE_ENFORCEMENT_PAUSE_KEY);
  } else if ((await AsyncStorage.getItem(PARENT_DEVICE_ENFORCEMENT_PAUSE_KEY)) === '1') {
    return;
  }
  try {
    const { data } = await apiClient.get(`/safety/${childId}/parental-controls`, {
      params: { _ts: Date.now() },
      headers: {
        'Cache-Control': 'no-cache',
        Pragma: 'no-cache',
      },
    });
    const fetchedVersionRaw = (data as { controlsVersion?: unknown })?.controlsVersion;
    const fetchedVersion = typeof fetchedVersionRaw === 'number' ? fetchedVersionRaw : null;
    const latestMirrored = latestMirroredControlsVersionByChild.get(childId) ?? -1;
    // Guard against out-of-order stale fetches overriding a newer policy already mirrored to native.
    if (fetchedVersion != null && fetchedVersion < latestMirrored) {
      return;
    }
    await pushPolicyToNativeAndroid(
      {
        blockedApps: data.blockedApps,
        blockedAppsJson: data.blockedAppsJson,
        appGuardEnabled: data.appGuardEnabled,
        blockAllAppsEnabled: data.blockAllAppsEnabled,
        dailyLimitMinutes: data.dailyLimitMinutes,
        stopInternetEnabled: data.stopInternetEnabled,
        stopInternetActivation: data.stopInternetActivation,
        stopInternetDelayedMinutes: data.stopInternetDelayedMinutes,
        stopInternetBlockStartsAtUtc:
          typeof data.stopInternetBlockStartsAtUtc === 'string'
            ? data.stopInternetBlockStartsAtUtc
            : data.stopInternetBlockStartsAtUtc != null
              ? String(data.stopInternetBlockStartsAtUtc)
              : null,
        websiteFilteringEnabled: data.websiteFilteringEnabled,
        websiteFilterMode: data.websiteFilterMode,
        blockedDomains: data.blockedDomains,
        allowedDomains: data.allowedDomains,
        blockNetworkChanges: data.blockNetworkChanges === true,
        gamesEnabled: data.gamesEnabled,
        gamingLimitMinutes: data.gamingLimitMinutes,
        gameSettings:
          typeof data.gameSettingsJson === 'object' && data.gameSettingsJson != null
            ? (data.gameSettingsJson as Record<string, unknown>)
            : {},
        videoSettings: data.videoSettings ?? null,
      },
      { websiteDnsGatesOnKidMode: true },
    );
    if (fetchedVersion != null) {
      latestMirroredControlsVersionByChild.set(childId, fetchedVersion);
    }
    void syncPendingUsageForChild(childId);
  } catch {
    /* offline / no access */
  }
}

export async function pushPolicyToNativeAndroid(
  data: ControlsPayload,
  options?: PushPolicyOptions,
): Promise<void> {
  if (Platform.OS !== 'android') return;
  const { user } = useAuthStore.getState();
  if (user?.role === UserRole.PARENT && (await AsyncStorage.getItem(PARENT_DEVICE_ENFORCEMENT_PAUSE_KEY)) === '1') {
    return;
  }
  const effectiveStop = computeEffectiveStopInternet(data);
  const gamesOk = data.gamesEnabled !== false;
  const gm = typeof data.gamingLimitMinutes === 'number' ? data.gamingLimitMinutes : 45;
  const persisted = coercePersistedGameSettings(data.gameSettings ?? {}, gm);
  const gameQuota = gamesOk ? buildNativeGameQuota(persisted) : null;
  const videoPolicy = buildNativeVideoPolicy(data.videoSettings ?? {});
  const ytNetworkFilter = buildYoutubeNetworkFilter(data.videoSettings ?? {});
  try {
    const policyJson = JSON.stringify({
      blockedApps: blockedPackagesFromControlsPayload({
        blockedApps: data.blockedApps,
        blockedAppsJson: data.blockedAppsJson,
      }),
      appGuardEnabled: data.appGuardEnabled === true,
      blockAllAppsEnabled: data.blockAllAppsEnabled === true,
      dailyLimitMinutes: data.dailyLimitMinutes ?? null,
      stopInternetEnabled: effectiveStop,
      websiteFilteringEnabled: data.websiteFilteringEnabled === true,
      websiteFilterMode: normalizeWebsiteFilterMode(data),
      websiteDnsGatesOnKidMode: options?.websiteDnsGatesOnKidMode === true,
      blockedDomains: domainsArrayForNative(data.blockedDomains),
      allowedDomains: domainsArrayForNative(data.allowedDomains),
      apiBypassHostnames: getApiBypassHostnames(),
      blockNetworkChanges: data.blockNetworkChanges === true,
      gamesEnabled: gamesOk,
      gameQuota,
      videoPolicy,
      // YouTube network-level DNS filter (derived from Video Manager toggles).
      // These are consumed by ParentalVpnService independently of websiteFiltering.
      youtubeNetworkFilteringEnabled: ytNetworkFilter.youtubeNetworkFilteringEnabled,
      youtubeBlockedDomains: ytNetworkFilter.youtubeBlockedDomains,
      youtubeBypassDomains: ytNetworkFilter.youtubeBypassDomains,
    });
    await AsyncStorage.setItem(ACTIVE_KID_POLICY_KEY, policyJson);

    try {
      const ParentalControlModule = require('../../modules/parental-control/src/ParentalControlModule');
      // Native setPolicyCache persists JSON and runs syncVpnAfterParentalPrefsChange (stopService or start tunnel).
      await ParentalControlModule.setPolicyCache(policyJson);
    } catch {
      /* custom native module not in this binary */
    }
  } catch {
    /* offline / storage */
  }
}

const POLL_MS_FOREGROUND = 15_000;

let interval: ReturnType<typeof setInterval> | null = null;
let appSub: { remove: () => void } | null = null;
let netSub: (() => void) | null = null;

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
        blockAllAppsEnabled: data.blockAllAppsEnabled,
        dailyLimitMinutes: data.dailyLimitMinutes,
        stopInternetEnabled: data.stopInternetEnabled,
        stopInternetActivation: data.stopInternetActivation,
        stopInternetDelayedMinutes: data.stopInternetDelayedMinutes,
        stopInternetBlockStartsAtUtc: data.stopInternetBlockStartsAtUtc,
        websiteFilteringEnabled: data.websiteFilteringEnabled,
        websiteFilterMode: data.websiteFilterMode,
        blockedDomains: data.blockedDomains,
        allowedDomains: data.allowedDomains,
        blockNetworkChanges: data.blockNetworkChanges === true,
        gamesEnabled: data.gamesEnabled,
        gamingLimitMinutes: data.gamingLimitMinutes ?? null,
        gameSettings: data.gameSettings ?? null,
        videoSettings: data.videoSettings ?? null,
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

  netSub = NetInfo.addEventListener((state) => {
    if (state.isConnected !== true) return;
    const { user, isAuthenticated } = useAuthStore.getState();
    if (!isAuthenticated || user?.role !== UserRole.CHILD || !user?.childProfileId) return;
    void tick();
  });
}

export function stopPolicySync(): void {
  if (interval) {
    clearInterval(interval);
    interval = null;
  }
  appSub?.remove();
  appSub = null;
  netSub?.();
  netSub = null;
  usePolicyStore.getState().setControls(null);
}
