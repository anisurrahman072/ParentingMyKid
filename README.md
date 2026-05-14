# ParentingMyKid — Infrastructure Setup Guide

---

## Architecture Overview

```
Mobile App (Expo/React Native)
         ↕ REST API              ↕ Socket.IO (real-time)
NestJS API (Render.com)    Socket.IO Server (Render.com)
    ↕            ↕            ↕            ↕
MongoDB Atlas  Cloudinary  OpenAI       Resend
(Free M0)                 (GPT-4o)    (Email)
         ↕
    RevenueCat (Subscriptions)
```

### Two Render services

| Service | Folder | Purpose |
|---------|--------|---------|
| `pmk-api` | `apps/server` | NestJS REST API + scheduled jobs |
| `pmk-socket` | `apps/socket-server` | Dedicated Socket.IO pub-sub for live parent-kid monitoring |

---

## 1. MongoDB Atlas — Free M0 Tier (replaces PostgreSQL)

**Why MongoDB?** No SQL migrations to run, schema-flexible, free M0 cluster handles hundreds of thousands of documents with no configuration.

**Steps:**

1. Go to [mongodb.com/atlas](https://www.mongodb.com/atlas) → Create account (no credit card)
2. Create a **Free M0** cluster (512 MB, shared)
3. Add a database user: Database Access → Add New User
4. Allow network access: Network Access → Add IP Address → `0.0.0.0/0` (allows Render)
5. Copy the connection string: Connect → Connect your application → Driver: Node.js
6. **Where to set this:**
   - **Local dev:** `apps/server/.env` → `MONGODB_URI=mongodb+srv://...`
   - **Render:** Dashboard → `pmk-api` service → Environment → Add `MONGODB_URI`

```
MONGODB_URI=mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/parentingmykid?retryWrites=true&w=majority
```

**No `db:push` needed.** Mongoose creates collections automatically on first write.

**Free tier:** 512 MB storage, shared cluster — good for ~100k users with typical document sizes.

---

## 2. NestJS Backend — Render.com (replaces Railway.app)

**Why Render?** Free Web Service tier, WebSocket support, no seat fees.

### Quick deploy (Blueprint)

1. Push this repo to GitHub
2. Go to [render.com](https://render.com) → New → **Blueprint**
3. Connect your GitHub repo — Render reads `render.yaml` automatically
4. Two services are created: `pmk-api` and `pmk-socket`
5. Set the secret env vars in the Render dashboard (those marked `sync: false` in `render.yaml`):
   - `MONGODB_URI` — your Atlas connection string
   - `JWT_SECRET` and `JWT_REFRESH_SECRET` — same in both services
   - `CHILD_PIN_ENCRYPTION_KEY`
   - `CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET`
   - `OPENAI_API_KEY`
   - `RESEND_API_KEY`
   - `REVENUECAT_WEBHOOK_SECRET`
   - `YOUTUBE_API_KEY`

### Manual deploy (no Blueprint)

**API service (`pmk-api`):**
1. New → Web Service → Connect repo → Root directory: `apps/server`
2. Build command: `npm install && npm run build`
3. Start command: `node dist/main.js`
4. Add all env vars from `apps/server/.env.example`

**Socket service (`pmk-socket`):**
1. New → Web Service → Connect same repo → Root directory: `apps/socket-server`
2. Build command: `npm install && npm run build`
3. Start command: `node dist/index.js`
4. Add env vars: `JWT_SECRET` (same as API), `ALLOWED_ORIGINS=*`

**Render will generate URLs like:**
- API: `https://pmk-api.onrender.com`
- Socket: `https://pmk-socket.onrender.com`

Update `apps/mobile/src/constants/api.ts`:

```typescript
return 'https://pmk-api.onrender.com/api/v1';
```

And `apps/mobile/.env` (or `app.config.ts`):

```
EXPO_PUBLIC_SOCKET_URL=https://pmk-socket.onrender.com
```

**Free tier note:** Render free Web Services spin down after 15 minutes of inactivity (cold start ~30 s on first request). Once you have regular users, the servers stay warm. The cron jobs inside NestJS (`@Cron`) run in-process and do not require any extra infrastructure.

---

## 3. Socket.IO Server — `apps/socket-server`

The dedicated real-time server for parent-kid live monitoring. It is completely **stateless** (no database, no Redis) and uses **Socket.IO rooms** as the pub-sub mechanism.

### How it works

```
Kid Device            Socket Server            Parent Device
    |                      |                         |
    |-- join-kid-room ----> |                         |
    |                      | <-- join-kid-room -------|
    |                      |                         |
    |-- kid:section-enter ->| ---- kid:section-enter->|
    |-- kid:app-foreground ->|---- kid:app-foreground->|
    |-- kid:usage-sync ----->|---- kid:usage-sync ---->|
    |                       |                         |
    |<-- parent:policy-update|<-- parent:policy-update-|
    |<-- parent:stop-session-|<-- parent:stop-session--|
```

Room name format: `family:{familyId}:kid:{kidId}`

### Connecting from the mobile app

```typescript
import { io } from 'socket.io-client';

const socket = io(process.env.EXPO_PUBLIC_SOCKET_URL + '/monitor', {
  auth: { token: accessToken },   // JWT from NestJS login
  transports: ['websocket'],
});

// Parent: join room and listen
socket.emit('join-kid-room', { familyId, kidId });
socket.on('kid:section-enter', (data) => { /* update UI */ });
socket.on('kid:online', (data) => { /* show green dot */ });

// Kid device: join room and emit activity
socket.emit('join-kid-room', { familyId, kidId: myChildId });
socket.emit('kid:app-foreground', { appPackage: 'com.example', appName: 'YouTube' });
socket.emit('kid:usage-sync', { sessions: [...] });

// Parent: send control command to kid
socket.emit('parent:policy-update', { policyVersion: 3 });
socket.emit('parent:stop-session', { reason: 'bedtime' });
```

---

## 4. Cache — MongoDB (replaces Redis/Upstash)

There is **no Redis** in this project. The `CacheService` (`apps/server/src/common/cache/`) stores short-lived keys (sessions, pairing codes, rate-limit counters, notification dedup) in a `session_caches` MongoDB collection with `expiresAt` TTL.

MongoDB Atlas has a **TTL index** on `expiresAt` that automatically deletes expired documents — equivalent to Redis key expiry, zero extra infrastructure.

---

## 5. Cloudinary — Media Storage

1. Go to [cloudinary.com](https://cloudinary.com) → Create account
2. Dashboard → Copy Cloud Name, API Key, API Secret
3. Paste into env:

```
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=123456789012345
CLOUDINARY_API_SECRET=xxx...
```

**Free tier:** 25 GB storage, 25 GB bandwidth

---

## 6. OpenAI API — AI Features

1. Go to [platform.openai.com](https://platform.openai.com) → Create account
2. Create an API key in Account → API Keys
3. Paste into env:

```
OPENAI_API_KEY=sk-...
```

**Cost estimate:** ~$0.15–0.60 per 1,000 API calls (GPT-4o-mini)

---

## 7. Resend — Email Service

1. Go to [resend.com](https://resend.com) → Create account
2. Verify your domain (or use `@resend.dev` for testing)
3. Create an API key and paste into env:

```
RESEND_API_KEY=re_...
```

**Free tier:** 3,000 emails/month

---

## 8. RevenueCat — In-App Subscriptions

1. Go to [revenuecat.com](https://revenuecat.com) → Create account
2. Create apps for iOS and Android
3. Set up products in App Store Connect and Google Play Console
4. Add the public SDK keys to `apps/mobile`:

```
EXPO_PUBLIC_REVENUECAT_IOS_KEY=appl_xxx...
EXPO_PUBLIC_REVENUECAT_ANDROID_KEY=goog_xxx...
```

5. Add the webhook secret to `apps/server/.env`:

```
REVENUECAT_WEBHOOK_SECRET=your-webhook-secret
```

---

## 9. Mobile App — EAS & Development Builds

Full command reference lives in **[apps/mobile/README.md](apps/mobile/README.md)**

Short version (from `apps/mobile` after `npm install` and `eas login`):

| Step | Command |
|------|---------|
| One-time EAS config | `eas build:configure` |
| **Install a dev client** (cloud) | `npm run build:dev:android` |
| **Daily Metro** (with dev app installed) | `npm start` |
| **Preview / production** | `npm run build:preview` / `npm run build:production` |
| **Local Android** | `npx expo prebuild` then `npm run android` |

---

## Environment Variables Checklist

Copy `apps/server/.env.example` to `apps/server/.env` and fill in:

| Variable | Where to get it |
|----------|----------------|
| `MONGODB_URI` | MongoDB Atlas → Connect → Node.js driver string |
| `JWT_SECRET` | `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"` |
| `JWT_REFRESH_SECRET` | Same command, different value |
| `CHILD_PIN_ENCRYPTION_KEY` | `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET` | Cloudinary dashboard |
| `OPENAI_API_KEY` | OpenAI platform |
| `RESEND_API_KEY` | Resend dashboard |
| `REVENUECAT_WEBHOOK_SECRET` | RevenueCat dashboard |
| `YOUTUBE_API_KEY` | Google Cloud Console |

Copy `apps/socket-server/.env.example` to `apps/socket-server/.env` and fill in:

| Variable | Notes |
|----------|-------|
| `JWT_SECRET` | **Must exactly match** `JWT_SECRET` in `apps/server/.env` |
| `ALLOWED_ORIGINS` | Comma-separated origins or `*` for dev |

---

## Local Development

```bash
# 1. Install all dependencies (from repo root)
npm install

# ── API Server ────────────────────────────────────────────────────────────
cd apps/server
cp .env.example .env          # fill in MONGODB_URI and other secrets
npm run dev                   # starts on http://localhost:3001

# ── Socket Server (separate terminal) ───────────────────────────────────
cd apps/socket-server
cp .env.example .env          # fill in JWT_SECRET
npm run dev                   # starts on ws://localhost:3002

# ── Mobile ────────────────────────────────────────────────────────────────
cd apps/mobile
# set EXPO_PUBLIC_API_URL=http://localhost:3001/api/v1
# set EXPO_PUBLIC_SOCKET_URL=http://localhost:3002
npm start                     # Metro bundler

# ── Web (optional marketing site) ────────────────────────────────────────
cd apps/web
npm run dev                   # http://localhost:4001
```

Default ports: **API → 3001 | Socket → 3002 | Web → 4001**
