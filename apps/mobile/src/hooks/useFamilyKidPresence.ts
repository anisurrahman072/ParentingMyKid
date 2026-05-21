/**
 * React hooks for subscribing to real-time kid presence from the family monitor socket.
 *
 *   useFamilyKidPresence(kidId)   — single kid, fully reactive
 *   useAllKidsPresence(kidIds)    — all kids at once, fully reactive
 *
 * These hooks read from the in-memory presence map maintained by
 * familyMonitorSocket.service.ts and re-render only when a relevant kid's
 * presence actually changes. Zero polling, zero extra HTTP calls.
 */

import { useEffect, useState } from 'react';
import {
  getKidPresence,
  subscribePresence,
  type KidPresence,
} from '../services/familyMonitorSocket.service';

/** Subscribe to real-time presence for a single kid. */
export function useFamilyKidPresence(kidId: string | null): KidPresence {
  const [presence, setPresence] = useState<KidPresence>(() =>
    kidId ? getKidPresence(kidId) : { isOnline: false, lastSeenAt: null },
  );

  useEffect(() => {
    if (!kidId) {
      setPresence({ isOnline: false, lastSeenAt: null });
      return;
    }
    setPresence(getKidPresence(kidId));
    return subscribePresence((updatedId, p) => {
      if (updatedId === kidId) setPresence(p);
    });
  }, [kidId]);

  return presence;
}

/**
 * Subscribe to real-time presence for every kid in the family.
 * Returns `Record<kidId, KidPresence>`.
 * The hook is stable — it only re-runs the effect when the set of kid IDs changes.
 */
export function useAllKidsPresence(kidIds: string[]): Record<string, KidPresence> {
  // Stable string key so the effect doesn't re-run on every render (new array ref)
  const stableKey = [...kidIds].sort().join(',');

  const [presenceMap, setPresenceMap] = useState<Record<string, KidPresence>>(() =>
    Object.fromEntries(kidIds.map((id) => [id, getKidPresence(id)])),
  );

  useEffect(() => {
    if (kidIds.length === 0) return;
    // Hydrate immediately with current snapshots
    setPresenceMap(Object.fromEntries(kidIds.map((id) => [id, getKidPresence(id)])));
    return subscribePresence((updatedId, p) => {
      if (kidIds.includes(updatedId)) {
        setPresenceMap((prev) => ({ ...prev, [updatedId]: p }));
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stableKey]);

  return presenceMap;
}
