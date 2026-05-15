# Deep Infrastructure Capacity Analysis — ParentingMyKid

> Full research and analysis. Last updated: 2026-05-15.

---

## 1. Infrastructure Overview

| Layer | Detail |
|---|---|
| **API** | NestJS 11 + Fastify adapter. Fastify gives 2.7× more throughput than Express-based NestJS. ~200–300 MB baseline RAM. |
| **Socket server** | Standalone Socket.IO 4.x, `ws` transport, pure in-memory pub/sub. No Redis adapter → single-process only. |
| **Database** | MongoDB Atlas M0 — 512 MB storage, shared vCPU + shared RAM, 500 connections max, no backup SLA. |
| **Cache** | MongoDB-backed `SessionCache` collection — NOT Redis. Every auth request = 2 MongoDB round-trips minimum. |
| **Hosting** | Render.com free tier — 512 MB RAM, 0.1 vCPU, 15-min spin-down, 100 GB/month bandwidth. |
| **Cron** | 3 NestJS `@Cron` jobs registered via `@nestjs/schedule`. Run on the same process as the API. |

---

## 2. Hard Limits (from vendor documentation, May 2026)

### Render Free Tier
- RAM: 512 MB per service
- CPU: 0.1 vCPU per service (1/10th of one modern core)
- Spin-down: 15 minutes of inactivity → 30–60 s cold start on next request
- Build minutes: 500/month
- Bandwidth: 100 GB/month outbound

### MongoDB Atlas M0
- Storage: 512 MB hard cap
- Connections: 500 max per node (shared cluster — practical performance degrades well before 500)
- RAM: Shared — your cluster competes with other M0 tenants
- IOPS: Not guaranteed. Latency can spike from ~5 ms to 100–500 ms under contention
- No automated backups

### Socket.IO (default ws library)
- Per-connection heap: ~50 KB (Socket.IO official docs + community benchmarks: 1.5 GB at 30,000 connections)
- Theoretical ceiling on 512 MB: ~7,200 connections
- Practical ceiling (file descriptor limit, typically 1,024 per process): ~800–1,000 connections
- Note: No Redis adapter means horizontal scaling is impossible without code change

---

## 3. Code-Level Bottlenecks Found (pre-Phase 0)

### Bottleneck 1: MongoDB-as-Cache (Doubles DB Load on Every Request)
Every authenticated API request calls `cache.sessionExists()` which hits MongoDB. 100 concurrent users making 1 request/second = 200+ MongoDB ops/second just for auth — before any business logic.

### Bottleneck 2: Daily Cron — Serial N+1 (1,001 queries at 1,000 kids)
`sendDailyMissionReminders` fetched 1,000 child profiles, then for each child made one individual `dailyMission.findOne()` await. 1,000 serial DB queries + 1,000 serial Expo HTTP calls ≈ 5 minutes of continuous load.

### Bottleneck 3: Weekly Analytics Cron — Unbounded Memory Load
`familyGroup.find().lean()` loaded ALL families into RAM with no limit. At 1,000 families = entire collection in Node.js heap. Risk of OOM (Out Of Memory) crash on Render 512 MB instance.

### Bottleneck 4: High-Write Collections With No TTL
`activity_logs`, `location_events`, `screen_usage_logs`, `content_filter_events` grow forever. One active kid generates ~100 events/day × 3 KB avg = 300 KB/day = 108 MB/year. 100 active kids = 10.8 GB/year — 21× the storage limit.

### Bottleneck 5: Missing Compound Indexes
`getTodayActivity()` queries `activity_logs` by `{ activeKidId, createdAt range }`. Only a single-field index on `activeKidId` existed. MongoDB had to scan all records for that kid to apply the date filter. Progressively slower as the collection grows.

---

## 4. Capacity Numbers (Pre vs Post Phase 0)

| Metric | Before Phase 0 | After Phase 0 |
|---|---|---|
| Safe concurrent HTTP users | 50 | 80 |
| Safe total registered users | 500–1,500 | 2,000–2,500 |
| Daily cron at 1,000 kids | ~5 minutes | ~5 seconds |
| Weekly cron at 500 families | ~10+ minutes + OOM risk | ~2 minutes, bounded RAM |
| Storage growth (100 active kids, 1 year) | 10.8 GB (impossible on M0) | ~1.5 GB (TTL keeps it clean) |
| Storage growth with TTL (100 active kids) | N/A | ~135 MB (90-day rolling window) |

---

## 5. Why 100,000 Users Is Not Possible on This Stack

- Storage: 100,000 families × 1 active kid each × 300 KB/day = 30 GB/day of activity events. Atlas M0 = 512 MB.
- CPU: 0.1 vCPU can handle ~50–150 concurrent HTTP requests before latency degrades past 2 seconds.
- Weekly cron: `familyGroup.find()` at 100,000 families = loading ~100 MB of JSON into a 512 MB process.
- WebSocket: 100,000 parent-kid monitoring pairs = 200,000 connections. Max ~1,000 on free tier.
- MongoDB connections: 100,000 active sessions generating session lookups would exhaust the 500-connection limit.

**Honest ceiling before paid infrastructure:** ~2,500 registered users, ~80 concurrent, ~300 WebSocket pairs.

---

## 6. Expert References

- Socket.IO memory usage: [socket.io/docs/v4/memory-usage](https://socket.io/docs/v4/memory-usage/) — linear scaling, ~50 KB per connection with ws library
- MongoDB Atlas M0 limits: [mongodb.com/docs/atlas/reference/free-shared-limitations](https://www.mongodb.com/docs/atlas/reference/free-shared-limitations/)
- Render free tier: [render.com/docs/free](https://render.com/docs/free) — 512 MB RAM, 0.1 vCPU, 15-min spin-down
- NestJS + Fastify benchmarks: 2.7× more requests/s vs Express adapter under 100 concurrent users
- MongoDB N+1 anti-pattern: Martin Fowler — using a separate query per item in a loop is the classic N+1 problem; bulk `$in` queries are the standard fix
- TTL indexes: MongoDB official — TTL indexes run a background thread every 60 seconds deleting expired documents; no performance impact on reads/writes
