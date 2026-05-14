import { requireNativeModule } from 'expo-modules-core';

export type InstalledApp = {
  packageName: string;
  appName: string;
  category: string;
  /** PNG bytes as base64 (Android native); use `data:image/png;base64,` in Image uri */
  iconBase64?: string;
};

export type AppUsageStat = {
  packageName: string;
  appName: string;
  totalTimeInForeground: number; // milliseconds
};

export type ParentalPolicy = {
  blockedApps: string[];
  appGuardEnabled: boolean;
  blockAllAppsEnabled: boolean;
  dailyLimitMinutes: number | null;
  stopInternetEnabled: boolean;
};

/** Native Kotlin module — present after a native rebuild (expo run:android / EAS) when autolinking includes this package. */
type NativeParentalControl = {
  getInstalledApps(): Promise<InstalledApp[]>;
  getAppUsageStats(startMs: number, endMs: number): Promise<AppUsageStat[]>;
  hasUsageStatsPermission(): Promise<boolean>;
  requestUsageStatsPermission(): Promise<void>;
  hasAccessibilityPermission(): Promise<boolean>;
  requestAccessibilityPermission(): Promise<void>;
  hasOverlayPermission(): Promise<boolean>;
  requestOverlayPermission(): Promise<void>;
  startVpn(blockedDomains: string[]): Promise<void>;
  stopVpn(): Promise<void>;
  /** Stop VPN/overlay, neutralize native policy prefs (login + server rules unchanged). */
  releaseDeviceEnforcementState(): Promise<void>;
  isVpnRunning(): Promise<boolean>;
  hasVpnPermission(): Promise<boolean>;
  requestVpnPermission(): Promise<boolean>;
  openAppSettings(): Promise<boolean>;
  takeScreenshot(): Promise<string>;
  takeFrontCameraPhoto(): Promise<string>;
  hasCameraPermission(): Promise<boolean>;
  setPolicyCache(policyJson: string): Promise<void>;
  // Feature 1 — block rules for parent
  setKidModeActive(active: boolean): Promise<void>;
  setApplyRulesToParent(enabled: boolean): Promise<void>;
  setOverlayPinHash(hash: string): Promise<void>;
  setOverlayChildId(childId: string): Promise<void>;
  consumePendingModeSwitch(): Promise<string | null>;
  consumePendingGameQuotaMessage(): Promise<Record<string, string> | null>;
  // Feature 3 — quick-access overlay
  startOverlayService(): Promise<void>;
  stopOverlayService(): Promise<void>;
  isOverlayRunning(): Promise<boolean>;
  // Background execution
  hasBatteryOptimizationExemption(): Promise<boolean>;
  requestBatteryOptimizationExemption(): Promise<void>;
  /** JSON object map package -> ms today */
  getKidTodayUsage(kidId: string): Promise<string>;
  /** Pending session segments JSON array */
  getPendingUsageSessions(kidId: string): Promise<string>;
  markUsageSessionsSynced(kidId: string, upToEpochMs: number): Promise<void>;
};

let nativeModule: NativeParentalControl | null | undefined;

const NATIVE_MISSING = 'ParentalControl native module is not linked (use a dev build with the parental-control native code).';

function getNative(): NativeParentalControl | null {
  if (nativeModule !== undefined) {
    return nativeModule;
  }
  try {
    nativeModule = requireNativeModule<NativeParentalControl>('ParentalControl');
  } catch {
    nativeModule = null;
  }
  return nativeModule;
}

export function getInstalledApps(): Promise<InstalledApp[]> {
  const n = getNative();
  if (!n) return Promise.resolve([]);
  return n.getInstalledApps();
}

export function getAppUsageStats(startMs: number, endMs: number): Promise<AppUsageStat[]> {
  const n = getNative();
  if (!n) return Promise.resolve([]);
  return n.getAppUsageStats(startMs, endMs);
}

export function hasUsageStatsPermission(): Promise<boolean> {
  const n = getNative();
  if (!n) return Promise.resolve(false);
  return n.hasUsageStatsPermission();
}

export function requestUsageStatsPermission(): Promise<void> {
  const n = getNative();
  if (!n) return Promise.reject(new Error(NATIVE_MISSING));
  return n.requestUsageStatsPermission();
}

export function hasAccessibilityPermission(): Promise<boolean> {
  const n = getNative();
  if (!n) return Promise.resolve(false);
  return n.hasAccessibilityPermission();
}

export function requestAccessibilityPermission(): Promise<void> {
  const n = getNative();
  if (!n) return Promise.reject(new Error(NATIVE_MISSING));
  return n.requestAccessibilityPermission();
}

export function hasOverlayPermission(): Promise<boolean> {
  const n = getNative();
  if (!n) return Promise.resolve(false);
  return n.hasOverlayPermission();
}

export function requestOverlayPermission(): Promise<void> {
  const n = getNative();
  if (!n) return Promise.reject(new Error(NATIVE_MISSING));
  return n.requestOverlayPermission();
}

export function startVpn(blockedDomains: string[]): Promise<void> {
  const n = getNative();
  if (!n) return Promise.resolve();
  return n.startVpn(blockedDomains);
}

