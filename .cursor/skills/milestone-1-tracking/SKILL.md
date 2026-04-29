---
name: milestone-1-tracking
description: Tracks every code block that was commented-out-but-not-deleted during Milestone 1 implementation. Read this skill whenever editing auth screens, layout files, settings, or any file listed below so the log stays accurate. Use 'grep "commented-for-now"' to find all markers in the codebase.
---

# Milestone 1 — Commented-Out Code Tracker

Every hidden (not deleted) block is marked with `// TODO: commented-for-now 🔴` in code so it is findable via:
```
grep -r "commented-for-now" apps/mobile/
```

## Log of All Commented-Out Blocks

### 1. `apps/mobile/app/auth/index.tsx`
- **Lines 51–58** — "Start Free Trial — 14 Days" primary `TouchableOpacity` button
- **Reason:** Milestone 1 is entirely free; trial messaging is inappropriate. Replaced with "Get Started Free" button pointing to the same `/auth/register` route.
- **Restore when:** A paid tier is introduced (Milestone 2+).

### 2. `apps/mobile/app/auth/login.tsx`
- **Lines 184–196** — "Sign in as a child (PIN)" `TouchableOpacity` button + its `or` divider above it
- **Reason:** Child PIN login is a Milestone 3+ feature. In Milestone 1 only parents log in; kids are identified via the `KidIdentityModal` after parent login.
- **Restore when:** Child PIN login is re-enabled (Milestone 3).

- **Lines 199–204** — "Start free trial" footer text link
- **Reason:** Same as above — no trial messaging in Milestone 1.
- **Restore when:** Paid tier is introduced.

### 3. `apps/mobile/app/(parent)/_layout.tsx`
- **tabBarStyle `display: 'none'`** added to `screenOptions`
- **Reason:** The bottom tab bar is replaced by the new single-page Control Center. The entire `<Tabs>` code and all tab screen registrations remain intact.
- **Restore when:** Bottom tabs are re-enabled for Milestone 2+ parent navigation.

### 4. `apps/mobile/app/(parent)/family-space/add-child.tsx`
- **`initialPin` state + validation guard** — 4-digit PIN removed from child creation (commented blocks remain in file)
- **API payload** — `initialPin` and `familyId` omitted; server creates the child under the parent’s **default family** (first `FamilyMember` row by `joinedAt`)
- **`ParentHouseholdSwitcherCard`** — removed from this screen so parents cannot switch target household here
- **`setCachedChildPin`** — import/call removed (no PIN)
- **PIN field UI section** — entire "4-digit PIN" block commented out
- **Backend:** `CreateChildDto.initialPin` is optional; `ChildrenService.createChild` sets `pinHash` / `pinEnc` only when a 4-digit PIN is provided
- **Reason:** Milestone 1 — Kid Mode on parent device + `KidIdentityModal`, not child PIN login.
- **Restore when:** Child PIN login is re-enabled (and restore household switcher if multi-family targeting is needed again).

### 5. `apps/mobile/app/(parent)/settings/index.tsx`
- **Upgrade banner (lines ~144–153)** — "Upgrade to Premium" `TouchableOpacity` banner
- **"💳 Subscription" settings row (line ~173)** — subscription management row
- **`🆓 Free Trial` plan badge text** — changed to "✓ Active" for Milestone 1
- **Reason:** All Milestone 1 features are free. No subscription UI is shown.
- **Restore when:** Premium tier is launched.

## Rules for Future Agents

1. When commenting out code, **always** add `// TODO: commented-for-now 🔴` on the same line or the line above.
2. **Never delete** the commented code — only wrap in JSX comments `{/* ... */}` or line comments `//`.
3. **Always update this file** with the exact file path, approximate line numbers, reason, and restore condition.
4. When restoring a block, remove the `TODO: commented-for-now 🔴` marker and update this log.
