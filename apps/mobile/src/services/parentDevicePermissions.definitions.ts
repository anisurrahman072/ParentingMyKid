/**
 * Single source of truth for “device permission slots” shown on Control Center + Troubleshoot.
 * Android: native module checks; iOS: Troubleshoot still lists rows (existing behaviour).
 */
import { Platform, PermissionsAndroid, Linking, Alert } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Location from 'expo-location';
import { setWeatherLocationOptIn } from '../utils/weatherLocationPrefs';
import {
  isAppLocationPermissionGranted,
  isDeviceLocationServicesEnabled,
  isLocationFullyReady,
  openDeviceLocationSettings,
} from '../utils/locationPermission';
import {
  hasUsageStatsPermission,
  requestUsageStatsPermission,
  hasAccessibilityPermission,
  requestAccessibilityPermission,
  hasOverlayPermission,
  requestOverlayPermission,
  hasCameraPermission,
  hasVpnPermission,
  requestVpnPermission,
  hasBatteryOptimizationExemption,
  requestBatteryOptimizationExemption,
} from './ParentalControl';

export type ParentDevicePermissionDefinition = {
  id: string;
  icon: string;
  title: string;
  description: string;
  checkFn: () => Promise<boolean>;
  grantFn: () => void | Promise<void>;
};

export const PARENT_DEVICE_PERMISSION_SLOT_IDS = [
  'usage-access',
  'accessibility',
  'overlay',
  'vpn',
  'battery',
  'camera',
  'notifications',
  'location',
] as const;

export type ParentDevicePermissionSlotId = (typeof PARENT_DEVICE_PERMISSION_SLOT_IDS)[number];

export function buildParentDevicePermissionDefinitions(opts: {
  onAccessibilityHelp: () => void;
}): ParentDevicePermissionDefinition[] {
  return [
    {
      id: 'usage-access',
      icon: '📊',
      title: 'Usage access',
      description: 'See app activity and time limits on this device.',
      checkFn: () => hasUsageStatsPermission(),
      grantFn: async () => {
        const ok = await requestUsageStatsPermission();
        if (!ok) {
          Alert.alert('Usage access', 'Enable Usage access for ParentingMyKid in system settings.', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'App settings', onPress: () => void Linking.openSettings() },
          ]);
        }
      },
    },
    {
      id: 'accessibility',
      icon: '♿',
      title: 'Accessibility',
      description: 'Blocks apps & guards Kid Mode on this phone.',
      checkFn: () => hasAccessibilityPermission(),
      grantFn: opts.onAccessibilityHelp,
    },
    {
      id: 'overlay',
      icon: '🖥️',
      title: 'Display over apps',
      description: 'Shows gentle lock prompts when rules trigger.',
      checkFn: () => hasOverlayPermission(),
      grantFn: async () => {
        const ok = await requestOverlayPermission();
        if (!ok) {
          Alert.alert('Overlay', 'Allow “Display over other apps” for ParentingMyKid.', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'App settings', onPress: () => void Linking.openSettings() },
          ]);
        }
      },
    },
    {
      id: 'vpn',
      icon: '🔒',
      title: 'VPN consent',
      description: 'Website filtering & pause-internet use a local VPN slot.',
      checkFn: () => hasVpnPermission(),
      grantFn: async () => {
        await requestVpnPermission();
      },
    },
    {
      id: 'battery',
      icon: '🔋',
      title: 'Run the app in background',
      description: 'Matches Android’s “Let app always run in background?” — keeps filtering and safety services dependable.',
      checkFn: () => hasBatteryOptimizationExemption(),
      grantFn: async () => {
        try {
          await requestBatteryOptimizationExemption();
        } catch {
          Alert.alert('Run in background', 'Open Settings → Apps → ParentingMyKid → Battery and choose Unrestricted or allow background activity.', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'App settings', onPress: () => void Linking.openSettings() },
          ]);
        }
      },
    },
    {
      id: 'camera',
      icon: '📷',
      title: 'Camera',
      description: 'Optional safety snapshots when enabled in your settings.',
      checkFn: () => hasCameraPermission(),
      grantFn: async () => {
        if (Platform.OS !== 'android') return;
        try {
          await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.CAMERA);
        } catch {
          void Linking.openSettings();
        }
      },
    },
    {
      id: 'notifications',
      icon: '🔔',
      title: 'Notifications',
      description: 'Alerts for limits and safety events.',
      checkFn: async () => {
        const { status } = await Notifications.getPermissionsAsync();
        return status === 'granted';
      },
      grantFn: async () => {
        await Notifications.requestPermissionsAsync();
      },
    },
    {
      id: 'location',
      icon: '📍',
      title: 'Turn on location',
      description:
        'Two steps: allow the app, then turn on Location on your phone (quick-settings tile). Needed for local weather and safety features.',
      checkFn: () => isLocationFullyReady(),
      grantFn: async () => {
        const appOk = await isAppLocationPermissionGranted();
        if (!appOk) {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status !== 'granted') {
            await setWeatherLocationOptIn(false);
            Alert.alert(
              'App location access',
              'Allow location for ParentingMyKid, then turn on device Location in the next step.',
              [
                { text: 'Not now', style: 'cancel' },
                { text: 'App settings', onPress: () => void Linking.openSettings() },
              ],
            );
            return;
          }
        }

        const deviceOk = await isDeviceLocationServicesEnabled();
        if (!deviceOk) {
          if (appOk) {
            await openDeviceLocationSettings();
          } else {
            Alert.alert(
              'Turn on device location',
              'Allow app access first, then turn on Location on your phone (quick-settings tile).',
              [
                { text: 'Not now', style: 'cancel' },
                {
                  text: 'Open location settings',
                  onPress: () => void openDeviceLocationSettings(),
                },
              ],
            );
          }
          return;
        }

        await setWeatherLocationOptIn(true);
      },
    },
  ];
}
