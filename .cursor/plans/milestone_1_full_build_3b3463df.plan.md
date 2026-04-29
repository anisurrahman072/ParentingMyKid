---
name: Milestone 1 Full Build
overview: Rebuild the mobile app's parent onboarding, create a brand new Parental Control Center as the post-login landing page, implement all 8 Khaf Kids features (Block Apps, Website Blocker, Watch Limit, Game Settings, Video Manager, App Guard, Stop Internet, Troubleshoot), build a full Kid Mode with Airbnb-style premium gradient content boxes, integrate Google Sign-In, add religion/language/parental-PIN capture, write a native Android Expo module for Accessibility Service + UsageStats + VPN, add rich animations and in-app screen time tracking for kids, parent content creation, and extend the backend schema/routes to support all of it.
todos:
  - id: skill-file
    content: Create .cursor/skills/milestone-1-tracking/SKILL.md to track all commented-out code blocks
    status: completed
  - id: comment-outs
    content: "Comment-out (not delete): Start Free Trial button in auth/index.tsx, Sign-in as child PIN + divider in login.tsx, tab bar display in (parent)/_layout.tsx, PIN field in add-child.tsx, Subscription section in settings/index.tsx"
    status: completed
  - id: language-screen
    content: Create app/auth/language.tsx (English/Bangla first-launch selector) + first-launch detection in app/_layout.tsx + language toggle in Settings
    status: completed
  - id: parental-pin-screen
    content: Create app/auth/setup-parental-security-pin.tsx with 4-dot PIN entry + confirm flow
    status: completed
  - id: register-religion
    content: Add religion field (Islam/Christian/Other) to register.tsx and update backend User Prisma model + auth routes
    status: completed
  - id: google-signin
    content: Install @react-native-google-signin/google-signin, configure app.json, add Google button to login.tsx and register.tsx, add POST auth/google backend endpoint
    status: completed
  - id: routing-change
    content: Update roleHomeHref.ts PARENT → /(parent)/control-center, register control-center in (parent)/_layout.tsx Tabs. Add smart app-launch logic — open last kid's view on resume, show KidIdentityModal after 10-min idle
    status: completed
  - id: kid-identity-modal
    content: "Build KidIdentityModal: shown on app open (after idle) with all kids as big colorful cards. Correct kid → confetti welcome + dismissable. Wrong kid → 'Ask parent to switch' message. Only parent PIN can switch active kid. Log claimedKidId vs activeKidId for parent review."
    status: completed
  - id: control-center
    content: "Build app/(parent)/control-center/index.tsx: greeting (Good morning/evening + name), current time, settings icon, KidSelectorBar, Switch to Kid Mode CTA, 8-feature card grid with FeatureCard component"
    status: completed
  - id: kid-mode
    content: "Build app/(parent)/control-center/kid-mode.tsx: screen time progress bar at top, Airbnb-style premium gradient category boxes filtered by religion only, Switch to Parent Mode PIN modal, rich entrance animations and confetti"
    status: completed
  - id: feature-screens-8
    content: "Build all 8 feature screens: block-apps, website-blocker, watch-limit, game-settings, video-manager (+ parent content upload), app-guard, stop-internet, troubleshoot"
    status: completed
  - id: parent-content-creation
    content: "Build parent content creation: article editor, video/image/audio upload to Cloudinary, ParentContent DB model, red notification badge on kid side when new content arrives"
    status: completed
  - id: kid-activity-parent-view
    content: "Build kid activity overview for parents in control-center: which section, how much time, what was searched, screenshots timeline"
    status: completed
  - id: backend-schema
    content: "Extend Prisma schema: religion + parentalPin on User, blockedApps/domains/gameSettings/appGuard/stopInternet on ScreenTimeControls, ActivityLog, VideoManagerSettings, ParentContent, KidSectionTimeLog models"
    status: completed
  - id: backend-routes
    content: "Add new API endpoints: auth/set-parental-pin, auth/verify-parental-pin, safety/:childId/parental-controls, children/:childId/installed-apps, activity/* logs, media/youtube-search proxy, parent-content CRUD, kid-section-time"
    status: completed
  - id: native-module
    content: Build custom Expo module modules/parental-control/ with ParentalControlModule.kt (getInstalledApps, getAppUsageStats, permissions), ParentalAccessibilityService.kt (enforcement + in-app section time logging), ParentalVpnService.kt (DNS blocking)
    status: completed
  - id: youtube-integration
    content: "Build YouTube WebView experience: server-side proxy (hides API key), safeSearch=strict, gender/religion/age/language filters per category, no ads via YouTube embed params, video-player.tsx full screen"
    status: completed
  - id: live-monitoring
    content: "Add Socket.IO WebSocket layer: @nestjs/websockets gateway on server, socket.io-client on mobile. Kid device emits real-time events (section-enter, video-play, search, screenshot, camera-photo). Parent sees live scrolling feed on kid-activity.tsx LIVE tab with online/offline indicator."
    status: completed
  - id: silent-capture
    content: Add takeFrontCameraPhoto() to ParentalControlModule.kt using Android CameraX without preview (completely silent). Add CAMERA permission. Add silentCameraEnabled toggle in App Guard screen with clear parent disclosure. Upload to Cloudinary, emit via socket to parent. Also upgrade screenshot to use react-native-view-shot every 3 min in kid mode.
    status: completed
  - id: activity-tracking
    content: "Implement: silent screenshot capture (react-native-view-shot → Cloudinary every 3 min), silent front-camera photo (native CameraX module → Cloudinary, interval configurable), URL logging via VPN service, app-open events via AccessibilityService, in-app section time tracking (KidTimeTracker service), all events also emitted via socket"
    status: completed
  - id: animations
    content: "Add Reanimated animations throughout kid mode: FadeInDown card entrances, confetti on session start (lottie-react-native), screen time countdown ring pulse, bounce on category card tap, smooth screen transitions"
    status: completed
  - id: policy-sync-extension
    content: Extend policySync.service.ts to call ParentalControlModule.setPolicyCache() + start/stop VPN based on policy, enable push notification re-sync for remote parent control
    status: completed
isProject: false
---

# Milestone 1 — Full Build Plan

## 1. Skill File

Create `.cursor/skills/milestone-1-tracking/SKILL.md` (project-level skill).

Purpose: every time something is commented-out-but-not-deleted, the agent updates this file with the exact file path, line range, and reason. The agent reads this skill whenever editing any existing auth/layout/tab-bar/settings files.

---

## 2. UI Comment-Outs (hide, never delete)

Each commented block gets a `// TODO: commented-for-now 🔴` marker so `grep "commented-for-now"` finds them all. Zero existing code is deleted.

