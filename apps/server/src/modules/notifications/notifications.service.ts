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
import { Cron } from '@nestjs/schedule';
import { DatabaseService } from '../../database/database.service';
import { CacheService } from '../../common/cache/cache.service';
import { NotificationType, PushNotificationPayload } from '@parentingmykid/shared-types';

@Injectable()
export class NotificationsService {
  private readonly expo: Expo;
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly cache: CacheService,
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
    const user = await this.db.user.findById(userId).select('expoPushToken').lean();

    if (!user?.expoPushToken) return;

    const isCritical = [NotificationType.SAFETY_ALERT, NotificationType.SOS].includes(payload.type);

    if (!isCritical && !options?.skipDedup) {
      const dedupKey = `${userId}:${payload.type}`;
      const alreadySent = await this.cache.wasNotificationSent(userId, dedupKey);
      if (alreadySent) return;
      await this.cache.markNotificationSent(userId, dedupKey);
    }

    await this.sendToTokens([user.expoPushToken], payload);
  }

  /**
   * Sends a safety alert to ALL parents in a family.
   * Used for SOS, geofence violations, and CRITICAL content alerts.
   */
  async sendSafetyAlertToFamily(
    familyId: string,
    childId: string,
    payload: PushNotificationPayload,
  ): Promise<void> {
    const members = await this.db.familyMember
      .find({ familyId, role: { $in: ['PRIMARY', 'CO_PARENT'] } })
      .lean();

    if (!members.length) return;

    const userIds = members.map((m) => m.userId);
    const users = await this.db.user
      .find({ _id: { $in: userIds }, expoPushToken: { $exists: true, $ne: null } })
      .select('expoPushToken')
      .lean();

    const tokens = users.map((u) => u.expoPushToken).filter((t): t is string => !!t);
    if (!tokens.length) return;

    await this.sendToTokens(tokens, payload);
    this.logger.warn(`Safety alert sent to ${tokens.length} parents for child ${childId}`);
  }

  // ─── Scheduled Notifications ─────────────────────────────────────────────

  /**
   * Daily mission reminder — sent at 9 AM Bangladesh time (UTC+6 = 03:00 UTC).
   */
  @Cron('0 3 * * *')
  async sendDailyMissionReminders(): Promise<void> {
    this.logger.log('Running daily mission reminder job...');

    const childProfiles = await this.db.childProfile.find({}).limit(1000).lean();
    if (!childProfiles.length) return;

    const userIds = childProfiles.map((c) => c.userId);
    const usersWithToken = await this.db.user
      .find({ _id: { $in: userIds }, expoPushToken: { $exists: true, $ne: null } })
      .select('_id expoPushToken')
      .lean();

    const tokenMap = new Map(
      usersWithToken.map((u) => [String(u._id), u.expoPushToken as string]),
    );

    const today = new Date().toISOString().split('T')[0];

    for (const child of childProfiles) {
      const pushToken = tokenMap.get(child.userId);
      if (!pushToken) continue;

      const todayMission = await this.db.dailyMission
        .findOne({ childId: String(child._id), date: today })
        .lean();

      const completionPct = (todayMission?.completionPct as number) ?? 0;
      if (!todayMission || completionPct < 100) {
        const total = ((todayMission?.missionsJson as { total?: number })?.total ?? 5);
        const remaining = Math.round(((100 - completionPct) / 100) * total);

        await this.sendToTokens([pushToken], {
          type: NotificationType.MISSION_REMINDER,
          title: `Time to complete your missions, ${child.name}! 🌟`,
          body:
            remaining > 0
              ? `You have ${remaining} missions left today. Let's go!`
              : 'Start your missions for today!',
          data: { screen: 'missions' },
          priority: 'default',
        });
      }
    }
  }

  /**
   * Sunday evening weekly report push — triggers the shareable certificate.
   * Runs at 8 PM Bangladesh time (14:00 UTC, Sunday).
   */
  @Cron('0 14 * * 0')
  async sendWeeklyReportNotifications(): Promise<void> {
    this.logger.log('Running weekly report notification job...');

    const parentMemberIds = await this.db.familyMember
      .find({ role: { $in: ['PRIMARY', 'CO_PARENT'] } })
      .distinct('userId');

    const parents = await this.db.user
      .find({
        _id: { $in: parentMemberIds },
        role: 'PARENT',
        expoPushToken: { $exists: true, $ne: null },
      })
      .select('_id expoPushToken name')
      .limit(500)
      .lean();

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

    await this.db.user.findByIdAndUpdate(userId, { expoPushToken });
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
      priority:
        payload.priority === 'max' ? 'high' : (payload.priority as 'default' | 'high' | 'normal'),
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
