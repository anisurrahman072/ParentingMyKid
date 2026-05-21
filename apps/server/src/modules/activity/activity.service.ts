/**
 * @module activity.service.ts
 * @description Handles activity logging from child devices — screenshots, URLs, apps, section time.
 */

import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';

@Injectable()
export class ActivityService {
  constructor(private readonly db: DatabaseService) {}

  async logScreenshot(data: {
    activeKidId: string;
    cloudinaryUrl: string;
    claimedKidId?: string;
  }) {
    return this.db.activityLog.create({
      activeKidId: data.activeKidId,
      claimedKidId: data.claimedKidId,
      type: 'SCREENSHOT',
      payload: { cloudinaryUrl: data.cloudinaryUrl },
      screenshotUrl: data.cloudinaryUrl,
    });
  }

  async logUrlVisited(data: {
    activeKidId: string;
    url: string;
    domain: string;
    claimedKidId?: string;
  }) {
    return this.db.activityLog.create({
      activeKidId: data.activeKidId,
      claimedKidId: data.claimedKidId,
      type: 'URL_VISITED',
      payload: { url: data.url, domain: data.domain },
    });
  }

  async logAppOpened(data: {
    activeKidId: string;
    packageName: string;
    appName: string;
    claimedKidId?: string;
  }) {
    return this.db.activityLog.create({
      activeKidId: data.activeKidId,
      claimedKidId: data.claimedKidId,
      type: 'APP_OPENED',
      payload: { packageName: data.packageName, appName: data.appName },
    });
  }

  async logSectionTime(data: {
    childId: string;
    date: string;
    section: string;
    minutes: number;
  }) {
    return this.db.kidSectionTimeLog
      .findOneAndUpdate(
        { childId: data.childId, date: data.date, section: data.section },
        {
          $inc: { minutes: data.minutes },
          $setOnInsert: {
            childId: data.childId,
            date: data.date,
            section: data.section,
          },
        },
        { upsert: true, new: true },
      )
      .lean();
  }

  async logIdentityClaimed(data: { activeKidId: string; claimedKidId: string }) {
    const [log] = await Promise.all([
      this.db.activityLog.create({
        activeKidId: data.activeKidId,
        claimedKidId: data.claimedKidId,
        type: 'IDENTITY_CLAIMED',
        payload: { claimedKidId: data.claimedKidId },
      }),
      // Also bump lastActiveAt on any linked child_devices rows so the legacy
      // device-based pipeline also reflects this Kid Mode session.
      this.db.childDevice.updateMany(
        { childId: data.activeKidId, isActive: true },
        { $set: { lastActiveAt: new Date() } },
      ),
    ]);
    return log;
  }

  async getTodayActivity(childId: string) {
    const today = new Date().toISOString().split('T')[0];

    const [activityLogs, sectionTimeLogs] = await Promise.all([
      this.db.activityLog
        .find({
          activeKidId: childId,
          createdAt: {
            $gte: new Date(`${today}T00:00:00.000Z`),
            $lte: new Date(`${today}T23:59:59.999Z`),
          },
        })
        .sort({ createdAt: -1 })
        .lean(),
      this.db.kidSectionTimeLog.find({ childId, date: today }).lean(),
    ]);

    return { activityLogs, sectionTimeLogs, date: today };
  }
}
