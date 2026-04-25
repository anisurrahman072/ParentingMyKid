import Constants, { ExecutionEnvironment } from 'expo-constants';

export const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

/**
 * Placeholder for Phase 3 native enforcement (EAS + Kotlin/Expo Module).
 * Safe no-op in Expo Go and until a native module is linked.
 */
export function notifyParentalPolicyUpdated(controlsVersion?: number): void {
  if (isExpoGo) return;
  void controlsVersion;
}
