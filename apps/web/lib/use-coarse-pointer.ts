'use client';

import { useSyncExternalStore } from 'react';

/**
 * True when the primary pointer is coarse (typical touch phone/tablet).
 * Used to skip expensive hover/tilt/blur effects that hurt scroll performance.
 */
export function useCoarsePointer(): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mq = window.matchMedia('(pointer: coarse)');
      mq.addEventListener('change', onChange);
      return () => mq.removeEventListener('change', onChange);
    },
    () => window.matchMedia('(pointer: coarse)').matches,
    () => false,
  );
}