export function stopVpn(): Promise<void> {
  const n = getNative();
  if (!n) return Promise.resolve();
  return n.stopVpn();
}

export function releaseDeviceEnforcementState(): Promise<void> {
  const n = getNative();
  if (!n) return Promise.resolve();
  return n.releaseDeviceEnforcementState();
}

export function isVpnRunning(): Promise<boolean> {
  const n = getNative();
  if (!n) return Promise.resolve(false);
  return n.isVpnRunning();
}

export function hasVpnPermission(): Promise<boolean> {
  const n = getNative();
  if (!n) return Promise.resolve(false);
  return n.hasVpnPermission();
}

export function requestVpnPermission(): Promise<boolean> {
  const n = getNative();
  if (!n) return Promise.resolve(false);
  return n.requestVpnPermission();
}

export function openAppSettings(): Promise<boolean> {
  const n = getNative();
  if (!n) return Promise.resolve(false);
  return n.openAppSettings();
}

export function takeScreenshot(): Promise<string> {
  const n = getNative();
  if (!n) return Promise.resolve('');
  return n.takeScreenshot();
}

export function takeFrontCameraPhoto(): Promise<string> {
  const n = getNative();
  if (!n) return Promise.resolve('');
  return n.takeFrontCameraPhoto();
}

export function hasCameraPermission(): Promise<boolean> {
  const n = getNative();
  if (!n) return Promise.resolve(false);
  return n.hasCameraPermission();
}

export function setPolicyCache(policyJson: string): Promise<void> {
  const n = getNative();
  if (!n) return Promise.resolve();
  return n.setPolicyCache(policyJson);
}

// ─── Feature 1: Block rules for parent ──────────────────────────────────────

export function setKidModeActive(active: boolean): Promise<void> {
  const n = getNative();
  if (!n) return Promise.resolve();
  return n.setKidModeActive(active);
}

export function setApplyRulesToParent(enabled: boolean): Promise<void> {
  const n = getNative();
  if (!n) return Promise.resolve();
  return n.setApplyRulesToParent(enabled);
}

export function setOverlayPinHash(hash: string): Promise<void> {
  const n = getNative();
  if (!n) return Promise.resolve();
  return n.setOverlayPinHash(hash);
}

export function setOverlayChildId(childId: string): Promise<void> {
  const n = getNative();
  if (!n) return Promise.resolve();
  return n.setOverlayChildId(childId);
}

export function consumePendingModeSwitch(): Promise<string | null> {
  const n = getNative();
  if (!n) return Promise.resolve(null);
  return n.consumePendingModeSwitch();
}

export async function consumePendingGameQuotaMessage(): Promise<{ title: string; body: string } | null> {
  const n = getNative();
  if (!n) return null;
  const raw = await n.consumePendingGameQuotaMessage();
  if (!raw || typeof raw.title !== 'string') return null;
  return { title: raw.title, body: typeof raw.body === 'string' ? raw.body : '' };
}

/** On-device totals (ms/pkg) JSON string `{}` — Android only */
export async function getKidTodayUsage(kidId: string): Promise<string> {
  const n = getNative();
  if (!n) return '{}';
  try {
    return await n.getKidTodayUsage(kidId);
  } catch {
    return '{}';
  }
}

/** Pending closed sessions JSON array — Android only */
export async function getPendingUsageSessions(kidId: string): Promise<string> {
  const n = getNative();
  if (!n) return '[]';
  try {
    return await n.getPendingUsageSessions(kidId);
  } catch {
    return '[]';
  }
}

export async function markUsageSessionsSynced(kidId: string, upToEpochMs: number): Promise<void> {
  const n = getNative();
  if (!n) return;
  try {
    await n.markUsageSessionsSynced(kidId, upToEpochMs);
  } catch {}
}

// ─── Feature 3: Quick-access overlay ────────────────────────────────────────

export function startOverlayService(): Promise<void> {
  const n = getNative();
  if (!n) return Promise.reject(new Error(NATIVE_MISSING));
  return n.startOverlayService();
}

export function stopOverlayService(): Promise<void> {
  const n = getNative();
  if (!n) return Promise.resolve();
  return n.stopOverlayService();
}

export function isOverlayRunning(): Promise<boolean> {
  const n = getNative();
  if (!n) return Promise.resolve(false);
  return n.isOverlayRunning();
}

// ─── Background execution (battery optimization) ────────────────────────────

/**
 * Returns true if this app is exempt from Android battery optimization (Doze mode).
 * When true, the overlay service can run unthrottled while the screen is off.
 */
export function hasBatteryOptimizationExemption(): Promise<boolean> {
  const n = getNative();
  if (!n) return Promise.resolve(false);
  return n.hasBatteryOptimizationExemption();
}

/**
 * Opens the system "Run in background" / battery optimization exemption dialog.
 * On standard Android: shows the direct ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS dialog.
 * On OEM skins that block it (Huawei, Xiaomi, etc.): falls back to battery settings list.
 */
export function requestBatteryOptimizationExemption(): Promise<void> {
  const n = getNative();
  if (!n) return Promise.reject(new Error(NATIVE_MISSING));
  return n.requestBatteryOptimizationExemption();
}
