/**
 * Silent upload of KidSessionTracker pending segments after parent resumes Parent Mode on device.
 * Uses parent JWT via apiClient; leaves pending intact on failure for retry.
 */
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiClient } from './api.client';
import { getPendingUsageSessions, markUsageSessionsSynced } from './ParentalControl';

const backupKey = (childId: string) => `@pmk_pending_usage_${childId}`;

export type NativeUsageSessionDto = {
  kidId?: string;
  pkg: string;
  date: string;
  startMs: number;
  endMs: number;
  durationMs: number;
};

export async function syncPendingUsageForChild(childId: string): Promise<void> {
  if (Platform.OS !== 'android') return;
  const id = childId.trim();
  if (!id) return;

  try {
    const raw = await getPendingUsageSessions(id);
    await AsyncStorage.setItem(backupKey(id), raw);

    let sessions: NativeUsageSessionDto[];
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed) || parsed.length === 0) return;
      sessions = parsed as NativeUsageSessionDto[];
    } catch {
      return;
    }

    let maxEnd = 0;
    for (const s of sessions) {
      const e = Number(s?.endMs);
      if (Number.isFinite(e) && e > maxEnd) maxEnd = e;
    }

    await apiClient.post(`/safety/${encodeURIComponent(id)}/screen-usage/batch`, { sessions });

    if (maxEnd > 0) {
      await markUsageSessionsSynced(id, maxEnd);
    }
    await AsyncStorage.removeItem(backupKey(id));
  } catch {
    /* offline — retry next parent visit */
  }
}
