import { useState, useEffect, useCallback, useRef } from 'react';
import { AppState } from 'react-native';
import type { ParentDevicePermissionDefinition } from '../services/parentDevicePermissions.definitions';

export function useParentDevicePermissionStatus(definitions: ParentDevicePermissionDefinition[]) {
  const [statusById, setStatusById] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  /** Stable across renders — avoids infinite loops when callers pass a new `definitions` array each render. */
  const idsKey = definitions.map((d) => d.id).join('|');

  const defsRef = useRef(definitions);
  defsRef.current = definitions;

  const refresh = useCallback(async () => {
    const defs = defsRef.current;
    if (defs.length === 0) {
      setStatusById({});
      setLoading(false);
      return;
    }
    setLoading(true);
    const next: Record<string, boolean> = {};
    await Promise.all(
      defs.map(async (d) => {
        try {
          next[d.id] = await d.checkFn();
        } catch {
          next[d.id] = false;
        }
      }),
    );
    setStatusById(next);
    setLoading(false);
  }, [idsKey]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void refresh();
    });
    return () => sub.remove();
  }, [refresh]);

  const total = definitions.length;
  const grantedCount = definitions.reduce((n, d) => (statusById[d.id] ? n + 1 : n), 0);
  const missingCount = total - grantedCount;

  return {
    statusById,
    loading,
    refresh,
    grantedCount,
    missingCount,
    total,
    allGranted: total > 0 && grantedCount >= total,
  };
}
