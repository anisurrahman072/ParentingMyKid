/**
 * @module api.ts
 * @description API base URL configuration and endpoint constants.
 *
 * Local dev:
 *   1. Run Nest: `cd apps/server && npm run start:dev` (listens on 0.0.0.0:3001)
 *   2. Optional: set `EXPO_PUBLIC_API_BASE_URL` in `apps/mobile/.env`, e.g.
 *      `EXPO_PUBLIC_API_BASE_URL=http://192.168.0.50:3001/api/v1`
 *   3. If unset, we resolve the dev machine from the Metro bundle URL (`SourceCode.scriptURL`)
 *      so physical devices and emulators point at the same host as the packager (port 3001 for API).
 *      Android emulators: `10.0.2.2` (not `localhost` — that is the device itself).
 */

import { NativeModules, Platform } from 'react-native';
import Constants from 'expo-constants';

type SourceCodeModule = { scriptURL?: string };

/** Packager / Metro host: same as your dev machine (LAN IP, 10.0.2.2 on Android emulator, etc.) */
function getDevHostFromBundle(): string | null {
  const scriptURL = (NativeModules as { SourceCode?: SourceCodeModule }).SourceCode?.scriptURL;
  if (!scriptURL) {
    return null;
  }
  try {
    const { hostname } = new URL(scriptURL);
    if (Platform.OS === 'android') {
      if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return '10.0.2.2';
      }
      return hostname;
    }
    if (hostname && hostname !== '127.0.0.1' && hostname !== 'localhost') {
      return hostname;
    }
  } catch {
    return null;
  }
  return null;
}

function getApiBaseUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
  if (fromEnv) {
    return fromEnv.replace(/\/$/, '');
  }

  if (process.env.NODE_ENV === 'production') {
    return 'https://parentingmykid-server.up.railway.app/api/v1';
  }

  const fromBundle = getDevHostFromBundle();
  if (fromBundle) {
    return `http://${fromBundle}:3001/api/v1`;
  }

  // Legacy: some Expo versions expose this (often undefined in SDK 50+)
  const hostUri = (Constants.expoConfig as { hostUri?: string } | undefined)?.hostUri;
  if (hostUri) {
    const host = hostUri.split(':')[0];
    if (host && host !== '127.0.0.1' && host !== 'localhost') {
      return `http://${host}:3001/api/v1`;
    }
  }

  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:3001/api/v1';
  }

  return 'http://localhost:3001/api/v1';
}

export const API_BASE_URL = getApiBaseUrl();

if (typeof __DEV__ !== 'undefined' && __DEV__) {
  // Helps verify the client is not stuck on localhost on Android (see getApiBaseUrl).
  // eslint-disable-next-line no-console
  console.log('[ParentingMyKid] API_BASE_URL =', API_BASE_URL);
}

