export declare enum UserRole {
    PARENT = "PARENT",
    CHILD = "CHILD",
    TUTOR = "TUTOR",
    ADMIN = "ADMIN"
}
export declare enum FamilyMemberRole {
    PRIMARY = "PRIMARY",
    CO_PARENT = "CO_PARENT",
    GUARDIAN = "GUARDIAN",
    TUTOR = "TUTOR"
}
export declare enum SubscriptionPlan {
    FREE = "FREE",
    STANDARD = "STANDARD",
    PRO = "PRO"
}
export declare enum SubscriptionStatus {
    ACTIVE = "ACTIVE",
    TRIAL = "TRIAL",
    EXPIRED = "EXPIRED",
    CANCELLED = "CANCELLED"
}
export declare enum SubscriptionEventType {
    TRIAL_STARTED = "TRIAL_STARTED",
    SUBSCRIBED = "SUBSCRIBED",
    RENEWED = "RENEWED",
    CANCELLED = "CANCELLED",
    EXPIRED = "EXPIRED",
    REFUNDED = "REFUNDED"
}
export declare enum MissionCategory {
    ACADEMIC = "ACADEMIC",
    PHYSICAL = "PHYSICAL",
    HABIT = "HABIT",
    SOCIAL = "SOCIAL",
    ISLAMIC = "ISLAMIC",
    CREATIVE = "CREATIVE",
    SELF_CARE = "SELF_CARE"
}
export declare enum ProofType {
    MANUAL = "MANUAL",
    PHOTO = "PHOTO",
    VOICE = "VOICE",
    SENSOR = "SENSOR"
}
export declare enum BadgeTier {
    BRONZE = "BRONZE",
    SILVER = "SILVER",
    GOLD = "GOLD",
    PLATINUM = "PLATINUM",
    ROYAL = "ROYAL"
}
export declare enum RewardStatus {
    PENDING = "PENDING",
    ACTIVE = "ACTIVE",
    ACHIEVED = "ACHIEVED",
    REDEEMED = "REDEEMED",
    EXPIRED = "EXPIRED"
}
export declare enum WishStatus {
    PENDING = "PENDING",
    APPROVED_WITH_GOAL = "APPROVED_WITH_GOAL",
    APPROVED_AS_GIFT = "APPROVED_AS_GIFT",
    DECLINED = "DECLINED"
}
export declare enum LocationEventType {
    CHECK_IN = "CHECK_IN",
    GEOFENCE_ENTER = "GEOFENCE_ENTER",
    GEOFENCE_EXIT = "GEOFENCE_EXIT",
    SOS = "SOS"
}
export declare enum GeofenceType {
    HOME = "HOME",
    SCHOOL = "SCHOOL",
    SAFE_ZONE = "SAFE_ZONE"
}
export declare enum AlertCategory {
    CYBERBULLYING = "CYBERBULLYING",
    SEXUAL_CONTENT = "SEXUAL_CONTENT",
    SELF_HARM = "SELF_HARM",
    DEPRESSION = "DEPRESSION",
    DRUG_REFERENCE = "DRUG_REFERENCE",
    VIOLENCE = "VIOLENCE",
    PREDATORY_BEHAVIOR = "PREDATORY_BEHAVIOR",
    ALCOHOL = "ALCOHOL",
    HATE_SPEECH = "HATE_SPEECH",
    ONLINE_SCAM = "ONLINE_SCAM",
    DANGEROUS_CHALLENGE = "DANGEROUS_CHALLENGE",
    STRANGER_CONTACT = "STRANGER_CONTACT",
    AI_CHAT_RISK = "AI_CHAT_RISK",
    EXCESSIVE_SCREEN_TIME = "EXCESSIVE_SCREEN_TIME",
    LATE_NIGHT_ACTIVITY = "LATE_NIGHT_ACTIVITY"
}
export declare enum AlertSeverity {
    LOW = "LOW",
    MEDIUM = "MEDIUM",
    HIGH = "HIGH",
    CRITICAL = "CRITICAL"
}
export declare enum HealthRecordType {
    HEIGHT = "HEIGHT",
    WEIGHT = "WEIGHT",
    SLEEP = "SLEEP",
    BMI = "BMI",
    ACTIVITY_MINUTES = "ACTIVITY_MINUTES"
}
export declare enum MealType {
    BREAKFAST = "BREAKFAST",
    LUNCH = "LUNCH",
    DINNER = "DINNER",
    SNACK = "SNACK"
}
export declare enum SalahName {
    FAJR = "FAJR",
    DHUHR = "DHUHR",
    ASR = "ASR",
    MAGHRIB = "MAGHRIB",
    ISHA = "ISHA"
}
export declare enum MemoryType {
    PHOTO = "PHOTO",
    VIDEO = "VIDEO",
    MILESTONE = "MILESTONE",
    ACHIEVEMENT = "ACHIEVEMENT",
    TRIP = "TRIP"
}
export declare enum MoodScore {
    VERY_HAPPY = 5,
    HAPPY = 4,
    OKAY = 3,
    SAD = 2,
    VERY_SAD = 1
}
export declare enum StudySessionType {
    AI_HELP = "AI_HELP",
    FLASHCARD = "FLASHCARD",
    PRACTICE_TEST = "PRACTICE_TEST",
    READING = "READING"
}
export declare enum GameCategory {
    MATH = "MATH",
    LANGUAGE = "LANGUAGE",
    GEOGRAPHY = "GEOGRAPHY",
    SCIENCE = "SCIENCE",
    ISLAMIC = "ISLAMIC",
    GENERAL = "GENERAL"
}
export declare enum FinanceEntryType {
    INCOME = "INCOME",
    EXPENSE = "EXPENSE"
}
export declare enum FinanceCategory {
    EDUCATION = "EDUCATION",
    HEALTH = "HEALTH",
    FOOD = "FOOD",
    ENTERTAINMENT = "ENTERTAINMENT",
    ACTIVITIES = "ACTIVITIES",
    CLOTHING = "CLOTHING",
    TRANSPORT = "TRANSPORT",
    SAVINGS = "SAVINGS",
    CHARITY = "CHARITY",
    OTHER = "OTHER"
}
export declare enum NotificationType {
    SAFETY_ALERT = "SAFETY_ALERT",
    SOS = "SOS",
    MISSION_REMINDER = "MISSION_REMINDER",
    BADGE_EARNED = "BADGE_EARNED",
    LEVEL_UP = "LEVEL_UP",
    WEEKLY_REPORT = "WEEKLY_REPORT",
    TUTOR_RESPONSE = "TUTOR_RESPONSE",
    WISH_REQUEST = "WISH_REQUEST",
    WISH_RESPONSE = "WISH_RESPONSE",
    WELLBEING_ALERT = "WELLBEING_ALERT",
    PAYMENT_REMINDER = "PAYMENT_REMINDER",
    VACATION_NUDGE = "VACATION_NUDGE",
    DAILY_TIP = "DAILY_TIP",
    CALENDAR_PLAN_UPDATED = "CALENDAR_PLAN_UPDATED"
}
