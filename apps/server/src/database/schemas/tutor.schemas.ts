import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export type TutorInviteDocument = TutorInvite & Document;

@Schema({ timestamps: true, collection: 'tutor_invites' })
export class TutorInvite {
  @Prop({ type: String, default: () => uuidv4() })
  _id: string;

  @Prop({ required: true, index: true })
  childId: string;

  @Prop({ required: true })
  parentId: string;

  @Prop({ required: true })
  tutorEmail: string;

  @Prop({ required: false })
  tutorName?: string;

  @Prop({ required: false })
  tutorUserId?: string;

  @Prop({ default: true })
  scopeAcademic: boolean;

  @Prop({ default: true })
  scopeBehavior: boolean;

  @Prop({ default: false })
  scopeMood: boolean;

  @Prop({ required: true, unique: true })
  token: string;

  @Prop({ required: true })
  tokenExpiresAt: Date;

  @Prop({ default: 'PENDING' })
  status: string;

  @Prop({ type: [Object], required: false })
  questionsJson?: unknown[];

  @Prop({ type: [Object], required: false })
  responsesJson?: unknown[];

  @Prop({ required: false })
  respondedAt?: Date;

  @Prop({ required: false })
  aiSummary?: string;

  @Prop({ default: () => new Date() })
  sentAt: Date;
}

export const TutorInviteSchema = SchemaFactory.createForClass(TutorInvite);
TutorInviteSchema.virtual('id').get(function () {
  return this._id;
});
