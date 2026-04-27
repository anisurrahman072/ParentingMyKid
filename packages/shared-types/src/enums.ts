/**
 * @module enums.ts
 * @description Shared enumerations used across both the mobile app and the NestJS server.
 *              Keeping enums in one place prevents value drift between client and server —
 *              critical for role-based access control and business logic consistency.
 */

// ─── User & Family Roles ─────────────────────────────────────────────────────

/**
 * Top-level user roles that determine which UI portal the user sees.
 * PARENT → parent dashboard (full control)
 * CHILD  → kid UI (missions, games, rewards)
 * TUTOR  → lightweight scoped view for academic/behavioral data
 * ADMIN  → internal operations dashboard
 */
export enum UserRole {
  PARENT = 'PARENT',
  CHILD = 'CHILD',
  TUTOR = 'TUTOR',
  ADMIN = 'ADMIN',
}

/**
 * Role of a user WITHIN a specific family group.
 * A user can be PRIMARY in one family and CO_PARENT in another (divorced families).
 */
export enum FamilyMemberRole {
  PRIMARY = 'PRIMARY',       // Main parent — full control, subscription payer
  CO_PARENT = 'CO_PARENT',   // Divorced/separated parent — scoped access
  GUARDIAN = 'GUARDIAN',     // Grandparent, uncle, aunt — read-only
  TUTOR = 'TUTOR',           // Private tutor or coach — scoped academic view
}

// ─── Subscription Plans ───────────────────────────────────────────────────────

/**
 * Subscription tiers. Controlled by RevenueCat entitlements on mobile.
 * FREE    → limited features, 1 child, basic missions
 * STANDARD → up to 3 children, AI plan, no safety suite
 * PRO     → unlimited children, full safety, Islamic module, all features
 */
export enum SubscriptionPlan {
  FREE = 'FREE',
  STANDARD = 'STANDARD',
  PRO = 'PRO',
}

export enum SubscriptionStatus {
  ACTIVE = 'ACTIVE',
  TRIAL = 'TRIAL',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED',
}

export enum SubscriptionEventType {
  TRIAL_STARTED = 'TRIAL_STARTED',
  SUBSCRIBED = 'SUBSCRIBED',
  RENEWED = 'RENEWED',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED',
  REFUNDED = 'REFUNDED',
}

// ─── Mission & Habit Categories ───────────────────────────────────────────────

/**
 * Mission categories determine icon color, AI generation rules, and
 * which skill dimension the completion improves (reading, physical, etc.).
 */
export enum MissionCategory {
  ACADEMIC = 'ACADEMIC',         // Homework, reading, practice questions
  PHYSICAL = 'PHYSICAL',         // Exercise, walking, sports
  HABIT = 'HABIT',               // Brush teeth, make bed, sleep on time
  SOCIAL = 'SOCIAL',             // Kindness acts, family interactions
  ISLAMIC = 'ISLAMIC',           // Salah, Quran, dua, good deeds
  CREATIVE = 'CREATIVE',         // Drawing, writing, music
  SELF_CARE = 'SELF_CARE',       // Eating well, hydration, mood check-in
}

/**
 * How a mission completion was proven/verified.
 * Determines confidence score and whether parent auto-approval applies.
 */
export enum ProofType {
  MANUAL = 'MANUAL',       // Child tapped the check button — lowest confidence
  PHOTO = 'PHOTO',         // Child uploaded a photo — medium confidence
  VOICE = 'VOICE',         // Child used voice check-in — medium confidence
  SENSOR = 'SENSOR',       // Inferred from accelerometer/step count — auto-approved
}

// ─── Achievement & Badge Tiers ────────────────────────────────────────────────

export enum BadgeTier {
  BRONZE = 'BRONZE',
  SILVER = 'SILVER',
  GOLD = 'GOLD',
  PLATINUM = 'PLATINUM',
  ROYAL = 'ROYAL',
}

