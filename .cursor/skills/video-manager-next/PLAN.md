# Video Manager & YouTube — Next plans

Roadmap and research notes for **Video Manager**, **YouTube**, and related **social video** parental control. Use this when planning milestones after the current Video Manager storage/UI work.

**Related code (today)**  
- Mobile: `apps/mobile/app/(parent)/control-center/video-manager.tsx`  
- Policy JSON helpers: `apps/mobile/src/utils/videoManagerPolicy.ts`  
- YouTube search proxy: `apps/server/src/modules/media/media.service.ts` (`resultType=video|channel`)  
- Kid browsing: `apps/mobile/app/(parent)/control-center/category/[id].tsx`, `video-player.tsx`  
- **Native YouTube content-type detection (Android)**: `apps/mobile/modules/parental-control/android/src/main/java/expo/modules/parentalcontrol/ParentalAccessibilityService.kt`
  - Single source of truth for the floating ribbon's "Currently in: YouTube · …" text is `probeYoutubeContentTypeAndUpdateLabel()`.
  - It uses `findAccessibilityNodeInfosByViewId` (full-tree, OS-indexed) on the YouTube root window for stable Shorts IDs (`reel_player_page_container`, `reel_recycler`, `reel_watch_fragment_root`, …) and for long-form player IDs (`watch_player`, `player_view`, …), gated on `nodeIsVisibleOnScreen`.
  - Driven by `youtubeMonitorTicker` every `YOUTUBE_MONITOR_TICK_MS` (700 ms) **whenever YouTube is foreground** — runs even when blocking is disabled so the parent always sees the right label.
  - Sticky windows: `YT_LABEL_SHORTS_STICKY_MS` (2.5 s), `YT_LABEL_LONGFORM_STICKY_MS` (2 s) keep the label stable across momentary probe misses.
  - Reference: based on the Scrolless production blocker (F-Droid).

---

## 1. Two ways to present video (product North Star)

| Mode | What it means | What we need next |
|------|----------------|-------------------|
| **A — In-app curated** | YouTube-like experience inside ParentingMyKid: search/play via API/WebView, full control over results. | Enforce **filters + blocklists + allowlists** in search and before play; optional richer “YouTube-like” grid/player. |
| **B — External guided** | Kid uses official YouTube, TikTok, Instagram, Facebook; parent sets policy from PMK. | **Device-level enforcement**: Accessibility / overlay / usage (same family as Game Settings + VPN/DNS where relevant); clear UX that Shorts/Reels blocking is **native roadmap**, not just toggles in JSON. |

Both can coexist per family: e.g. curated in Kid Mode + limited official app use with caps.

---

## 2. What others do that we do not fully have yet

These are common in **FamiSafe-class**, **Mobicip**, **Shortstop-style**, or **MDN + companion app** products. Our UI already **stores intent** for several; **enforcement and depth** are the gaps.

- **Short-form-only blocking** (YouTube Shorts, Reels, TikTok feed, Spotlight) without killing the whole app — often needs **Accessibility overlays**, app-specific heuristics, or **dedicated helper apps**.
- **Per-app screen time** with **hard stop** and **daily reset** tied to **Usage Stats** on the **child device** (we have patterns for games; extend to video/social packages).
- **Social monitoring / risk alerts** on DMs and posts (separate big product area; Bark/FamiSafe territory).
- **Scheduled blocks** (homework, bedtime) scoped to **video apps only**.
- **Strict allowlist** for YouTube channels at the **player** level (we have pieces: `youtubeAllowedChannelIds` on controls + Video Manager blocks — need **one coherent rule engine** in kid flows).
- **Kid-facing dashboard** of remaining minutes and “why this video was hidden.”
- **Remote approve/deny** next video or next app session (async parent workflow).

---

## 3. Technical realities (so plans stay honest)

- **YouTube Data API**: good for **search, metadata, channel/video IDs**; **not** for “halal / adult / gender composition / nasheed-only” as guaranteed fields. Those need **your own rules** (allowlist, blocklist, optional ML) on **your** pipeline.
- **Restricted Mode / supervised Google accounts**: complements PMK; still not fine-grained for faith-specific rules.
- **Instagram / TikTok / Facebook**: **no** parent-friendly public API equivalent to “search any video and block by id” for all surfaces; competitors rely on **device control**, **VPN/DNS**, **their own browser**, or **OS parental features**.
- **AI / classifiers**: viable when applied to **URLs/metadata you fetch**, or **user-uploaded samples**; **expensive and sensitive** if processing every frame/audio of arbitrary third-party playback.

---

## 4. Near-term engineering backlog (high leverage)

Ordered for impact vs effort.

1. **Respect Video Manager in kid paths**  
   - Filter or hide **blocked video IDs** and **blocked channel IDs** in category search results and before opening `video-player`.  
   - Apply **`customUrls` + filter prefs** when building search queries server- or client-side.

