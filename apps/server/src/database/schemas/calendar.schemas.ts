import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export type MemoryDocument = Memory & Document;

@Schema({ timestamps: true, collection: 'memories' })
export class Memory {
  @Prop({ type: String, default: () => uuidv4() })
  _id: string;

  @Prop({ required: true, index: true })
  familyId: string;

  @Prop({ required: false })
  childId?: string;

  @Prop({ required: true })
  type: string;

  @Prop({ required: false })
  mediaUrl?: string;

  @Prop({ required: false })
  caption?: string;

  @Prop({ required: false })
  milestone?: string;

  @Prop({ default: () => new Date() })
  taggedAt: Date;
}

export const MemorySchema = SchemaFactory.createForClass(Memory);
MemorySchema.virtual('id').get(function () {
  return this._id;
});

// ---------------------------------------------------------------------------

export type FamilyCalendarEventDocument = FamilyCalendarEvent & Document;

@Schema({ timestamps: true, collection: 'family_calendar_events' })
export class FamilyCalendarEvent {
  @Prop({ type: String, default: () => uuidv4() })
  _id: string;

  @Prop({ required: true, index: true })
  familyId: string;

  @Prop({ required: false })
  childId?: string;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  type: string;

  @Prop({ required: false })
  description?: string;

  @Prop({ required: false })
  location?: string;

  @Prop({ required: true })
  startAt: Date;

  @Prop({ required: false })
  endAt?: Date;

  @Prop({ required: false })
  reminderDays?: number;

  @Prop({ default: 'NONE' })
  recurrenceKind: string;

  @Prop({ required: false })
  recurrenceByWeekday?: string;

  @Prop({ type: [Number], default: [] })
  recurrenceByWeekdays: number[];

  @Prop({ type: [String], default: [] })
  assigneeUserIds: string[];

  @Prop({ type: [String], default: [] })
  assigneeChildIds: string[];

  @Prop({ required: true })
  createdBy: string;
}

export const FamilyCalendarEventSchema =
  SchemaFactory.createForClass(FamilyCalendarEvent);
FamilyCalendarEventSchema.virtual('id').get(function () {
  return this._id;
});