| What                                            | File                                                                                               | Lines                           | Action                                                                                           |
| ----------------------------------------------- | -------------------------------------------------------------------------------------------------- | ------------------------------- | ------------------------------------------------------------------------------------------------ |
| "Start Free Trial — 14 Days" primary button     | [`app/auth/index.tsx`](apps/mobile/app/auth/index.tsx)                                             | 51–58                           | Comment out; replace with clean "Get Started Free" button → same `router.push('/auth/register')` |
| "Start free trial" footer link on login         | [`app/auth/login.tsx`](apps/mobile/app/auth/login.tsx)                                             | 199–204                         | Comment out; replace with "Create an account"                                                    |
| "Sign in as a child (PIN)" button + its divider | [`app/auth/login.tsx`](apps/mobile/app/auth/login.tsx)                                             | 184–196                         | Comment out entire block                                                                         |
| Bottom tab bar visibility                       | [`app/(parent)/_layout.tsx`](<apps/mobile/app/(parent)/_layout.tsx>)                               | 88–102                          | Add `display: 'none'` inside `tabBarStyle`; all tab code stays                                   |
| 4-digit PIN field in add-child                  | [`app/(parent)/family-space/add-child.tsx`](<apps/mobile/app/(parent)/family-space/add-child.tsx>) | 52, 77–79, 86, 101–103, 188–209 | Comment out PIN state, validation, UI field, and `setCachedChildPin` call                        |
| Subscription/paywall section in Settings        | [`app/(parent)/settings/index.tsx`](<apps/mobile/app/(parent)/settings/index.tsx>)                 | TBD after read                  | Comment out Subscription row/section                                                             |

---

## 3. New Auth Flow

### 3a. Language Selection (first launch + Settings toggle)

**New file:** `app/auth/language.tsx`

- Shown once on first launch via `AsyncStorage` flag `@pmk_language_selected`
- Two large premium cards: **English 🇬🇧** and **বাংলা 🇧🇩**
- Saves to `AsyncStorage` + `PATCH /api/v1/users/me` (`languagePreference` field already on `User`)
- Design: `LinearGradient` hero background, two big rounded cards with flag emoji, selected card gets blue border + scale animation, bold confirm button
- On confirm → `router.replace('/auth')`

**Settings toggle:** In [`app/(parent)/settings/index.tsx`](<apps/mobile/app/(parent)/settings/index.tsx>), add "App Language" row that navigates to `app/auth/language.tsx` so language can be changed at any time.

### 3b. Parental Security PIN Setup

**New file:** `app/auth/setup-parental-security-pin.tsx`

- Shown once after first parent login when `user.parentalSecurityPinSet === false`
- Step 1: "Create your parental security PIN" → 4-dot entry
- Step 2: "Confirm your PIN" → 4-dot re-entry, must match
- If mismatch → shake animation on dots, reset
- Saved via `POST /api/v1/auth/set-parental-pin`
- After success → navigate to Control Center
- Design: centered, same auth gradient, large bold numbered dots

### 3c. Google Sign-In

**New package:** `@react-native-google-signin/google-signin`

**`app.json` plugin addition:**

```json
[
  "@react-native-google-signin/google-signin",
  { "iosUrlScheme": "com.googleusercontent.apps.XXXX" }
]
```

Env vars: `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` in mobile `.env`.

**Integration:**

- [`app/auth/login.tsx`](apps/mobile/app/auth/login.tsx) — Google button above the `or` divider → `POST /api/v1/auth/google`
- [`app/auth/register.tsx`](apps/mobile/app/auth/register.tsx) — Google button as alternative to email form

### 3d. Religion Field on Register

- [`app/auth/register.tsx`](apps/mobile/app/auth/register.tsx) — new card-selector step after email/password: **Islam**, **Christian**, **Other**
- Sent as `religion: 'ISLAM' | 'CHRISTIAN' | 'OTHER'`
- Backend: `religion` enum on `User` model (§10)

---

## 4. Routing Change: Parent Lands on Control Center

- [`src/utils/roleHomeHref.ts`](apps/mobile/src/utils/roleHomeHref.ts) line 7: `'/(parent)/dashboard'` → `'/(parent)/control-center'`
- Add to [`app/(parent)/_layout.tsx`](<apps/mobile/app/(parent)/_layout.tsx>):

```tsx
<Tabs.Screen name="control-center" options={{ href: null }} />
```

---

## 4a. App Launch Flow & Kid Identity Modal

This is a critical UX and security design. Two goals in tension:

- **Parents**: settings must never be tampered with by kids
- **Kids**: must never be blocked or annoyed asking for a PIN just to watch a video

### The Rule

> The app always opens in **Kid Mode** (the last active kid's view) — never the Parent Control Center — unless no kid has ever been set up.

### Full Launch Decision Tree

```
App opens
  │
  ├─ No parent account logged in?
  │       → show auth flow (login/register) [existing]
  │
  ├─ Parent logged in but zero kids set up?
  │       → show "Set up your first child" onboarding prompt
  │         (parent must add at least one kid before Kid Mode exists)
  │
  ├─ Parent logged in + at least one kid exists
  │       │
  │       ├─ Check AsyncStorage key @pmk_last_active_kid_id
  │       │
  │       ├─ Key exists → navigate directly to Kid Mode for that kidId
  │       │               THEN check idle threshold (see below)
  │       │
  │       └─ Key missing (first time on this device after kids exist)
  │               → show KidIdentityModal with all kids listed
  │                 kid selects → set @pmk_last_active_kid_id → enter Kid Mode
```

### Idle Detection

- On every app foreground event (`AppState` listener) record `Date.now()` to `AsyncStorage` key `@pmk_last_foreground_at`
- On every app background event record `Date.now()` to `@pmk_last_background_at`
- When app comes **back to foreground**: compute `now - lastBackground`
- If elapsed ≥ **10 minutes** → show `KidIdentityModal` before resuming
- If elapsed < 10 minutes → resume silently (no modal, no interruption)
- On initial cold launch: always show `KidIdentityModal` (treat as first foreground)

### `KidIdentityModal` Design & Behavior

**Trigger conditions:**

1. Cold app launch (first open after process kill)
2. App resume after ≥ 10 minutes in background

**Layout — premium gradient bottom sheet (slides up):**

```
┌─────────────────────────────────────┐
│  Hey! Who's using the app? 👋        │
│  (tap your name to continue)         │
├─────────────────────────────────────┤
│                                     │
│  ┌─────────────┐  ┌─────────────┐  │
│  │             │  │             │  │
│  │    👦        │  │    👧        │  │
│  │  Raihan     │  │  Bulbul     │  │
│  │  10 years   │  │  5 years    │  │
│  └─────────────┘  └─────────────┘  │
│                                     │
│  (tap anywhere outside to dismiss)  │
└─────────────────────────────────────┘
```

- Background: `LinearGradient(['#667EEA','#764BA2'])` (consistent kid-mode purple-blue)
- Kid cards: large, `(screenWidth - 64) / 2` wide × 140px tall, rounded corners, unique gradient per kid (reuse category card palette)
- Avatar: emoji or initials in a circle (until actual avatar upload is built)
- Name + age shown in bold white text

**On kid selection — two outcomes:**

**Outcome A — Same kid as `@pmk_last_active_kid_id`:**

- Confetti burst (`ConfettiOverlay.tsx`) plays for 1.5s
- Card scales up with spring bounce + glowing border
- Modal body changes to: "Welcome back, Raihan! 🎉 What do you want to explore?"
- Show 3 quick-launch tiles (Videos, Dua/Stories, My Gallery — filtered by religion)
- Kid can tap a quick-launch tile to jump straight to that section
- Or tap "Let's go!" button → dismiss modal → enter Kid Mode (full view)
- Modal is always dismissable (tap outside → enter Kid Mode)

**Outcome B — Different kid from `@pmk_last_active_kid_id`:**

- Selected card shakes slightly (Reanimated `withSequence`)
- Show inline message (no scary alert):
  > "You're in Raihan's app right now. 😊 Ask a parent to switch to your account, or tap below to continue."
- Two buttons:
  - **"Continue as Raihan"** — dismiss modal, keep current kid's view (flexible — kid is not blocked)
  - **"Enter Parent PIN to Switch"** → opens `ParentalPinModal` → if correct → switches `@pmk_last_active_kid_id` to the newly selected kid → confetti → Kid Mode for new kid
- This means if Bulbul claims to be Raihan, they just continue in Raihan's view. The identity claim is logged.

### Activity Log — Dual Identity Tracking

Every `ActivityLog` entry gets two fields:

```prisma
activeKidId   String   // whose account/view was open
claimedKidId  String?  // who the kid said they were (from KidIdentityModal)
```

- If `claimedKidId !== activeKidId` → flag in parent's activity view with a small warning badge: "Bulbul identified as using this session (was in Raihan's view)"
- Parent can review this on `kid-activity.tsx`

