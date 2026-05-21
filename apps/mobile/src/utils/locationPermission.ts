import { Platform, Linking } from 'react-native';
import * as Location from 'expo-location';
import { launchAndroidLocationSettings } from '../android/androidPermissionIntents';

/** App may use location (Settings → App → Permissions). */
export async function isAppLocationPermissionGranted(): Promise<boolean> {
  const { status } = await Location.getForegroundPermissionsAsync();
  return status === 'granted';
}

/** Phone-wide GPS / Location toggle (quick settings). */
export async function isDeviceLocationServicesEnabled(): Promise<boolean> {
  try {
    return await Location.hasServicesEnabledAsync();
  } catch {
    return false;
  }
}

/** Both app access and system Location must be on. */
export async function isLocationFullyReady(): Promise<boolean> {
  return (await isAppLocationPermissionGranted()) && (await isDeviceLocationServicesEnabled());
}

export async function openDeviceLocationSettings(): Promise<void> {
  if (Platform.OS === 'android') {
    const opened = await launchAndroidLocationSettings();
    if (!opened) await Linking.openSettings();
    return;
  }
  await Linking.openSettings();
}
