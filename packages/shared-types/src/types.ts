/**
 * @module types.ts
 * @description Core TypeScript interfaces shared between the mobile app (Expo) and
 *              the NestJS backend. These types represent the shape of API request/response
 *              payloads and common data structures.
 *
 *              BUSINESS CONTEXT: These types are the "contract" between the frontend
 *              and backend. If a type changes here, both sides must be updated together.
 *              This prevents the #1 cause of API bugs: mismatched data shapes.
 */

import {
  UserRole,
  FamilyMemberRole,
  SubscriptionPlan,
  SubscriptionStatus,
  MissionCategory,
  ProofType,
  BadgeTier,
  RewardStatus,
  WishStatus,
  AlertCategory,
  AlertSeverity,
  HealthRecordType,
  MealType,
  SalahName,
  MemoryType,
  MoodScore,
  StudySessionType,
  GameCategory,
  FinanceEntryType,
  FinanceCategory,
  GeofenceType,
  LocationEventType,
  NotificationType,
} from './enums';

// ─── Auth ─────────────────────────────────────────────────────────────────────

export interface AuthTokenPayload {
  sub: string;         // User ID
  email: string;
  role: UserRole;
  familyIds: string[]; // All family groups this user belongs to
  iat: number;
  exp: number;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
  phone?: string;
  parentalConsentGiven: boolean; // Must be true to create account
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: UserProfile;
}

export interface ChildLoginRequest {
  childId: string;
  pin: string; // 4-digit PIN, hashed server-side
}

export interface PairingCodeResponse {
  code: string;      // 6-digit numeric code
  expiresAt: string; // ISO timestamp — expires in 5 minutes
  qrData: string;    // Base64 QR code data for display
}

// ─── User & Family ────────────────────────────────────────────────────────────

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  phone?: string;
  role: UserRole;
  avatarUrl?: string;
  createdAt: string;
  /** All family group IDs this user belongs to (set by auth for most roles) */
  familyIds?: string[];
  /** Set when role === CHILD — ChildProfile id for API paths */
  childProfileId?: string;
  /** Child UI (optional; populated by child auth / profile merges) */
  firstName?: string;
  lastName?: string;
  avatar?: string;
  level?: number;
  xp?: number;
  points?: number;
  coins?: number;
  badgesCount?: number;
  currentStreak?: number;
  longestStreak?: number;
}

export interface FamilyGroup {
  id: string;
  name: string;
  members: FamilyMemberSummary[];
  children: ChildProfileSummary[];
  subscription: SubscriptionInfo;
  createdAt: string;
}

/** Minimal child id + name for family roster lists (e.g. multi-household picker). */
export interface FamilyChildNameRef {
  id: string;
  name: string;
}

/**
 * One of the current user’s household groups, with members and children for
 * the family space / divorced multi-family UX.
 */
export interface MyFamilyListItem {
  id: string;
  name: string;
  myRole: FamilyMemberRole;
  members: FamilyMemberSummary[];
  children: FamilyChildNameRef[];
}

export type FamilyCalendarRecurrenceKind = 'NONE' | 'WEEKLY';

/** Resolved person on a calendar instance (week grid avatars). */
export interface FamilyCalendarEventAssignee {
  kind: 'user' | 'child';
  id: string;
  displayName: string;
  avatarUrl: string | null;
}

/** One occurrence (weekly rows are expanded in range by the server). */
export interface FamilyCalendarEventInstance {
  id: string;
  baseEventId: string;
  familyId: string;
  childId: string | null;
  title: string;
  type: string;
  description: string | null;
  /** Optional place or address */
  location: string | null;
  startAt: string;
  endAt: string | null;
  reminderDays: number | null;
  recurrenceKind: FamilyCalendarRecurrenceKind;
  /** First weekday when weekly (legacy); use `recurrenceByWeekdays` for full set. */
  recurrenceByWeekday: number | null;
  /** 0=Sun … 6=Sat; empty when not weekly. */
  recurrenceByWeekdays: number[];
  /** Who this event is for (users + children); empty if none linked. */
  assignees: FamilyCalendarEventAssignee[];
  createdBy: string;
  createdAt: string;
  isRecurringInstance: boolean;
}

export interface CreateFamilyRequest {
  /** Display name for the new household (e.g. “Summer with kids”). */
  name: string;
}

export interface FamilyMemberSummary {
  userId: string;
  name: string;
  role: FamilyMemberRole;
  avatarUrl?: string;
}

export interface SubscriptionInfo {
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  expiresAt?: string;
  trialEndsAt?: string;
}

// ─── Child Profile ────────────────────────────────────────────────────────────

export interface ChildProfileSummary {
  id: string;
  name: string;
  nickname?: string;
  avatarUrl?: string;
  age: number;
  grade: string;
}

