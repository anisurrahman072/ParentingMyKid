import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export type UserDocument = User & Document;

@Schema({ timestamps: true, collection: 'users' })
export class User {
  @Prop({ type: String, default: () => uuidv4() })
  _id: string;

  @Prop({ required: true, unique: true, lowercase: true })
  email: string;

  @Prop({ required: false })
  phone?: string;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  passwordHash: string;

  @Prop({ default: 'PARENT' })
  role: string;

  @Prop({ required: false })
  avatarUrl?: string;

  @Prop({ default: false })
  parentalConsentGiven: boolean;

  @Prop({ required: false })
  parentalConsentAt?: Date;

  @Prop({ required: false })
  parentalConsentVersion?: string;

  @Prop({ required: false })
  expoPushToken?: string;

  @Prop({ default: 'en' })
  languagePreference: string;

  @Prop({ required: false })
  religion?: string;

  @Prop({ required: false })
  parentalPinHash?: string;

  @Prop({ required: false })
  parentalPinEnc?: string;

  @Prop({ default: false })
  parentalPinSet: boolean;

  @Prop({ required: false })
  cameraMonitoringConsentAt?: Date;

  @Prop({ required: false })
  lastLoginAt?: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);
UserSchema.virtual('id').get(function () {
  return this._id;
});

// ---------------------------------------------------------------------------

export type SessionCacheDocument = SessionCache & Document;

@Schema({ timestamps: true, collection: 'session_caches' })
export class SessionCache {
  @Prop({ type: String, default: () => uuidv4() })
  _id: string;

  @Prop({ required: true, unique: true })
  key: string;

  @Prop({ required: true })
  value: string;

  @Prop({ required: true })
  expiresAt: Date;
}

export const SessionCacheSchema = SchemaFactory.createForClass(SessionCache);
SessionCacheSchema.virtual('id').get(function () {
  return this._id;
});
SessionCacheSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