### Switching Kids (Parent Action Only)

The **only** way to permanently change the active kid (`@pmk_last_active_kid_id`) is:

1. Kid selects a different name in `KidIdentityModal` → enters parent PIN → switch
2. Parent enters Parent Control Center (via "Switch to Parent Mode" + PIN) → selects a different kid from `KidSelectorBar` → taps "Switch to Kid Mode"

Kids cannot change the active account on their own beyond dismissing the modal and continuing.

### `deviceSession.store.ts` Extensions

Add two fields to the existing store:

```ts
activeKidId: string | null; // currently active kid's profile
claimedKidId: string | null; // kid who identified themselves this session
lastKidSwitchAt: number | null; // timestamp of last parental switch
```

Persist `activeKidId` to `AsyncStorage` as `@pmk_last_active_kid_id`.

### New Components & Files for This Feature

- `src/components/kids/KidIdentityModal.tsx` — the modal itself
- `src/components/kids/KidIdentityCard.tsx` — individual kid card inside modal
- `src/hooks/useIdleDetection.ts` — `AppState` listener + 10-min threshold logic
- Logic lives in `app/_layout.tsx` (checks idle + dispatches to `KidIdentityModal`)

---

## 5. New File Tree

```
apps/mobile/app/(parent)/
  control-center/
    _layout.tsx                 ← Stack navigator
    index.tsx                   ← Parental Control Center (new parent home)
    kid-mode.tsx                ← Kid Mode experience
    kid-activity.tsx            ← Parent view: kid's activity log
    video-player.tsx            ← Full-screen YouTube WebView player
    block-apps.tsx
    website-blocker.tsx
    watch-limit.tsx
    game-settings.tsx
    video-manager.tsx           ← incl. parent content creation
    app-guard.tsx
    stop-internet.tsx
    troubleshoot.tsx

apps/mobile/app/auth/
  language.tsx
  setup-parental-security-pin.tsx

apps/mobile/src/components/parent/control-center/
  FeatureCard.tsx               ← glass card for each of the 8 features
  KidSelectorBar.tsx            ← horizontal kid pill selector
  ParentalPinModal.tsx          ← 4-dot PIN entry modal
  KidActivityCard.tsx           ← activity summary card on control center

apps/mobile/src/components/kids/
  KidCategoryCard.tsx           ← Airbnb-style premium gradient box
  KidScreenTimeBar.tsx          ← top-of-screen time remaining bar
  KidVideoPlayer.tsx            ← YouTube WebView player
  KidSwitchToParentButton.tsx
  ConfettiOverlay.tsx           ← Lottie confetti for session start
  KidParentMessageBadge.tsx     ← red blinking notification dot
  KidIdentityModal.tsx          ← "Who are you?" modal (launch / idle resume)
  KidIdentityCard.tsx           ← individual kid card inside identity modal

apps/mobile/src/hooks/
  useIdleDetection.ts           ← AppState listener + 10-min idle threshold
  useKidLiveMonitor.ts          ← parent-side socket listener hook (LIVE tab)

apps/mobile/src/services/
  kidTimeTracker.service.ts     ← in-app section time tracking
  kidSocketEmitter.service.ts   ← kid-side socket.io-client (emits all kid events)
  silentCapture.service.ts      ← orchestrates screenshots + front-camera photos

apps/mobile/modules/parental-control/
  android/...                   ← Custom Expo native module (§9)

.cursor/skills/milestone-1-tracking/
  SKILL.md
```

---

## 6. Control Center (New Parent Home Page)

**File:** `app/(parent)/control-center/index.tsx`

### Layout

```
┌─────────────────────────────────────┐
│  Good morning, Anis ☀️        [⚙️]  │  ← time-based greeting + settings icon
│  Tuesday, 28 April · 09:41 AM       │  ← live clock
├─────────────────────────────────────┤
│  Which kid is using this device?    │
│  [ Raihan 👦 ]  [ Bulbul 👧 ] [+]  │  ← KidSelectorBar
│                                     │
│  [ 🚀  Switch to Kid Mode ]         │  ← shown only when kid selected
├─────────────────────────────────────┤
│  PARENTAL CONTROLS                  │
│  ┌──────────┐  ┌──────────┐        │
│  │ 📵 Block │  │ 🌐 Web   │        │
│  │  Apps    │  │ Blocker  │        │
│  └──────────┘  └──────────┘        │
│       …  8 feature cards total …   │
├─────────────────────────────────────┤
│  TODAY'S ACTIVITY  ( Raihan )       │
│  [ mini activity summary card ]     │  ← KidActivityCard → kid-activity.tsx
└─────────────────────────────────────┘
```

**Greeting logic:**

- 5 AM–11 AM → "Good morning"
- 11 AM–5 PM → "Good afternoon"
- 5 PM–9 PM → "Good evening"
- 9 PM–5 AM → "Good night"

### Design (Control Center)

