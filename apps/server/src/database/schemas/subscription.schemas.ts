import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export type SubscriptionDocument = Subscription & Document;

@Schema({ timestamps: true, collection: 'subscriptions' })
export class Subscription {
  @Prop({ type: String, default: () => uuidv4() })
  _id: string;

  @Prop({ required: true, unique: true })
  familyId: string;

  @Prop({ default: 'FREE' })
  plan: string;

  @Prop({ default: 'TRIAL' })
  status: string;

  @Prop({ required: false })
  revenuecatCustomerId?: string;

  @Prop({ required: false })
  entitlementIdentifier?: string;

  @Prop({ required: false })
  platform?: string;

  @Prop({ required: false })
  expiresAt?: Date;

  @Prop({ required: false })
  trialEndsAt?: Date;

  @Prop({ required: false })
  cancelledAt?: Date;
}

export const SubscriptionSchema = SchemaFactory.createForClass(Subscription);
SubscriptionSchema.virtual('id').get(function () {
  return this._id;
});

// ---------------------------------------------------------------------------

export type SubscriptionEventDocument = SubscriptionEvent & Document;

@Schema({ timestamps: true, collection: 'subscription_events' })
export class SubscriptionEvent {
  @Prop({ type: String, default: () => uuidv4() })
  _id: string;

  @Prop({ required: true, index: true })
  subscriptionId: string;

  @Prop({ required: true })
  eventType: string;

  @Prop({ required: true })
  plan: string;

  @Prop({ required: false })
  platform?: string;

  @Prop({ type: Object, required: false })
  rawWebhookJson?: Record<string, unknown>;
}

export const SubscriptionEventSchema =
  SchemaFactory.createForClass(SubscriptionEvent);
SubscriptionEventSchema.virtual('id').get(function () {
  return this._id;
});
