import { useState, useEffect, useCallback, useMemo } from 'react';
import { AppState } from 'react-native';
import type { ParentDevicePermissionDefinition } from '../services/parentDevicePermissions.definitions';

export function useParentDevicePermissionStatus(definitions: ParentDevicePermissionDefinition[]) {
  const [statusById, setStatusById] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  const idsKey = useMemo(() => definitions.map((d) => d.id).join(','), [definitions]);

  const refresh = useCallback(async () => {
    setLoading(true);
    const next: Record<string, boolean> = {};
    await Promise.all(
      definitions.map(async (d) => {
        try {
          next[d.id] = await d.checkFn();
        } catch {
          next[d.id] = false;
        }
      }),
    );
    setStatusById(next);
    setLoading(false);
  }, [definitions]);

  useEffect(() => {
    void refresh();
  }, [refresh, idsKey]);

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
