import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export type RewardDocument = Reward & Document;

@Schema({ timestamps: true, collection: 'rewards' })
export class Reward {
  @Prop({ type: String, default: () => uuidv4() })
  _id: string;

  @Prop({ required: true, index: true })
  childId: string;

  @Prop({ required: true })
  parentId: string;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  conditionType: string;

  @Prop({ required: true })
  conditionDescription: string;

  @Prop({ required: true })
  conditionValue: number;

  @Prop({ default: 0 })
  currentProgress: number;

  @Prop({ required: true })
  rewardDescription: string;

  @Prop({ default: 'PENDING' })
  status: string;

  @Prop({ required: false })
  targetDate?: Date;

  @Prop({ required: false })
  achievedAt?: Date;

  @Prop({ required: false })
  redeemedAt?: Date;
}

export const RewardSchema = SchemaFactory.createForClass(Reward);
RewardSchema.virtual('id').get(function () {
  return this._id;
});

// ---------------------------------------------------------------------------

export type PointsLedgerEntryDocument = PointsLedgerEntry & Document;

@Schema({ timestamps: true, collection: 'points_ledger_entries' })
export class PointsLedgerEntry {
  @Prop({ type: String, default: () => uuidv4() })
  _id: string;

  @Prop({ required: true, index: true })
  childId: string;

  @Prop({ required: true })
  points: number;

  @Prop({ default: 0 })
  coins: number;

  @Prop({ default: 0 })
  xp: number;

  @Prop({ required: true })
  reason: string;

  @Prop({ required: true })
  sourceType: string;

  @Prop({ required: false })
  sourceId?: string;
}

export const PointsLedgerEntrySchema =
  SchemaFactory.createForClass(PointsLedgerEntry);
PointsLedgerEntrySchema.virtual('id').get(function () {
  return this._id;
});

// ---------------------------------------------------------------------------

export type BadgeDocument = Badge & Document;

@Schema({ timestamps: true, collection: 'badges' })
export class Badge {
  @Prop({ type: String, default: () => uuidv4() })
  _id: string;

  @Prop({ required: true, index: true })
  childId: string;

  @Prop({ required: true })
  badgeType: string;

  @Prop({ required: true })
  tier: string;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  description: string;

  @Prop({ required: false })
  iconUrl?: string;

  @Prop({ default: () => new Date() })
  earnedAt: Date;

  @Prop({ default: false })
  isShared: boolean;
}

export const BadgeSchema = SchemaFactory.createForClass(Badge);
BadgeSchema.virtual('id').get(function () {
  return this._id;
});

// ---------------------------------------------------------------------------

export type WishRequestDocument = WishRequest & Document;

@Schema({ timestamps: true, collection: 'wish_requests' })
export class WishRequest {
  @Prop({ type: String, default: () => uuidv4() })
  _id: string;

  @Prop({ required: true, index: true })
  childId: string;

  @Prop({ required: true })
  itemName: string;

  @Prop({ required: true })
  description: string;

  @Prop({ required: false })
  voiceUrl?: string;

  @Prop({ default: 'PENDING' })
  status: string;

  @Prop({ required: false })
  parentResponse?: string;

  @Prop({ required: false })
  goalCondition?: string;

  @Prop({ required: false })
  goalValue?: number;

  @Prop({ required: false })
  targetDate?: Date;

  @Prop({ required: false })
  respondedAt?: Date;
}

export const WishRequestSchema = SchemaFactory.createForClass(WishRequest);
WishRequestSchema.virtual('id').get(function () {
  return this._id;
});
