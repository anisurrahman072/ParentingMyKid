/**
 * @module notifications.service.ts
 * @description Push notification delivery via Expo Push Notification Service.
 *              Expo Push wraps both FCM (Android) and APNs (iOS) automatically —
 *              no separate FCM server key or Apple certificates needed in code.
 *
 *              Notification Priority Levels:
 *              - SAFETY_ALERT: immediate, all channels, bypass quiet hours
 *              - SOS: immediate, all channels + SMS to emergency contacts
 *              - Mission reminder / growth alerts: respect quiet hours (22:00-08:00)
 *              - Daily tips: only when parent is historically active (smart timing)
 *
 * @business-rule Notifications are the product's retention engine.
 *               Too many → parent disables them → churn.
 *               Too few → parent forgets app exists → churn.
 *               The Smart Notification Engine (AI Module 8) learns optimal timing.
 */

import { Injectable, Logger } from '@nestjs/common';
import { Expo, ExpoPushMessage } from 'expo-server-sdk';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../database/prisma.service';
import { RedisService } from '../../common/redis/redis.service';
import { NotificationType, PushNotificationPayload } from '@parentingmykid/shared-types';

@Injectable()
export class NotificationsService {
  private readonly expo: Expo;
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {
    this.expo = new Expo({ useFcmV1: true });
  }

  // ─── Send Push to a User ─────────────────────────────────────────────────

  /**
   * Sends a push notification to all active devices registered to a user.
   * SAFETY_ALERT and SOS notifications bypass all throttling.
   */
  async sendToUser(
    userId: string,
    payload: PushNotificationPayload,
    options?: { skipDedup?: boolean },
  ): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { expoPushToken: true, id: true },
    });

    if (!user?.expoPushToken) return;

    // Skip deduplication for safety-critical notifications
    const isCritical = [NotificationType.SAFETY_ALERT, NotificationType.SOS].includes(payload.type);

    if (!isCritical && !options?.skipDedup) {
      // Check if same notification type was sent recently (dedup window: 1 hour)
      const dedupKey = `${userId}:${payload.type}`;
      const alreadySent = await this.redis.wasNotificationSent(userId, dedupKey);
      if (alreadySent) return;
      await this.redis.markNotificationSent(userId, dedupKey);
    }

    await this.sendToTokens([user.expoPushToken], payload);
  }

  /**
   * Sends a safety alert to ALL parents in a family.
   * Used for SOS, geofence violations, and CRITICAL content alerts.
   */
  async sendSafetyAlertToFamily(familyId: string, childId: string, payload: PushNotificationPayload): Promise<void> {
    const family = await this.prisma.familyGroup.findUnique({
      where: { id: familyId },
      include: {
        members: {
          where: { role: { in: ['PRIMARY', 'CO_PARENT'] } },
          include: { user: { select: { expoPushToken: true } } },
        },
      },
    });

    if (!family) return;

    const tokens = family.members
      .map((m) => m.user.expoPushToken)
      .filter((t): t is string => t !== null);

    await this.sendToTokens(tokens, payload);

    // Log alert as read=false for each parent
    this.logger.warn(`Safety alert sent to ${tokens.length} parents for child ${childId}`);
  }

  // ─── Scheduled Notifications ─────────────────────────────────────────────

  /**
   * Daily mission reminder — sent at 9 AM for each family's timezone.
   * Simplified: sends to all users at 9 AM server time (UTC+6 for Bangladesh).
   */
  @Cron('0 3 * * *') // 9 AM Bangladesh time (UTC+6 = 03:00 UTC)
  async sendDailyMissionReminders(): Promise<void> {
    this.logger.log('Running daily mission reminder job...');

    const activeChildren = await this.prisma.childProfile.findMany({
      where: { user: { expoPushToken: { not: null } } },
      include: { user: { select: { expoPushToken: true } }, family: true },
      take: 1000,
    });

    const today = new Date().toISOString().split('T')[0];

    for (const child of activeChildren) {
      const todayMissions = await this.prisma.dailyMission.findFirst({
        where: { childId: child.id, date: today },
      });

      if (!todayMissions || todayMissions.completionPct < 100) {
        const remaining = Math.round(
          ((100 - (todayMissions?.completionPct ?? 0)) / 100) *
            ((todayMissions?.missionsJson as { total?: number })?.total ?? 5),
        );

        if (child.user.expoPushToken) {
          await this.sendToTokens([child.user.expoPushToken], {
            type: NotificationType.MISSION_REMINDER,
            title: `Time to complete your missions, ${child.name}! 🌟`,
            body: remaining > 0 ? `You have ${remaining} missions left today. Let's go!` : 'Start your missions for today!',
            data: { screen: 'missions' },
            priority: 'default',
          });
        }
      }
    }
  }

  /**
   * Sunday evening weekly report push — triggers the shareable certificate.
   */
  @Cron('0 14 * * 0') // Sunday 8 PM Bangladesh (14:00 UTC)
  async sendWeeklyReportNotifications(): Promise<void> {
    this.logger.log('Running weekly report notification job...');

    const parents = await this.prisma.user.findMany({
      where: {
        role: 'PARENT',
        expoPushToken: { not: null },
        familyMemberships: { some: { role: { in: ['PRIMARY', 'CO_PARENT'] } } },
      },
      select: { id: true, expoPushToken: true, name: true },
      take: 500,
    });

    for (const parent of parents) {
      if (parent.expoPushToken) {
        await this.sendToTokens([parent.expoPushToken], {
          type: NotificationType.WEEKLY_REPORT,
          title: '📊 Your weekly family progress report is ready!',
          body: 'See how your children grew this week. Tap to view and share their certificates.',
          data: { screen: 'reports' },
          priority: 'default',
        });
      }
    }
  }

  // ─── Register Push Token ──────────────────────────────────────────────────

  async registerPushToken(userId: string, expoPushToken: string): Promise<void> {
    if (!Expo.isExpoPushToken(expoPushToken)) {
      this.logger.warn(`Invalid Expo push token for user ${userId}: ${expoPushToken}`);
      return;
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { expoPushToken },
    });
  }

  // ─── Internal Delivery ───────────────────────────────────────────────────

  private async sendToTokens(tokens: string[], payload: PushNotificationPayload): Promise<void> {
    const validTokens = tokens.filter((t) => Expo.isExpoPushToken(t));
    if (validTokens.length === 0) return;

    const messages: ExpoPushMessage[] = validTokens.map((pushToken) => ({
      to: pushToken,
      title: payload.title,
      body: payload.body,
      data: payload.data,
      sound: 'default',
      priority: payload.priority === 'max' ? 'high' : (payload.priority as 'default' | 'high' | 'normal'),
      channelId: payload.channelId ?? 'default',
    }));

    const chunks = this.expo.chunkPushNotifications(messages);

    for (const chunk of chunks) {
      try {
        const tickets = await this.expo.sendPushNotificationsAsync(chunk);
        const errors = tickets.filter((t) => t.status === 'error');
        if (errors.length > 0) {
          this.logger.warn(`${errors.length} push notification delivery errors`);
        }
      } catch (error) {
        this.logger.error('Push notification delivery failed:', error);
      }
    }
  }
}
