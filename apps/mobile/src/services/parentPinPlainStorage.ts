/**
 * Stores the parental PIN locally so "My PIN" can show digits quickly offline.
 * Server keeps bcrypt (`parentalPinHash`) for verification and AES-GCM (`parentalPinEnc`) so
 * GET /auth/me can return `parentalPinDigits` after reinstall — same key as child PINs.
 */
import * as SecureStore from 'expo-secure-store';

const PARENT_PIN_DISPLAY_KEY = 'pmk_parent_pin_plain_display';

export async function saveParentPinPlain(pin: string): Promise<void> {
  await SecureStore.setItemAsync(PARENT_PIN_DISPLAY_KEY, pin);
}

export async function getParentPinPlain(): Promise<string | null> {
  return SecureStore.getItemAsync(PARENT_PIN_DISPLAY_KEY);
}

export async function clearParentPinPlain(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(PARENT_PIN_DISPLAY_KEY);
  } catch {
    // ignore missing key
  }
}