export const API_ENDPOINTS = {
  // ─── Auth ───────────────────────────────────────────────────────────────
  auth: {
    register: '/auth/register',
    login: '/auth/login',
    childPinLogin: '/auth/child-login',
    refresh: '/auth/refresh',
    me: '/auth/me',
    logout: '/auth/logout',
    generatePairingCode: '/auth/pair-device/generate',
    confirmPairing: '/auth/pair-device/confirm',
    autoPairDevice: '/auth/pair-device/auto',
    pairDeviceStatus: '/auth/pair-device/status',
    /** Parent sets or updates a child 4-digit PIN (body: { pin }) */
    setChildPin: (childId: string) => `/auth/children/${childId}/pin`,
  },

  // ─── Families & Children ─────────────────────────────────────────────────
  families: {
    mine: '/families',
  },
  children: {
    base: '/children',
    profile: (id: string) => `/children/${id}`,
    baselineAssessment: '/children/baseline-assessment',
    /** Fast parent home snapshot (server-optimized; same JSON as dashboard) */
    home: (familyId: string) => `/families/${familyId}/home`,
    /** Legacy alias; prefer `home` for the parent home tab */
    dashboard: (familyId: string) => `/families/${familyId}/dashboard`,
  },

  // ─── Missions ────────────────────────────────────────────────────────────
  missions: {
    today: (childId: string) => `/missions/today/${childId}`,
    complete: (missionId: string, childId: string) => `/missions/${missionId}/complete/${childId}`,
  },

  // ─── Rewards ─────────────────────────────────────────────────────────────
  rewards: {
    base: '/rewards',
    wishRequest: '/rewards/wish-request',
    badges: (childId: string) => `/rewards/${childId}/badges`,
    points: (childId: string) => `/rewards/${childId}/points`,
  },

  // ─── Safety ──────────────────────────────────────────────────────────────
  safety: {
    base: '/safety',
    sos: (childId: string) => `/safety/${childId}/sos`,
    location: (childId: string) => `/safety/${childId}/location`,
    geofences: (childId: string) => `/safety/${childId}/geofences`,
    alerts: (childId: string) => `/safety/${childId}/alerts`,
    /** Parent: full controls */
    controls: (childId: string) => `/safety/${childId}/controls`,
    /** Child: own profile only */
    controlsSelf: (childId: string) => `/safety/${childId}/controls/self`,
    screenTime: (childId: string) => `/safety/${childId}/controls`,
    pauseInternet: '/safety/pause-internet',
  },

  // ─── AI ──────────────────────────────────────────────────────────────────
  ai: {
    growthPlan: '/ai/growth-plan',
    coachScript: '/ai/coach-script',
    wellbeing: (childId: string) => `/ai/wellbeing/${childId}`,
    nutritionAdvice: '/ai/nutrition-advice',
    studyAssist: '/ai/study/question',
    anomalyDetect: '/ai/anomaly-detect',
  },

  // ─── Notifications ────────────────────────────────────────────────────────
  notifications: {
    registerToken: '/notifications/expo-token',
  },

  // ─── Islamic ─────────────────────────────────────────────────────────────
  islamic: {
    daily: '/islamic/daily-content',
    logSalah: '/islamic/salah/log',
    logQuran: '/islamic/quran/log',
    zakatCalc: '/islamic/zakat/calculate',
  },

  // ─── Memory ──────────────────────────────────────────────────────────────
  memory: {
    list: (childId: string) => `/memory/${childId}`,
    upload: '/memory/upload',
    milestones: (childId: string) => `/memory/${childId}/milestones`,
  },

  // ─── Payments ───────────────────────────────────────────────────────────
  payments: {
    status: (familyId: string) => `/payments/subscription/${familyId}`,
    webhook: '/payments/webhook',
  },

  // ─── Gaming ─────────────────────────────────────────────────────────────
  games: {
    list: '/games',
    start: (gameId: string) => `/games/${gameId}/start`,
    end: (gameId: string) => `/games/${gameId}/end`,
    quizBattles: '/games/quiz-battles',
  },

  // ─── Tutors ─────────────────────────────────────────────────────────────
  tutors: {
    invite: '/tutors/invite',
    myStudents: '/tutors/my-students',
    publicForm: (token: string) => `/tutors/form/${token}`,
  },

  // ─── Social Monitor ─────────────────────────────────────────────────────
  socialMonitor: {
    scan: '/social-monitor/scan',
    summary: (childId: string) => `/social-monitor/${childId}/summary`,
    toggle: (childId: string) => `/social-monitor/${childId}/toggle`,
  },

  // ─── Finance ─────────────────────────────────────────────────────────────
  finance: {
    summary: (familyId: string) => `/families/${familyId}/finance/summary`,
    logExpense: '/finance/expense',
    allowance: (childId: string) => `/finance/allowance/${childId}`,
    savingsGoals: (familyId: string) => `/finance/savings/${familyId}`,
    zakat: '/islamic/zakat/calculate',
  },

  // ─── Community ───────────────────────────────────────────────────────────
  community: {
    tips: '/community/tips',
    forum: '/community/forum',
    webinars: '/community/webinars',
    parentMood: '/community/parent-mood',
  },

  familyChat: {
    send: '/family-chat/send',
    list: (familyId: string) => `/family-chat/${familyId}`,
    delete: (messageId: string) => `/family-chat/message/${messageId}`,
  },

  friends: {
    invite: '/friends/invite',
    accept: '/friends/accept',
    approve: (familyId: string, inviteId: string) => `/friends/${familyId}/approve/${inviteId}`,
    list: (childId: string) => `/friends/list/${childId}`,
    pending: (familyId: string) => `/friends/pending/${familyId}`,
  },

  // ─── Family calendar (parent schedule) ───────────────────────────────────
  calendar: {
    events: (familyId: string) => `/families/${familyId}/calendar/events`,
    event: (familyId: string, eventId: string) =>
      `/families/${familyId}/calendar/events/${eventId}`,
  },

  // ─── Legacy flat names (some screens use these) ─────────────────────────
  REFRESH: '/auth/refresh',
  REGISTER_PUSH_TOKEN: '/notifications/expo-token',
  MISSIONS_TODAY: (childId: string) => `/missions/today/${childId}`,
  COMPLETE_MISSION: (missionId: string, childId: string) =>
    `/missions/${missionId}/complete/${childId}`,
  FAMILY_HOME: (familyId: string) => `/families/${familyId}/home`,
  FAMILY_DASHBOARD: (familyId: string) => `/families/${familyId}/dashboard`,
} as const;
