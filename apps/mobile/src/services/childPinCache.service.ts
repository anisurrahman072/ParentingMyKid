/**
 * Local copy of the kid PIN for quick reveal (eye toggle). The server stores
 * `pinHash` (bcrypt) for login and `pinEnc` (AES-GCM) so the parent dashboard
 * can return `kidPinDigits` after reinstall; successful loads also write here.
 */
import * as SecureStore from 'expo-secure-store';

const keyFor = (childId: string) => `pmk-parent-cached-child-pin-${childId}`;

export async function getCachedChildPin(childId: string): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(keyFor(childId));
  } catch {
    return null;
  }
}

export async function setCachedChildPin(childId: string, pin: string): Promise<void> {
  await SecureStore.setItemAsync(keyFor(childId), pin);
}

export async function loadCachedPinsForChildren(
  childIds: string[],
): Promise<Record<string, string | null>> {
  const out: Record<string, string | null> = {};
  await Promise.all(
    childIds.map(async (id) => {
      out[id] = await getCachedChildPin(id);
    }),
  );
  return out;
}
