import { AppState, AppStateStatus } from 'react-native';
import { apiClient } from './api.client';
import { API_ENDPOINTS } from '../constants/api';
import { useAuthStore } from '../store/auth.store';
import { usePolicyStore } from '../store/policy.store';
import { UserRole } from '@parentingmykid/shared-types';
import { notifyParentalPolicyUpdated } from '../native/parentalEnforcement';

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
