/**
 * @module api.ts
 * @description API base URL configuration and endpoint constants.
 *
 * Local dev:
 *   1. Run Nest: `cd apps/server && npm run start:dev` (listens on 0.0.0.0:3001)
 *   2. Optional: set `EXPO_PUBLIC_API_BASE_URL` in `apps/mobile/.env`, e.g.
 *      `EXPO_PUBLIC_API_BASE_URL=http://192.168.0.50:3001/api/v1`
 *   3. If unset, we derive the host from Expo (same machine as Metro) so a phone
 *      on the same Wi‑Fi can reach your laptop without hardcoding an IP.
 */

import Constants from 'expo-constants';

function getApiBaseUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
  if (fromEnv) {
    return fromEnv.replace(/\/$/, '');
  }

  if (process.env.NODE_ENV === 'production') {
    return 'https://parentingmykid-server.up.railway.app/api/v1';
  }

  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const host = hostUri.split(':')[0];
    if (host && host !== '127.0.0.1' && host !== 'localhost') {
      return `http://${host}:3001/api/v1`;
    }
  }

  return 'http://localhost:3001/api/v1';
}

export const API_BASE_URL = getApiBaseUrl();

export const API_ENDPOINTS = {
  // ─── Auth ───────────────────────────────────────────────────────────────
  auth: {
    register: '/auth/register',
    login: '/auth/login',
    childPinLogin: '/auth/child-login',
    refresh: '/auth/refresh',
    logout: '/auth/logout',
    generatePairingCode: '/auth/pair-device/generate',
    confirmPairing: '/auth/pair-device/confirm',
  },

  // ─── Families & Children ─────────────────────────────────────────────────
  children: {
    base: '/children',
    profile: (id: string) => `/children/${id}`,
    baselineAssessment: '/children/baseline-assessment',
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

  // ─── Legacy flat names (some screens use these) ─────────────────────────
  REFRESH: '/auth/refresh',
  REGISTER_PUSH_TOKEN: '/notifications/expo-token',
  MISSIONS_TODAY: (childId: string) => `/missions/today/${childId}`,
  COMPLETE_MISSION: (missionId: string, childId: string) =>
    `/missions/${missionId}/complete/${childId}`,
  FAMILY_DASHBOARD: (familyId: string) => `/families/${familyId}/dashboard`,
} as const;
