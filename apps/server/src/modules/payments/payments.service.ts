/**
 * @module payments.service.ts
 * @description RevenueCat subscription management.
 *              RevenueCat handles all App Store + Google Play billing complexity.
 *              This service listens to RevenueCat webhooks and syncs subscription
 *              state to our database.
 *
 * @business-rule We use RevenueCat instead of Stripe because:
 *   - Apple and Google REQUIRE their own payment systems for in-app purchases
 *   - Bypassing them = app removal from store
 *   - RevenueCat is FREE up to $2,500/month tracked revenue
 *   - RevenueCat handles: receipt validation, renewal, grace periods, A/B paywalls
 *
 *              RevenueCat Webhook Events we handle:
 *   - INITIAL_PURCHASE: User subscribed
 *   - RENEWAL: Subscription renewed
 *   - CANCELLATION: User cancelled
 *   - EXPIRATION: Subscription expired
 *   - TRIAL_STARTED: 14-day trial started
 *   - TRIAL_CONVERTED: Trial converted to paid
 */

import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DatabaseService } from '../../database/database.service';
import { SubscriptionPlan, SubscriptionStatus } from '@parentingmykid/shared-types';

interface RevenueCatWebhookEvent {
  event: {
    type: string;
    app_user_id: string;
    product_id: string;
    period_type?: string;
    store?: string;
    expiration_at_ms?: number;
    price_in_purchased_currency?: number;
    currency?: string;
  };
}

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly config: ConfigService,
  ) {}

  // ─── RevenueCat Webhook Handler ───────────────────────────────────────────

  /**
   * Processes incoming webhooks from RevenueCat.
   * RevenueCat sends events for all subscription lifecycle changes.
   * We update our database to reflect the current subscription state.
   */
  async handleRevenueCatWebhook(payload: RevenueCatWebhookEvent, signature: string): Promise<void> {
    const expectedSecret = this.config.get<string>('REVENUECAT_WEBHOOK_SECRET');
    if (signature !== expectedSecret) {
      throw new UnauthorizedException('Invalid RevenueCat webhook signature');
    }

    const { event } = payload;
    const userId = event.app_user_id;

    this.logger.log(`RevenueCat webhook: ${event.type} for user ${userId}`);

    const user = await this.db.user.findOne({ _id: userId }).lean();
    if (!user) {
      this.logger.warn(`RevenueCat webhook for unknown user: ${userId}`);
      return;
    }

    const membership = await this.db.familyMember.findOne({ userId, role: 'PRIMARY' }).lean();
    if (!membership) return;

    const familyId = (membership as any).familyId as string;
    const plan = this.productIdToPlan(event.product_id);

    switch (event.type) {
      case 'INITIAL_PURCHASE':
      case 'RENEWAL':
      case 'TRIAL_CONVERTED':
        await this.activateSubscription(familyId, plan, event);
        break;

      case 'TRIAL_STARTED':
        await this.startTrial(familyId, plan, event);
        break;

      case 'CANCELLATION':
        await this.cancelSubscription(familyId, event);
        break;

      case 'EXPIRATION':
        await this.expireSubscription(familyId);
        break;

      default:
        this.logger.log(`Unhandled RevenueCat event type: ${event.type}`);
    }
  }

  // ─── Get Current Subscription ─────────────────────────────────────────────

  async getSubscription(
    familyId: string,
  ): Promise<(Record<string, unknown> & { events: Array<Record<string, unknown>> }) | null> {
    const sub = await this.db.subscription.findOne({ familyId }).lean();
    if (!sub) return null;
    const events = await this.db.subscriptionEvent
      .find({ subscriptionId: (sub as any)._id })
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();
    return {
      ...(sub as unknown as Record<string, unknown>),
      events: events as unknown as Array<Record<string, unknown>>,
    };
  }

  /**
   * Checks if a family has access to a premium feature.
   * Used as a guard before executing premium business logic.
   */
  async hasEntitlement(familyId: string, requiredPlan: SubscriptionPlan): Promise<boolean> {
    const subscription = await this.db.subscription.findOne({ familyId }).lean();
    if (!subscription) return false;

    const isActive = [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIAL].includes(
      (subscription as any).status as SubscriptionStatus,
    );
    if (!isActive) return false;

    const planHierarchy = [SubscriptionPlan.FREE, SubscriptionPlan.STANDARD, SubscriptionPlan.PRO];
    const currentIndex = planHierarchy.indexOf((subscription as any).plan as SubscriptionPlan);
    const requiredIndex = planHierarchy.indexOf(requiredPlan);

    return currentIndex >= requiredIndex;
  }

  // ─── Private Helpers ──────────────────────────────────────────────────────

  private async activateSubscription(
    familyId: string,
    plan: SubscriptionPlan,
    event: RevenueCatWebhookEvent['event'],
  ): Promise<void> {
    const expiresAt = event.expiration_at_ms
      ? new Date(event.expiration_at_ms)
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const subscription = await this.db.subscription
      .findOneAndUpdate(
        { familyId },
        {
          $set: {
            plan,
            status: SubscriptionStatus.ACTIVE,
            platform: event.store?.toLowerCase(),
            expiresAt,
            cancelledAt: null,
          },
          $setOnInsert: { familyId },
        },
        { upsert: true, new: true },
      )
      .lean();

    await this.db.subscriptionEvent.create({
      subscriptionId: (subscription as any)._id,
      eventType: event.type === 'RENEWAL' ? 'RENEWED' : 'SUBSCRIBED',
      plan,
      platform: event.store?.toLowerCase(),
      rawWebhookJson: event,
    });
  }

  private async startTrial(
    familyId: string,
    plan: SubscriptionPlan,
    event: RevenueCatWebhookEvent['event'],
  ): Promise<void> {
    const trialEnd = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

    const subscription = await this.db.subscription
      .findOneAndUpdate(
        { familyId },
        {
          $set: { plan, status: SubscriptionStatus.TRIAL, trialEndsAt: trialEnd },
          $setOnInsert: { familyId },
        },
        { upsert: true, new: true },
      )
      .lean();

    await this.db.subscriptionEvent.create({
      subscriptionId: (subscription as any)._id,
      eventType: 'TRIAL_STARTED',
      plan,
      platform: event.store?.toLowerCase(),
    });
  }

  private async cancelSubscription(
    familyId: string,
    event: RevenueCatWebhookEvent['event'],
  ): Promise<void> {
    const subscription = await this.db.subscription.findOne({ familyId }).lean();
    if (!subscription) return;

    await this.db.subscription.findOneAndUpdate(
      { familyId },
      { $set: { cancelledAt: new Date() } },
    );

    await this.db.subscriptionEvent.create({
      subscriptionId: (subscription as any)._id,
      eventType: 'CANCELLED',
      plan: (subscription as any).plan as SubscriptionPlan,
      platform: event.store?.toLowerCase(),
    });
  }

  private async expireSubscription(familyId: string): Promise<void> {
    const subscription = await this.db.subscription.findOne({ familyId }).lean();
    if (!subscription) return;

    await this.db.subscription.findOneAndUpdate(
      { familyId },
      { $set: { status: SubscriptionStatus.EXPIRED, plan: SubscriptionPlan.FREE } },
    );

    await this.db.subscriptionEvent.create({
      subscriptionId: (subscription as any)._id,
      eventType: 'EXPIRED',
      plan: SubscriptionPlan.FREE,
    });
  }

  /**
   * Maps RevenueCat product IDs to our subscription plan enum.
   * Product IDs must match exactly what is configured in App Store Connect / Google Play Console.
   */
  private productIdToPlan(productId: string): SubscriptionPlan {
    if (productId.includes('pro') || productId.includes('family_pro')) {
      return SubscriptionPlan.PRO;
    }
    if (productId.includes('standard')) {
      return SubscriptionPlan.STANDARD;
    }
    return SubscriptionPlan.FREE;
  }
}
