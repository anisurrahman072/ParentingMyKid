/**
 * Opens Android system permission screens via Intent (same UX as typical parental-control apps).
 * Uses expo-intent-launcher so this works in dev clients without the custom ParentalControl native module.
 */
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as IntentLauncher from 'expo-intent-launcher';

function androidPackageName(): string {
  const legacy = Constants.manifest as { android?: { package?: string } } | undefined;
  return Constants.expoConfig?.android?.package ?? legacy?.android?.package ?? 'com.parentingmykid.app';
}

/**
 * Full system "App info" screen (same entry as Settings → Apps → this app). HiOS and some OEMs show a
 * stripped UI for Linking.openSettings(); this intent matches the manual path and usually shows ⋮.
 */
export async function launchAndroidApplicationDetailsSettings(): Promise<boolean> {
  if (Platform.OS !== 'android') return false;
  try {
    await IntentLauncher.startActivityAsync(IntentLauncher.ActivityAction.APPLICATION_DETAILS_SETTINGS, {
      data: `package:${androidPackageName()}`,
    });
    return true;
  } catch {
    return false;
  }
}

export async function launchAndroidAccessibilitySettings(): Promise<boolean> {
  if (Platform.OS !== 'android') return false;
  try {
    await IntentLauncher.startActivityAsync(IntentLauncher.ActivityAction.ACCESSIBILITY_SETTINGS);
    return true;
  } catch {
    return false;
  }
}

/** Settings → Display over other apps for this package */
export async function launchAndroidOverlayPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') return false;
  try {
    await IntentLauncher.startActivityAsync('android.settings.action.MANAGE_OVERLAY_PERMISSION', {
      data: `package:${androidPackageName()}`,
    });
    return true;
  } catch {
    return false;
  }
}

/** Settings → Special app access → Usage access */
export async function launchAndroidUsageAccessSettings(): Promise<boolean> {
  if (Platform.OS !== 'android') return false;
  try {
    await IntentLauncher.startActivityAsync('android.settings.action.USAGE_ACCESS_SETTINGS');
    return true;
  } catch {
    return false;
  }
}
