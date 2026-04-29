import { requireNativeModule } from 'expo-modules-core';

export type InstalledApp = {
  packageName: string;
  appName: string;
  category: string;
};

export type AppUsageStat = {
  packageName: string;
  appName: string;
  totalTimeInForeground: number; // milliseconds
};

export type ParentalPolicy = {
  blockedApps: string[];
  appGuardEnabled: boolean;
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
  isVpnRunning(): Promise<boolean>;
  hasVpnPermission(): Promise<boolean>;
  requestVpnPermission(): Promise<boolean>;
  openAppSettings(): Promise<boolean>;
  takeScreenshot(): Promise<string>;
  takeFrontCameraPhoto(): Promise<string>;
  hasCameraPermission(): Promise<boolean>;
  setPolicyCache(policyJson: string): Promise<void>;
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
