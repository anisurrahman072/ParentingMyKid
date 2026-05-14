import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export type StudySessionDocument = StudySession & Document;

@Schema({ timestamps: true, collection: 'study_sessions' })
export class StudySession {
  @Prop({ type: String, default: () => uuidv4() })
  _id: string;

  @Prop({ required: true, index: true })
  childId: string;

  @Prop({ required: true })
  subject: string;

  @Prop({ required: true })
  durationMinutes: number;

  @Prop({ required: true })
  sessionType: string;

  @Prop({ default: 0 })
  aiPrompts: number;

  @Prop({ default: () => new Date() })
  startedAt: Date;

  @Prop({ required: false })
  endedAt?: Date;
}

export const StudySessionSchema = SchemaFactory.createForClass(StudySession);
StudySessionSchema.virtual('id').get(function () {
  return this._id;
});

// ---------------------------------------------------------------------------

export type PracticeQuestionDocument = PracticeQuestion & Document;

@Schema({ timestamps: true, collection: 'practice_questions' })
export class PracticeQuestion {
  @Prop({ type: String, default: () => uuidv4() })
  _id: string;

  @Prop({ required: true, index: true })
  childId: string;

  @Prop({ required: true })
  subject: string;

  @Prop({ required: true })
  difficulty: string;

  @Prop({ required: true })
  questionText: string;

  @Prop({ default: 'MCQ' })
  questionType: string;

  @Prop({ type: [Object], required: false })
  optionsJson?: unknown[];

  @Prop({ required: true })
  correctAnswer: string;

  @Prop({ required: false })
  childAnswer?: string;

  @Prop({ required: false })
  isCorrect?: boolean;

  @Prop({ required: false })
  explanation?: string;

  @Prop({ required: false })
  attemptedAt?: Date;
}

export const PracticeQuestionSchema =
  SchemaFactory.createForClass(PracticeQuestion);
PracticeQuestionSchema.virtual('id').get(function () {
  return this._id;
});

// ---------------------------------------------------------------------------

export type ReadingLogDocument = ReadingLog & Document;

@Schema({ timestamps: true, collection: 'reading_logs' })
export class ReadingLog {
  @Prop({ type: String, default: () => uuidv4() })
  _id: string;

  @Prop({ required: true, index: true })
  childId: string;

  @Prop({ required: true })
  bookTitle: string;

  @Prop({ required: false })
  author?: string;

  @Prop({ required: true })
  pagesRead: number;

  @Prop({ required: false })
  totalPages?: number;

  @Prop({ required: false })
  notes?: string;

  @Prop({ default: () => new Date() })
  loggedAt: Date;
}

export const ReadingLogSchema = SchemaFactory.createForClass(ReadingLog);
ReadingLogSchema.virtual('id').get(function () {
  return this._id;
});

// ---------------------------------------------------------------------------

export type FlashcardSetDocument = FlashcardSet & Document;

@Schema({ timestamps: true, collection: 'flashcard_sets' })
export class FlashcardSet {
  @Prop({ type: String, default: () => uuidv4() })
  _id: string;

  @Prop({ required: true, index: true })
  childId: string;

  @Prop({ required: true })
  topic: string;

  @Prop({ type: [Object], required: true })
  cardsJson: unknown[];

  @Prop({ required: false })
  nextReviewAt?: Date;
}

export const FlashcardSetSchema = SchemaFactory.createForClass(FlashcardSet);
FlashcardSetSchema.virtual('id').get(function () {
  return this._id;
});
