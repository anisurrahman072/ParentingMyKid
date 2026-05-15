import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export type LeadDocument = Lead & Document;

@Schema({ timestamps: true, collection: 'leads' })
export class Lead {
  @Prop({ type: String, default: () => uuidv4() })
  _id: string;

  @Prop({ required: false })
  name?: string;

  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: false })
  country?: string;

  @Prop({ default: 'en' })
  language: string;

  @Prop({ required: false })
  source?: string;
}

export const LeadSchema = SchemaFactory.createForClass(Lead);
LeadSchema.virtual('id').get(function () {
  return this._id;
});

// ---------------------------------------------------------------------------

export type SiteFeedbackDocument = SiteFeedback & Document;

@Schema({ timestamps: true, collection: 'site_feedbacks' })
export class SiteFeedback {
  @Prop({ type: String, default: () => uuidv4() })
  _id: string;

  @Prop({ required: true })
  email: string;

  @Prop({ required: false })
  name?: string;

  @Prop({ required: true })
  message: string;

  @Prop({ required: false })
  country?: string;

  @Prop({ default: 'en' })
  language: string;

  @Prop({ required: false })
  source?: string;
}

export const SiteFeedbackSchema = SchemaFactory.createForClass(SiteFeedback);
SiteFeedbackSchema.virtual('id').get(function () {
  return this._id;
});

// ---------------------------------------------------------------------------

export type ActivityLogDocument = ActivityLog & Document;

@Schema({ timestamps: true, collection: 'activity_logs' })
export class ActivityLog {
  @Prop({ type: String, default: () => uuidv4() })
  _id: string;

  @Prop({ required: true, index: true })
  activeKidId: string;

  @Prop({ required: false })
  claimedKidId?: string;

  @Prop({ required: true })
  type: string;

  @Prop({ type: Object, required: true })
  payload: Record<string, unknown>;

  @Prop({ required: false })
  screenshotUrl?: string;
}

export const ActivityLogSchema = SchemaFactory.createForClass(ActivityLog);
ActivityLogSchema.virtual('id').get(function () {
  return this._id;
});
// Compound index: covers getTodayActivity() query { activeKidId, createdAt range }
ActivityLogSchema.index({ activeKidId: 1, createdAt: -1 });
// TTL: auto-expire after 90 days to protect Atlas M0 512 MB storage budget
ActivityLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7_776_000 });

// ---------------------------------------------------------------------------

export type KidSectionTimeLogDocument = KidSectionTimeLog & Document;

@Schema({ timestamps: true, collection: 'kid_section_time_logs' })
export class KidSectionTimeLog {
  @Prop({ type: String, default: () => uuidv4() })
  _id: string;

  @Prop({ required: true, index: true })
  childId: string;

  @Prop({ required: true, index: true })
  date: string;

  @Prop({ required: true })
  section: string;

  @Prop({ default: 0 })
  minutes: number;
}

export const KidSectionTimeLogSchema =
  SchemaFactory.createForClass(KidSectionTimeLog);
KidSectionTimeLogSchema.virtual('id').get(function () {
  return this._id;
});
// Compound index: covers upsert and read queries { childId, date, section }
KidSectionTimeLogSchema.index({ childId: 1, date: 1 });
// TTL: auto-expire after 90 days — analytics only uses last 30 days of data
KidSectionTimeLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7_776_000 });

// ---------------------------------------------------------------------------

export type VideoManagerSettingsDocument = VideoManagerSettings & Document;

@Schema({ timestamps: true, collection: 'video_manager_settings' })
export class VideoManagerSettings {
  @Prop({ type: String, default: () => uuidv4() })
  _id: string;

  @Prop({ required: true, unique: true })
  childId: string;

  @Prop({ default: 'CHILD' })
  ageGroup: string;

  @Prop({ default: 'NONE' })
  musicLevel: string;

  @Prop({ default: 'en' })
  videoLanguage: string;

  @Prop({ default: 'STRICT_HALAL' })
  contentType: string;

  @Prop({ default: 'BOTH' })
  gender: string;

  @Prop({ default: 'NORMAL' })
  theme: string;
}

export const VideoManagerSettingsSchema =
  SchemaFactory.createForClass(VideoManagerSettings);
VideoManagerSettingsSchema.virtual('id').get(function () {
  return this._id;
});

// ---------------------------------------------------------------------------

export type ParentContentDocument = ParentContent & Document;

@Schema({ timestamps: true, collection: 'parent_contents' })
export class ParentContent {
  @Prop({ type: String, default: () => uuidv4() })
  _id: string;

  @Prop({ required: true, index: true })
  familyId: string;

  @Prop({ required: false })
  childId?: string;

  @Prop({ required: true })
  type: string;

  @Prop({ required: true })
  title: string;

  @Prop({ required: false })
  body?: string;

  @Prop({ required: false })
  mediaUrl?: string;

  @Prop({ default: false })
  isRead: boolean;
}

export const ParentContentSchema = SchemaFactory.createForClass(ParentContent);
ParentContentSchema.virtual('id').get(function () {
  return this._id;
});
