# ParentingMyKid — Infrastructure Setup Guide

---

**■ STOP — DATABASE SETUP (Prisma) — READ THIS FIRST ■**

> ### 🚨 **ALERT — Prisma & your database (read this if you are new to PostgreSQL / Neon)**
>
> **What Prisma does:** Prisma is a tool that talks to your **PostgreSQL** database (hosted on **Neon**). Your `apps/server/prisma/schema.prisma` file describes **tables, columns, and relationships**.  
> **The database starts empty.** Neon gives you an *empty* PostgreSQL instance — it does **not** create tables automatically.
>
> **You must create tables before the API works.** If you skip the step below, the server will connect to Neon but you will get errors like *`The table public.users does not exist`* and registration will fail with **500 Internal Server Error**.
>
> **Command you need (most important for this repo):**
>
> ```bash
> cd apps/server
> npm run db:push
> ```
>
>
> | Question                            | Answer                                                                                                                                                                                                                                   |
> | ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
> | **What does `npm run db:push` do?** | It reads `prisma/schema.prisma` and **creates or updates** all tables, columns, and enums in the database pointed to by `DATABASE_URL` in `apps/server/.env`. It does **not** use migration files unless you add them later.             |
> | **When must I run it?**             | (1) **First time** after creating a new Neon database and setting `DATABASE_URL`. (2) After you **change** `schema.prisma` and want those changes applied to Neon. (3) When you **switch** to a new empty database (new `DATABASE_URL`). |
> | **When do I run it again?**         | Any time the schema file changes and you need the live DB to match — e.g. after `git pull` that updates `schema.prisma`.                                                                                                                 |
> | **What does it *not* do?**          | It does not delete your app code. It does not fill tables with fake data unless you add a seed script.                                                                                                                                   |
> | **Safe on production?**             | `db push` can be destructive in edge cases (e.g. renames). For production with strict change control, teams often use `**prisma migrate`** instead; this project currently documents `**db push`** for simplicity.                       |
>
>
> **Also required after install:** `npm install` runs `prisma generate` in the server package — that **only regenerates the TypeScript client**, it **does not create tables**. Tables = `**db:push`** (or migrate).
>
> **Quick checklist — new machine or new Neon project:**
>
> 1. Copy `apps/server/.env.example` → `apps/server/.env` and set `**DATABASE_URL`** from Neon.
> 2. Run `**cd apps/server && npm run db:push`**.
> 3. Start the server: `**npm run dev**` (API at **[http://localhost:3001](http://localhost:3001)**).

---

## Architecture Overview

```
Mobile App (Expo/React Native)
         ↕
NestJS API (Railway.app)
    ↕         ↕         ↕         ↕         ↕
PostgreSQL  Redis    Cloudinary  OpenAI    Resend
(Neon.tech) (Upstash)           (GPT-4o)  (Email)
         ↕
    RevenueCat (Subscriptions)
```

---

## 1. PostgreSQL — Neon.tech (Free Tier)

**Steps:**

1. Go to [neon.tech](https://neon.tech) → Create account
2. Create a project (e.g. `parentingmykid-prod`) and a database
3. Copy the `**DATABASE_URL`** connection string from the Neon dashboard
4. Paste into `apps/server/.env`:

```
DATABASE_URL="postgresql://user:pass@ep-xxx.us-east-1.aws.neon.tech/neondb?sslmode=require"
```

5. **Create all tables in Neon** (required — see the 🚨 alert at the top of this file):

```bash
cd apps/server
npm run db:push
```

**Free tier:** 3 GB storage, 10 compute hours/month

**Beginner note:** Neon is “managed PostgreSQL in the cloud.” PostgreSQL is the database *engine*; Prisma is how the NestJS app *maps* TypeScript models to SQL tables. Until you run `db:push`, the engine has no `users` (or other) tables for this app.

---

## 2. Redis — Upstash (Free Tier)

**Steps:**

1. Go to [upstash.com](https://upstash.com) → Create account
2. Create a Redis database: `pmk-cache`
3. Copy the **REST URL** and **REST Token** (not the redis:// URL)
4. Paste into `apps/server/.env`:

```
 UPSTASH_REDIS_REST_URL="https://xxx.upstash.io"
 UPSTASH_REDIS_REST_TOKEN="AXxx..."
```

**Free tier:** 10,000 commands/day, 256 MB

---

## 3. NestJS Backend — Railway.app

**Steps:**

1. Go to [railway.app](https://railway.app) → Create account
2. Create a new project → Deploy from GitHub
3. Select the `ParentingMyKid` repo, set root directory to `apps/server`
4. Add environment variables (all from `.env.example`)
5. Set start command: `node dist/main.js`
6. Build command: `npm run build`

**Railway will auto-generate a URL like:** `https://parentingmykid-server.up.railway.app`

Update `apps/mobile/src/constants/api.ts`:

```typescript
return 'https://parentingmykid-server.up.railway.app/api/v1';
```

**Free tier:** 500 hours/month compute (enough for development)

---

## 4. Cloudinary — Media Storage

**Steps:**

1. Go to [cloudinary.com](https://cloudinary.com) → Create account
2. Go to Dashboard → Copy Cloud Name, API Key, API Secret
3. Paste into `apps/server/.env`:

```
 CLOUDINARY_CLOUD_NAME="your-cloud-name"
 CLOUDINARY_API_KEY="123456789012345"
 CLOUDINARY_API_SECRET="xxx..."
```

**Free tier:** 25 GB storage, 25 GB bandwidth

---

## 5. OpenAI API — AI Features

**Steps:**

1. Go to [platform.openai.com](https://platform.openai.com) → Create account
2. Create an API key in Account → API Keys
3. Paste into `apps/server/.env`:

```
 OPENAI_API_KEY="sk-..."
```

**Cost estimate:** ~$0.15-0.60 per 1,000 API calls (GPT-4o-mini)

---

## 6. Resend — Email Service

**Steps:**

1. Go to [resend.com](https://resend.com) → Create account
2. Verify your domain (or use `@resend.dev` for testing)
3. Create an API key
4. Paste into `apps/server/.env`:

```
 RESEND_API_KEY="re_..."
```

**Free tier:** 3,000 emails/month

---

## 7. RevenueCat — In-App Subscriptions

**Steps:**

1. Go to [revenuecat.com](https://revenuecat.com) → Create account
2. Create apps for iOS and Android
3. Set up products in App Store Connect and Google Play Console
4. Link RevenueCat to your stores
5. Add the public SDK keys to `apps/mobile`:

```
 EXPO_PUBLIC_REVENUECAT_IOS_KEY="appl_xxx..."
 EXPO_PUBLIC_REVENUECAT_ANDROID_KEY="goog_xxx..."
```

1. Add the webhook secret to `apps/server/.env`:

```
 REVENUECAT_WEBHOOK_SECRET="your-webhook-secret"
```

---

## 8. Mobile app — EAS & development builds (not Expo Go)

**Default local workflow** for this app is a **[development build](https://docs.expo.dev/develop/development-builds/introduction/)** (`expo-dev-client`): required for full **remote push** (`expo-notifications` on SDK 53+), RevenueCat, and any native add-ons. **Expo Go** is not the target runtime.

**Full command reference (EAS, Android, iOS, local `expo run`)** lives in:

**[apps/mobile/README.md](apps/mobile/README.md)**

Short version (from `apps/mobile` after `npm install` and `eas login`):

| Step | Command |
|------|--------|
| One-time EAS config | `eas build:configure` |
| **Install a dev client** (cloud) | `npm run build:dev:android` and/or `npm run build:dev:ios` (or `npm run build:dev` for all) — then install the artifact on device/simulator |
| **Daily Metro** (with dev app installed) | `npm start` (runs `expo start --dev-client`) |
| **Preview / production** | `npm run build:preview` / `npm run build:production` |
| **Local Android/iOS** (Xcode / Android Studio) | `npx expo prebuild` then `npm run android` or `npm run ios` — see `apps/mobile/README.md` |

Set a real `expo.extra.eas.projectId` in `apps/mobile/app.json` (`eas init` or Expo dashboard) before relying on EAS or push.

---

## Environment Variables Checklist

Copy `apps/server/.env.example` to `apps/server/.env` and fill in:

- `DATABASE_URL` — Neon PostgreSQL connection string
- **After** `DATABASE_URL` is set — run `**cd apps/server && npm run db:push` so tables exist (see alert at top of file)
- `UPSTASH_REDIS_REST_URL` — Upstash REST URL
- `UPSTASH_REDIS_REST_TOKEN` — Upstash token
- `JWT_SECRET` — Random 64-char string
- `JWT_REFRESH_SECRET` — Another random 64-char string
- `OPENAI_API_KEY` — OpenAI key
- `CLOUDINARY_CLOUD_NAME` — Cloudinary cloud name
- `CLOUDINARY_API_KEY` — Cloudinary API key
- `CLOUDINARY_API_SECRET` — Cloudinary API secret
- `RESEND_API_KEY` — Resend email key
- `REVENUECAT_WEBHOOK_SECRET` — RevenueCat webhook secret

---

## Local Development

Default ports in this repo: **NestJS API → 3001**, **Next.js marketing site (`apps/web`) → 4001**.

```bash
# 1. Install all dependencies
npm install

-------------- DATABASE 👇 --------------
-------------- DATABASE 👇 --------------

# Go to SERVER directory first then
cd apps/server

# Open the database in a browser --> usually http://localhost:5555
npx prisma studio

# Creates/updates tables in Neon — run once per new DB / after schema changes ----> It does the same job like as "prisma migrate dev" but it just can't write migration histories.
npm run db:push

# Creates/updates tables in Neon ----> It does the same job like as "npm run db:push" but it can write migration history under "prisma/migrations/" directory.
# The full command is --> prisma migrate dev --name describe_your_change
# Don't use it in the PRODUCTION DATABASE
npx prisma migrate dev

# Apply the same migrations to staging DB/ PRODUCTION DB (applying on DATABASE_URL in .env file)
npx prisma migrate deploy

-------------- SERVER 👇 --------------
-------------- SERVER 👇 --------------

# 2. Configure and sync the database (see 🚨 Prisma alert at top of file)
cd apps/server
cp .env.example .env   # Fill in DATABASE_URL and other secrets

# 3. Start the backend
npm run dev      # auto starts on http://localhost:3001

-------------- WEB 👇 --------------
-------------- WEB 👇 --------------

# 4. Optional — marketing / landing site (new terminal)
cd apps/web
cp .env.example .env   # Optional: set NEXT_PUBLIC_SERVER_URL=http://localhost:3001 for API calls
npm run dev            # auto starts → http://localhost:4001

-------------- MOBILE 👇 --------------
-------------- MOBILE 👇 --------------

# 5. Mobile — see **apps/mobile/README.md** (development build + EAS, Android & iOS)

#    First time: build and install a **development** client on device/simulator, then:
cd apps/mobile
npm start
#    (`npm start` = `expo start --dev-client` — use the **development build** app, not Expo Go.)

#    Expo Go: `npx expo start --go` or `npm run start:go` (limited; not used for this app’s
#    push / native-dependent features)
```

---

## Database & Prisma — command reference

All commands below are run from `**apps/server**` (or with `cd apps/server` first).

> **⚠️ WARNING — `DATABASE_URL` points at real data**  
> These commands affect whatever database URL is in `apps/server/.env`. Double-check you are not pointing at production if you intend to work on a dev database only.


| Command                       | When to use it                                                      | What it does                                                                                                                                    |
| ----------------------------- | ------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `**npm run db:push`           | **First setup**, after **schema changes**, or **new empty Neon DB** | Applies `prisma/schema.prisma` to the database: creates/updates tables. **This is the main command for syncing schema → Neon in this project.** |
| `**npm run db:generate`       | After `schema.prisma` changes (also runs via `postinstall`)         | Regenerates the Prisma Client TypeScript types under `node_modules`. Does **not** create tables.                                                |
| `**npx prisma studio`         | Whenever you want a GUI                                             | Opens a browser UI to browse/edit rows in your database (great for debugging).                                                                  |
| `**npx prisma migrate dev`    | If you later adopt **migration files** for team workflows           | Creates a new migration from schema changes (development). This repo may use `**db:push` instead until migrations are added.                    |
| `**npx prisma migrate deploy` | CI / production servers using **migrations**                        | Applies pending migration files — use only if your team uses the migrate workflow.                                                              |
| `**npx prisma migrate reset`  | **Local dev only** — wipes data                                     | Drops DB, reapplies migrations, may run seed. **Never run against production.**                                                                 |


**Symptom → action:**


| Error or symptom                                       | Likely cause                         | What to do                                                             |
| ------------------------------------------------------ | ------------------------------------ | ---------------------------------------------------------------------- |
| `The table public.users does not exist` (or similar)   | Schema never pushed to this database | Run `**npm run db:push` with correct `DATABASE_URL`.                   |
| TypeScript errors about missing Prisma enums / types   | Client out of date                   | Run `**npm run db:generate`** or `**npm install\*\`* in the repo root. |
| Registration works locally but not after changing Neon | New empty branch/database            | Run `**db:push`** against the new `DATABASE_URL`.                      |


