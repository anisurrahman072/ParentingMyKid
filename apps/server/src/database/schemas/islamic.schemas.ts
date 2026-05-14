import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export type SalahLogDocument = SalahLog & Document;

@Schema({ timestamps: true, collection: 'salah_logs' })
export class SalahLog {
  @Prop({ type: String, default: () => uuidv4() })
  _id: string;

  @Prop({ required: true, index: true })
  childId: string;

  @Prop({ required: true })
  date: string;

  @Prop({ required: true })
  salah: string;

  @Prop({ default: () => new Date() })
  loggedAt: Date;

  @Prop({ default: true })
  onTime: boolean;
}

export const SalahLogSchema = SchemaFactory.createForClass(SalahLog);
SalahLogSchema.virtual('id').get(function () {
  return this._id;
});

// ---------------------------------------------------------------------------

export type QuranLogDocument = QuranLog & Document;

@Schema({ timestamps: true, collection: 'quran_logs' })
export class QuranLog {
  @Prop({ type: String, default: () => uuidv4() })
  _id: string;

  @Prop({ required: true, index: true })
  childId: string;

  @Prop({ required: true })
  date: string;

  @Prop({ default: 0 })
  pagesRead: number;

  @Prop({ required: false })
  surahName?: string;

  @Prop({ required: false })
  fromAyah?: number;

  @Prop({ required: false })
  toAyah?: number;

  @Prop({ required: false })
  photoUrl?: string;

  @Prop({ default: () => new Date() })
  loggedAt: Date;
}

export const QuranLogSchema = SchemaFactory.createForClass(QuranLog);
QuranLogSchema.virtual('id').get(function () {
  return this._id;
});

// ---------------------------------------------------------------------------

export type IslamicStoryDocument = IslamicStory & Document;

@Schema({ timestamps: true, collection: 'islamic_stories' })
export class IslamicStory {
  @Prop({ type: String, default: () => uuidv4() })
  _id: string;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  content: string;

  @Prop({ default: 4 })
  minAge: number;

  @Prop({ default: 15 })
  maxAge: number;

  @Prop({ required: true })
  category: string;

  @Prop({ required: false })
  imageUrl?: string;

  @Prop({ required: false })
  audioUrl?: string;

  @Prop({ default: 0 })
  readCount: number;

  @Prop({ default: true })
  isPublished: boolean;
}

export const IslamicStorySchema = SchemaFactory.createForClass(IslamicStory);
IslamicStorySchema.virtual('id').get(function () {
  return this._id;
});

// ---------------------------------------------------------------------------

export type ZakatRecordDocument = ZakatRecord & Document;

@Schema({ timestamps: true, collection: 'zakat_records' })
export class ZakatRecord {
  @Prop({ type: String, default: () => uuidv4() })
  _id: string;

  @Prop({ required: true, index: true })
  parentId: string;

  @Prop({ required: true })
  year: number;

  @Prop({ required: true })
  savingsAmount: number;

  @Prop({ default: 0 })
  goldValue: number;

  @Prop({ default: 0 })
  silverValue: number;

  @Prop({ default: 0 })
  investmentValue: number;

  @Prop({ default: 0 })
  otherAssets: number;

  @Prop({ required: true })
  nisabThreshold: number;

  @Prop({ required: true })
  zakatDue: number;

  @Prop({ default: 0 })
  zakatPaid: number;

  @Prop({ default: 'BDT' })
  currency: string;

  @Prop({ default: () => new Date() })
  calculatedAt: Date;
}

export const ZakatRecordSchema = SchemaFactory.createForClass(ZakatRecord);
ZakatRecordSchema.virtual('id').get(function () {
  return this._id;
});
