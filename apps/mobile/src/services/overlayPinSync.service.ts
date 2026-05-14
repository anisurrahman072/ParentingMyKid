/**
 * Keeps Android overlay PIN verification aligned with the parental PIN on the account.
 * Overlay compares SHA-256(plain PIN) to SharedPreferences `overlayPinHash` (see ParentalOverlayService).
 */
import { Platform } from 'react-native';
import * as Crypto from 'expo-crypto';
import type { UserProfile } from '@parentingmykid/shared-types';
import { UserRole } from '@parentingmykid/shared-types';
import { setOverlayPinHash } from '../../modules/parental-control/src/index';
import { getParentPinPlain } from './parentPinPlainStorage';

function isFourDigits(v: string | undefined | null): v is string {
  return typeof v === 'string' && /^\d{4}$/.test(v);
}

export async function syncNativeOverlayPinHashFromProfile(user: UserProfile | null): Promise<void> {
  if (Platform.OS !== 'android') return;
  if (!user || user.role !== UserRole.PARENT || !user.parentalPinSet) return;

  let digits: string | null = null;
  if (isFourDigits(user.parentalPinDigits)) {
    digits = user.parentalPinDigits;
  } else {
    try {
      const plain = await getParentPinPlain();
      if (isFourDigits(plain)) digits = plain;
    } catch {
      /* SecureStore unavailable */
    }
  }
  if (!digits) return;

  try {
    const hash = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, digits);
    await setOverlayPinHash(hash);
  } catch {
    /* native module missing */
  }
}
