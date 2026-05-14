import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { User, UserDocument } from './schemas/user.schemas';
import { SessionCache, SessionCacheDocument } from './schemas/user.schemas';
import {
  FamilyGroup,
  FamilyGroupDocument,
  FamilyMember,
  FamilyMemberDocument,
  FamilyChatMessage,
  FamilyChatMessageDocument,
} from './schemas/family.schemas';
import {
  ChildProfile,
  ChildProfileDocument,
  ChildDevice,
  ChildDeviceDocument,
  FriendInvite,
  FriendInviteDocument,
  ChildFriend,
  ChildFriendDocument,
  BaselineAssessment,
  BaselineAssessmentDocument,
} from './schemas/child.schemas';
import {
  Habit,
  HabitDocument,
  HabitCompletion,
  HabitCompletionDocument,
  DailyMission,
  DailyMissionDocument,
  MoodLog,
  MoodLogDocument,
  SkillAssessment,
  SkillAssessmentDocument,
} from './schemas/habits.schemas';
import {
  Reward,
  RewardDocument,
  PointsLedgerEntry,
  PointsLedgerEntryDocument,
  Badge,
  BadgeDocument,
  WishRequest,
  WishRequestDocument,
} from './schemas/rewards.schemas';
import {
  LocationEvent,
  LocationEventDocument,
  Geofence,
  GeofenceDocument,
  ScreenUsageLog,
  ScreenUsageLogDocument,
  ScreenTimeControls,
  ScreenTimeControlsDocument,
  ContentFilterEvent,
  ContentFilterEventDocument,
  SafetyAlert,
  SafetyAlertDocument,
} from './schemas/safety.schemas';
import {
  MealLog,
  MealLogDocument,
  HealthRecord,
  HealthRecordDocument,
  MedicationReminder,
  MedicationReminderDocument,
  VaccinationRecord,
  VaccinationRecordDocument,
} from './schemas/health.schemas';
import {
  AiGrowthPlan,
  AiGrowthPlanDocument,
  AiRecommendation,
  AiRecommendationDocument,
  AiCoachSession,
  AiCoachSessionDocument,
} from './schemas/ai.schemas';
import { TutorInvite, TutorInviteDocument } from './schemas/tutor.schemas';
import {
  SalahLog,
  SalahLogDocument,
  QuranLog,
  QuranLogDocument,
  IslamicStory,
  IslamicStoryDocument,
  ZakatRecord,
  ZakatRecordDocument,
} from './schemas/islamic.schemas';
import {
  Memory,
  MemoryDocument,
  FamilyCalendarEvent,
  FamilyCalendarEventDocument,
} from './schemas/calendar.schemas';
import {
  Game,
  GameDocument,
  GameSession,
  GameSessionDocument,
  GameAchievement,
  GameAchievementDocument,
  FamilyQuizBattle,
  FamilyQuizBattleDocument,
} from './schemas/gaming.schemas';
import {
  StudySession,
  StudySessionDocument,
  PracticeQuestion,
  PracticeQuestionDocument,
  ReadingLog,
  ReadingLogDocument,
  FlashcardSet,
  FlashcardSetDocument,
} from './schemas/study.schemas';
import {
  Subscription,
  SubscriptionDocument,
  SubscriptionEvent,
  SubscriptionEventDocument,
} from './schemas/subscription.schemas';
import {
  FamilyFinanceEntry,
  FamilyFinanceEntryDocument,
  SavingsGoal,
  SavingsGoalDocument,
  ChildAllowance,
  ChildAllowanceDocument,
  TuitionRecord,
  TuitionRecordDocument,
} from './schemas/finance.schemas';
import {
  ParentingTip,
  ParentingTipDocument,
  CommunityGroup,
  CommunityGroupDocument,
  CommunityPost,
  CommunityPostDocument,
  ParentMoodLog,
  ParentMoodLogDocument,
  CrisisScript,
  CrisisScriptDocument,
} from './schemas/community.schemas';
import {
  Lead,
  LeadDocument,
  SiteFeedback,
  SiteFeedbackDocument,
  ActivityLog,
  ActivityLogDocument,
  KidSectionTimeLog,
  KidSectionTimeLogDocument,
  VideoManagerSettings,
  VideoManagerSettingsDocument,
  ParentContent,
  ParentContentDocument,
} from './schemas/misc.schemas';

