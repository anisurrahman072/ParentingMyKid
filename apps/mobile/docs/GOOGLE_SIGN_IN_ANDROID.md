# Fix `DEVELOPER_ERROR` (Google Sign-In on Android)

This error almost always means **Google Play Services** cannot match your app’s signing key to a credential in **Google Cloud Console**. It is **not** fixed only by setting `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` — you also need an **Android OAuth client** with the correct **package name** and **SHA-1**.

Your app’s Android package name is: **`com.parentingmykid.app`** (see `app.json` → `expo.android.package`).

## 1. Web Client ID (already in `.env`)

Create an OAuth client of type **Web application** in  
[Google Cloud Console → APIs & Services → Credentials](https://console.cloud.google.com/apis/credentials).

Put the client ID in `apps/mobile/.env`:

```bash
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=xxxx.apps.googleusercontent.com
```

Restart Metro with a clean cache and **rebuild** the native app after changing this value.

## 2. Android OAuth client + SHA-1 (required for Android)

You must add an OAuth client of type **Android** with:

- **Package name:** `com.parentingmykid.app`
- **SHA-1 certificate fingerprint:** the one used to sign the APK you run on the device (debug is different from release / Play).

### Get the debug SHA-1 (local `expo run:android` / debug build)

From the mobile app folder, after `android/` exists (`expo prebuild` or `expo run:android` once):

```bash
cd apps/mobile/android && ./gradlew signingReport
```

In the output, find **Variant: debug** → **SHA1** under `Task :app:signingReport`.

Or from the default debug keystore:

```bash
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android
```

Copy the **SHA1** line (not SHA-256).

### Add it in Google Cloud Console

1. Open [Credentials](https://console.cloud.google.com/apis/credentials).
2. **Create credentials → OAuth client ID**.
3. Application type: **Android**.
4. Package name: `com.parentingmykid.app`
5. SHA-1: paste the value from above.
6. Create.

You can add **multiple** SHA-1s by creating additional Android OAuth clients or editing — Google may allow multiple fingerprints on one client depending on console version; if not, create one Android client per SHA-1 (same package).

### EAS / Play Store builds

Use the SHA-1 from **EAS credentials** or **Google Play App signing** and register those too, or sign-in will work in debug but fail in release (or the opposite).

## 3. Rebuild the app

After changing OAuth credentials or `.env`:

```bash
cd apps/mobile
npx expo prebuild --clean
npx expo run:android
```

## 4. Optional: verify setup

```bash
npx @react-native-google-signin/config-doctor
```

## Reference

- [Collecting configuration (official)](https://react-native-google-signin.github.io/docs/setting-up/get-config-file)
- [Troubleshooting](https://react-native-google-signin.github.io/docs/troubleshooting)