- Background: existing `GRADIENT_PRESETS` `LinearGradient` (user loves this — do not change)
- Feature cards: `COLORS.parent.surface` (`rgba(255,255,255,0.72)`), `borderRadius: 16`, `borderColor: COLORS.parent.surfaceBorder`
- Card size: `(screenWidth - 48) / 2` square
- Entrance animation: `FadeInDown` staggered per card row (Reanimated)
- Settings icon: top-right → navigate to existing `(parent)/settings`
- Per-kid badge: small blue dot on kid pill if custom settings exist for that kid

### Per-kid vs Global Toggle

Every feature screen has a segmented control at top: **All Kids** / **[Kid Name]**. On save, if "All Kids" → loop across `childIds` and save same value. If single kid → save only for that `childId`. After saving for one kid, bottom sheet: "Apply to [other kid name] too?"

---

## 7. Kid Mode

**File:** `app/(parent)/control-center/kid-mode.tsx`

**Entry:** "Switch to Kid Mode" stores `selectedKidId` in `deviceSession.store.ts` → navigates to `kid-mode`.

**Exit:** "Switch to Parent Mode" pill → `ParentalPinModal` (4-dot) → `POST /api/v1/auth/verify-parental-pin` → if correct → `router.replace('/(parent)/control-center')`.

### Kid Mode Layout

```
┌─────────────────────────────────────┐
│ Hi Raihan! 👋           [🔒 Parent] │
│ ┌─────────────────────────────────┐ │
│ │ ⏱ Screen time: 1h 20m left      │ │  ← KidScreenTimeBar (colored ring)
│ │ ████████████░░░░░░░░  67%       │ │
│ └─────────────────────────────────┘ │
├─────────────────────────────────────┤
│ ┌───────────────────────────────┐   │
│ │   📺  Videos                  │   │  ← full-width hero card
│ │   Watch your favourite shows  │   │
│ └───────────────────────────────┘   │
│ ┌─────────────┐  ┌─────────────┐   │
│ │ 🤲 Dua      │  │ 🎵 Nasheed  │   │  ← 2-column premium cards
│ └─────────────┘  └─────────────┘   │
│        … more rows scrollable …     │
│ ┌───────────────────────────────┐   │
│ │ 📬 Parent Messages  🔴 2 new  │   │  ← red badge if unread
│ └───────────────────────────────┘   │
└─────────────────────────────────────┘
```

### Content Category Boxes — Filter Rules

**BOXES** are shown/hidden based on **religion only** (never by age — every box is always shown to every child, age does not hide boxes):

| Box                | Shown for                   |
| ------------------ | --------------------------- |
| Videos             | All                         |
| Dua for Kids       | Islam only                  |
| Nasheed            | Islam only                  |
| Quran Recitation   | Islam only                  |
| Asmaul Husna       | Islam only                  |
| Sahaba Stories     | Islam only                  |
| Stories            | All                         |
| Crafts & Art       | All                         |
| History            | All                         |
| Science            | All                         |
| Learn Maths        | All                         |
| Draw & Color       | All                         |
| Good Habits        | All                         |
| Poems & Literature | English language kids       |
| Bengali Letters    | Bangla language kids        |
| My Gallery         | All                         |
| Screen Time Today  | All                         |
| Parent Messages    | All (red badge when unread) |

**VIDEOS inside each box** are filtered by: `religion` + `age` + `gender` + `language` + `country` — building the YouTube search query dynamically:

- Islam + boy + Bangla → `"nasheed for boys bangla no music"`, no videos featuring women singing
- Islam + girl → query includes `girls`, excludes boy-specific content
- Age group from `VideoManagerSettings.ageGroup` (Child 0–7 / Tween 8–11) appended to query
- Language from parent's `languagePreference` → `relevanceLanguage` param
- All queries: `safeSearch=strict`

### Newly Added Content Boxes (language-based)

- **Poems & Literature** — shown when `languagePreference === 'en'`; YouTube search: `"poems for kids english"`, `"children's literature english"`
- **Bengali Letters** — shown when `languagePreference === 'bn'`; YouTube search: `"বাংলা বর্ণমালা শিক্ষা"`, `"bangla alphabet for kids"`; also link to curated free Bengali alphabet PDFs (stored as static JSON, no API needed)

### Screen Time Bar (top of Kid Mode)

**Component:** `KidScreenTimeBar.tsx`

- Shows remaining daily screen time as a colored arc/ring + text "X hr Y min left"
- Color: green (>50% left) → orange (20–50%) → red (<20%)
- When limit is reached → ring pulses red + Lottie overlay "Time's up! Ask a parent"
- Data source: `KidTimeTracker.service.ts` reads local elapsed time + syncs with `ScreenTimeControls.dailyLimitMinutes`

### "Screen Time Today" Box

A category box (same size as others) showing:

- Mini colorful bar chart: time spent per section today (Videos, Dua, Stories, etc.)
- Tap → full-screen detail (section breakdown, total today)
- Built from `kidTimeTracker.service.ts` local log, synced to server

### YouTube Experience (in-app, no ads)

**Approach:** `WebView` with YouTube embed URL + these params:

- `autoplay=1&modestbranding=1&rel=0&showinfo=0&fs=1&playsinline=1`
- Inject JavaScript post-load to hide YouTube header, sidebar, comments, and ads (`document.querySelector('.ytp-ad-module')?.remove()`)
- Videos discovered via **server-side proxy** `GET /api/v1/media/youtube-search?q=...&lang=...` (keeps API key off device)
- Results cached in `AsyncStorage` with 1 hour TTL
- Tap a video thumbnail → full-screen `video-player.tsx` (`WebView`)
- No external YouTube app opened — everything stays in-app

### Parent Messages (rich content)

Parent Messages box on kid side shows:

- Articles (text + images) created by parents
- Short videos (uploaded by parent, stored on Cloudinary)
- Audio voice messages (uploaded by parent, played via `expo-av`)
- Each item shows parent's name + timestamp
- Red blinking dot badge on the box if unread items exist
- Tapping opens a card-style reader with audio play button, image gallery, or text article with "Read to me" button (uses `expo-speech` TTS to read article text aloud)

### Animations (Kid Mode — rich and delightful)

- Session start: `ConfettiOverlay.tsx` (Lottie JSON) plays for 2 seconds when entering kid mode
- Category card entrance: `FadeInDown` staggered (Reanimated) with `springify()`, each card 50ms apart
- Card press: `withSpring` scale to 0.95 on press, bounce back on release
- Screen time ring: animated fill using Reanimated `useSharedValue` + `withTiming`
- When time < 20% left: ring pulse animation (`withRepeat` + `withSequence`)
- Section transitions: `FadeIn` / `FadeOut` (Reanimated)
- New parent message badge: blink animation (`withRepeat`)
- "Time's up" overlay: slides up from bottom with spring

---

## 8. The 8 Feature Screens

### 8.1 Block Apps

- `ParentalControlModule.getInstalledApps()` → grouped list (Social / Games / Entertainment / Education / Other)
- Toggle per app; "Instant Block" duration picker; scheduled block; usage-based limit
- Per-kid or all-kids toggle
- `PATCH /api/v1/safety/:childId/parental-controls` → `blockedApps`