@Injectable()
export class DatabaseService {
  constructor(
    @InjectModel(User.name) readonly user: Model<UserDocument>,
    @InjectModel(SessionCache.name)
    readonly sessionCache: Model<SessionCacheDocument>,
    @InjectModel(FamilyGroup.name)
    readonly familyGroup: Model<FamilyGroupDocument>,
    @InjectModel(FamilyMember.name)
    readonly familyMember: Model<FamilyMemberDocument>,
    @InjectModel(FamilyChatMessage.name)
    readonly familyChatMessage: Model<FamilyChatMessageDocument>,
    @InjectModel(ChildProfile.name)
    readonly childProfile: Model<ChildProfileDocument>,
    @InjectModel(ChildDevice.name)
    readonly childDevice: Model<ChildDeviceDocument>,
    @InjectModel(FriendInvite.name)
    readonly friendInvite: Model<FriendInviteDocument>,
    @InjectModel(ChildFriend.name)
    readonly childFriend: Model<ChildFriendDocument>,
    @InjectModel(BaselineAssessment.name)
    readonly baselineAssessment: Model<BaselineAssessmentDocument>,
    @InjectModel(Habit.name) readonly habit: Model<HabitDocument>,
    @InjectModel(HabitCompletion.name)
    readonly habitCompletion: Model<HabitCompletionDocument>,
    @InjectModel(DailyMission.name)
    readonly dailyMission: Model<DailyMissionDocument>,
    @InjectModel(MoodLog.name) readonly moodLog: Model<MoodLogDocument>,
    @InjectModel(SkillAssessment.name)
    readonly skillAssessment: Model<SkillAssessmentDocument>,
    @InjectModel(Reward.name) readonly reward: Model<RewardDocument>,
    @InjectModel(PointsLedgerEntry.name)
    readonly pointsLedgerEntry: Model<PointsLedgerEntryDocument>,
    @InjectModel(Badge.name) readonly badge: Model<BadgeDocument>,
    @InjectModel(WishRequest.name)
    readonly wishRequest: Model<WishRequestDocument>,
    @InjectModel(LocationEvent.name)
    readonly locationEvent: Model<LocationEventDocument>,
    @InjectModel(Geofence.name) readonly geofence: Model<GeofenceDocument>,
    @InjectModel(ScreenUsageLog.name)
    readonly screenUsageLog: Model<ScreenUsageLogDocument>,
    @InjectModel(ScreenTimeControls.name)
    readonly screenTimeControls: Model<ScreenTimeControlsDocument>,
    @InjectModel(ContentFilterEvent.name)
    readonly contentFilterEvent: Model<ContentFilterEventDocument>,
    @InjectModel(SafetyAlert.name)
    readonly safetyAlert: Model<SafetyAlertDocument>,
    @InjectModel(MealLog.name) readonly mealLog: Model<MealLogDocument>,
    @InjectModel(HealthRecord.name)
    readonly healthRecord: Model<HealthRecordDocument>,
    @InjectModel(MedicationReminder.name)
    readonly medicationReminder: Model<MedicationReminderDocument>,
    @InjectModel(VaccinationRecord.name)
    readonly vaccinationRecord: Model<VaccinationRecordDocument>,
    @InjectModel(AiGrowthPlan.name)
    readonly aiGrowthPlan: Model<AiGrowthPlanDocument>,
    @InjectModel(AiRecommendation.name)
    readonly aiRecommendation: Model<AiRecommendationDocument>,
    @InjectModel(AiCoachSession.name)
    readonly aiCoachSession: Model<AiCoachSessionDocument>,
    @InjectModel(TutorInvite.name)
    readonly tutorInvite: Model<TutorInviteDocument>,
    @InjectModel(SalahLog.name) readonly salahLog: Model<SalahLogDocument>,
    @InjectModel(QuranLog.name) readonly quranLog: Model<QuranLogDocument>,
    @InjectModel(IslamicStory.name)
    readonly islamicStory: Model<IslamicStoryDocument>,
    @InjectModel(ZakatRecord.name)
    readonly zakatRecord: Model<ZakatRecordDocument>,
    @InjectModel(Memory.name) readonly memory: Model<MemoryDocument>,
    @InjectModel(FamilyCalendarEvent.name)
    readonly familyCalendarEvent: Model<FamilyCalendarEventDocument>,
    @InjectModel(Game.name) readonly game: Model<GameDocument>,
    @InjectModel(GameSession.name)
    readonly gameSession: Model<GameSessionDocument>,
    @InjectModel(GameAchievement.name)
    readonly gameAchievement: Model<GameAchievementDocument>,
    @InjectModel(FamilyQuizBattle.name)
    readonly familyQuizBattle: Model<FamilyQuizBattleDocument>,
    @InjectModel(StudySession.name)
    readonly studySession: Model<StudySessionDocument>,
    @InjectModel(PracticeQuestion.name)
    readonly practiceQuestion: Model<PracticeQuestionDocument>,
    @InjectModel(ReadingLog.name)
    readonly readingLog: Model<ReadingLogDocument>,
    @InjectModel(FlashcardSet.name)
    readonly flashcardSet: Model<FlashcardSetDocument>,
    @InjectModel(Subscription.name)
    readonly subscription: Model<SubscriptionDocument>,
    @InjectModel(SubscriptionEvent.name)
    readonly subscriptionEvent: Model<SubscriptionEventDocument>,
    @InjectModel(FamilyFinanceEntry.name)
    readonly familyFinanceEntry: Model<FamilyFinanceEntryDocument>,
    @InjectModel(SavingsGoal.name)
    readonly savingsGoal: Model<SavingsGoalDocument>,
    @InjectModel(ChildAllowance.name)
    readonly childAllowance: Model<ChildAllowanceDocument>,
    @InjectModel(TuitionRecord.name)
    readonly tuitionRecord: Model<TuitionRecordDocument>,
    @InjectModel(ParentingTip.name)
    readonly parentingTip: Model<ParentingTipDocument>,
    @InjectModel(CommunityGroup.name)
    readonly communityGroup: Model<CommunityGroupDocument>,
    @InjectModel(CommunityPost.name)
    readonly communityPost: Model<CommunityPostDocument>,
    @InjectModel(ParentMoodLog.name)
    readonly parentMoodLog: Model<ParentMoodLogDocument>,
    @InjectModel(CrisisScript.name)
    readonly crisisScript: Model<CrisisScriptDocument>,
    @InjectModel(Lead.name) readonly lead: Model<LeadDocument>,
    @InjectModel(SiteFeedback.name)
    readonly siteFeedback: Model<SiteFeedbackDocument>,
    @InjectModel(ActivityLog.name)
    readonly activityLog: Model<ActivityLogDocument>,
    @InjectModel(KidSectionTimeLog.name)
    readonly kidSectionTimeLog: Model<KidSectionTimeLogDocument>,
    @InjectModel(VideoManagerSettings.name)
    readonly videoManagerSettings: Model<VideoManagerSettingsDocument>,
    @InjectModel(ParentContent.name)
    readonly parentContent: Model<ParentContentDocument>,
  ) {}
}