export interface ChildProfile extends ChildProfileSummary {
  dob: string;
  school?: string;
  languagePreference: 'en' | 'bn' | 'ar';
  allergies: string[];
  foodPreferences: string[];
  favoriteActivities: string[];
  islamicModuleEnabled: boolean;
  wellbeingScore?: number;   // 0-100, calculated daily by AI
  currentStreak: number;
  totalPoints: number;
  level: number;
  xp: number;
}

/**
 * Aggregated child summary for parent dashboard cards.
 * Combines profile + today's progress + safety status.
 */
export interface ChildSummary {
  id: string;
  name: string;
  age: number;
  gender?: string;
  avatarUrl?: string;
  wellbeingScore?: number;
  currentStreak: number;
  longestStreak: number;
  todayCompletionPct?: number;
  activeAlertsCount?: number;
  lastSeenAt?: string;
  islamicModuleEnabled?: boolean;
}

// ─── Child Dashboard ─────────────────────────────────────────────────────────

/**
 * The data shape returned by GET /families/:id/home and GET /families/:id/dashboard
 * (identical; home is the preferred fast parent-shell endpoint).
 * This is the main API call the parent dashboard makes on load.
 */
/** A child’s phone/tablet linked for monitoring (parent home “paired devices” list). */
export interface PairedDeviceSummary {
  id: string;
  childId: string;
  childName: string;
  deviceName: string | null;
  platform: string;
  lastActiveAt: string | null;
}

export interface FamilyDashboard {
  familyId: string;
  familyName: string;
  children: ChildDashboardCard[];
  urgentAlerts: SafetyAlert[];
  upcomingEvents: CalendarEvent[];
  weeklyHighlights: string[]; // AI-generated summary sentences
  /** Active paired devices for all children in this family (safety, screen time, push). */
  pairedDevices: PairedDeviceSummary[];
}

export interface ChildDashboardCard {
  childId: string;
  name: string;
  avatarUrl?: string;
  todayMissionsTotal: number;
  todayMissionsCompleted: number;
  currentMood?: MoodScore;
  currentStreak: number;
  wellbeingScore?: number;
  lastLocationAt?: string;
  lastSeenAt?: string;
  activeAlerts: number; // count of unread safety alerts
  /** Child devices still marked active in this family. */
  linkedDeviceCount: number;
  /** True if any screen-usage was logged for this child for today (UTC date, same as missions). */
  hasScreenUsageToday: boolean;
  /** Latest activity time across the child’s linked devices, if any. */
  lastDeviceActivityAt?: string;
}

// ─── Missions & Habits ────────────────────────────────────────────────────────

export interface Mission {
  id: string;
  childId: string;
  title: string;
  description?: string;
  category: MissionCategory;
  pointsValue: number;
  xpValue: number;
  isCompleted: boolean;
  completedAt?: string;
  proofRequired: boolean;
  proofType?: ProofType;
  proofUrl?: string;   // Cloudinary URL for photo/voice proof
  autoApprove: boolean;
  date: string;        // YYYY-MM-DD — missions belong to a specific day
}

export interface CompleteMissionRequest {
  proofType: ProofType;
  proofUrl?: string;   // Cloudinary URL, provided after upload
  voiceTranscript?: string; // Whisper API result for voice check-ins
}

export interface Habit {
  id: string;
  childId: string;
  title: string;
  category: MissionCategory;
  pointsValue: number;
  scheduleJson: string[]; // Days of week: ['MON', 'TUE', ...]
  isActive: boolean;
  currentStreak: number;
  longestStreak: number;
}

// ─── Rewards & Gamification ───────────────────────────────────────────────────

export interface PointsBalance {
  childId: string;
  totalPoints: number;
  spendableCoins: number;
  xp: number;
  level: number;
  xpToNextLevel: number;
  levelProgress: number; // 0-100 percentage
}

export interface Badge {
  id: string;
  childId: string;
  badgeType: string;
  tier: BadgeTier;
  title: string;
  description: string;
  iconUrl: string;
  earnedAt: string;
  isShared: boolean;
}

export interface RewardContract {
  id: string;
  childId: string;
  parentId: string;
  title: string;
  conditionDescription: string;    // "Score 80%+ on math exam"
  conditionType: string;           // 'EXAM_SCORE' | 'STREAK' | 'MISSIONS_COUNT' etc.
  conditionValue: number;
  currentProgress: number;         // 0-100 percentage
  rewardDescription: string;       // "New bicycle"
  status: RewardStatus;
  targetDate?: string;
  achievedAt?: string;
}

export interface WishRequest {
  id: string;
  childId: string;
  itemName: string;
  description: string;
  voiceUrl?: string;   // Cloudinary URL if child used voice
  status: WishStatus;
  parentResponse?: string;  // Warm message from parent
  createdAt: string;
}