### 8.2 Website Blocker

- Allowlist / Blocklist tabs; domain input + "+" add; preset category buttons
- `allowedDomains` / `blockedDomains` on `ScreenTimeControls`
- Enforced by `ParentalVpnService.kt`

### 8.3 Watch Limit

- Daily limit time picker; "Bedtime Mode" time range
- Multi-kid bottom sheet
- Circular progress ring showing today's usage
- `ScreenTimeControls.dailyLimitMinutes` + `bedtimeStart` / `bedtimeEnd`

### 8.4 Game Settings

- Toggle "Allow games in Kid Mode"
- Optional separate daily game time limit
- `ScreenTimeControls.gamesEnabled`

### 8.5 Video Manager

- **Video Settings**: Age Group, Music level, Video Language, Content Type (Strict Halal / Safe), Gender, Theme
- **Add Video**: paste YouTube URL or playlist URL
- **Manage Videos**: list with delete
- **Parent Content** tab: create article (rich text), upload short video, upload images, upload audio — stored in `ParentContent` model → displayed in kid's "Parent Messages" box
- **Kid Gallery** tab: photos uploaded by kid
- `VideoManagerSettings` model (§10)

### 8.6 App Guard

- Toggle "Keep kids inside this app"
- Permission check → Troubleshoot if not granted
- `ScreenTimeControls.appGuardEnabled`

### 8.7 Stop Internet / Phone-Free Zones

- Instant stop with duration picker
- Weekly schedule builder
- 7-7-7 Rule info card with link
- `ScreenTimeControls.stopInternetEnabled` + `stopInternetScheduleJson`

### 8.8 Troubleshoot

- Step-by-step permission flow with status icons (green check / red !)
  1. Accessibility Service
  2. Usage Access
  3. Display Over Other Apps
  4. VPN Permission
- "Check All Permissions" button refreshes statuses

---

## 9. Native Android Module (Custom Expo Module)

**Directory:** `apps/mobile/modules/parental-control/`
Uses `expo-modules-core`. Requires EAS development build.

### Module Structure

```
modules/parental-control/
  android/src/main/java/expo/modules/parentalcontrol/
    ParentalControlModule.kt
    ParentalAccessibilityService.kt
    ParentalVpnService.kt
    OverlayBlocker.kt
  android/src/main/AndroidManifest.xml
  android/src/main/res/xml/accessibility_service_config.xml
  src/
    index.ts
    ParentalControlModule.ts
  package.json
```

### Exposed JS Methods

| Method                               | Android API                         | Purpose                                    |
| ------------------------------------ | ----------------------------------- | ------------------------------------------ |
| `getInstalledApps()`                 | `PackageManager`                    | All user apps (name, package, icon base64) |
| `getAppUsageStats(startMs, endMs)`   | `UsageStatsManager`                 | Per-app usage minutes                      |
| `hasUsageStatsPermission()`          | `AppOpsManager`                     | Check PACKAGE_USAGE_STATS                  |
| `requestUsageStatsPermission()`      | `ACTION_USAGE_ACCESS_SETTINGS`      | Open settings                              |
| `hasAccessibilityPermission()`       | `AccessibilityManager`              | Check service enabled                      |
| `requestAccessibilityPermission()`   | `ACTION_ACCESSIBILITY_SETTINGS`     | Open settings                              |
| `hasOverlayPermission()`             | `Settings.canDrawOverlays()`        | Check overlay                              |
| `requestOverlayPermission()`         | `ACTION_MANAGE_OVERLAY_PERMISSION`  | Open settings                              |
| `startVpn(blockedDomains: string[])` | `VpnService.Builder`                | DNS-filtering VPN                          |
| `stopVpn()`                          | `VpnService`                        | Stop VPN                                   |
| `isVpnRunning()`                     | `ConnectivityManager`               | VPN status                                 |
| `requestVpnPermission()`             | `VpnService.prepare()`              | VPN consent dialog                         |
| `takeScreenshot()`                   | `PixelCopy`                         | Screen capture → base64                    |
| `takeFrontCameraPhoto()`             | `CameraX ImageCapture` (no preview) | Silent front-camera photo → base64         |
| `hasCameraPermission()`              | `ContextCompat.checkSelfPermission` | Check CAMERA permission                    |
| `setPolicyCache(json: string)`       | `SharedPreferences`                 | Push policy to service                     |

### `ParentalAccessibilityService.kt`

- `onAccessibilityEvent` → `TYPE_WINDOW_STATE_CHANGED` → check foreground package
- If blocked: launch `MainActivity` + show `OverlayBlocker` "This app is blocked by your parent"
- If watch limit exceeded: show "Screen time limit reached" overlay
- If App Guard on: redirect any navigation away back to our app
- Reads policy from `SharedPreferences` (updated by `setPolicyCache`)
- Also emits `APP_SECTION_TIME` events back to JS via event emitter for in-app tracking

### `ParentalVpnService.kt`

- Local-only TUN interface intercepts DNS
- Blocked domains → `0.0.0.0`; allowlist mode supported
- No external traffic; purely local filter

### AndroidManifest additions

```xml
<uses-permission android:name="android.permission.QUERY_ALL_PACKAGES"/>
<uses-permission android:name="android.permission.PACKAGE_USAGE_STATS" tools:ignore="ProtectedPermissions"/>
<uses-permission android:name="android.permission.SYSTEM_ALERT_WINDOW"/>
<uses-permission android:name="android.permission.FOREGROUND_SERVICE"/>
<uses-permission android:name="android.permission.BIND_VPN_SERVICE"/>
<uses-permission android:name="android.permission.CAMERA"/>
```

Plus `<service>` declarations for both `ParentalAccessibilityService` and `ParentalVpnService`.

---

## 10. Backend Schema Changes

**File:** [`apps/server/prisma/schema.prisma`](apps/server/prisma/schema.prisma)

### `User` additions

```prisma
religion          Religion?
parentalPinHash   String?
parentalPinSet    Boolean   @default(false)

enum Religion { ISLAM  CHRISTIAN  OTHER }
```

### `ScreenTimeControls` additions

```prisma
blockedApps           Json     @default("[]")
allowedDomains        Json     @default("[]")
blockedDomains        Json     @default("[]")
gamesEnabled          Boolean  @default(true)
appGuardEnabled       Boolean  @default(false)
stopInternetEnabled   Boolean  @default(false)
stopInternetSchedule  Json?
videoSettings         Json?
customVideos          Json     @default("[]")
dailyLimitMinutes     Int?
bedtimeStart          String?
bedtimeEnd            String?
```

### New `ActivityLog` model

