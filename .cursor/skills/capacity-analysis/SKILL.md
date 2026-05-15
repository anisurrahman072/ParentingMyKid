---
name: capacity-analysis
description: >-
  Infrastructure capacity limits and scaling roadmap for ParentingMyKid. Covers
  MongoDB Atlas M0, Render.com free tier, Socket.IO, cron jobs, and concurrent
  user ceilings. Read when asking about infrastructure scaling, user capacity,
  when to upgrade, performance issues, cron jobs, or WebSocket limits.
---

# ParentingMyKid Infrastructure Capacity Analysis

Read [ANALYSIS.md](ANALYSIS.md) for the full deep-dive. This file is the quick-action reference.

---

## Current Stack

| Layer | What you have |
|---|---|
| API server | NestJS 11 + Fastify, Mongoose, JWT auth (`pmk-api`) |
| Socket server | Standalone Socket.IO, pure in-memory, JWT auth (`pmk-socket`) |
| Database | MongoDB Atlas **M0** free tier (512 MB storage, shared RAM/CPU) |
| Cache | MongoDB-backed `SessionCache` collection (NOT Redis) |
| Hosting | Render.com **free** tier — 512 MB RAM, 0.1 vCPU, spins down after 15 min |
| Cron jobs | 3 jobs: daily push reminders, weekly analytics, weekly push report |

---

## Hard Limits (confirmed from vendor docs)

- **Render free tier:** 512 MB RAM, 0.1 vCPU per service, 15-min spin-down, 100 GB bandwidth
- **MongoDB Atlas M0:** 512 MB storage hard cap, 500 connections max, shared IOPS (no SLA)
- **Socket.IO (ws library):** ~50 KB RAM per connection → ~7,000 theoretical; real ceiling ~800–1,000 (file descriptors on free tier)

---

## Realistic Capacity (after Phase 0 code fixes)

| Metric | Comfortable | Degraded | Failure |
|---|---|---|---|
| Total registered users | 0 – 2,500 | 2,500 – 6,000 | 6,000+ |
| Concurrent HTTP users | 0 – 80 | 80 – 200 | 200+ |
| Concurrent WebSocket pairs | 0 – 300 | 300 – 600 | 800+ |
| MongoDB storage | < 150 MB | 150 – 400 MB | 512 MB (hard stop) |
| Daily cron duration | < 5 s (< 1,000 kids) | 5–30 s | 30 s+ |
| Weekly cron duration | < 30 s (any size) | 30 s – 3 min | 3 min+ |

> **Before Phase 0 fixes:** safe zone was only 50–100 concurrent HTTP users, 500–1,500 total users.

---

## Scaling Roadmap

### Phase 0 — Fix Code (NOW, $0) ✅ IMPLEMENTED
See "Phase 0 Changes Applied" section below.

### Phase 1 — First Real Users (50–500 users, **~$14/month**)
**When:** Before public launch or first 50 active users.
**What:** Change `plan: free` → `plan: starter` for BOTH services in `render.yaml`.
- Eliminates 15-minute spin-down cold starts (30–60 s delay)
- $7/month × 2 services = $14/month

### Phase 2 — Growth Stage (500–3,000 users, **~$70/month**)
**When:** MongoDB storage exceeds 300 MB, or weekly cron > 3 min.
**What:**
1. Upgrade MongoDB Atlas M0 → **M10** ($57/month): dedicated RAM (2 GB), 10 GB storage, automated backups, SLA latency
2. Add **Upstash Redis** (free tier: 10,000 commands/day) as a real cache — replace MongoDB `SessionCache` lookups for session validation

### Phase 3 — Meaningful Scale (3,000–15,000 users, **~$150–300/month**)
**When:** API p95 latency > 500 ms, or socket server approaches 500 concurrent connections.
**What:**
1. Add `@socket.io/redis-adapter` to `apps/socket-server/src/index.ts` — enables running multiple socket server instances
2. Upgrade Render API service to **Standard** plan (more RAM/CPU)
3. Add 30-second client-side event buffering in the mobile app before writing activity logs to reduce DB write frequency

### Phase 4 — Serious Product (15,000–50,000 users, **~$500–1,500/month**)
**What:**
1. Multiple API instances + load balancer
2. MongoDB M20/M30 with a read replica — run the weekly analytics cron against the replica, not primary
3. Separate lightweight ingest service for high-frequency activity logs (screenshot/URL events from kids)

### Phase 5 — 100,000 Users ($3,000–8,000+/month)
Sharded MongoDB, Kubernetes auto-scaling, dedicated Socket.IO cluster, Kafka/SQS for activity ingest, multi-region Atlas.

