"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationType = exports.FinanceCategory = exports.FinanceEntryType = exports.GameCategory = exports.StudySessionType = exports.MoodScore = exports.MemoryType = exports.SalahName = exports.MealType = exports.HealthRecordType = exports.AlertSeverity = exports.AlertCategory = exports.GeofenceType = exports.LocationEventType = exports.WishStatus = exports.RewardStatus = exports.BadgeTier = exports.ProofType = exports.MissionCategory = exports.SubscriptionEventType = exports.SubscriptionStatus = exports.SubscriptionPlan = exports.FamilyMemberRole = exports.UserRole = void 0;
var UserRole;
(function (UserRole) {
    UserRole["PARENT"] = "PARENT";
    UserRole["CHILD"] = "CHILD";
    UserRole["TUTOR"] = "TUTOR";
    UserRole["ADMIN"] = "ADMIN";
})(UserRole || (exports.UserRole = UserRole = {}));
var FamilyMemberRole;
(function (FamilyMemberRole) {
    FamilyMemberRole["PRIMARY"] = "PRIMARY";
    FamilyMemberRole["CO_PARENT"] = "CO_PARENT";
    FamilyMemberRole["GUARDIAN"] = "GUARDIAN";
    FamilyMemberRole["TUTOR"] = "TUTOR";
})(FamilyMemberRole || (exports.FamilyMemberRole = FamilyMemberRole = {}));
var SubscriptionPlan;
(function (SubscriptionPlan) {
    SubscriptionPlan["FREE"] = "FREE";
    SubscriptionPlan["STANDARD"] = "STANDARD";
    SubscriptionPlan["PRO"] = "PRO";
})(SubscriptionPlan || (exports.SubscriptionPlan = SubscriptionPlan = {}));
var SubscriptionStatus;
(function (SubscriptionStatus) {
    SubscriptionStatus["ACTIVE"] = "ACTIVE";
    SubscriptionStatus["TRIAL"] = "TRIAL";
    SubscriptionStatus["EXPIRED"] = "EXPIRED";
    SubscriptionStatus["CANCELLED"] = "CANCELLED";
})(SubscriptionStatus || (exports.SubscriptionStatus = SubscriptionStatus = {}));
var SubscriptionEventType;
(function (SubscriptionEventType) {
    SubscriptionEventType["TRIAL_STARTED"] = "TRIAL_STARTED";
    SubscriptionEventType["SUBSCRIBED"] = "SUBSCRIBED";
    SubscriptionEventType["RENEWED"] = "RENEWED";
    SubscriptionEventType["CANCELLED"] = "CANCELLED";
    SubscriptionEventType["EXPIRED"] = "EXPIRED";
    SubscriptionEventType["REFUNDED"] = "REFUNDED";
})(SubscriptionEventType || (exports.SubscriptionEventType = SubscriptionEventType = {}));
var MissionCategory;
(function (MissionCategory) {
    MissionCategory["ACADEMIC"] = "ACADEMIC";
    MissionCategory["PHYSICAL"] = "PHYSICAL";
    MissionCategory["HABIT"] = "HABIT";
    MissionCategory["SOCIAL"] = "SOCIAL";
    MissionCategory["ISLAMIC"] = "ISLAMIC";
    MissionCategory["CREATIVE"] = "CREATIVE";
    MissionCategory["SELF_CARE"] = "SELF_CARE";
})(MissionCategory || (exports.MissionCategory = MissionCategory = {}));
var ProofType;
(function (ProofType) {
    ProofType["MANUAL"] = "MANUAL";
    ProofType["PHOTO"] = "PHOTO";
    ProofType["VOICE"] = "VOICE";
    ProofType["SENSOR"] = "SENSOR";
})(ProofType || (exports.ProofType = ProofType = {}));
var BadgeTier;
(function (BadgeTier) {
    BadgeTier["BRONZE"] = "BRONZE";
    BadgeTier["SILVER"] = "SILVER";
    BadgeTier["GOLD"] = "GOLD";
    BadgeTier["PLATINUM"] = "PLATINUM";
    BadgeTier["ROYAL"] = "ROYAL";
})(BadgeTier || (exports.BadgeTier = BadgeTier = {}));
var RewardStatus;
(function (RewardStatus) {
    RewardStatus["PENDING"] = "PENDING";
    RewardStatus["ACTIVE"] = "ACTIVE";
    RewardStatus["ACHIEVED"] = "ACHIEVED";
    RewardStatus["REDEEMED"] = "REDEEMED";
    RewardStatus["EXPIRED"] = "EXPIRED";
})(RewardStatus || (exports.RewardStatus = RewardStatus = {}));
var WishStatus;
(function (WishStatus) {
    WishStatus["PENDING"] = "PENDING";
    WishStatus["APPROVED_WITH_GOAL"] = "APPROVED_WITH_GOAL";
    WishStatus["APPROVED_AS_GIFT"] = "APPROVED_AS_GIFT";
    WishStatus["DECLINED"] = "DECLINED";
})(WishStatus || (exports.WishStatus = WishStatus = {}));
var LocationEventType;
(function (LocationEventType) {
    LocationEventType["CHECK_IN"] = "CHECK_IN";
    LocationEventType["GEOFENCE_ENTER"] = "GEOFENCE_ENTER";
    LocationEventType["GEOFENCE_EXIT"] = "GEOFENCE_EXIT";
    LocationEventType["SOS"] = "SOS";
})(LocationEventType || (exports.LocationEventType = LocationEventType = {}));
var GeofenceType;
(function (GeofenceType) {
    GeofenceType["HOME"] = "HOME";
    GeofenceType["SCHOOL"] = "SCHOOL";
    GeofenceType["SAFE_ZONE"] = "SAFE_ZONE";
})(GeofenceType || (exports.GeofenceType = GeofenceType = {}));
var AlertCategory;
(function (AlertCategory) {
    AlertCategory["CYBERBULLYING"] = "CYBERBULLYING";
    AlertCategory["SEXUAL_CONTENT"] = "SEXUAL_CONTENT";
    AlertCategory["SELF_HARM"] = "SELF_HARM";
    AlertCategory["DEPRESSION"] = "DEPRESSION";
    AlertCategory["DRUG_REFERENCE"] = "DRUG_REFERENCE";
    AlertCategory["VIOLENCE"] = "VIOLENCE";
    AlertCategory["PREDATORY_BEHAVIOR"] = "PREDATORY_BEHAVIOR";
    AlertCategory["ALCOHOL"] = "ALCOHOL";
    AlertCategory["HATE_SPEECH"] = "HATE_SPEECH";
    AlertCategory["ONLINE_SCAM"] = "ONLINE_SCAM";
    AlertCategory["DANGEROUS_CHALLENGE"] = "DANGEROUS_CHALLENGE";
    AlertCategory["STRANGER_CONTACT"] = "STRANGER_CONTACT";
    AlertCategory["AI_CHAT_RISK"] = "AI_CHAT_RISK";
    AlertCategory["EXCESSIVE_SCREEN_TIME"] = "EXCESSIVE_SCREEN_TIME";
    AlertCategory["LATE_NIGHT_ACTIVITY"] = "LATE_NIGHT_ACTIVITY";
})(AlertCategory || (exports.AlertCategory = AlertCategory = {}));
var AlertSeverity;
(function (AlertSeverity) {
    AlertSeverity["LOW"] = "LOW";
    AlertSeverity["MEDIUM"] = "MEDIUM";
    AlertSeverity["HIGH"] = "HIGH";
    AlertSeverity["CRITICAL"] = "CRITICAL";
})(AlertSeverity || (exports.AlertSeverity = AlertSeverity = {}));
var HealthRecordType;
(function (HealthRecordType) {
    HealthRecordType["HEIGHT"] = "HEIGHT";
    HealthRecordType["WEIGHT"] = "WEIGHT";
    HealthRecordType["SLEEP"] = "SLEEP";
    HealthRecordType["BMI"] = "BMI";
    HealthRecordType["ACTIVITY_MINUTES"] = "ACTIVITY_MINUTES";
})(HealthRecordType || (exports.HealthRecordType = HealthRecordType = {}));
var MealType;
(function (MealType) {
    MealType["BREAKFAST"] = "BREAKFAST";
    MealType["LUNCH"] = "LUNCH";
    MealType["DINNER"] = "DINNER";
    MealType["SNACK"] = "SNACK";
})(MealType || (exports.MealType = MealType = {}));
var SalahName;
(function (SalahName) {
    SalahName["FAJR"] = "FAJR";
    SalahName["DHUHR"] = "DHUHR";
    SalahName["ASR"] = "ASR";
    SalahName["MAGHRIB"] = "MAGHRIB";
    SalahName["ISHA"] = "ISHA";
})(SalahName || (exports.SalahName = SalahName = {}));
var MemoryType;
(function (MemoryType) {
    MemoryType["PHOTO"] = "PHOTO";
    MemoryType["VIDEO"] = "VIDEO";
    MemoryType["MILESTONE"] = "MILESTONE";
    MemoryType["ACHIEVEMENT"] = "ACHIEVEMENT";
    MemoryType["TRIP"] = "TRIP";
})(MemoryType || (exports.MemoryType = MemoryType = {}));
var MoodScore;
(function (MoodScore) {
    MoodScore[MoodScore["VERY_HAPPY"] = 5] = "VERY_HAPPY";
    MoodScore[MoodScore["HAPPY"] = 4] = "HAPPY";
    MoodScore[MoodScore["OKAY"] = 3] = "OKAY";
    MoodScore[MoodScore["SAD"] = 2] = "SAD";
    MoodScore[MoodScore["VERY_SAD"] = 1] = "VERY_SAD";
})(MoodScore || (exports.MoodScore = MoodScore = {}));
var StudySessionType;
(function (StudySessionType) {
    StudySessionType["AI_HELP"] = "AI_HELP";
    StudySessionType["FLASHCARD"] = "FLASHCARD";
    StudySessionType["PRACTICE_TEST"] = "PRACTICE_TEST";
    StudySessionType["READING"] = "READING";
})(StudySessionType || (exports.StudySessionType = StudySessionType = {}));
var GameCategory;
(function (GameCategory) {
    GameCategory["MATH"] = "MATH";
    GameCategory["LANGUAGE"] = "LANGUAGE";
    GameCategory["GEOGRAPHY"] = "GEOGRAPHY";
    GameCategory["SCIENCE"] = "SCIENCE";
    GameCategory["ISLAMIC"] = "ISLAMIC";
    GameCategory["GENERAL"] = "GENERAL";
})(GameCategory || (exports.GameCategory = GameCategory = {}));
var FinanceEntryType;
(function (FinanceEntryType) {
    FinanceEntryType["INCOME"] = "INCOME";
    FinanceEntryType["EXPENSE"] = "EXPENSE";
})(FinanceEntryType || (exports.FinanceEntryType = FinanceEntryType = {}));
var FinanceCategory;
(function (FinanceCategory) {
    FinanceCategory["EDUCATION"] = "EDUCATION";
    FinanceCategory["HEALTH"] = "HEALTH";
    FinanceCategory["FOOD"] = "FOOD";
    FinanceCategory["ENTERTAINMENT"] = "ENTERTAINMENT";
    FinanceCategory["ACTIVITIES"] = "ACTIVITIES";
    FinanceCategory["CLOTHING"] = "CLOTHING";
    FinanceCategory["TRANSPORT"] = "TRANSPORT";
    FinanceCategory["SAVINGS"] = "SAVINGS";
    FinanceCategory["CHARITY"] = "CHARITY";
    FinanceCategory["OTHER"] = "OTHER";
})(FinanceCategory || (exports.FinanceCategory = FinanceCategory = {}));
var NotificationType;
(function (NotificationType) {
    NotificationType["SAFETY_ALERT"] = "SAFETY_ALERT";
    NotificationType["SOS"] = "SOS";
    NotificationType["MISSION_REMINDER"] = "MISSION_REMINDER";
    NotificationType["BADGE_EARNED"] = "BADGE_EARNED";
    NotificationType["LEVEL_UP"] = "LEVEL_UP";
    NotificationType["WEEKLY_REPORT"] = "WEEKLY_REPORT";
    NotificationType["TUTOR_RESPONSE"] = "TUTOR_RESPONSE";
    NotificationType["WISH_REQUEST"] = "WISH_REQUEST";
    NotificationType["WISH_RESPONSE"] = "WISH_RESPONSE";
    NotificationType["WELLBEING_ALERT"] = "WELLBEING_ALERT";
    NotificationType["PAYMENT_REMINDER"] = "PAYMENT_REMINDER";
    NotificationType["VACATION_NUDGE"] = "VACATION_NUDGE";
    NotificationType["DAILY_TIP"] = "DAILY_TIP";
})(NotificationType || (exports.NotificationType = NotificationType = {}));
//# sourceMappingURL=enums.js.map