import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';
import { apiClient } from './api.client';
import { API_ENDPOINTS } from '../constants/api';
import { CHILD_ID_KEY } from '../store/deviceSession.store';

async function getExpoPushTokenOrFallback(): Promise<string> {
  const { status: existing } = await Notifications.getPermissionsAsync();
  let final = existing;
  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    final = status;
  }
  if (final !== 'granted') {
    return 'no-permission';
  }
  const token = await Notifications.getExpoPushTokenAsync();
  return token.data;
}

export async function getCurrentDeviceRegistration(): Promise<{
  expoPushToken: string;
  platform: string;
  deviceName: string;
}> {
  const expoPushToken = await getExpoPushTokenOrFallback();
  return {
    expoPushToken,
    platform: Platform.OS,
    deviceName: Device.deviceName ?? Device.modelName ?? 'Device',
  };
}

export async function autoPairCurrentDevice(childId: string): Promise<void> {
  const { expoPushToken, platform, deviceName } = await getCurrentDeviceRegistration();
  await apiClient.post(API_ENDPOINTS.auth.autoPairDevice, {
    childId,
    expoPushToken,
    platform,
    deviceName,
  });
  await SecureStore.setItemAsync(CHILD_ID_KEY, childId);
}