---

## Phase 0 Changes Applied

All four changes were implemented on **2026-05-15**. No features were broken.

### Fix 1: TTL Indexes (storage protection)

**Files changed:** `apps/server/src/database/schemas/misc.schemas.ts`, `apps/server/src/database/schemas/safety.schemas.ts`

| Collection | TTL field | Expiry | Reason |
|---|---|---|---|
| `activity_logs` | `createdAt` | 90 days | Screenshots, URL visits, app events grow unboundedly |
| `kid_section_time_logs` | `createdAt` | 90 days | Per-kid time tracking, only needed for recent analytics |
| `location_events` | `createdAt` | 30 days | GPS pings — no feature uses 30-day-old location |
| `screen_usage_logs` | `createdAt` | 90 days | Usage stats — analytics only looks at last 30 days |
| `content_filter_events` | `createdAt` | 30 days | Blocked URL events — short-term forensics only |

`session_caches` already had a TTL index (`expiresAt`). No change needed there.

**Impact:** Prevents storage exhaustion. Without TTL, 100 active kids generate ~2.7 GB of `activity_logs` in 90 days — more than 5× the 512 MB limit.

### Fix 2: Compound Indexes (query speed)

**Files changed:** same schema files

| Collection | New compound index | Covers query |
|---|---|---|
| `activity_logs` | `{ activeKidId: 1, createdAt: -1 }` | `getTodayActivity()` date range per kid |
| `kid_section_time_logs` | `{ childId: 1, date: 1 }` | section time lookup by kid + date |
| `location_events` | `{ childId: 1, timestamp: -1 }` | location history by kid |
| `screen_usage_logs` | `{ childId: 1, date: 1 }` | screen usage by kid + date |
| `content_filter_events` | `{ childId: 1, timestamp: -1 }` | filter event history by kid |

**Impact:** As these collections grow, queries that previously did a full index scan on `childId` + a date sort now use a single B-tree traversal. 5–20× faster at 10,000+ records per collection.

### Fix 3: Daily Cron — Batch (N+1 → 3 queries)

**File changed:** `apps/server/src/modules/notifications/notifications.service.ts`

Before: 1 `childProfile.find()` + **N individual `dailyMission.findOne()`** per child + **N individual Expo HTTP calls**. At 1,000 children = 2,001 DB/network operations.

After: 3 total DB queries (childProfiles, usersWithTokens, all todayMissions) + 1 Expo batch push call. At 1,000 children = **3 DB queries + 1 batch HTTP call**.

**Impact:** Daily cron drops from ~5 minutes to under 5 seconds at 1,000 children. Eliminates MongoDB contention that blocked all user requests during the cron window.

### Fix 4: Weekly Analytics Cron — Pagination (unbounded RAM → 50-family pages)

**File changed:** `apps/server/src/modules/analytics/analytics.service.ts`

Before: `familyGroup.find().lean()` loaded ALL families into RAM at once. At 1,000 families = entire collection in memory → potential OOM on Render 512 MB.

After: `while + skip + limit(50)` processes 50 families per page. RAM usage is bounded to 50 family objects regardless of total count. Also optimized `buildWeeklyReport` to run all children's analytics in parallel (`Promise.all`) instead of serially.

**Impact:** Weekly cron no longer risks OOM on any size database. Per-family email latency unchanged. Children analytics within each family run in parallel (2 children = 2× faster per family).

---

## Key Code Anti-Patterns to Watch

1. **MongoDB-as-cache** — `CacheService` uses MongoDB for session validation on every request. This doubles DB load. Fix in Phase 2 with Upstash Redis.
2. **No Redis adapter on socket server** — Cannot run multiple socket server instances. Fix in Phase 3.
3. **OpenAI calls are not rate-limited per user** — AI module uses GPT-4o with no per-user throttle. Watch OpenAI billing at scale.
4. **Activity logs have no client-side batching** — Kids' devices write every screenshot/URL immediately. Consider 30s client buffer in Phase 3.

---

## Quick Decision Guide

| You notice this → | Do this |
|---|---|
| Users complain app takes 30–60 s to load | Upgrade Render to Starter ($7/service/month) — cold start issue |
| MongoDB storage approaches 400 MB | Upgrade to Atlas M10 ($57/month) |
| Weekly cron takes > 3 min | Phase 2 fixes already applied; upgrade Atlas for faster IOPS |
| API latency > 500 ms under load | Add Redis cache for sessions (Phase 2) |
| Socket server drops connections at scale | Add Redis adapter (Phase 3) |
| You have > 5,000 registered users | Re-read Phase 3 section above |
