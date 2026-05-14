import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export type AiGrowthPlanDocument = AiGrowthPlan & Document;

@Schema({ timestamps: true, collection: 'ai_growth_plans' })
export class AiGrowthPlan {
  @Prop({ type: String, default: () => uuidv4() })
  _id: string;

  @Prop({ required: true, index: true })
  childId: string;

  @Prop({ required: true })
  weekStart: string;

  @Prop({ type: [Object], required: true })
  focusAreasJson: unknown[];

  @Prop({ type: Object, required: true })
  predictedImprovements: Record<string, unknown>;

  @Prop({ required: true })
  confidence: number;

  @Prop({ default: false })
  parentApproved: boolean;

  @Prop({ default: false })
  parentModified: boolean;

  @Prop({ default: () => new Date() })
  generatedAt: Date;
}

export const AiGrowthPlanSchema = SchemaFactory.createForClass(AiGrowthPlan);
AiGrowthPlanSchema.virtual('id').get(function () {
  return this._id;
});

// ---------------------------------------------------------------------------

export type AiRecommendationDocument = AiRecommendation & Document;

@Schema({ timestamps: true, collection: 'ai_recommendations' })
export class AiRecommendation {
  @Prop({ type: String, default: () => uuidv4() })
  _id: string;

  @Prop({ required: true, index: true })
  childId: string;

  @Prop({ required: true })
  parentId: string;

  @Prop({ required: true })
  category: string;

  @Prop({ required: true })
  recommendationText: string;

  @Prop({ type: [Object], required: false })
  actionStepsJson?: unknown[];

  @Prop({ default: false })
  isRead: boolean;

  @Prop({ default: false })
  isDismissed: boolean;
}

export const AiRecommendationSchema =
  SchemaFactory.createForClass(AiRecommendation);
AiRecommendationSchema.virtual('id').get(function () {
  return this._id;
});

// ---------------------------------------------------------------------------

export type AiCoachSessionDocument = AiCoachSession & Document;

@Schema({ timestamps: true, collection: 'ai_coach_sessions' })
export class AiCoachSession {
  @Prop({ type: String, default: () => uuidv4() })
  _id: string;

  @Prop({ required: true, index: true })
  parentId: string;

  @Prop({ required: true })
  childId: string;

  @Prop({ required: true })
  situation: string;

  @Prop({ required: true })
  category: string;

  @Prop({ required: true })
  immediateScript: string;

  @Prop({ type: [Object], required: true })
  immediateSteps: unknown[];

  @Prop({ type: [String], required: false })
  doNotSay?: string[];

  @Prop({ required: true })
  longerTermStrategy: string;

  @Prop({ required: false })
  isHelpful?: boolean;
}

export const AiCoachSessionSchema =
  SchemaFactory.createForClass(AiCoachSession);
AiCoachSessionSchema.virtual('id').get(function () {
  return this._id;
});