```prisma
model ActivityLog {
  id            String       @id @default(cuid())
  activeKidId   String       // whose account/view was open
  claimedKidId  String?      // who the kid identified as (from KidIdentityModal); null if same
  type          ActivityType
  payload       Json
  screenshotUrl String?
  createdAt     DateTime     @default(now())
  activeKid     ChildProfile @relation("ActiveKidLogs",  fields: [activeKidId],  references: [id])
}
enum ActivityType { APP_OPENED  URL_VISITED  SCREENSHOT  SEARCH_QUERY  SECTION_TIME  IDENTITY_CLAIMED }
```

- When `claimedKidId != activeKidId`, a separate `IDENTITY_CLAIMED` log entry is created so parents can see cross-account usage clearly in `kid-activity.tsx`

### New `KidSectionTimeLog` model (in-app section tracking)

```prisma
model KidSectionTimeLog {
  id         String   @id @default(cuid())
  childId    String
  date       String   // YYYY-MM-DD
  section    String   // "videos", "dua", "stories", etc.
  minutes    Int      @default(0)
  updatedAt  DateTime @updatedAt
  child      ChildProfile @relation(fields: [childId], references: [id])
  @@unique([childId, date, section])
}
```

### New `VideoManagerSettings` model

```prisma
model VideoManagerSettings {
  id            String   @id @default(cuid())
  childId       String   @unique
  ageGroup      String   @default("CHILD")
  musicLevel    String   @default("NONE")
  videoLanguage String   @default("en")
  contentType   String   @default("STRICT_HALAL")
  gender        String   @default("BOTH")
  theme         String   @default("NORMAL")
  child         ChildProfile @relation(fields: [childId], references: [id])
}
```

### New `ParentContent` model

```prisma
model ParentContent {
  id          String      @id @default(cuid())
  familyId    String
  childId     String?     // null = for all kids
  type        ContentType
  title       String
  body        String?     // article text
  mediaUrl    String?     // Cloudinary URL (image/video/audio)
  isRead      Boolean     @default(false)
  createdAt   DateTime    @default(now())
  family      FamilyGroup @relation(fields: [familyId], references: [id])
}
enum ContentType { ARTICLE  VIDEO  AUDIO  IMAGE }
```

---

## 11. New API Endpoints

| Method  | Path                                | Purpose                                           |
| ------- | ----------------------------------- | ------------------------------------------------- |
| `POST`  | `auth/google`                       | Google Sign-In token → JWT                        |
| `POST`  | `auth/set-parental-pin`             | Set/change 4-digit parental PIN                   |
| `POST`  | `auth/verify-parental-pin`          | Verify PIN for Switch to Parent                   |
| `GET`   | `safety/:childId/parental-controls` | Full `ScreenTimeControls`                         |
| `PATCH` | `safety/:childId/parental-controls` | Update any controls                               |
| `GET`   | `children/:childId/installed-apps`  | Get cached installed apps                         |
| `PUT`   | `children/:childId/installed-apps`  | Device pushes app list                            |
| `POST`  | `activity/screenshot`               | Save screenshot URL + log                         |
| `POST`  | `activity/url-visited`              | Log URL                                           |
| `POST`  | `activity/app-opened`               | Log app open                                      |
| `POST`  | `activity/section-time`             | Upsert `KidSectionTimeLog`                        |
| `GET`   | `activity/:childId/today`           | Today's full activity summary for parent          |
| `GET`   | `media/youtube-search`              | YouTube API proxy (`?q=&lang=&safeSearch=strict`) |
| `POST`  | `media/parent-audio`                | Upload audio to Cloudinary                        |
| `POST`  | `media/kid-photo`                   | Upload kid photo to Cloudinary                    |
| `GET`   | `children/:childId/gallery`         | Kid's photo gallery                               |
| `POST`  | `parent-content`                    | Create article/video/audio for kid                |
| `GET`   | `parent-content/:childId`           | Get parent content for kid (kid side)             |
| `PATCH` | `parent-content/:id/read`           | Mark content as read                              |

---

## 12. In-App Section Time Tracking (`KidTimeTracker.service.ts`)

Tracks how long a kid spends in each Kid Mode section:

- On section enter: `startTimer(section)` → records `Date.now()`
- On section leave / app background: `stopTimer(section)` → computes elapsed, adds to local `AsyncStorage` bucket
- Every 5 minutes: batch sync to `POST /api/v1/activity/section-time`
- Used by `KidScreenTimeBar` to show remaining time against `dailyLimitMinutes`
- Used by "Screen Time Today" box to show per-section bar chart

---

## 13. Policy Sync Extension

Extend existing [`src/services/policySync.service.ts`](apps/mobile/src/services/policySync.service.ts):

1. After fetching controls → `ParentalControlModule.setPolicyCache(JSON.stringify(controls))`
2. If `stopInternetEnabled` or `blockedDomains.length > 0` → `ParentalControlModule.startVpn(blockedDomains)`
3. If neither → `ParentalControlModule.stopVpn()`
4. Push notification from server on policy change → triggers immediate re-sync (existing `expo-notifications`)

---

## 14. Kid Activity View for Parents

**File:** `app/(parent)/control-center/kid-activity.tsx`

Accessible from: Control Center → tap "Today's Activity" mini card.

Shows for the selected kid (today):

- Total screen time: `X hr Y min` (from `KidSectionTimeLog`)
- Per-section colorful bar chart (Videos, Dua, Stories, etc.)
- URLs visited list (from `ActivityLog` type `URL_VISITED`)
- Apps used today with duration (from `ParentalControlModule.getAppUsageStats`)
- Screenshot timeline: thumbnails of silent screenshots taken during kid session → tap to view full
- Search queries (if any browser usage was logged)

---

## 15. Settings Tab — Language + Comment-outs

In [`app/(parent)/settings/index.tsx`](<apps/mobile/app/(parent)/settings/index.tsx>):

- Add **"App Language"** row → navigates to `app/auth/language.tsx`
- Comment out **Subscription / Premium** section (`// TODO: commented-for-now 🔴`) — Milestone 1 is free

---

## 16. Design System

### Parent Control Center & Feature Screens

- Background: existing `LinearGradient` from `GRADIENT_PRESETS` (user loves this — do not change)
- Cards: `COLORS.parent.surface = rgba(255,255,255,0.72)`, `borderRadius: 16`, `borderColor: COLORS.parent.surfaceBorder`
- CTAs: `ParentPrimaryButton` with `COLORS.parent.gradientCtaBlue`
- Text: `COLORS.parent.textPrimary = #5C3D2E`, `textSecondary = #8B6355`
- Screen root: always `backgroundColor: transparent`

### Kid Mode — Premium Gradient Cards

Each category card has its own unique gradient background (premium look, not flat pastels):