export interface CreateWishRequest {
  itemName: string;
  description: string;
  voiceUrl?: string;
}

export interface RespondToWishRequest {
  status: 'APPROVED_WITH_GOAL' | 'APPROVED_AS_GIFT' | 'DECLINED';
  parentMessage: string;   // Always required — even for declines
  goalCondition?: string;  // Required if APPROVED_WITH_GOAL
  goalValue?: number;
  targetDate?: string;
}

// ─── Safety ───────────────────────────────────────────────────────────────────

export interface ChildLocation {
  childId: string;
  lat: number;
  lon: number;
  accuracy: number;
  timestamp: string;
  eventType: LocationEventType;
  address?: string;  // Reverse geocoded for display
}

export interface Geofence {
  id: string;
  childId: string;
  name: string;
  type: GeofenceType;
  centerLat: number;
  centerLon: number;
  radiusMeters: number;
  isActive: boolean;
  address?: string;
}

export interface SafetyAlert {
  id: string;
  childId: string;
  category: AlertCategory;
  severity: AlertSeverity;
  title: string;
  description: string;
  evidenceSnippet?: string;  // Anonymized/flagged content snippet
  isRead: boolean;
  actionTaken?: string;
  createdAt: string;
  /** Optional UI hint for legacy / agent alerts */
  alertType?: string;
  summary?: string;
}

export interface ScreenTimeControls {
  childId: string;
  dailyLimitMinutes: number;
  socialMediaLimitMinutes: number;
  gamingLimitMinutes: number;
  youtubeLimitMinutes?: number;
  youtubeRestrictedMode: boolean;
  safeSearchEnabled: boolean;
  youtubeAllowedChannelIds?: string[];
  youtubeBlockedChannelIds?: string[];
  youtubeAllowlistMode?: boolean;
  bedtimeStart: string;  // HH:MM
  bedtimeEnd: string;    // HH:MM
  morningUnlockTime: string; // HH:MM
  focusTimeStart?: string;
  focusTimeEnd?: string;
  drivingModeEnabled: boolean;
  isPaused: boolean;     // Emergency internet pause
  blockedApps: string[];
  blockedWebsites: string[];
  /** Bumped when parent changes controls; child can use for ETag / poll skip */
  controlsVersion?: number;
}

// ─── AI & Growth Plan ─────────────────────────────────────────────────────────

export interface GrowthPlan {
  childId: string;
  weekStart: string; // YYYY-MM-DD of Monday
  focusAreas: GrowthPlanFocusArea[];
  predictedImprovements: Record<string, number>; // dimension → % improvement
  confidence: number; // 0-1
  generatedAt: string;
}

export interface GrowthPlanFocusArea {
  dimension: string;       // 'reading' | 'math' | 'physical' | etc.
  reason: string;          // Why this is a focus area this week
  dailyTasks: string[];    // 3 specific tasks with times
  predictedOutcome: string; // Human-readable prediction
}

export interface WellbeingScore {
  childId: string;
  score: number;        // 0-100
  breakdown: Record<string, number>; // dimension → score
  trend: 'UP' | 'DOWN' | 'STABLE';
  trendDays: number;
  alerts: string[];     // AI-generated alert messages
  calculatedAt: string;
}

export interface AICoachRequest {
  situation: string;        // Parent describes the situation in 1-2 sentences
  childId: string;
  childAge: number;
}

export interface AICoachResponse {
  immediateScript: string;  // Exact words to say right now (60-90 seconds)
  immediateSteps: string[]; // 3 steps to take right now
  doNotSay: string[];       // What NOT to say
  longerTermStrategy: string;
  category: string;
}

// ─── Tutor Integration ────────────────────────────────────────────────────────

export interface TutorInvite {
  id: string;
  childId: string;
  parentId: string;
  tutorEmail: string;
  tutorName?: string;
  scopeAcademic: boolean;
  scopeBehavior: boolean;
  scopeMood: boolean;
  token: string;       // Short-lived JWT for web form access
  tokenExpiresAt: string;
  status: 'PENDING' | 'RESPONDED' | 'EXPIRED';
}

export interface TutorQuestionPack {
  inviteId: string;
  childName: string;
  concern: string;
  questions: TutorQuestion[];
}

export interface TutorQuestion {
  id: string;
  text: string;
  type: 'RATING' | 'TEXT' | 'BOOLEAN';
}

export interface TutorResponse {
  questionId: string;
  rating?: number;    // 1-5
  text?: string;
  booleanAnswer?: boolean;
}

// ─── Nutrition & Health ───────────────────────────────────────────────────────