2. **Single source of truth for YouTube channel rules**  
   - Align **Video Manager** block list with **`youtubeBlockedChannelIds`** / allowlist flags so Safety + Kid Mode + server policy don’t diverge.

3. **Native enforcement spec (Android child profile)**  
   - Map `platformToggles` (Shorts vs long-form) to concrete **packages** (`com.google.android.youtube`, Instagram, TikTok, etc.) and **Accessibility** behaviors (reuse Block Apps / game timer patterns).

4. **Usage + limits**  
   - Persist **video time budget** (`timeBudget` in `videoSettings`) into the same **daily usage** pipeline as games where possible; surface **remaining minutes** to parents and optionally kids.

5. **Server: optional enrichment**  
   - Cache video metadata; optional **moderation provider** or **simple keyword/tag rules** on titles/descriptions (no illusion of 100% accuracy).

---

## 5. Making Video Manager more “engaged” (product ideas)

Ideas that improve **learning and habit**, not only blocking — good differentiators vs “dumb timers.”

### 5.1 Kid-visible “goal of the day”

- Parent sets a **short intention** (“Today: 20 min Quran stories + 10 min math”) in Video Manager or Kid Mode setup.  
- Kid sees it at session start; optional checkmark when they pick something that matches a **tag/category** (lightweight, honor-based or parent-curated list).

### 5.2 Post-watch one-tap “quiz” or reflection (in-app curated path)

- After a video opened **inside PMK**, show **one question** (“What did you learn?” multiple choice or voice note).  
- Store **reflections** for parent dashboard; optional **streak** without tying to rewards spam.

### 5.3 Co-viewing / parent queue

- **Parent approves next N videos** from search results into a **queue** the kid can only play from for that session.  
- Push notification to parent: “Request to watch X” (later milestone).

### 5.4 Weekly video summary for parents

- **Minutes per app** vs **budget**; top channels watched; **blocked attempts** count (once enforcement exists).  
- Ties into existing **usage batch** / section time logs if extended with **video-tagged** segments.

### 5.5 “Praise log” / learning journal

- Kid (or parent) logs **one sentence** after a good session; appears in **Family Space** or parent digest — reinforces **learning from video**, not passive consumption.

### 5.6 Transparency for the child

- When a clip is blocked, show a **kid-safe reason** (“Family rule: no Shorts right now” / “This channel is on your parent list”) to reduce frustration and build trust.

---

## 6. Suggested milestone slices (for future PRs)

- **M-Video-1**: Kid search/player respects **blocklist + customUrls** + basic filter query params.  
- **M-Video-2**: **Per-platform Android** enforcement MVP (at least **YouTube Shorts** or **one app**) + usage tie-in.  
- **M-Video-3**: Parent **queue** + kid **goal of the day**.  
- **M-Video-4**: **Weekly report** + **reflection** log.  
- **M-Video-5** (optional): **Moderation/ML** pipeline on metadata only, with clear privacy policy.

---

## 7. Maintenance

When an item ships, **move it to a “Done” subsection** or delete from backlog here; add new competitor observations as you research.  
If agents should auto-read this before changing Video Manager, add a short `SKILL.md` beside this file pointing to `PLAN.md`.

---

## 8. Platform integration strategy (Meta / TikTok / Netflix / Twitch)

Pick **one primary strategy per platform**; mixing without legal review is risky.

| Platform | Strategy A: Curated in PMK | Strategy B: API / account-linked | Strategy C: Device enforcement only |
|----------|----------------------------|-----------------------------------|-------------------------------------|
| **Instagram / Facebook** | Parent-pasted URLs or embed WebView where TOS allows; no global Reels search. | Meta developer app + **app review**; scopes limited to **owned** or approved assets — not arbitrary feeds. | Accessibility + DNS (Kahf-style) on official apps. |
| **TikTok** | Curated links only. | TikTok developer programs (login, posting, research) — **not** a generic kid-safe browser API. | Official app + Accessibility/time caps. |
| **Netflix** | Deep link to title; **no** in-app licensed playback without partnership. | No first-party catalog API; optional **third-party metadata** SaaS (pricing per vendor). | Block Apps / schedules / Netflix Kids profile. |
| **Twitch** | Curated channel URLs. | Twitch Helix with Client ID; **terms + rate limits**; small modules only. | Time caps on official app. |

**Legal/TOS**: Any embedding or reproduction of third-party video requires **compliance review** (Meta Platform Terms, TikTok Developer Terms, YouTube API Services Terms, Twitch Developer Agreement).

---

## 9. iOS vs Android

- **Android**: Accessibility-based disruption (e.g. experimental YouTube Shorts back-off) and VPN/DNS are technically feasible with explicit permissions; behavior varies by OEM and app version.
- **iOS**: No equivalent to Android’s open Accessibility control of third-party UIs. Expect **Screen Time** (Family Sharing), **supervised devices**, or **feature gaps** for “block only Shorts inside official YouTube.” Product and support copy should **not promise** Kahf-class parity on iOS without a dedicated Apple strategy.

