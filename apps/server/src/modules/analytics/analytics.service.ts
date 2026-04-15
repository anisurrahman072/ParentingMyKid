/**
 * @module analytics.service.ts
 * @description Family analytics engine — generates weekly reports and trends.
 *
 *              Weekly email reports sent to parents every Sunday via Resend.
 *              Covers: mission completion trends, mood patterns, safety incidents,
 *              growth plan progress, habit consistency, and AI-generated highlights.
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Resend } from 'resend';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);
  private readonly resend: Resend;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.resend = new Resend(this.config.get('RESEND_API_KEY'));
  }

  async getChildAnalytics(childId: string, days = 30) {
    const since = new Date(Date.now() - days * 86400000);

    const [missions, moods, safetyAlerts, habits] = await Promise.all([
      this.prisma.dailyMission.findMany({
        where: { childId, createdAt: { gte: since } },
        orderBy: { date: 'asc' },
      }),
      this.prisma.moodLog.findMany({
        where: { childId, loggedAt: { gte: since } },
        orderBy: { loggedAt: 'asc' },
      }),
      this.prisma.safetyAlert.count({
        where: { childId, createdAt: { gte: since } },
      }),
      this.prisma.habitCompletion.count({
        where: { childId, completedAt: { gte: since } },
      }),
    ]);

    const avgCompletion = missions.length > 0
      ? missions.reduce((sum, m) => sum + (m.completionPct as number ?? 0), 0) / missions.length
      : 0;

    const moodScores = moods.map((m) => m.moodScore).filter(Boolean);
    const avgMood = moodScores.length > 0
      ? moodScores.reduce((a, b) => a + b, 0) / moodScores.length
      : null;

    return {
      period: `Last ${days} days`,
      missionAvgCompletion: Math.round(avgCompletion),
      totalMissionDays: missions.length,
      moodAverage: avgMood ? Math.round(avgMood * 10) / 10 : null,
      totalMoodLogs: moods.length,
      safetyAlertsCount: safetyAlerts,
      habitCompletions: habits,
      completionTrend: missions.slice(-7).map((m) => ({
        date: m.date,
        pct: m.completionPct,
      })),
    };
  }

  /**
   * Weekly report sent every Sunday at 8:00 AM to all active parents.
   * Uses family's subscription plan to determine report depth.
   */
  @Cron('0 8 * * 0') // Every Sunday at 8am
  async sendWeeklyReports() {
    this.logger.log('Starting weekly report generation...');

    const families = await this.prisma.familyGroup.findMany({
      include: {
        members: {
          where: { role: 'PRIMARY' },
          include: { user: true },
        },
        children: {
          where: { wellbeingScore: { not: null } },
        },
      },
    });

    let sent = 0;
    for (const family of families) {
      const primaryParent = family.members[0];
      if (!primaryParent?.user?.email) continue;

      try {
        const report = await this.buildWeeklyReport(family);
        await this.sendWeeklyEmail(primaryParent.user.email, primaryParent.user.name, report);
        sent++;
      } catch (err) {
        this.logger.error(`Failed to send report to family ${family.id}:`, err);
      }
    }

    this.logger.log(`Weekly reports sent: ${sent}/${families.length}`);
  }

  private async buildWeeklyReport(family: any) {
    const children = [];

    for (const child of family.children) {
      const analytics = await this.getChildAnalytics(child.id, 7);
      children.push({
        name: child.name,
        wellbeingScore: child.wellbeingScore,
        ...analytics,
      });
    }

    return {
      familyName: family.name,
      period: 'This Week',
      children,
    };
  }

  private async sendWeeklyEmail(email: string, firstName: string, report: any) {
    const childrenHtml = report.children.map((child: any) => `
      <div style="background:#1A1035;border-radius:12px;padding:20px;margin-bottom:16px;">
        <h3 style="color:#8B5CF6;margin:0 0 12px">${child.name}</h3>
        <p style="color:#fff;margin:4px 0">Wellbeing Score: <strong style="color:#6366F1">${child.wellbeingScore ?? 'N/A'}</strong></p>
        <p style="color:#fff;margin:4px 0">Mission Completion: <strong>${child.missionAvgCompletion}%</strong> average this week</p>
        <p style="color:#fff;margin:4px 0">Safety Alerts: <strong style="color:${child.safetyAlertsCount > 0 ? '#F87171' : '#4ADE80'}">${child.safetyAlertsCount}</strong></p>
        <p style="color:#fff;margin:4px 0">Habits Completed: <strong>${child.habitCompletions}</strong> this week</p>
      </div>
    `).join('');

    await this.resend.emails.send({
      from: 'ParentingMyKid <reports@parentingmykid.com>',
      to: email,
      subject: `📊 ${report.familyName} — Weekly Family Report`,
      html: `
        <div style="font-family:Inter,sans-serif;background:#0F0A1E;padding:32px;max-width:600px;margin:0 auto;border-radius:16px;">
          <h1 style="color:#fff;font-size:24px;margin:0 0 8px">Good morning, ${firstName}! 👋</h1>
          <p style="color:rgba(255,255,255,0.6);margin:0 0 24px">Here's your family's weekly growth summary.</p>
          ${childrenHtml}
          <div style="text-align:center;margin-top:24px;">
            <a href="https://parentingmykid.com/dashboard" style="background:#6366F1;color:#fff;padding:14px 28px;border-radius:10px;text-decoration:none;font-weight:700">
              View Full Report →
            </a>
          </div>
          <p style="color:rgba(255,255,255,0.3);font-size:12px;text-align:center;margin-top:24px;">
            ParentingMyKid • Building better families, one day at a time 💙
          </p>
        </div>
      `,
    });
  }
}