// ─── Reward & Wish System ─────────────────────────────────────────────────────

export enum RewardStatus {
  PENDING = 'PENDING',             // Parent just created it, child working toward it
  ACTIVE = 'ACTIVE',               // Child is actively working on goal
  ACHIEVED = 'ACHIEVED',           // Child met the condition
  REDEEMED = 'REDEEMED',           // Parent honored the reward
  EXPIRED = 'EXPIRED',             // Goal date passed without achievement
}

export enum WishStatus {
  PENDING = 'PENDING',                  // Child sent wish, parent hasn't responded
  APPROVED_WITH_GOAL = 'APPROVED_WITH_GOAL', // Parent approved with a condition
  APPROVED_AS_GIFT = 'APPROVED_AS_GIFT',     // Parent approved unconditionally
  DECLINED = 'DECLINED',                // Parent declined with message
}

// ─── Safety & Location ────────────────────────────────────────────────────────

export enum LocationEventType {
  CHECK_IN = 'CHECK_IN',               // Periodic location ping
  GEOFENCE_ENTER = 'GEOFENCE_ENTER',   // Child entered a safe zone
  GEOFENCE_EXIT = 'GEOFENCE_EXIT',     // Child left a safe zone — may trigger alert
  SOS = 'SOS',                         // Emergency — highest priority
}

export enum GeofenceType {
  HOME = 'HOME',
  SCHOOL = 'SCHOOL',
  SAFE_ZONE = 'SAFE_ZONE',   // Grandparent's, friend's house, etc.
}

/**
 * Categories of AI content monitoring alerts.
 * Inspired by Bark's 29-category system — each category has a severity level
 * and triggers different parent notification priority.
 */
export enum AlertCategory {
  CYBERBULLYING = 'CYBERBULLYING',
  SEXUAL_CONTENT = 'SEXUAL_CONTENT',
  SELF_HARM = 'SELF_HARM',
  DEPRESSION = 'DEPRESSION',
  DRUG_REFERENCE = 'DRUG_REFERENCE',
  VIOLENCE = 'VIOLENCE',
  PREDATORY_BEHAVIOR = 'PREDATORY_BEHAVIOR',
  ALCOHOL = 'ALCOHOL',
  HATE_SPEECH = 'HATE_SPEECH',
  ONLINE_SCAM = 'ONLINE_SCAM',
  DANGEROUS_CHALLENGE = 'DANGEROUS_CHALLENGE',
  STRANGER_CONTACT = 'STRANGER_CONTACT',
  AI_CHAT_RISK = 'AI_CHAT_RISK',
  EXCESSIVE_SCREEN_TIME = 'EXCESSIVE_SCREEN_TIME',
  LATE_NIGHT_ACTIVITY = 'LATE_NIGHT_ACTIVITY',
}

export enum AlertSeverity {
  LOW = 'LOW',         // Informational — no immediate action needed
  MEDIUM = 'MEDIUM',   // Worth checking — send push notification
  HIGH = 'HIGH',       // Urgent — send immediate push + email
  CRITICAL = 'CRITICAL', // Emergency — SOS level, all channels
}

// ─── Health & Nutrition ───────────────────────────────────────────────────────

export enum HealthRecordType {
  HEIGHT = 'HEIGHT',
  WEIGHT = 'WEIGHT',
  SLEEP = 'SLEEP',
  BMI = 'BMI',
  ACTIVITY_MINUTES = 'ACTIVITY_MINUTES',
}

export enum MealType {
  BREAKFAST = 'BREAKFAST',
  LUNCH = 'LUNCH',
  DINNER = 'DINNER',
  SNACK = 'SNACK',
}

// ─── Islamic Module ───────────────────────────────────────────────────────────

/**
 * The 5 daily Islamic prayers. Used for Salah tracking.
 * Prayer times are fetched from a prayer time API based on user location.
 */
