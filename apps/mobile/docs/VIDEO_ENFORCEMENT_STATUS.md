# Video enforcement — what applies today

This document explains **where** ParentingMyKid applies Video Manager rules, so parents and developers share the same expectations.

## Summary

| Surface | In-app YouTube (Kid categories / WebView player) | Official Android apps (YouTube, TikTok, …) |
|--------|---------------------------------------------------|---------------------------------------------|
| Blocked channels/videos from Video Manager | Filtered in search; player blocked if ID is on list | Not auto-blocked by those lists alone (use Block Apps for full app block) |
| `videoSettings` JSON on server | Used for search filter + playback gate | Mirrored into native `videoPolicy` JSON for **experimental** Shorts disruption (YouTube only, optional) |
| Per-app toggles / time budget | Stored; in-app limits can be extended later | **Experimental**: YouTube Shorts heuristic when parent disables Shorts + Guided mode (Android) |

## Technical references

- Policy payload built in [`policySync.service.ts`](../src/services/policySync.service.ts) → native `ParentalPolicy` prefs key `policy`.
- Server YouTube proxy: [`media.service.ts`](../../server/src/modules/media/media.service.ts).
- Video Manager UI: [`video-manager.tsx`](../app/(parent)/control-center/video-manager.tsx).

## iOS

Apple does **not** expose Android-style Accessibility hooks to block specific surfaces (e.g. only Shorts) inside third-party apps. Practical options:

| Approach | Role for PMK |
|----------|----------------|
| **Screen Time** (child device / Family Sharing) | Parents configure downtime/app limits at the OS level; PMK can **coach** and **link** but not replace Settings. |
| **Supervised / MDM** | Institutional or advanced families; separate from consumer app features. |
| **In-app curated YouTube** | Full control inside ParentingMyKid WebView/search — **this is the reliable path on iOS**. |

**Messaging:** Avoid promising “block YouTube Shorts inside the official app” on iOS the same way as on Android until a dedicated Apple strategy ships.

## Third-party APIs (in-feed)

YouTube Data API v3 is supported server-side. **TikTok / Instagram / Facebook** do not offer a general “search all public video inside my parenting app” API; typical approaches are **curated URLs**, **WebView**, **device enforcement**, or large **Meta/TikTok developer programs** with app review. Netflix has **no** public playback API for partners; use **metadata aggregators** or **deep links** only.
