import { UserRole, FamilyMemberRole, SubscriptionPlan, SubscriptionStatus, MissionCategory, ProofType, BadgeTier, RewardStatus, WishStatus, AlertCategory, AlertSeverity, HealthRecordType, MealType, SalahName, MemoryType, MoodScore, GameCategory, FinanceEntryType, FinanceCategory, GeofenceType, LocationEventType, NotificationType } from './enums';
export interface AuthTokenPayload {
    sub: string;
    email: string;
    role: UserRole;
    familyIds: string[];
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
    parentalConsentGiven: boolean;
}
export interface AuthResponse {
    accessToken: string;
    refreshToken: string;
    user: UserProfile;
}
export interface ChildLoginRequest {
    childId: string;
    pin: string;
}
export interface PairingCodeResponse {
    code: string;
    expiresAt: string;
    qrData: string;
}
export interface UserProfile {
    id: string;
    email: string;
    name: string;
    phone?: string;
    role: UserRole;
    avatarUrl?: string;
    createdAt: string;
    familyIds?: string[];
    childProfileId?: string;
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
export interface FamilyChildNameRef {
    id: string;
    name: string;
}
export interface MyFamilyListItem {
    id: string;
    name: string;
    myRole: FamilyMemberRole;
    members: FamilyMemberSummary[];
    children: FamilyChildNameRef[];
}
export type FamilyCalendarRecurrenceKind = 'NONE' | 'WEEKLY';
export interface FamilyCalendarEventAssignee {
    kind: 'user' | 'child';
    id: string;
    displayName: string;
    avatarUrl: string | null;
}
export interface FamilyCalendarEventInstance {
    id: string;
    baseEventId: string;
    familyId: string;
    childId: string | null;
    title: string;
    type: string;
    description: string | null;
    location: string | null;
    startAt: string;
    endAt: string | null;
    reminderDays: number | null;
    recurrenceKind: FamilyCalendarRecurrenceKind;
    recurrenceByWeekday: number | null;
    recurrenceByWeekdays: number[];
    assignees: FamilyCalendarEventAssignee[];
    createdBy: string;
    createdAt: string;
    isRecurringInstance: boolean;
}
export interface CreateFamilyRequest {
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
    wellbeingScore?: number;
    currentStreak: number;
    totalPoints: number;
    level: number;
    xp: number;
}
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
    weeklyHighlights: string[];
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
    activeAlerts: number;
    linkedDeviceCount: number;
    hasScreenUsageToday: boolean;
    lastDeviceActivityAt?: string;
}
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
    proofUrl?: string;
    autoApprove: boolean;
    date: string;
}
export interface CompleteMissionRequest {
    proofType: ProofType;
    proofUrl?: string;
    voiceTranscript?: string;
}
export interface Habit {
    id: string;
    childId: string;
    title: string;
    category: MissionCategory;
    pointsValue: number;
    scheduleJson: string[];
    isActive: boolean;
    currentStreak: number;
    longestStreak: number;
}
export interface PointsBalance {
    childId: string;
    totalPoints: number;
    spendableCoins: number;
    xp: number;
    level: number;
    xpToNextLevel: number;
    levelProgress: number;
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
    conditionDescription: string;
    conditionType: string;
    conditionValue: number;
    currentProgress: number;
    rewardDescription: string;
    status: RewardStatus;
    targetDate?: string;
    achievedAt?: string;
}
export interface WishRequest {
    id: string;
    childId: string;
    itemName: string;
    description: string;
    voiceUrl?: string;
    status: WishStatus;
    parentResponse?: string;
    createdAt: string;
}
export interface CreateWishRequest {
    itemName: string;
    description: string;
    voiceUrl?: string;
}
export interface RespondToWishRequest {
    status: 'APPROVED_WITH_GOAL' | 'APPROVED_AS_GIFT' | 'DECLINED';
    parentMessage: string;
    goalCondition?: string;
    goalValue?: number;
    targetDate?: string;
}
export interface ChildLocation {
    childId: string;
    lat: number;
    lon: number;
    accuracy: number;
    timestamp: string;
    eventType: LocationEventType;
    address?: string;
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
    evidenceSnippet?: string;
    isRead: boolean;
    actionTaken?: string;
    createdAt: string;
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
    bedtimeStart: string;
    bedtimeEnd: string;
    morningUnlockTime: string;
    focusTimeStart?: string;
    focusTimeEnd?: string;
    drivingModeEnabled: boolean;
    isPaused: boolean;
    blockedApps: string[];
    blockedWebsites: string[];
    controlsVersion?: number;
}
export interface GrowthPlan {
    childId: string;
    weekStart: string;
    focusAreas: GrowthPlanFocusArea[];
    predictedImprovements: Record<string, number>;
    confidence: number;
    generatedAt: string;
}
export interface GrowthPlanFocusArea {
    dimension: string;
    reason: string;
    dailyTasks: string[];
    predictedOutcome: string;
}
export interface WellbeingScore {
    childId: string;
    score: number;
    breakdown: Record<string, number>;
    trend: 'UP' | 'DOWN' | 'STABLE';
    trendDays: number;
    alerts: string[];
    calculatedAt: string;
}
export interface AICoachRequest {
    situation: string;
    childId: string;
    childAge: number;
}
export interface AICoachResponse {
    immediateScript: string;
    immediateSteps: string[];
    doNotSay: string[];
    longerTermStrategy: string;
    category: string;
}
export interface TutorInvite {
    id: string;
    childId: string;
    parentId: string;
    tutorEmail: string;
    tutorName?: string;
    scopeAcademic: boolean;
    scopeBehavior: boolean;
    scopeMood: boolean;
    token: string;
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
    rating?: number;
    text?: string;
    booleanAnswer?: boolean;
}
export interface MealLog {
    id: string;
    childId: string;
    mealType: MealType;
    foods: FoodItem[];
    totalCalories?: number;
    totalProtein?: number;
    totalCarbs?: number;
    totalFat?: number;
    vitamins: Record<string, number>;
    loggedAt: string;
}
export interface FoodItem {
    name: string;
    portion: string;
    isHalal?: boolean;
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
    unit: string;
    recordedAt: string;
    note?: string;
}
export interface DailyIslamicContent {
    date: string;
    dua: IslamicDua;
    islamicFact: string;
    prayerTimes: Record<SalahName, string>;
    quranGoalStatus: QuranGoalStatus;
    ramadanMode: boolean;
    ifstarTime?: string;
    suhoorTime?: string;
}
export interface IslamicDua {
    arabicText: string;
    transliteration: string;
    translation: string;
    audioUrl?: string;
    category: string;
}
export interface QuranGoalStatus {
    dailyGoal: string;
    completedToday: boolean;
    streak: number;
    totalPagesRead: number;
    completedSurahs: string[];
}
export interface Memory {
    id: string;
    familyId: string;
    childId?: string;
    type: MemoryType;
    mediaUrl?: string;
    caption?: string;
    taggedAt: string;
    milestone?: string;
}
export interface CalendarEvent {
    id: string;
    familyId: string;
    title: string;
    type: string;
    startAt: string;
    endAt?: string;
    location?: string;
    note?: string;
    childId?: string;
    reminderDays?: number;
}
export interface BudgetEntry {
    id: string;
    familyId: string;
    category: FinanceCategory;
    amount: number;
    currency: string;
    type: FinanceEntryType;
    date: string;
    note?: string;
    childId?: string;
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
    progress: number;
}
export interface PushNotificationPayload {
    type: NotificationType;
    title: string;
    body: string;
    data?: Record<string, string>;
    channelId?: string;
    priority: 'default' | 'high' | 'max';
}
export interface Game {
    id: string;
    name: string;
    category: GameCategory;
    minAge: number;
    maxAge: number;
    description: string;
    iconUrl?: string;
    isLocked?: boolean;
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
export interface SafeAIStudyResponse {
    response: string;
    followUpQuestion?: string;
    relatedTip?: string;
}
export interface PracticeQuestion {
    id: string;
    subject: string;
    difficulty: 'EASY' | 'MEDIUM' | 'HARD';
    questionText: string;
    options?: string[];
    type: 'MCQ' | 'SHORT_ANSWER';
    childAnswer?: string;
    isCorrect?: boolean;
    explanation?: string;
}
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
