import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export type ChildProfileDocument = ChildProfile & Document;

@Schema({ timestamps: true, collection: 'child_profiles' })
export class ChildProfile {
  @Prop({ type: String, default: () => uuidv4() })
  _id: string;

  @Prop({ required: true, unique: true })
  userId: string;

  @Prop({ required: true, index: true })
  familyId: string;

  @Prop({ required: true, index: true })
  parentId: string;

  @Prop({ required: true })
  name: string;

  @Prop({ required: false })
  nickname?: string;

  @Prop({ required: true })
  dob: Date;

  @Prop({ required: true })
  grade: string;

  @Prop({ required: false })
  school?: string;

  @Prop({ required: false })
  avatarUrl?: string;

  @Prop({ required: false })
  pinHash?: string;

  @Prop({ required: false })
  pinEnc?: string;

  @Prop({ default: 'en' })
  languagePreference: string;

  @Prop({ type: [String], default: [] })
  allergies: string[];

  @Prop({ type: [String], default: [] })
  foodPreferences: string[];

  @Prop({ type: [String], default: [] })
  favoriteActivities: string[];

  @Prop({ required: false })
  learningStyle?: string;

  @Prop({ default: false })
  islamicModuleEnabled: boolean;

  @Prop({ default: false })
  socialMonitoringEnabled: boolean;

  @Prop({ default: 1 })
  level: number;

  @Prop({ default: 0 })
  xp: number;

  @Prop({ default: 0 })
  totalPoints: number;

  @Prop({ default: 0 })
  spendableCoins: number;

  @Prop({ default: 0 })
  currentStreak: number;

  @Prop({ default: 0 })
  longestStreak: number;

  @Prop({ required: false })
  wellbeingScore?: number;

  @Prop({ required: false })
  wellbeingUpdatedAt?: Date;

  @Prop({ required: false })
  baselineCompletedAt?: Date;

  @Prop({ type: Object, required: false })
  baselineScores?: Record<string, unknown>;

  @Prop({ type: [Object], default: [] })
  installedAppsCache: unknown[];
}

export const ChildProfileSchema = SchemaFactory.createForClass(ChildProfile);
ChildProfileSchema.virtual('id').get(function () {
  return this._id;
});

// ---------------------------------------------------------------------------

export type ChildDeviceDocument = ChildDevice & Document;

@Schema({ timestamps: true, collection: 'child_devices' })
export class ChildDevice {
  @Prop({ type: String, default: () => uuidv4() })
  _id: string;

  @Prop({ required: true, index: true })
  childId: string;

  @Prop({ required: true })
  deviceToken: string;

  @Prop({ required: true })
  platform: string;

  @Prop({ required: false })
  deviceName?: string;

  @Prop({ default: () => new Date() })
  pairedAt: Date;

  @Prop({ required: false })
  lastActiveAt?: Date;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ required: false })
  batteryLevel?: number;
}

export const ChildDeviceSchema = SchemaFactory.createForClass(ChildDevice);
ChildDeviceSchema.virtual('id').get(function () {
  return this._id;
});

// ---------------------------------------------------------------------------

export type FriendInviteDocument = FriendInvite & Document;

@Schema({ timestamps: true, collection: 'friend_invites' })
export class FriendInvite {
  @Prop({ type: String, default: () => uuidv4() })
  _id: string;

  @Prop({ required: true })
  fromChildId: string;

  @Prop({ required: false })
  toChildId?: string;

  @Prop({ required: true, unique: true })
  inviteCode: string;

  @Prop({ default: 'PENDING' })
  status: string;

  @Prop({ default: false })
  parentApproved: boolean;

  @Prop({ required: true })
  expiresAt: Date;
}

export const FriendInviteSchema = SchemaFactory.createForClass(FriendInvite);
FriendInviteSchema.virtual('id').get(function () {
  return this._id;
});

// ---------------------------------------------------------------------------

export type ChildFriendDocument = ChildFriend & Document;

@Schema({ timestamps: true, collection: 'child_friends' })
export class ChildFriend {
  @Prop({ type: String, default: () => uuidv4() })
  _id: string;

  @Prop({ required: true })
  childAId: string;

  @Prop({ required: true })
  childBId: string;

  @Prop({ default: () => new Date() })
  since: Date;
}

export const ChildFriendSchema = SchemaFactory.createForClass(ChildFriend);
ChildFriendSchema.virtual('id').get(function () {
  return this._id;
});

// ---------------------------------------------------------------------------

export type BaselineAssessmentDocument = BaselineAssessment & Document;

@Schema({ timestamps: true, collection: 'baseline_assessments' })
export class BaselineAssessment {
  @Prop({ type: String, default: () => uuidv4() })
  _id: string;

  @Prop({ required: true, unique: true })
  childId: string;

  @Prop({ type: [Object], required: true })
  answers: unknown[];

  @Prop({ type: Object, required: true })
  scores: Record<string, unknown>;

  @Prop({ type: Object, required: true })
  report: Record<string, unknown>;

  @Prop({ default: () => new Date() })
  completedAt: Date;
}

export const BaselineAssessmentSchema =
  SchemaFactory.createForClass(BaselineAssessment);
BaselineAssessmentSchema.virtual('id').get(function () {
  return this._id;
});
