import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import { UserProfile } from '@parentingmykid/shared-types';

const PARENT_SESSION_KEY = 'pmk_parent_session';
const PARENT_UNLOCK_HASH_KEY = 'pmk_parent_unlock_hash';

export interface StoredParentSession {
  accessToken: string;
  refreshToken: string;
  user: UserProfile;
}

export const deviceSessionService = {
  async saveParentSession(session: StoredParentSession, unlockPin: string): Promise<void> {
    await SecureStore.setItemAsync(PARENT_SESSION_KEY, JSON.stringify(session));
    const hash = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, unlockPin);
    await SecureStore.setItemAsync(PARENT_UNLOCK_HASH_KEY, hash);
  },

  async verifyUnlockPin(enteredPin: string): Promise<boolean> {
    const stored = await SecureStore.getItemAsync(PARENT_UNLOCK_HASH_KEY);
    if (!stored) return false;
    const hash = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, enteredPin);
    return stored === hash;
  },

  async getParentSession(): Promise<StoredParentSession | null> {
    const raw = await SecureStore.getItemAsync(PARENT_SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StoredParentSession;
  },

  async hasParentSession(): Promise<boolean> {
    return !!(await SecureStore.getItemAsync(PARENT_SESSION_KEY));
  },

  async hasUnlockPin(): Promise<boolean> {
    return !!(await SecureStore.getItemAsync(PARENT_UNLOCK_HASH_KEY));
  },

  async clearParentSession(): Promise<void> {
    await SecureStore.deleteItemAsync(PARENT_SESSION_KEY);
    await SecureStore.deleteItemAsync(PARENT_UNLOCK_HASH_KEY);
  },
};

export const CHILD_ID_KEY = 'pmk_child_id';
