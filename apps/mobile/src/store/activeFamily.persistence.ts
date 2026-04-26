import * as SecureStore from 'expo-secure-store';

const KEY = 'pmk_last_active_family_id';

/**
 * Last selected family (parent app). Survives app restarts until logout.
 */
export async function getResolvedActiveFamilyId(familyIds: string[]): Promise<string | null> {
  if (familyIds.length === 0) {
    return null;
  }
  try {
    const stored = await SecureStore.getItemAsync(KEY);
    if (stored && familyIds.includes(stored)) {
      return stored;
    }
  } catch {
    // use default
  }
  return familyIds[0] ?? null;
}

export function schedulePersistActiveFamilyId(id: string) {
  void SecureStore.setItemAsync(KEY, id);
}

export async function clearPersistedActiveFamilyId() {
  try {
    await SecureStore.deleteItemAsync(KEY);
  } catch {
    // ignore
  }
}