export interface MealLog {
  id: string;
  childId: string;
  mealType: MealType;
  foods: FoodItem[];
  totalCalories?: number;
  totalProtein?: number;
  totalCarbs?: number;
  totalFat?: number;
  vitamins: Record<string, number>; // vitamin name → mg
  loggedAt: string;
}

export interface FoodItem {
  name: string;
  portion: string;   // "1 cup", "200g", etc.
  isHalal?: boolean; // Relevant when Islamic module is enabled
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
}

export interface HealthRecord {
  id: string;
  childId: string;
  recordType: HealthRecordType;
  value: number;
  unit: string;       // 'cm', 'kg', 'hours', 'minutes'
  recordedAt: string;
  note?: string;
}

// ─── Islamic Module ───────────────────────────────────────────────────────────

export interface DailyIslamicContent {
  date: string;
  dua: IslamicDua;
  islamicFact: string;
  prayerTimes: Record<SalahName, string>; // Salah name → HH:MM time
  quranGoalStatus: QuranGoalStatus;
  ramadanMode: boolean;
  ifstarTime?: string;
  suhoorTime?: string;
}

export interface IslamicDua {
  arabicText: string;
  transliteration: string;
  translation: string;       // In user's language preference
  audioUrl?: string;         // Cloudinary URL for pronunciation audio
  category: string;          // 'morning' | 'evening' | 'before_eating' etc.
}

export interface QuranGoalStatus {
  dailyGoal: string;          // "1 page" | "5 ayahs" | "1 surah"
  completedToday: boolean;
  streak: number;
  totalPagesRead: number;
  completedSurahs: string[];
}

// ─── Memory & Calendar ────────────────────────────────────────────────────────

export interface Memory {
  id: string;
  familyId: string;
  childId?: string;
  type: MemoryType;
  mediaUrl?: string;   // Cloudinary URL
  caption?: string;
  taggedAt: string;
  milestone?: string;  // For MILESTONE type: "First day of school"
}

export interface CalendarEvent {
  id: string;
  familyId: string;
  title: string;
  type: string;        // 'EXAM' | 'APPOINTMENT' | 'BIRTHDAY' | 'TRIP' etc.
  startAt: string;
  endAt?: string;
  location?: string;
  note?: string;
  childId?: string;    // Linked to specific child if applicable
  reminderDays?: number; // Send reminder X days before
}

// ─── Finance ─────────────────────────────────────────────────────────────────

export interface BudgetEntry {
  id: string;
  familyId: string;
  category: FinanceCategory;
  amount: number;
  currency: string;
  type: FinanceEntryType;
  date: string;
  note?: string;
  childId?: string;    // Linked to child if education/health expense
}

export interface SavingsGoal {
  id: string;
  familyId: string;
  title: string;
  targetAmount: number;
  currentAmount: number;
  currency: string;
  targetDate: string;
  isAchieved: boolean;
  progress: number;    // 0-100 percentage
}

// ─── Notifications ────────────────────────────────────────────────────────────

export interface PushNotificationPayload {
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, string>; // Deep link data for navigation
  channelId?: string;
  priority: 'default' | 'high' | 'max'; // max for SAFETY_ALERT and SOS
}

// ─── Gaming ───────────────────────────────────────────────────────────────────

export interface Game {
  id: string;
  name: string;
  category: GameCategory;
  minAge: number;
  maxAge: number;
  description: string;
  iconUrl?: string;
  isLocked?: boolean;    // True if child hasn't unlocked it via missions today
  personalBestScore?: number;
}

export interface QuizBattle {
  id: string;
  familyId: string;
  initiatorId: string;
  opponentId: string;
  subject: string;
  status: 'PENDING' | 'ACTIVE' | 'COMPLETED';
  questions: QuizQuestion[];
  results?: QuizResults;
  startedAt: string;
}

export interface QuizQuestion {
  id: string;
  questionText: string;
  options: string[];
  correctOptionIndex: number;
}

export interface QuizResults {
  initiatorScore: number;
  opponentScore: number;
  winnerId: string;
  completedAt: string;
}

// ─── Study Companion ──────────────────────────────────────────────────────────

export interface SafeAIStudyResponse {
  response: string;     // AI teaching response (never direct answers)
  followUpQuestion?: string; // Socratic follow-up to make child think
  relatedTip?: string;
}

export interface PracticeQuestion {
  id: string;
  subject: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  questionText: string;
  options?: string[];   // For multiple choice
  type: 'MCQ' | 'SHORT_ANSWER';
  childAnswer?: string;
  isCorrect?: boolean;
  explanation?: string; // Shown after answering
}

// ─── API Response Wrapper ─────────────────────────────────────────────────────

/**
 * Standard API response envelope used for all endpoints.
 * Consistent structure makes error handling in the mobile app predictable.
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  statusCode: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}
