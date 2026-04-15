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
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
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
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  // ─── RevenueCat Webhook Handler ───────────────────────────────────────────

  /**
   * Processes incoming webhooks from RevenueCat.
   * RevenueCat sends events for all subscription lifecycle changes.
   * We update our database to reflect the current subscription state.
   */
  async handleRevenueCatWebhook(
    payload: RevenueCatWebhookEvent,
    signature: string,
  ): Promise<void> {
    // Validate webhook signature to ensure it's from RevenueCat
    const expectedSecret = this.config.get<string>('REVENUECAT_WEBHOOK_SECRET');
    if (signature !== expectedSecret) {
      throw new UnauthorizedException('Invalid RevenueCat webhook signature');
    }

    const { event } = payload;
    const userId = event.app_user_id;

    this.logger.log(`RevenueCat webhook: ${event.type} for user ${userId}`);

    // Find the user's family
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      this.logger.warn(`RevenueCat webhook for unknown user: ${userId}`);
      return;
    }

    const membership = await this.prisma.familyMember.findFirst({
      where: { userId, role: 'PRIMARY' },
    });
    if (!membership) return;

    const familyId = membership.familyId;

    // Determine plan from product ID
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

  async getSubscription(familyId: string) {
    return this.prisma.subscription.findUnique({
      where: { familyId },
      include: { events: { orderBy: { createdAt: 'desc' }, take: 5 } },
    });
  }

  /**
   * Checks if a family has access to a premium feature.
   * Used as a guard before executing premium business logic.
   */
  async hasEntitlement(familyId: string, requiredPlan: SubscriptionPlan): Promise<boolean> {
    const subscription = await this.prisma.subscription.findUnique({ where: { familyId } });
    if (!subscription) return false;

    const isActive = [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIAL].includes(
      subscription.status as SubscriptionStatus,
    );
    if (!isActive) return false;

    const planHierarchy = [SubscriptionPlan.FREE, SubscriptionPlan.STANDARD, SubscriptionPlan.PRO];
    const currentIndex = planHierarchy.indexOf(subscription.plan as SubscriptionPlan);
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

    const subscription = await this.prisma.subscription.upsert({
      where: { familyId },
      create: {
        familyId,
        plan,
        status: SubscriptionStatus.ACTIVE,
        platform: event.store?.toLowerCase(),
        expiresAt,
      },
      update: {
        plan,
        status: SubscriptionStatus.ACTIVE,
        platform: event.store?.toLowerCase(),
        expiresAt,
        cancelledAt: null,
      },
    });

    await this.prisma.subscriptionEvent.create({
      data: {
        subscriptionId: subscription.id,
        eventType: event.type === 'RENEWAL' ? 'RENEWED' : 'SUBSCRIBED',
        plan,
        platform: event.store?.toLowerCase(),
        rawWebhookJson: event as unknown as Prisma.InputJsonValue,
      },
    });
  }

  private async startTrial(
    familyId: string,
    plan: SubscriptionPlan,
    event: RevenueCatWebhookEvent['event'],
  ): Promise<void> {
    const trialEnd = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

    const subscription = await this.prisma.subscription.upsert({
      where: { familyId },
      create: {
        familyId,
        plan,
        status: SubscriptionStatus.TRIAL,
        trialEndsAt: trialEnd,
      },
      update: {
        plan,
        status: SubscriptionStatus.TRIAL,
        trialEndsAt: trialEnd,
      },
    });

    await this.prisma.subscriptionEvent.create({
      data: {
        subscriptionId: subscription.id,
        eventType: 'TRIAL_STARTED',
        plan,
        platform: event.store?.toLowerCase(),
      },
    });
  }

  private async cancelSubscription(
    familyId: string,
    event: RevenueCatWebhookEvent['event'],
  ): Promise<void> {
    const subscription = await this.prisma.subscription.findUnique({ where: { familyId } });
    if (!subscription) return;

    await this.prisma.subscription.update({
      where: { familyId },
      data: { cancelledAt: new Date() },
    });

    await this.prisma.subscriptionEvent.create({
      data: {
        subscriptionId: subscription.id,
        eventType: 'CANCELLED',
        plan: subscription.plan as SubscriptionPlan,
        platform: event.store?.toLowerCase(),
      },
    });
  }

  private async expireSubscription(familyId: string): Promise<void> {
    const subscription = await this.prisma.subscription.findUnique({ where: { familyId } });
    if (!subscription) return;

    await this.prisma.subscription.update({
      where: { familyId },
      data: { status: SubscriptionStatus.EXPIRED, plan: SubscriptionPlan.FREE },
    });

    await this.prisma.subscriptionEvent.create({
      data: {
        subscriptionId: subscription.id,
        eventType: 'EXPIRED',
        plan: SubscriptionPlan.FREE,
      },
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
