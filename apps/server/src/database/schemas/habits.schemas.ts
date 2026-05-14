import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export type HabitDocument = Habit & Document;

@Schema({ timestamps: true, collection: 'habits' })
export class Habit {
  @Prop({ type: String, default: () => uuidv4() })
  _id: string;

  @Prop({ required: true, index: true })
  childId: string;

  @Prop({ required: true })
  parentId: string;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  category: string;

  @Prop({ required: false })
  description?: string;

  @Prop({ required: false })
  iconEmoji?: string;

  @Prop({ default: 10 })
  pointsValue: number;

  @Prop({ default: 15 })
  xpValue: number;

  @Prop({ type: [String], default: [] })
  scheduleDays: string[];

  @Prop({ default: false })
  proofRequired: boolean;

  @Prop({ default: true })
  autoApprove: boolean;

  @Prop({ required: false })
  proofDescription?: string;

  @Prop({ default: 0 })
  currentStreak: number;

  @Prop({ default: 0 })
  longestStreak: number;

  @Prop({ required: false })
  lastCompletedAt?: Date;

  @Prop({ default: true })
  isActive: boolean;
}

export const HabitSchema = SchemaFactory.createForClass(Habit);
HabitSchema.virtual('id').get(function () {
  return this._id;
});

// ---------------------------------------------------------------------------

export type HabitCompletionDocument = HabitCompletion & Document;

@Schema({ timestamps: true, collection: 'habit_completions' })
export class HabitCompletion {
  @Prop({ type: String, default: () => uuidv4() })
  _id: string;

  @Prop({ required: true, index: true })
  habitId: string;

  @Prop({ required: true, index: true })
  childId: string;

  @Prop({ default: () => new Date() })
  completedAt: Date;

  @Prop({ default: 'MANUAL' })
  proofType: string;

  @Prop({ required: false })
  proofUrl?: string;

  @Prop({ required: false })
  voiceTranscript?: string;

  @Prop({ required: false })
  confidenceScore?: number;

  @Prop({ default: false })
  autoApproved: boolean;

  @Prop({ required: false })
  parentApprovedAt?: Date;

  @Prop({ required: false })
  parentApprovedBy?: string;
}

export const HabitCompletionSchema =
  SchemaFactory.createForClass(HabitCompletion);
HabitCompletionSchema.virtual('id').get(function () {
  return this._id;
});

// ---------------------------------------------------------------------------

export type DailyMissionDocument = DailyMission & Document;

@Schema({ timestamps: true, collection: 'daily_missions' })
export class DailyMission {
  @Prop({ type: String, default: () => uuidv4() })
  _id: string;

  @Prop({ required: true, index: true })
  childId: string;

  @Prop({ required: true })
  date: string;

  @Prop({ type: [Object], required: true })
  missionsJson: unknown[];

  @Prop({ default: 0 })
  totalPoints: number;

  @Prop({ default: 0 })
  completionPct: number;

  @Prop({ default: false })
  generatedByAi: boolean;

  @Prop({ default: false })
  isLocked: boolean;
}

export const DailyMissionSchema = SchemaFactory.createForClass(DailyMission);
DailyMissionSchema.virtual('id').get(function () {
  return this._id;
});
DailyMissionSchema.index({ childId: 1, date: 1 }, { unique: true });

// ---------------------------------------------------------------------------

export type MoodLogDocument = MoodLog & Document;

@Schema({ timestamps: true, collection: 'mood_logs' })
export class MoodLog {
  @Prop({ type: String, default: () => uuidv4() })
  _id: string;

  @Prop({ required: true, index: true })
  childId: string;

  @Prop({ required: true })
  moodScore: number;

  @Prop({ required: false })
  note?: string;

  @Prop({ default: 'CHILD' })
  source: string;

  @Prop({ default: () => new Date() })
  loggedAt: Date;
}

export const MoodLogSchema = SchemaFactory.createForClass(MoodLog);
MoodLogSchema.virtual('id').get(function () {
  return this._id;
});

// ---------------------------------------------------------------------------

export type SkillAssessmentDocument = SkillAssessment & Document;

@Schema({ timestamps: true, collection: 'skill_assessments' })
export class SkillAssessment {
  @Prop({ type: String, default: () => uuidv4() })
  _id: string;

  @Prop({ required: true, index: true })
  childId: string;

  @Prop({ required: true })
  skillType: string;

  @Prop({ required: true })
  score: number;

  @Prop({ required: false })
  percentile?: number;

  @Prop({ required: false })
  note?: string;

  @Prop({ default: () => new Date() })
  assessedAt: Date;

  @Prop({ required: true })
  assessedBy: string;
}

export const SkillAssessmentSchema =
  SchemaFactory.createForClass(SkillAssessment);
SkillAssessmentSchema.virtual('id').get(function () {
  return this._id;
});