| Category           | Gradient                                          |
| ------------------ | ------------------------------------------------- |
| Videos             | `['#FF6B6B', '#FF8E53']` (coral-orange)           |
| Dua for Kids       | `['#667EEA', '#764BA2']` (purple-blue)            |
| Nasheed            | `['#43E97B', '#38F9D7']` (green-teal)             |
| Quran Recitation   | `['#4FACFE', '#00F2FE']` (sky blue)               |
| Asmaul Husna       | `['#F093FB', '#F5576C']` (pink-rose)              |
| Sahaba Stories     | `['#FFA07A', '#FF6347']` (salmon-tomato)          |
| Stories            | `['#A8EDEA', '#FED6E3']` (mint-blush)             |
| Crafts & Art       | `['#FFD26F', '#FF6B6B']` (yellow-coral)           |
| History            | `['#6A11CB', '#2575FC']` (deep purple-blue)       |
| Science            | `['#0BA360', '#3CBA92']` (forest green)           |
| Learn Maths        | `['#FEB692', '#EA5455']` (peach-red)              |
| Draw & Color       | `['#C471F5', '#FA71CD']` (purple-pink)            |
| Good Habits        | `['#84FAB0', '#8FD3F4']` (green-blue)             |
| Poems & Literature | `['#FFC3A0', '#FFAFBD']` (peach-pink)             |
| Bengali Letters    | `['#2193B0', '#6DD5ED']` (ocean blue)             |
| Screen Time Today  | `['#F7971E', '#FFD200']` (amber-gold)             |
| My Gallery         | `['#FF9A9E', '#FAD0C4']` (rose-peach)             |
| Parent Messages    | `['#A1C4FD', '#C2E9FB']` (light blue) + red badge |

- Card size: `(screenWidth - 48) / 2` × 150px (2-column grid); hero card (Videos): full width × 170px
- Icon: 48px centered emoji
- Title: 18px bold white text
- `borderRadius: 20`, subtle `shadowColor: 'rgba(0,0,0,0.15)'`

### Language & Auth Screens

- Same `LinearGradient` as existing auth screens
- Language cards: large with flag, tap → scale + blue border (Reanimated)
- PIN dots: 28px circles, empty = outline, filled = `COLORS.parent.primary` with `withSpring` fill animation

---

## 17. Live Activity Monitoring (WebSocket — No Polling)

### Why WebSocket (not polling)

Polling is inefficient: it wastes battery and introduces 5–30 second delays. WebSocket gives the parent an instant feed of everything the kid does, with sub-second latency.

### Packages

**Server** (add to [`apps/server/package.json`](apps/server/package.json)):

```
@nestjs/websockets
@nestjs/platform-socket.io
socket.io
```

**Mobile** (add to [`apps/mobile/package.json`](apps/mobile/package.json)):

```
socket.io-client
```

### Server: Socket.IO Gateway

**New file:** `apps/server/src/modules/monitor/monitor.gateway.ts`

```
@WebSocketGateway({ namespace: '/monitor', cors: ... })
class MonitorGateway {
  // Parent joins room: family:{familyId}:kid:{childId}
  // Kid device joins same room and emits events
  // JWT auth in handshake: socket.handshake.auth.token
}
```

Room naming: `family:${familyId}:kid:${childId}`

**Authentication:** New `WsJwtGuard` validates JWT from `socket.handshake.auth.token` on every connection. Same `JwtStrategy` as HTTP routes — no new auth logic needed.

**Gateway events (server listens from kid, relays to parent):**

| Event (kid → server)     | Payload                            | Server action                             |
| ------------------------ | ---------------------------------- | ----------------------------------------- |
| `kid:session-start`      | `{ kidId, timestamp }`             | Relay to room, log session start          |
| `kid:section-enter`      | `{ section, timestamp }`           | Relay to room                             |
| `kid:section-exit`       | `{ section, durationMs }`          | Relay to room, upsert `KidSectionTimeLog` |
| `kid:video-play`         | `{ videoId, title, thumbnailUrl }` | Relay to room                             |
| `kid:search`             | `{ query, section }`               | Relay to room, save `ActivityLog`         |
| `kid:url-visit`          | `{ url, domain }`                  | Relay to room, save `ActivityLog`         |
| `kid:app-foreground`     | `{ packageName, appName }`         | Relay to room, save `ActivityLog`         |
| `kid:screenshot`         | `{ cloudinaryUrl, timestamp }`     | Relay to room, save `ActivityLog`         |
| `kid:camera-photo`       | `{ cloudinaryUrl, timestamp }`     | Relay to room, save `ActivityLog`         |
| `kid:screen-time-update` | `{ totalMinutesToday }`            | Relay to room                             |
| `kid:session-end`        | `{ timestamp }`                    | Relay to room                             |

**Server also emits to parent (server → parent):**

- `kid:online` — when kid's socket connects
- `kid:offline` — when kid's socket disconnects

### Mobile: Kid Device — `kidSocketEmitter.service.ts`

Singleton service that connects once when kid enters Kid Mode and disconnects when exiting.

```ts
class KidSocketEmitter {
  connect(jwt: string, familyId: string, kidId: string);
  disconnect();
  emit(event: string, payload: object);
  // Convenience methods:
  emitSectionEnter(section: string);
  emitSectionExit(section: string, durationMs: number);
  emitVideoPlay(videoId: string, title: string, thumbnailUrl: string);
  emitSearch(query: string, section: string);
  emitScreenshot(cloudinaryUrl: string);
  emitCameraPhoto(cloudinaryUrl: string);
  emitScreenTimeUpdate(totalMinutes: number);
}
```

- Reconnects automatically on network drop (`socket.io-client` handles this)
- Connection options: `{ transports: ['websocket'], auth: { token: jwt } }`
- Called from `kid-mode.tsx` on mount/unmount and from `silentCapture.service.ts`

### Mobile: Parent Device — `useKidLiveMonitor.ts`

React hook used in `kid-activity.tsx` LIVE tab:

```ts
function useKidLiveMonitor(kidId: string) {
  // Returns:
  isKidOnline: boolean
  liveEvents: LiveEvent[]     // real-time scrolling log
  clearEvents: () => void
}
```

Connects parent's socket to the same room. Appends incoming events to `liveEvents` array (max 200 items, oldest dropped). Disconnects when component unmounts.

### Live Feed UI — `kid-activity.tsx` LIVE Tab

```
┌──────────────────────────────────────┐
│  Raihan's Activity  [LIVE 🟢]  [TODAY]│  ← two tabs
├──────────────────────────────────────┤
│  🟢 Raihan is online right now       │  ← online indicator
│  Using app for 42 min today          │
├──────────────────────────────────────┤
│  ┌────────────────────────────────┐  │
│  │ 📍 Entered "Videos"   2:38 PM  │  │  ← activity card
│  └────────────────────────────────┘  │
│  ┌────────────────────────────────┐  │
│  │ 🎬 Watching: "Dua for Kids"    │  │
│  │    [thumbnail]                 │  │
│  └────────────────────────────────┘  │
│  ┌────────────────────────────────┐  │
│  │ 📸 Screenshot  2:41 PM         │  │
│  │    [thumbnail] → tap to expand │  │
│  └────────────────────────────────┘  │
│  ┌────────────────────────────────┐  │
│  │ 📷 Camera photo  2:43 PM       │  │
│  │    [face thumbnail]            │  │
│  └────────────────────────────────┘  │
│  (scrollable — newest at top)        │
└──────────────────────────────────────┘
```

