/**
 * Parental control native APIs + Android system settings intents.
 * Opening Accessibility / overlay / usage-access screens uses expo-intent-launcher first so
 * "Grant" works even when the custom ParentalControl native module is not linked (until you rebuild).
 */
import { Linking, Platform } from 'react-native';
import {
  launchAndroidAccessibilitySettings,
  launchAndroidApplicationDetailsSettings,
  launchAndroidOverlayPermission,
  launchAndroidUsageAccessSettings,
} from '../android/androidPermissionIntents';
export async function takeFrontCameraPhoto(): Promise<string | null> {
  try {
    const mod = require('../../modules/parental-control/src/ParentalControlModule');
    return await mod.takeFrontCameraPhoto();
  } catch {
    return null;
  }
}

export async function hasCameraPermission(): Promise<boolean> {
  try {
    const mod = require('../../modules/parental-control/src/ParentalControlModule');
    return await mod.hasCameraPermission();
  } catch {
    return false;
  }
}

export async function setPolicyCache(policyJson: string): Promise<void> {
  try {
    const mod = require('../../modules/parental-control/src/ParentalControlModule');
    await mod.setPolicyCache(policyJson);
  } catch {}
}

export async function getInstalledApps() {
  try {
    const mod = require('../../modules/parental-control/src/ParentalControlModule');
    return await mod.getInstalledApps();
  } catch {
    return [];
  }
}

export async function hasAccessibilityPermission(): Promise<boolean> {
  try {
    const mod = require('../../modules/parental-control/src/ParentalControlModule');
    return await mod.hasAccessibilityPermission();
  } catch {
    return false;
  }
}

export async function requestAccessibilityPermission(): Promise<boolean> {
  if (Platform.OS === 'android') {
    const opened = await launchAndroidAccessibilitySettings();
    if (opened) return true;
  }
  try {
    const mod = require('../../modules/parental-control/src/ParentalControlModule');
    await mod.requestAccessibilityPermission();
    return true;
  } catch {
    return false;
  }
}

export async function hasOverlayPermission(): Promise<boolean> {
  try {
    const mod = require('../../modules/parental-control/src/ParentalControlModule');
    return await mod.hasOverlayPermission();
  } catch {
    return false;
  }
}

export async function requestOverlayPermission(): Promise<boolean> {
  if (Platform.OS === 'android') {
    const opened = await launchAndroidOverlayPermission();
    if (opened) return true;
  }
  try {
    const mod = require('../../modules/parental-control/src/ParentalControlModule');
    await mod.requestOverlayPermission();
    return true;
  } catch {
    return false;
  }
}

export async function hasUsageStatsPermission(): Promise<boolean> {
  try {
    const mod = require('../../modules/parental-control/src/ParentalControlModule');
    return await mod.hasUsageStatsPermission();
  } catch {
    return false;
  }
}

export async function requestUsageStatsPermission(): Promise<boolean> {
  if (Platform.OS === 'android') {
    const opened = await launchAndroidUsageAccessSettings();
    if (opened) return true;
  }
  try {
    const mod = require('../../modules/parental-control/src/ParentalControlModule');
    await mod.requestUsageStatsPermission();
    return true;
  } catch {
    return false;
  }
}

export async function isVpnRunning(): Promise<boolean> {
  try {
    const mod = require('../../modules/parental-control/src/ParentalControlModule');
    return await mod.isVpnRunning();
  } catch {
    return false;
  }
}

export async function startVpn(blockedDomains: string[]): Promise<void> {
  try {
    const mod = require('../../modules/parental-control/src/ParentalControlModule');
    await mod.startVpn(blockedDomains);
  } catch {}
}

export async function stopVpn(): Promise<void> {
  try {
    const mod = require('../../modules/parental-control/src/ParentalControlModule');
    await mod.stopVpn();
  } catch {}
}

export async function hasVpnPermission(): Promise<boolean> {
  try {
    const mod = require('../../modules/parental-control/src/ParentalControlModule');
    return await mod.hasVpnPermission();
  } catch {
    return false;
  }
}

export async function requestVpnPermission(): Promise<boolean> {
  try {
    const mod = require('../../modules/parental-control/src/ParentalControlModule');
    return await mod.requestVpnPermission();
  } catch {
    return false;
  }
}

/**
 * Opens full App info (APPLICATION_DETAILS_SETTINGS). Order matters on OEM skins:
 * 1) Native `openAppSettings()` uses current Activity (no FLAG_ACTIVITY_NEW_TASK when possible — fixes ⋮ on many devices)
 * 2) expo-intent-launcher fallback
 * 3) Linking fallback
 */
export async function openAppSettings(): Promise<boolean> {
  if (Platform.OS === 'android') {
    try {
      const mod = require('../../modules/parental-control/src/ParentalControlModule');
      if (typeof mod.openAppSettings === 'function') {
        const ok = await mod.openAppSettings();
        if (ok) return true;
      }
    } catch {}
    const launcherOk = await launchAndroidApplicationDetailsSettings();
    if (launcherOk) return true;
  }
  try {
    await Linking.openSettings();
    return true;
  } catch {
    return false;
  }
}
