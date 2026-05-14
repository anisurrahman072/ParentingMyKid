import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export type FamilyFinanceEntryDocument = FamilyFinanceEntry & Document;

@Schema({ timestamps: true, collection: 'family_finance_entries' })
export class FamilyFinanceEntry {
  @Prop({ type: String, default: () => uuidv4() })
  _id: string;

  @Prop({ required: true, index: true })
  familyId: string;

  @Prop({ required: false })
  childId?: string;

  @Prop({ required: true })
  category: string;

  @Prop({ required: true })
  amount: number;

  @Prop({ default: 'BDT' })
  currency: string;

  @Prop({ required: true })
  type: string;

  @Prop({ required: true })
  date: string;

  @Prop({ required: false })
  note?: string;

  @Prop({ required: false })
  paymentMethod?: string;
}

export const FamilyFinanceEntrySchema =
  SchemaFactory.createForClass(FamilyFinanceEntry);
FamilyFinanceEntrySchema.virtual('id').get(function () {
  return this._id;
});

// ---------------------------------------------------------------------------

export type SavingsGoalDocument = SavingsGoal & Document;

@Schema({ timestamps: true, collection: 'savings_goals' })
export class SavingsGoal {
  @Prop({ type: String, default: () => uuidv4() })
  _id: string;

  @Prop({ required: true, index: true })
  familyId: string;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  targetAmount: number;

  @Prop({ default: 0 })
  currentAmount: number;

  @Prop({ default: 'BDT' })
  currency: string;

  @Prop({ required: true })
  targetDate: Date;

  @Prop({ default: false })
  isAchieved: boolean;

  @Prop({ required: false })
  achievedAt?: Date;

  @Prop({ required: false })
  note?: string;
}

export const SavingsGoalSchema = SchemaFactory.createForClass(SavingsGoal);
SavingsGoalSchema.virtual('id').get(function () {
  return this._id;
});

// ---------------------------------------------------------------------------

export type ChildAllowanceDocument = ChildAllowance & Document;

@Schema({ timestamps: true, collection: 'child_allowances' })
export class ChildAllowance {
  @Prop({ type: String, default: () => uuidv4() })
  _id: string;

  @Prop({ required: true, unique: true })
  childId: string;

  @Prop({ required: true })
  weeklyAmount: number;

  @Prop({ default: 0 })
  savingsGoal: number;

  @Prop({ default: 0 })
  savingsBalance: number;

  @Prop({ default: 'BDT' })
  currency: string;
}

export const ChildAllowanceSchema =
  SchemaFactory.createForClass(ChildAllowance);
ChildAllowanceSchema.virtual('id').get(function () {
  return this._id;
});

// ---------------------------------------------------------------------------

export type TuitionRecordDocument = TuitionRecord & Document;

@Schema({ timestamps: true, collection: 'tuition_records' })
export class TuitionRecord {
  @Prop({ type: String, default: () => uuidv4() })
  _id: string;

  @Prop({ required: true, index: true })
  familyId: string;

  @Prop({ required: true })
  childId: string;

  @Prop({ required: true })
  institutionName: string;

  @Prop({ required: true })
  amount: number;

  @Prop({ default: 'BDT' })
  currency: string;

  @Prop({ required: true })
  dueDate: Date;

  @Prop({ required: false })
  paidAt?: Date;

  @Prop({ required: false })
  paymentMethod?: string;

  @Prop({ required: false })
  note?: string;
}

export const TuitionRecordSchema = SchemaFactory.createForClass(TuitionRecord);
TuitionRecordSchema.virtual('id').get(function () {
  return this._id;
});