export enum SalahName {
  FAJR = 'FAJR',
  DHUHR = 'DHUHR',
  ASR = 'ASR',
  MAGHRIB = 'MAGHRIB',
  ISHA = 'ISHA',
}

// ─── Memory & Media ───────────────────────────────────────────────────────────

export enum MemoryType {
  PHOTO = 'PHOTO',
  VIDEO = 'VIDEO',
  MILESTONE = 'MILESTONE',     // Text-only milestone marker
  ACHIEVEMENT = 'ACHIEVEMENT', // Linked to a badge or reward
  TRIP = 'TRIP',               // Family vacation photos
}

// ─── Mood ─────────────────────────────────────────────────────────────────────

/**
 * Child mood scores used for wellbeing tracking.
 * Numeric value used for trend analysis and anomaly detection.
 * 5 = Very Happy, 1 = Very Sad
 */
export enum MoodScore {
  VERY_HAPPY = 5,
  HAPPY = 4,
  OKAY = 3,
  SAD = 2,
  VERY_SAD = 1,
}

// ─── Study & Gaming ───────────────────────────────────────────────────────────

export enum StudySessionType {
  AI_HELP = 'AI_HELP',             // Child used the safe AI homework helper
  FLASHCARD = 'FLASHCARD',         // Flashcard review session
  PRACTICE_TEST = 'PRACTICE_TEST', // Generated practice questions
  READING = 'READING',             // Logged book reading session
}

export enum GameCategory {
  MATH = 'MATH',
  LANGUAGE = 'LANGUAGE',
  GEOGRAPHY = 'GEOGRAPHY',
  SCIENCE = 'SCIENCE',
  ISLAMIC = 'ISLAMIC',
  GENERAL = 'GENERAL',
}

// ─── Finance ─────────────────────────────────────────────────────────────────

export enum FinanceEntryType {
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE',
}

export enum FinanceCategory {
  EDUCATION = 'EDUCATION',
  HEALTH = 'HEALTH',
  FOOD = 'FOOD',
  ENTERTAINMENT = 'ENTERTAINMENT',
  ACTIVITIES = 'ACTIVITIES',
  CLOTHING = 'CLOTHING',
  TRANSPORT = 'TRANSPORT',
  SAVINGS = 'SAVINGS',
  CHARITY = 'CHARITY',
  OTHER = 'OTHER',
}

// ─── Notifications ────────────────────────────────────────────────────────────

/**
 * Notification types determine priority, channel, and delivery timing.
 * SAFETY alerts bypass all throttling and deliver immediately.
 */
export enum NotificationType {
  SAFETY_ALERT = 'SAFETY_ALERT',       // Immediate — all channels
  SOS = 'SOS',                         // Immediate — all channels + emergency contacts
  MISSION_REMINDER = 'MISSION_REMINDER', // Morning nudge
  BADGE_EARNED = 'BADGE_EARNED',       // Celebratory push
  LEVEL_UP = 'LEVEL_UP',               // Full celebration notification
  WEEKLY_REPORT = 'WEEKLY_REPORT',     // Sunday evening
  TUTOR_RESPONSE = 'TUTOR_RESPONSE',   // Tutor replied to question pack
  WISH_REQUEST = 'WISH_REQUEST',       // Child sent a wish to parent
  WISH_RESPONSE = 'WISH_RESPONSE',     // Parent responded to child's wish
  WELLBEING_ALERT = 'WELLBEING_ALERT', // AI detected concerning pattern
  PAYMENT_REMINDER = 'PAYMENT_REMINDER', // Tuition/subscription due
  VACATION_NUDGE = 'VACATION_NUDGE',   // "You haven't taken a trip this year"
  DAILY_TIP = 'DAILY_TIP',             // Parenting tip of the day
  /** Family calendar plan assignees updated — notify involved parents */
  CALENDAR_PLAN_UPDATED = 'CALENDAR_PLAN_UPDATED',
}
