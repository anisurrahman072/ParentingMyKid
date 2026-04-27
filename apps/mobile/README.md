# ParentingMyKid — Mobile (Expo)

**Default development workflow: [development build](https://docs.expo.dev/develop/development-builds/introduction/) (custom native client), not Expo Go.**  
Expo Go cannot run full `expo-notifications` (remote push) on SDK 53+ and is not a target for this app’s feature set.

---

## Prerequisites

- **Node.js** and npm (or use the monorepo root `npm install`).
- **EAS account**: [expo.dev](https://expo.dev) (free tier is enough to start).
- **EAS CLI** (install once globally):

  ```bash
  npm install -g eas-cli
  ```

- **Expo / EAS login** (once per machine):

  ```bash
  eas login
  ```

- **EAS project ID** in `app.json` under `expo.extra.eas.projectId` must be a **real** project (not the placeholder all-zeros). From `apps/mobile`:

  ```bash
  eas init
  ```

  Or create a project in the [Expo dashboard](https://expo.dev) and paste the UUID into `app.json`. Push notifications and EAS need this.

---

## One-time: link the app to EAS

From **`apps/mobile`**:

```bash
cd apps/mobile
eas build:configure
```

This creates/updates `eas.json` (already in the repo) and links the app. Confirm when prompted.

---

## Development build (install on a device or simulator)

A **development build** is a **separate installable app** (your icon + `expo-dev-client` + native code). You must have it **on the device or simulator once** before daily `npm start` is useful. It is required for **remote push**, **RevenueCat**-style testing, and this app’s native modules.

`npm start` / Metro **does not** create or update that app — it only serves JavaScript. If nothing is installed, or you open the wrong app, the QR and deep links will not load your project.

**How you get that binary (pick one — not “skip both”):**

| Path | When to use | Needs `prebuild`? |
|------|-------------|-------------------|
| **EAS `development` build** (below) | Most people; no Android Studio / Xcode on the machine | No |
| **Local `expo prebuild` + `expo run:android` / `run:ios`** | [Local compile (optional)](#local-compile-optional--expo-runandroid--expo-runios) | Yes, for that workflow |

**Cloud build (EAS) — most common**

```bash
cd apps/mobile

# Android (APK / internal install)
eas build --profile development --platform android

# iOS (simulator build — good for M1/CI; see profile in eas.json)
eas build --profile development --platform ios

# Both platforms
eas build --profile development --platform all
```

After the build finishes, open the link from the CLI, install the app on a **phone** (Android) or **simulator** (iOS per profile), or use EAS’s install QR.

**npm shortcuts (same as above):**

```bash
npm run build:dev:android
npm run build:dev:ios
npm run build:dev
```

(Defined in `package.json`.)

### EAS path: step-by-step (Android APK)

Do **[Prerequisites](#prerequisites)**, **[One-time: link the app to EAS](#one-time-link-the-app-to-eas)**, and a real **`expo.extra.eas.projectId`** in `app.json` before the first build.

| Step | What you do |
|------|-------------|
| **1. Start a cloud build** | From **`apps/mobile`**, run **`npm run build:dev:android`** (same as `eas build --profile development --platform android`). This tells **EAS** to queue an Android build on Expo’s servers. |
| **2. Wait** | The CLI shows a **build URL** and progress. You can close the terminal after the build is **submitted**; it keeps building in the cloud. Typical time: many minutes the first time. |
| **3. Open the build page** | When the build **finishes**, open the link the CLI printed, or go to [expo.dev](https://expo.dev) → your **account** → **project** → **Builds**, and open the latest **development** Android build. |
| **4. Install on the phone** | On the build page, use **Install** / **Download** / **QR code** (wording varies) to get the **APK** onto the device. You may need to allow **“Install unknown apps”** for the browser or Files app. This installs the **ParentingMyKid** dev client — **one time** (or again after native changes that require a new binary). This step is **not** `npm start`; it is the installable app from EAS. |
| **5. Daily: JavaScript (Metro)** | On your PC, from **`apps/mobile`**, run **`npm start`**. That starts **Metro** (the JS bundler) only. |
| **6. What the `npm start` QR is for** | The QR in the terminal (or Expo DevTools in the browser) encodes a URL that points your **installed development build** at **your computer’s** Metro. **Do not** expect Expo Go to run this project. **Use the ParentingMyKid app you installed in step 4:** open it, and either let it find the dev server on the same Wi‑Fi, use **Enter URL** in the dev menu if your flow supports it, or scan the QR **from a flow that hands the URL to that app** (some devices: Camera app opens a deep link into your dev client). A generic QR scanner that only shows text will not connect Metro by itself. |
| **7. If the device cannot reach the PC** | Same Wi‑Fi and firewall, or use a tunnel: `npx expo start --dev-client --tunnel` and use the new URL/QR. |

**iOS note:** this repo’s `development` profile uses an **iOS simulator** build in `eas.json` (`"simulator": true`). A simulator build is installed on a **Mac** simulator, not over‑the‑air to a physical iPhone the same way as Android internal APK. For a device IPA, adjust profile/credentials per [Expo iOS build docs](https://docs.expo.dev/build/setup/).

---

## EAS pricing (snapshot — verify on the official page)

[Expo EAS pricing](https://expo.dev/pricing) is the source of truth; numbers can change.

| Plan | Approx. monthly cost | EAS Build highlights (typical) |
|------|----------------------|---------------------------------|
| **Free** | $0 | Up to **15 Android** and **15 iOS** builds per month, **low‑priority** queue, **45‑minute** build timeout, **1** concurrent build |
| **Starter** | $19 + usage | e.g. **$45** build credit, then pay‑as‑you‑go; **2‑hour** timeout; higher queue priority |
| **Production** | $199 + usage | e.g. **$225** build credit, **2** concurrencies, more MAUs for EAS Update, etc. |
| **Enterprise** | Custom | Higher credits and limits |

EAS **Update** (OTA) and other add‑ons have separate MAU / bandwidth limits on the free tier (e.g. **1K MAUs** for updates on Free — see the [pricing](https://expo.dev/pricing) page). **Development builds** for local testing count against the same **EAS Build** monthly allowances unless you [build locally](#local-compile-optional--expo-runandroid--expo-runios) instead.

---

## Daily: Metro + development build (after the dev client is installed)

**Prerequisite:** the **ParentingMyKid** development build (APK / IPA or simulator app) is already installed from EAS or from `expo run:*`. The app you launch is **this project’s dev client**, not the generic **Expo Go** app from the store.

1. Start the **API** (e.g. `cd apps/server && npm run dev` on port **3001**).
2. Set **`EXPO_PUBLIC_API_BASE_URL`** in `apps/mobile/.env` (e.g. `http://YOUR_LAN_IP:3001/api/v1` for a physical device on the same Wi‑Fi).
3. Start the bundler from **`apps/mobile`**:

   ```bash
   cd apps/mobile
   npm start
   ```

   This runs **`expo start --dev-client`**. Then either:

   - Open the **installed ParentingMyKid dev client** on the device (it should list your dev server on the same network), or  
   - In the **terminal**, press **a** / **i** if a simulator/emulator is available, or  
   - Scan the QR with a reader that opens the link in the **dev client** (Expo’s docs: use the [development build](https://docs.expo.dev/develop/development-builds/introduction/) you installed, not Expo Go).

4. If the phone cannot reach your PC, use a tunnel:

   ```bash
   npx expo start --dev-client --tunnel
   ```

**Why “Development servers” in Expo Go can look broken here:** A `--dev-client` project uses a custom URL scheme (e.g. `exp+parentingmykid://…`). The store **Expo Go** app is not your dev client. If you only have Expo Go installed, a listed entry may do nothing on tap, because the handler is the **ParentingMyKid** dev build you must install first (see EAS or local `expo run` above).

**Switch Metro to use Expo Go (optional, not recommended for this app):**

```bash
npx expo start --go
# or: npm run start:go
```

---

## Local compile (optional) — `expo run:android` / `expo run:ios`

**What “optional” means:** you do **not** have to compile locally if you use **[EAS `development` builds](#development-build-install-on-a-device-or-simulator)** instead. You still need **a** dev client on the device (from EAS **or** from here). `npm start` alone does not replace that.

**When you choose this path:** you want a dev client built on your machine (or you need to debug native code). Then Android Studio (Android) and/or Xcode (iOS) are required.

Generates `android/` and `ios/` and compiles on your machine.

```bash
cd apps/mobile
npx expo prebuild
npx expo run:android
# or
npx expo run:ios
```

**Shorter (scripts in package.json):**

```bash
npm run android
npm run ios
```

Use this when you need to debug **native** code or avoid cloud builds. First run may take a while.

---

## Preview & production EAS builds

| Goal | Command |
|------|--------|
| **Internal / QA** (Android default in script) | `npm run build:preview`  →  `eas build --profile preview --platform android` |
| **Custom preview** | `eas build --profile preview --platform ios` (or `all`) |
| **Store / production** | `npm run build:production`  →  `eas build --profile production --platform all` |
| **Submit to stores** (after a production build) | `npm run submit`  →  `eas submit` |

**Production profile** in `eas.json` uses `autoIncrement` for version codes where applicable. Adjust `app.json` / EAS as needed for your release process.

---

## Useful EAS / Expo commands reference

| Command | Purpose |
|--------|--------|
| `eas whoami` | Check logged-in Expo user |
| `eas project:info` | Show project ID and slugs |
| `eas build:list` | List recent builds |
| `eas build:view` | Open a build in the browser |
| `npx expo install <package>` | Install a package at the correct version for the current SDK |
| `npx expo doctor` | Diagnose project issues |

---

## Environment variables (mobile)

Create **`apps/mobile/.env`** (see `.env.example` if present) with at least:

- `EXPO_PUBLIC_API_BASE_URL` — your Nest `api/v1` base (local LAN IP for device testing).
- `EXPO_PUBLIC_REVENUECAT_*` when testing purchases (if used).

EAS can inject production env via **EAS Secrets** and `eas.json` `env` blocks for release builds; see [Expo EAS environment variables](https://docs.expo.dev/build-reference/variables/).

---

## Troubleshooting

- **Tapping a project under “Development” in Expo Go and nothing happens:** you need the **ParentingMyKid** development build installed (EAS or `expo run:*`). The custom URL (`exp+parentingmykid://…`) is opened by that app, not by the store Expo Go app. Install the dev build, then use **`npm start`** and open the **ParentingMyKid** dev client.
- **“No development build” / QR opens browser:** install a **development** build from EAS (or run locally) first, then use **`npm start`** and open the project from the **installed dev client** (not Expo Go).
- **“Is `prebuild` required?”** Only if you use **local** `expo run:android` / `expo run:ios`. If you use **EAS** `development` builds only, you can skip `prebuild` on your machine and still do daily `npm start` with the EAS‑installed app.
- **Push not working:** only full **dev/production binaries**; not Expo Go (SDK 53+).
- **iOS signing:** EAS can manage credentials (`eas credentials`); first iOS build may prompt to create/configure.

---

## Related files

- `eas.json` — build profiles: `development`, `preview`, `production`
- `app.json` — `expo`, plugins, `extra.eas.projectId`
- Root repo **`README.md`** — monorepo install, server, and high-level EAS section
