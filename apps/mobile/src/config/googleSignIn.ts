import Constants from 'expo-constants';
import { Platform } from 'react-native';

/**
 * Web OAuth 2.0 Client ID (type "Web application") — required for `idToken` on Android/iOS.
 * Must be set in `.env` as EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID and you must rebuild the native app after changing it.
 */
export function getGoogleWebClientId(): string {
  const fromEnv = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
  const fromExtra = (Constants.expoConfig?.extra as { googleWebClientId?: string } | undefined)
    ?.googleWebClientId;
  return (fromEnv || fromExtra || '').trim();
}

let configured = false;

/** Call once after the JS runtime is up (e.g. RootLayout useEffect). */
export function configureGoogleSignIn(): void {
  if (Platform.OS !== 'android' && Platform.OS !== 'ios') return;
  if (configured) return;

  const webClientId = getGoogleWebClientId();
  if (!webClientId) {
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.warn(
        '[GoogleSignIn] Missing EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID. Add it to apps/mobile/.env, then restart Metro with --clear and rebuild native (expo run:android).',
      );
    }
    return;
  }

  try {
    const { GoogleSignin } = require('@react-native-google-signin/google-signin') as {
      GoogleSignin: { configure: (opts: { webClientId: string; offlineAccess?: boolean }) => void };
    };
    GoogleSignin.configure({
      webClientId,
      // Server uses id_token only; offline refresh scope can complicate Play Services setup
      offlineAccess: false,
    });
    configured = true;
  } catch {
    // e.g. Expo Go / web — ignore
  }
}

export type GoogleAccountSelectionResult = {
  idToken: string;
  email: string | null;
  name: string | null;
};

/**
 * Always opens interactive Google account selection instead of silently
 * reusing a previously selected account.
 */
export async function getGoogleSignInResultWithAccountPicker(): Promise<GoogleAccountSelectionResult> {
  const { GoogleSignin } = await import('@react-native-google-signin/google-signin');

  await GoogleSignin.hasPlayServices();

  // Force account picker by clearing cached session + consent state first.
  // In some cases isSignedIn() is false while Google still reuses last account.
  try {
    await GoogleSignin.revokeAccess();
  } catch {
    // Best effort only; continue to interactive sign-in.
  }
  try {
    await GoogleSignin.signOut();
  } catch {
    // Best effort only; continue to interactive sign-in.
  }

  const userInfo = await GoogleSignin.signIn();
  const idToken = (userInfo as any).idToken || (userInfo as any).data?.idToken;
  const user = (userInfo as any).user || (userInfo as any).data?.user;
  const email = typeof user?.email === 'string' ? user.email : null;
  const name = typeof user?.name === 'string' ? user.name : null;
  if (!idToken) {
    throw new Error('No ID token returned from Google');
  }
  return { idToken, email, name };
}

export async function getGoogleIdTokenWithAccountPicker(): Promise<string> {
  const { idToken } = await getGoogleSignInResultWithAccountPicker();
  return idToken;
}

/** User-facing message when Play Services returns DEVELOPER_ERROR (Android SHA-1 / OAuth mismatch). */
export function formatGoogleSignInError(err: unknown): string {
  const e = err as { message?: string; code?: string };
  const msg = (e?.message ?? '').toString();
  const code = (e?.code ?? '').toString();
  if (
    msg.includes('DEVELOPER_ERROR') ||
    code === '10' ||
    msg.toLowerCase().includes('developer_error')
  ) {
    if (Platform.OS === 'android') {
      return 'Android Sign-In needs your debug SHA-1 in Google Cloud (OAuth client type Android, package com.parentingmykid.app). See apps/mobile/docs/GOOGLE_SIGN_IN_ANDROID.md — then rebuild the app.';
    }
    return 'Google Sign-In is not configured for this build. Check OAuth clients and rebuild. See apps/mobile/docs/GOOGLE_SIGN_IN_ANDROID.md';
  }
  return msg || 'Please try again.';
}
