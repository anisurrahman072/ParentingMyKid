import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export type GameDocument = Game & Document;

@Schema({ timestamps: true, collection: 'games' })
export class Game {
  @Prop({ type: String, default: () => uuidv4() })
  _id: string;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  category: string;

  @Prop({ required: true })
  minAge: number;

  @Prop({ required: true })
  maxAge: number;

  @Prop({ required: true })
  description: string;

  @Prop({ required: false })
  iconUrl?: string;

  @Prop({ default: true })
  isActive: boolean;
}

export const GameSchema = SchemaFactory.createForClass(Game);
GameSchema.virtual('id').get(function () {
  return this._id;
});

// ---------------------------------------------------------------------------

export type GameSessionDocument = GameSession & Document;

@Schema({ timestamps: true, collection: 'game_sessions' })
export class GameSession {
  @Prop({ type: String, default: () => uuidv4() })
  _id: string;

  @Prop({ required: true, index: true })
  childId: string;

  @Prop({ required: true })
  gameId: string;

  @Prop({ default: 0 })
  score: number;

  @Prop({ default: 0 })
  durationSeconds: number;

  @Prop({ default: false })
  isPersonalBest: boolean;

  @Prop({ default: () => new Date() })
  startedAt: Date;

  @Prop({ required: false })
  endedAt?: Date;
}

export const GameSessionSchema = SchemaFactory.createForClass(GameSession);
GameSessionSchema.virtual('id').get(function () {
  return this._id;
});

// ---------------------------------------------------------------------------

export type GameAchievementDocument = GameAchievement & Document;

@Schema({ timestamps: true, collection: 'game_achievements' })
export class GameAchievement {
  @Prop({ type: String, default: () => uuidv4() })
  _id: string;

  @Prop({ required: true, index: true })
  childId: string;

  @Prop({ required: true })
  gameId: string;

  @Prop({ required: true })
  achievementType: string;

  @Prop({ default: () => new Date() })
  earnedAt: Date;
}

export const GameAchievementSchema =
  SchemaFactory.createForClass(GameAchievement);
GameAchievementSchema.virtual('id').get(function () {
  return this._id;
});

// ---------------------------------------------------------------------------

export type FamilyQuizBattleDocument = FamilyQuizBattle & Document;

@Schema({ timestamps: true, collection: 'family_quiz_battles' })
export class FamilyQuizBattle {
  @Prop({ type: String, default: () => uuidv4() })
  _id: string;

  @Prop({ required: true, index: true })
  familyId: string;

  @Prop({ required: true })
  initiatorChildId: string;

  @Prop({ required: true })
  opponentId: string;

  @Prop({ required: true })
  opponentType: string;

  @Prop({ required: true })
  subject: string;

  @Prop({ type: [Object], required: true })
  questionsJson: unknown[];

  @Prop({ type: Object, required: false })
  resultsJson?: Record<string, unknown>;

  @Prop({ default: 'PENDING' })
  status: string;

  @Prop({ default: () => new Date() })
  startedAt: Date;

  @Prop({ required: false })
  completedAt?: Date;
}

export const FamilyQuizBattleSchema =
  SchemaFactory.createForClass(FamilyQuizBattle);
FamilyQuizBattleSchema.virtual('id').get(function () {
  return this._id;
});
