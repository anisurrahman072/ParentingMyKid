import { Global, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { User, UserSchema } from './schemas/user.schemas';
import { SessionCache, SessionCacheSchema } from './schemas/user.schemas';

import {
  FamilyGroup,
  FamilyGroupSchema,
  FamilyMember,
  FamilyMemberSchema,
  FamilyChatMessage,
  FamilyChatMessageSchema,
} from './schemas/family.schemas';

import {
  ChildProfile,
  ChildProfileSchema,
  ChildDevice,
  ChildDeviceSchema,
  FriendInvite,
  FriendInviteSchema,
  ChildFriend,
  ChildFriendSchema,
  BaselineAssessment,
  BaselineAssessmentSchema,
} from './schemas/child.schemas';

import {
  Habit,
  HabitSchema,
  HabitCompletion,
  HabitCompletionSchema,
  DailyMission,
  DailyMissionSchema,
  MoodLog,
  MoodLogSchema,
  SkillAssessment,
  SkillAssessmentSchema,
} from './schemas/habits.schemas';

import {
  Reward,
  RewardSchema,
  PointsLedgerEntry,
  PointsLedgerEntrySchema,
  Badge,
  BadgeSchema,
  WishRequest,
  WishRequestSchema,
} from './schemas/rewards.schemas';

import {
  LocationEvent,
  LocationEventSchema,
  Geofence,
  GeofenceSchema,
  ScreenUsageLog,
  ScreenUsageLogSchema,
  ScreenTimeControls,
  ScreenTimeControlsSchema,
  ContentFilterEvent,
  ContentFilterEventSchema,
  SafetyAlert,
  SafetyAlertSchema,
} from './schemas/safety.schemas';

import {
  MealLog,
  MealLogSchema,
  HealthRecord,
  HealthRecordSchema,
  MedicationReminder,
  MedicationReminderSchema,
  VaccinationRecord,
  VaccinationRecordSchema,
} from './schemas/health.schemas';

import {
  AiGrowthPlan,
  AiGrowthPlanSchema,
  AiRecommendation,
  AiRecommendationSchema,
  AiCoachSession,
  AiCoachSessionSchema,
} from './schemas/ai.schemas';

import { TutorInvite, TutorInviteSchema } from './schemas/tutor.schemas';

import {
  SalahLog,
  SalahLogSchema,
  QuranLog,
  QuranLogSchema,
  IslamicStory,
  IslamicStorySchema,
  ZakatRecord,
  ZakatRecordSchema,
} from './schemas/islamic.schemas';

import {
  Memory,
  MemorySchema,
  FamilyCalendarEvent,
  FamilyCalendarEventSchema,
} from './schemas/calendar.schemas';

import {
  Game,
  GameSchema,
  GameSession,
  GameSessionSchema,
  GameAchievement,
  GameAchievementSchema,
  FamilyQuizBattle,
  FamilyQuizBattleSchema,
} from './schemas/gaming.schemas';

import {
  StudySession,
  StudySessionSchema,
  PracticeQuestion,
  PracticeQuestionSchema,
  ReadingLog,
  ReadingLogSchema,
  FlashcardSet,
  FlashcardSetSchema,
} from './schemas/study.schemas';

import {
  Subscription,
  SubscriptionSchema,
  SubscriptionEvent,
  SubscriptionEventSchema,
} from './schemas/subscription.schemas';

import {
  FamilyFinanceEntry,
  FamilyFinanceEntrySchema,
  SavingsGoal,
  SavingsGoalSchema,
  ChildAllowance,
  ChildAllowanceSchema,
  TuitionRecord,
  TuitionRecordSchema,
} from './schemas/finance.schemas';

import {
  ParentingTip,
  ParentingTipSchema,
  CommunityGroup,
  CommunityGroupSchema,
  CommunityPost,
  CommunityPostSchema,
  ParentMoodLog,
  ParentMoodLogSchema,
  CrisisScript,
  CrisisScriptSchema,
} from './schemas/community.schemas';

import {
  Lead,
  LeadSchema,
  SiteFeedback,
  SiteFeedbackSchema,
  ActivityLog,
  ActivityLogSchema,
  KidSectionTimeLog,
  KidSectionTimeLogSchema,
  VideoManagerSettings,
  VideoManagerSettingsSchema,
  ParentContent,
  ParentContentSchema,
} from './schemas/misc.schemas';

import { DatabaseService } from 'src/database/database.service';

const ALL_SCHEMAS = MongooseModule.forFeature([
  { name: User.name, schema: UserSchema },
  { name: SessionCache.name, schema: SessionCacheSchema },
  { name: FamilyGroup.name, schema: FamilyGroupSchema },
  { name: FamilyMember.name, schema: FamilyMemberSchema },
  { name: FamilyChatMessage.name, schema: FamilyChatMessageSchema },
  { name: ChildProfile.name, schema: ChildProfileSchema },
  { name: ChildDevice.name, schema: ChildDeviceSchema },
  { name: FriendInvite.name, schema: FriendInviteSchema },
  { name: ChildFriend.name, schema: ChildFriendSchema },
  { name: BaselineAssessment.name, schema: BaselineAssessmentSchema },
  { name: Habit.name, schema: HabitSchema },
  { name: HabitCompletion.name, schema: HabitCompletionSchema },
  { name: DailyMission.name, schema: DailyMissionSchema },
  { name: MoodLog.name, schema: MoodLogSchema },
  { name: SkillAssessment.name, schema: SkillAssessmentSchema },
  { name: Reward.name, schema: RewardSchema },
  { name: PointsLedgerEntry.name, schema: PointsLedgerEntrySchema },
  { name: Badge.name, schema: BadgeSchema },
  { name: WishRequest.name, schema: WishRequestSchema },
  { name: LocationEvent.name, schema: LocationEventSchema },
  { name: Geofence.name, schema: GeofenceSchema },
  { name: ScreenUsageLog.name, schema: ScreenUsageLogSchema },
  { name: ScreenTimeControls.name, schema: ScreenTimeControlsSchema },
  { name: ContentFilterEvent.name, schema: ContentFilterEventSchema },
  { name: SafetyAlert.name, schema: SafetyAlertSchema },
  { name: MealLog.name, schema: MealLogSchema },
  { name: HealthRecord.name, schema: HealthRecordSchema },
  { name: MedicationReminder.name, schema: MedicationReminderSchema },
  { name: VaccinationRecord.name, schema: VaccinationRecordSchema },
  { name: AiGrowthPlan.name, schema: AiGrowthPlanSchema },
  { name: AiRecommendation.name, schema: AiRecommendationSchema },
  { name: AiCoachSession.name, schema: AiCoachSessionSchema },
  { name: TutorInvite.name, schema: TutorInviteSchema },
  { name: SalahLog.name, schema: SalahLogSchema },
  { name: QuranLog.name, schema: QuranLogSchema },
  { name: IslamicStory.name, schema: IslamicStorySchema },
  { name: ZakatRecord.name, schema: ZakatRecordSchema },
  { name: Memory.name, schema: MemorySchema },
  { name: FamilyCalendarEvent.name, schema: FamilyCalendarEventSchema },
  { name: Game.name, schema: GameSchema },
  { name: GameSession.name, schema: GameSessionSchema },
  { name: GameAchievement.name, schema: GameAchievementSchema },
  { name: FamilyQuizBattle.name, schema: FamilyQuizBattleSchema },
  { name: StudySession.name, schema: StudySessionSchema },
  { name: PracticeQuestion.name, schema: PracticeQuestionSchema },
  { name: ReadingLog.name, schema: ReadingLogSchema },
  { name: FlashcardSet.name, schema: FlashcardSetSchema },
  { name: Subscription.name, schema: SubscriptionSchema },
  { name: SubscriptionEvent.name, schema: SubscriptionEventSchema },
  { name: FamilyFinanceEntry.name, schema: FamilyFinanceEntrySchema },
  { name: SavingsGoal.name, schema: SavingsGoalSchema },
  { name: ChildAllowance.name, schema: ChildAllowanceSchema },
  { name: TuitionRecord.name, schema: TuitionRecordSchema },
  { name: ParentingTip.name, schema: ParentingTipSchema },
  { name: CommunityGroup.name, schema: CommunityGroupSchema },
  { name: CommunityPost.name, schema: CommunityPostSchema },
  { name: ParentMoodLog.name, schema: ParentMoodLogSchema },
  { name: CrisisScript.name, schema: CrisisScriptSchema },
  { name: Lead.name, schema: LeadSchema },
  { name: SiteFeedback.name, schema: SiteFeedbackSchema },
  { name: ActivityLog.name, schema: ActivityLogSchema },
  { name: KidSectionTimeLog.name, schema: KidSectionTimeLogSchema },
  { name: VideoManagerSettings.name, schema: VideoManagerSettingsSchema },
  { name: ParentContent.name, schema: ParentContentSchema },
]);

@Global()
@Module({
  imports: [
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        uri: config.getOrThrow<string>('MONGODB_URI'),
      }),
      inject: [ConfigService],
    }),
    ALL_SCHEMAS,
  ],
  providers: [DatabaseService],
  exports: [MongooseModule, DatabaseService],
})
export class DatabaseModule {}
