import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export type ParentingTipDocument = ParentingTip & Document;

@Schema({ timestamps: true, collection: 'parenting_tips' })
export class ParentingTip {
  @Prop({ type: String, default: () => uuidv4() })
  _id: string;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  content: string;

  @Prop({ required: true })
  category: string;

  @Prop({ default: 4 })
  ageGroupMin: number;

  @Prop({ default: 15 })
  ageGroupMax: number;

  @Prop({ default: 3 })
  readMinutes: number;

  @Prop({ default: true })
  isPublished: boolean;

  @Prop({ required: false })
  publishedAt?: Date;

  @Prop({ default: 0 })
  readCount: number;
}

export const ParentingTipSchema = SchemaFactory.createForClass(ParentingTip);
ParentingTipSchema.virtual('id').get(function () {
  return this._id;
});

// ---------------------------------------------------------------------------

export type CommunityGroupDocument = CommunityGroup & Document;

@Schema({ timestamps: true, collection: 'community_groups' })
export class CommunityGroup {
  @Prop({ type: String, default: () => uuidv4() })
  _id: string;

  @Prop({ required: true })
  name: string;

  @Prop({ required: false })
  description?: string;

  @Prop({ required: true })
  ageRangeMin: number;

  @Prop({ required: true })
  ageRangeMax: number;

  @Prop({ default: 0 })
  memberCount: number;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ type: [String], default: [] })
  familyIds: string[];
}

export const CommunityGroupSchema =
  SchemaFactory.createForClass(CommunityGroup);
CommunityGroupSchema.virtual('id').get(function () {
  return this._id;
});

// ---------------------------------------------------------------------------

export type CommunityPostDocument = CommunityPost & Document;

@Schema({ timestamps: true, collection: 'community_posts' })
export class CommunityPost {
  @Prop({ type: String, default: () => uuidv4() })
  _id: string;

  @Prop({ required: true, index: true })
  parentId: string;

  @Prop({ required: true, index: true })
  groupId: string;

  @Prop({ required: true })
  content: string;

  @Prop({ default: false })
  isAnonymous: boolean;

  @Prop({ default: 0 })
  likesCount: number;

  @Prop({ default: false })
  isModerated: boolean;

  @Prop({ required: false })
  moderatedAt?: Date;
}

export const CommunityPostSchema = SchemaFactory.createForClass(CommunityPost);
CommunityPostSchema.virtual('id').get(function () {
  return this._id;
});

// ---------------------------------------------------------------------------

export type ParentMoodLogDocument = ParentMoodLog & Document;

@Schema({ timestamps: true, collection: 'parent_mood_logs' })
export class ParentMoodLog {
  @Prop({ type: String, default: () => uuidv4() })
  _id: string;

  @Prop({ required: true, index: true })
  parentId: string;

  @Prop({ required: true })
  moodScore: number;

  @Prop({ required: false })
  note?: string;

  @Prop({ default: () => new Date() })
  loggedAt: Date;
}

export const ParentMoodLogSchema = SchemaFactory.createForClass(ParentMoodLog);
ParentMoodLogSchema.virtual('id').get(function () {
  return this._id;
});

// ---------------------------------------------------------------------------

export type CrisisScriptDocument = CrisisScript & Document;

@Schema({ timestamps: true, collection: 'crisis_scripts' })
export class CrisisScript {
  @Prop({ type: String, default: () => uuidv4() })
  _id: string;

  @Prop({ required: true })
  situation: string;

  @Prop({ required: true })
  childAgeMin: number;

  @Prop({ required: true })
  childAgeMax: number;

  @Prop({ required: true })
  immediateScript: string;

  @Prop({ type: [String], required: true })
  immediateSteps: string[];

  @Prop({ type: [String], required: true })
  doNotSay: string[];

  @Prop({ required: true })
  longerTermStrategy: string;

  @Prop({ required: true })
  psychologyBasis: string;

  @Prop({ default: true })
  isPublished: boolean;
}

export const CrisisScriptSchema = SchemaFactory.createForClass(CrisisScript);
CrisisScriptSchema.virtual('id').get(function () {
  return this._id;
});