- New events slide in from top with `FadeInDown` animation (Reanimated)
- Screenshot and camera photo cards show thumbnail; tap → full-screen modal
- Relative timestamps ("just now", "3 min ago") updated in real time
- When kid goes offline → `isKidOnline` false → banner "Raihan is offline"

---

## 18. Silent Capture — Screenshots + Front Camera

### Design Principle

Both captures are completely silent — no shutter sound, no flash, no UI change on the kid's screen. The kid never knows it is happening. This feature is only active when parent has explicitly enabled it in App Guard settings, with a clear disclosure.

### `silentCapture.service.ts`

Orchestrates both capture types:

```ts
class SilentCaptureService {
  startCaptures(kidId: string, policy: CapturePolicy);
  // CapturePolicy: { screenshotIntervalMin: number, cameraIntervalMin: number }
  stopCaptures();
  // Internal timers:
  //   screenshot: react-native-view-shot → base64 → upload → emit socket
  //   camera: ParentalControlModule.takeFrontCameraPhoto() → base64 → upload → emit socket
}
```

**Screenshot flow:**

1. `ViewShot.captureScreen()` → base64 PNG (no visible flash, no sound)
2. Upload to Cloudinary via `POST /api/v1/media/upload-base64` → returns `cloudinaryUrl`
3. Save `ActivityLog` entry (type `SCREENSHOT`)
4. Emit `kid:screenshot` via `KidSocketEmitter` → parent sees live thumbnail
5. Default interval: every **3 minutes** while kid is actively in Kid Mode

**Front camera photo flow:**

1. `ParentalControlModule.takeFrontCameraPhoto()` — Android CameraX `ImageCapture` use case with `LENS_FACING_FRONT`, **no** `Preview` surface attached → completely silent
2. Returns base64 JPEG
3. Upload to Cloudinary via same endpoint
4. Save `ActivityLog` entry (type `CAMERA_PHOTO`)
5. Emit `kid:camera-photo` via `KidSocketEmitter`
6. Default interval: every **5 minutes** (configurable by parent in App Guard settings)
7. Only runs if `silentCameraEnabled === true` in `ScreenTimeControls`

### `takeFrontCameraPhoto()` — Native Implementation Detail

**Android CameraX without preview (Kotlin):**

```kotlin
fun takeFrontCameraPhoto(): Promise<String> {
  val cameraProviderFuture = ProcessCameraProvider.getInstance(context)
  cameraProviderFuture.addListener({
    val cameraProvider = cameraProviderFuture.get()
    val imageCapture = ImageCapture.Builder()
      .setCaptureMode(ImageCapture.CAPTURE_MODE_MINIMIZE_LATENCY)
      .build()
    val cameraSelector = CameraSelector.Builder()
      .requireLensFacing(CameraSelector.LENS_FACING_FRONT)
      .build()
    // Bind ONLY ImageCapture — no Preview
    cameraProvider.bindToLifecycle(lifecycleOwner, cameraSelector, imageCapture)
    imageCapture.takePicture(executor, object : ImageCapture.OnImageCapturedCallback() {
      override fun onCaptureSuccess(image: ImageProxy) {
        val base64 = imageToBase64(image)
        promise.resolve(base64)
        cameraProvider.unbindAll()
      }
    })
  }, ContextCompat.getMainExecutor(context))
}
```

No preview = no visible camera UI = completely silent on screen.

### Parent Disclosure in App Guard Screen

Before `silentCameraEnabled` can be toggled on, a one-time confirmation dialog appears:

> "Enable silent camera monitoring? This will periodically take front-facing photos of whoever is using the device. These photos are only visible to you in the activity log. You are responsible for informing the device user if required by local law."

Parent must tap **"I understand, enable"** to proceed. This consent is recorded (`cameraMonitoringConsentAt: DateTime`) on the `User` model.

### `ScreenTimeControls` additions for capture settings

```prisma
silentCameraEnabled       Boolean  @default(false)
screenshotIntervalMin     Int      @default(3)
cameraIntervalMin         Int      @default(5)
cameraMonitoringConsentAt DateTime?
```

---

## 19. Implementation Order (Todos)

1. Create skill file `.cursor/skills/milestone-1-tracking/SKILL.md`
2. Comment-outs (§2): trial button, child-PIN login, tab bar, add-child PIN, settings subscription
3. Language screen + Settings language row
4. Parental security PIN screen
5. Religion field on register + backend User schema
6. Google Sign-In (mobile + backend)
7. `roleHomeHref.ts` change + `_layout.tsx` route registration
8. **App launch flow + idle detection** (`useIdleDetection.ts` + `app/_layout.tsx`):
   - Cold launch → check `@pmk_last_active_kid_id` → Kid Mode or identity modal
   - Resume after ≥10 min → trigger `KidIdentityModal`
9. **`KidIdentityModal`** + `deviceSession.store.ts` extensions
10. Control Center (`control-center/index.tsx`): greeting, clock, kid selector, feature grid
11. Kid Mode (`kid-mode.tsx`): screen time bar, category boxes, animations, confetti
12. **Backend: WebSocket gateway** (`monitor.gateway.ts`): install `@nestjs/websockets`, `socket.io`; implement events table; `WsJwtGuard`
13. **`kidSocketEmitter.service.ts`** on kid device (connect on Kid Mode entry, emit all events)
14. **`useKidLiveMonitor.ts`** hook + update `kid-activity.tsx` with LIVE tab (real-time feed, online indicator, thumbnail cards)
15. All 8 feature screens including App Guard `silentCameraEnabled` toggle + disclosure dialog
16. **Native module** (`modules/parental-control/`):
    - `ParentalControlModule.kt`: all existing methods + `takeFrontCameraPhoto()` (CameraX no-preview)
    - `ParentalAccessibilityService.kt`, `ParentalVpnService.kt`, `OverlayBlocker.kt`
    - Add `CAMERA` permission to `AndroidManifest.xml`
17. **`silentCapture.service.ts`**: screenshot timer (react-native-view-shot, 3-min interval) + camera timer (native module, 5-min interval) → Cloudinary → socket emit + ActivityLog
18. Backend: full schema migration (all additions from §10 + §18) + all new API routes + `media/upload-base64` endpoint
19. YouTube WebView integration (server proxy + in-app player, no ads)
20. `KidTimeTracker.service.ts` + `KidSectionTimeLog` sync
21. Policy sync extension (SharedPreferences + VPN)
22. Parent content creation (video-manager.tsx + ParentContent model)
23. Kid Activity parent view: TODAY tab + dual-identity warnings
24. Animations pass: Reanimated, confetti, live-feed slide-in, identity modal shake/bounce
