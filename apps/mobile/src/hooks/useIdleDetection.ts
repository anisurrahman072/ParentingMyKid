/**
 * useIdleDetection — detects when the app has been backgrounded for 10+ minutes
 * and triggers the KidIdentityModal on resume.
 */
import { useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';

const IDLE_THRESHOLD_MS = 10 * 60 * 1000; // 10 minutes

export function useIdleDetection(enabled: boolean = true) {
  const [showIdentityModal, setShowIdentityModal] = useState(false);
  const backgroundedAt = useRef<number | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    if (!enabled) return;

    const subscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      const prevState = appStateRef.current;
      appStateRef.current = nextState;

      if (nextState === 'background' || nextState === 'inactive') {
        backgroundedAt.current = Date.now();
      } else if (nextState === 'active') {
        if (backgroundedAt.current !== null) {
          const idleMs = Date.now() - backgroundedAt.current;
          if (idleMs >= IDLE_THRESHOLD_MS) {
            setShowIdentityModal(true);
          }
          backgroundedAt.current = null;
        }
      }
    });

    return () => subscription.remove();
  }, [enabled]);

  function resetIdleModal() {
    setShowIdentityModal(false);
  }

  return { showIdentityModal, resetIdleModal };
}
