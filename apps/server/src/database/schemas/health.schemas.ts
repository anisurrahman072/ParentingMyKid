import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export type MealLogDocument = MealLog & Document;

@Schema({ timestamps: true, collection: 'meal_logs' })
export class MealLog {
  @Prop({ type: String, default: () => uuidv4() })
  _id: string;

  @Prop({ required: true, index: true })
  childId: string;

  @Prop({ required: true })
  mealType: string;

  @Prop({ type: [Object], required: true })
  foodsJson: unknown[];

  @Prop({ type: Object, required: false })
  macrosJson?: unknown;

  @Prop({ type: Object, required: false })
  vitaminsJson?: unknown;

  @Prop({ default: () => new Date() })
  loggedAt: Date;

  @Prop({ required: true })
  date: string;
}

export const MealLogSchema = SchemaFactory.createForClass(MealLog);
MealLogSchema.virtual('id').get(function () {
  return this._id;
});

// ---------------------------------------------------------------------------

export type HealthRecordDocument = HealthRecord & Document;

@Schema({ timestamps: true, collection: 'health_records' })
export class HealthRecord {
  @Prop({ type: String, default: () => uuidv4() })
  _id: string;

  @Prop({ required: true, index: true })
  childId: string;

  @Prop({ required: true })
  recordType: string;

  @Prop({ required: true })
  value: number;

  @Prop({ required: true })
  unit: string;

  @Prop({ required: false })
  note?: string;

  @Prop({ default: () => new Date() })
  recordedAt: Date;
}

export const HealthRecordSchema = SchemaFactory.createForClass(HealthRecord);
HealthRecordSchema.virtual('id').get(function () {
  return this._id;
});

// ---------------------------------------------------------------------------

export type MedicationReminderDocument = MedicationReminder & Document;

@Schema({ timestamps: true, collection: 'medication_reminders' })
export class MedicationReminder {
  @Prop({ type: String, default: () => uuidv4() })
  _id: string;

  @Prop({ required: true, index: true })
  childId: string;

  @Prop({ required: true })
  medicationName: string;

  @Prop({ required: true })
  dosage: string;

  @Prop({ type: [String], required: true })
  scheduleTimes: string[];

  @Prop({ required: true })
  startDate: Date;

  @Prop({ required: false })
  endDate?: Date;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ required: false })
  note?: string;
}

export const MedicationReminderSchema =
  SchemaFactory.createForClass(MedicationReminder);
MedicationReminderSchema.virtual('id').get(function () {
  return this._id;
});

// ---------------------------------------------------------------------------

export type VaccinationRecordDocument = VaccinationRecord & Document;

@Schema({ timestamps: true, collection: 'vaccination_records' })
export class VaccinationRecord {
  @Prop({ type: String, default: () => uuidv4() })
  _id: string;

  @Prop({ required: true, index: true })
  childId: string;

  @Prop({ required: true })
  vaccineName: string;

  @Prop({ default: 1 })
  doseNumber: number;

  @Prop({ required: true })
  givenAt: Date;

  @Prop({ required: false })
  nextDueAt?: Date;

  @Prop({ required: false })
  givenBy?: string;

  @Prop({ required: false })
  note?: string;
}

export const VaccinationRecordSchema =
  SchemaFactory.createForClass(VaccinationRecord);
VaccinationRecordSchema.virtual('id').get(function () {
  return this._id;
});
