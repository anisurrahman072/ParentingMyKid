/**
 * @module activity.service.ts
 * @description Handles activity logging from child devices — screenshots, URLs, apps, section time.
 */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class ActivityService {
  constructor(private readonly prisma: PrismaService) {}

  async logScreenshot(data: {
    activeKidId: string;
    cloudinaryUrl: string;
    claimedKidId?: string;
  }) {
    return this.prisma.activityLog.create({
      data: {
        activeKidId: data.activeKidId,
        claimedKidId: data.claimedKidId,
        type: 'SCREENSHOT',
        payload: { cloudinaryUrl: data.cloudinaryUrl },
        screenshotUrl: data.cloudinaryUrl,
      },
    });
  }

  async logUrlVisited(data: {
    activeKidId: string;
    url: string;
    domain: string;
    claimedKidId?: string;
  }) {
    return this.prisma.activityLog.create({
      data: {
        activeKidId: data.activeKidId,
        claimedKidId: data.claimedKidId,
        type: 'URL_VISITED',
        payload: { url: data.url, domain: data.domain },
      },
    });
  }

  async logAppOpened(data: {
    activeKidId: string;
    packageName: string;
    appName: string;
    claimedKidId?: string;
  }) {
    return this.prisma.activityLog.create({
      data: {
        activeKidId: data.activeKidId,
        claimedKidId: data.claimedKidId,
        type: 'APP_OPENED',
        payload: { packageName: data.packageName, appName: data.appName },
      },
    });
  }

  async logSectionTime(data: {
    childId: string;
    date: string;
    section: string;
    minutes: number;
  }) {
    return this.prisma.kidSectionTimeLog.upsert({
      where: {
        childId_date_section: {
          childId: data.childId,
          date: data.date,
          section: data.section,
        },
      },
      create: {
        childId: data.childId,
        date: data.date,
        section: data.section,
        minutes: data.minutes,
      },
      update: {
        minutes: { increment: data.minutes },
      },
    });
  }

  async logIdentityClaimed(data: { activeKidId: string; claimedKidId: string }) {
    return this.prisma.activityLog.create({
      data: {
        activeKidId: data.activeKidId,
        claimedKidId: data.claimedKidId,
        type: 'IDENTITY_CLAIMED',
        payload: { claimedKidId: data.claimedKidId },
      },
    });
  }

  async getTodayActivity(childId: string) {
    const today = new Date().toISOString().split('T')[0];

    const [activityLogs, sectionTimeLogs] = await Promise.all([
      this.prisma.activityLog.findMany({
        where: {
          activeKidId: childId,
          createdAt: {
            gte: new Date(`${today}T00:00:00.000Z`),
            lte: new Date(`${today}T23:59:59.999Z`),
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.kidSectionTimeLog.findMany({
        where: { childId, date: today },
      }),
    ]);

    return { activityLogs, sectionTimeLogs, date: today };
  }
}
