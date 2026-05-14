import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export type FamilyGroupDocument = FamilyGroup & Document;

@Schema({ timestamps: true, collection: 'family_groups' })
export class FamilyGroup {
  @Prop({ type: String, default: () => uuidv4() })
  _id: string;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  createdById: string;

  @Prop({ default: 'Asia/Dhaka' })
  timezone: string;

  @Prop({ default: false })
  islamicModuleEnabled: boolean;

  @Prop({ required: false })
  islamicCountry?: string;
}

export const FamilyGroupSchema = SchemaFactory.createForClass(FamilyGroup);
FamilyGroupSchema.virtual('id').get(function () {
  return this._id;
});

// ---------------------------------------------------------------------------

export type FamilyMemberDocument = FamilyMember & Document;

@Schema({ timestamps: true, collection: 'family_members' })
export class FamilyMember {
  @Prop({ type: String, default: () => uuidv4() })
  _id: string;

  @Prop({ required: true, index: true })
  familyId: string;

  @Prop({ required: true, index: true })
  userId: string;

  @Prop({ default: 'PRIMARY' })
  role: string;

  @Prop({ default: true })
  canViewSafetyData: boolean;

  @Prop({ default: false })
  canChangeScreenTime: boolean;

  @Prop({ default: true })
  canApproveRewards: boolean;

  @Prop({ default: false })
  canManageSubscription: boolean;

  @Prop({ default: () => new Date() })
  joinedAt: Date;
}

export const FamilyMemberSchema = SchemaFactory.createForClass(FamilyMember);
FamilyMemberSchema.virtual('id').get(function () {
  return this._id;
});
FamilyMemberSchema.index({ familyId: 1, userId: 1 }, { unique: true });

// ---------------------------------------------------------------------------

export type FamilyChatMessageDocument = FamilyChatMessage & Document;

@Schema({ timestamps: true, collection: 'family_chat_messages' })
export class FamilyChatMessage {
  @Prop({ type: String, default: () => uuidv4() })
  _id: string;

  @Prop({ required: true, index: true })
  familyId: string;

  @Prop({ required: true })
  senderId: string;

  @Prop({ required: true })
  senderName: string;

  @Prop({ required: true })
  senderRole: string;

  @Prop({ required: true })
  content: string;

  @Prop({ required: false })
  mediaUrl?: string;
}

export const FamilyChatMessageSchema =
  SchemaFactory.createForClass(FamilyChatMessage);
FamilyChatMessageSchema.virtual('id').get(function () {
  return this._id;
});
