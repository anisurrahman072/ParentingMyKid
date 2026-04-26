/**
 * @module children.service.ts
 * @description Business logic for child profile management, baseline assessment,
 *              and family dashboard data aggregation.
 *
 * @business-rule Children are the core users that keep parents subscribed.
 *               Every child profile has: XP/level, streaks, wellbeing score,
 *               and a growth plan. Parent dashboard aggregates all children at once.
 */

import { Injectable, ForbiddenException, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../../database/prisma.service';
import { CreateChildDto, SubmitBaselineDto } from './dto/create-child.dto';
import {
  UserRole,
  ChildProfile,
  FamilyDashboard,
  ChildDashboardCard,
  PairedDeviceSummary,
} from '@parentingmykid/shared-types';

@Injectable()
export class ChildrenService {
  private readonly logger = new Logger(ChildrenService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ─── Create Child Profile ────────────────────────────────────────────────

  /**
   * Creates a new child profile linked to the parent's family.
   * Also creates a User record for the child (used for PIN login).
   * Checks subscription plan limits (FREE = 1 child, STANDARD = 3, PRO = unlimited).
   */
  async createChild(parentId: string, dto: CreateChildDto): Promise<ChildProfile> {
    // Get parent's family (use first family if not specified)
    const memberships = await this.prisma.familyMember.findMany({
      where: { userId: parentId, role: { in: ['PRIMARY', 'CO_PARENT'] } },
      include: { family: { include: { subscription: true, children: true } } },
    });

    if (memberships.length === 0) {
      throw new BadRequestException('No family group found. Please create a family first.');
    }

    const membership = dto.familyId
      ? memberships.find((m) => m.familyId === dto.familyId)
      : memberships[0];

    if (!membership) {
      throw new ForbiddenException('Access to this family denied');
    }

    const { family } = membership;

    // Enforce subscription child limits
    const childCount = family.children.length;
    const plan = family.subscription?.plan ?? 'FREE';

    if (plan === 'FREE' && childCount >= 1) {
      throw new ForbiddenException(
        'Free plan allows 1 child profile. Upgrade to Standard for up to 3, or Pro for unlimited.',
      );
    }
    if (plan === 'STANDARD' && childCount >= 3) {
      throw new ForbiddenException(
        'Standard plan allows up to 3 child profiles. Upgrade to Family Pro for unlimited children.',
      );
    }

    // Create the child's User account (for PIN login)
    const childUser = await this.prisma.user.create({
      data: {
        email: `child-${uuidv4()}@internal.parentingmykid.com`, // Internal email, never used for login
        passwordHash: await bcrypt.hash(uuidv4(), 10), // Random password — child uses PIN not password
        name: dto.name,
        role: UserRole.CHILD,
        parentalConsentGiven: true, // Parent gave consent on registration
        parentalConsentAt: new Date(),
        parentalConsentVersion: '1.0',
      },
    });

    const pinHash = dto.initialPin ? await bcrypt.hash(dto.initialPin, 12) : null;

    const child = await this.prisma.childProfile.create({
      data: {
        userId: childUser.id,
        familyId: family.id,
        parentId,
        name: dto.name,
        nickname: dto.nickname,
        dob: new Date(dto.dob),
        grade: dto.grade,
        school: dto.school,
        languagePreference: dto.languagePreference ?? 'en',
        allergies: dto.allergies ?? [],
        foodPreferences: dto.foodPreferences ?? [],
        favoriteActivities: dto.favoriteActivities ?? [],
        islamicModuleEnabled: dto.islamicModuleEnabled ?? family.islamicModuleEnabled,
        pinHash,
      },
    });

    // Initialize screen time controls with safe defaults
    await this.prisma.screenTimeControls.create({
      data: { childId: child.id },
    });

    this.logger.log(`Child profile created: ${child.name} (id: ${child.id})`);

    return this.mapChildToDto(child);
  }

  // ─── Get Child Profile ────────────────────────────────────────────────────

  async getChildProfile(requesterId: string, childId: string): Promise<ChildProfile> {
    const child = await this.assertChildAccess(requesterId, childId);
    return this.mapChildToDto(child);
  }

  // ─── Family Dashboard ─────────────────────────────────────────────────────

  /**
   * Returns the complete family dashboard for the parent app's home screen.
   * Called once on app load — aggregates all children's status in one query.
   */
  async getFamilyDashboard(parentId: string, familyId: string): Promise<FamilyDashboard> {
    const membership = await this.prisma.familyMember.findUnique({
      where: { familyId_userId: { familyId, userId: parentId } },
      include: {
        family: {
          include: {
            children: {
              include: {
                moodLogs: { orderBy: { loggedAt: 'desc' }, take: 1 },
                safetyAlerts: { where: { isRead: false } },
                dailyMissions: {
                  where: { date: new Date().toISOString().split('T')[0] },
                  take: 1,
                },
                devices: { where: { isActive: true } },
              },
            },
            calendarEvents: {
              where: { startAt: { gte: new Date() } },
              orderBy: { startAt: 'asc' },
              take: 5,
            },
          },
        },
      },
    });

    if (!membership) {
      throw new ForbiddenException('Access to this family denied');
    }

    const { family } = membership;
    const childIds = family.children.map((c) => c.id);
    const today = new Date().toISOString().split('T')[0];

    const usageByChildId = new Map<string, number>();
    if (childIds.length > 0) {
      const usageGroups = await this.prisma.screenUsageLog.groupBy({
        by: ['childId'],
        where: { childId: { in: childIds }, date: today },
        _sum: { durationSeconds: true },
      });
      for (const row of usageGroups) {
        usageByChildId.set(row.childId, row._sum.durationSeconds ?? 0);
      }
    }

    const childCards: ChildDashboardCard[] = family.children.map((child) => {
      const todayMissions = child.dailyMissions[0];
      const latestMood = child.moodLogs[0];
      const devices = child.devices;
      const linked = devices.length;
      const seenSeconds = usageByChildId.get(child.id) ?? 0;
      const hasScreenUsageToday = seenSeconds > 0;

      const lastDeviceMs = devices
        .map((d) => (d.lastActiveAt ? d.lastActiveAt.getTime() : 0))
        .reduce((a, b) => Math.max(a, b), 0);
      const lastDeviceActivityAt =
        lastDeviceMs > 0 ? new Date(lastDeviceMs).toISOString() : undefined;

      return {
        childId: child.id,
        name: child.name,
        avatarUrl: child.avatarUrl ?? undefined,
        todayMissionsTotal: todayMissions
          ? (todayMissions.missionsJson as { total: number }).total ?? 0
          : 0,
        todayMissionsCompleted: Math.round(
          ((todayMissions?.completionPct ?? 0) / 100) *
            ((todayMissions?.missionsJson as { total: number })?.total ?? 0),
        ),
        currentMood: latestMood?.moodScore ?? undefined,
        currentStreak: child.currentStreak,
        wellbeingScore: child.wellbeingScore ?? undefined,
        activeAlerts: child.safetyAlerts.length,
        linkedDeviceCount: linked,
        hasScreenUsageToday,
        lastDeviceActivityAt,
      };
    });

    const pairedDevices: PairedDeviceSummary[] = family.children.flatMap((child) =>
      child.devices.map((d) => ({
        id: d.id,
        childId: child.id,
        childName: child.name,
        deviceName: d.deviceName,
        platform: d.platform,
        lastActiveAt: d.lastActiveAt?.toISOString() ?? null,
      })),
    );

    return {
      familyId: family.id,
      familyName: family.name,
      children: childCards,
      urgentAlerts: [],
      upcomingEvents: family.calendarEvents.map((e) => ({
        id: e.id,
        familyId: e.familyId,
        title: e.title,
        type: e.type,
        startAt: e.startAt.toISOString(),
        endAt: e.endAt?.toISOString(),
        childId: e.childId ?? undefined,
      })),
      weeklyHighlights: [],
      pairedDevices,
    };
  }

  // ─── Baseline Assessment ──────────────────────────────────────────────────

  /**
   * Processes the 10-minute baseline assessment submission.
   * Scores answers across 8 dimensions, generates the Baseline Report via AI,
   * and triggers the 14-day premium trial.
   *
   * This is THE most important first-run experience — it converts free users to trial.
   */
  async submitBaseline(
    parentId: string,
    childId: string,
    dto: SubmitBaselineDto,
  ): Promise<{ scores: Record<string, number>; reportSummary: string }> {
    await this.assertChildAccess(parentId, childId);

    // Score the answers across 8 dimensions
    const scores = this.scoreBaselineAnswers(dto.answers);

    // Save the assessment
    const answersJson = dto.answers as unknown as Prisma.InputJsonValue;

    await this.prisma.baselineAssessment.upsert({
      where: { childId },
      create: {
        childId,
        answers: answersJson,
        scores,
        report: { scores, summary: this.generateReportSummary(scores) },
      },
      update: {
        answers: answersJson,
        scores,
        report: { scores, summary: this.generateReportSummary(scores) },
        completedAt: new Date(),
      },
    });

    // Mark baseline as completed on child profile
    await this.prisma.childProfile.update({
      where: { id: childId },
      data: { baselineCompletedAt: new Date(), baselineScores: scores },
    });

    return { scores, reportSummary: this.generateReportSummary(scores) };
  }

  // ─── Private Helpers ──────────────────────────────────────────────────────

  private async assertChildAccess(requesterId: string, childId: string) {
    const child = await this.prisma.childProfile.findUnique({
      where: { id: childId },
    });

    if (!child) throw new NotFoundException('Child profile not found');

    // Check: is requester the parent, co-parent, or the child themselves?
    const isParent = await this.prisma.familyMember.findFirst({
      where: { familyId: child.familyId, userId: requesterId },
    });

    const isChild = child.userId === requesterId;

    if (!isParent && !isChild) {
      throw new ForbiddenException('Access to this child profile denied');
    }

    return child;
  }

  /**
   * Scores baseline assessment answers across 8 growth dimensions.
   * Returns normalized scores 0-100 per dimension.
   */
  private scoreBaselineAnswers(
    answers: Array<{ questionId: string; answer: unknown }>,
  ): Record<string, number> {
    // Simplified scoring — production version uses AI to analyze answers
    const dimensions = ['reading', 'math', 'physical', 'emotional', 'habit', 'social', 'sleep', 'islamic'];
    const scores: Record<string, number> = {};
    dimensions.forEach((d) => {
      scores[d] = 50; // Default baseline
    });

    // Map question IDs to dimensions and score accordingly
    answers.forEach((a) => {
      const qId = a.questionId;
      if (qId.startsWith('reading_')) scores.reading = this.normalizeScore(a.answer);
      else if (qId.startsWith('math_')) scores.math = this.normalizeScore(a.answer);
      else if (qId.startsWith('physical_')) scores.physical = this.normalizeScore(a.answer);
      else if (qId.startsWith('emotional_')) scores.emotional = this.normalizeScore(a.answer);
      else if (qId.startsWith('habit_')) scores.habit = this.normalizeScore(a.answer);
      else if (qId.startsWith('social_')) scores.social = this.normalizeScore(a.answer);
      else if (qId.startsWith('sleep_')) scores.sleep = this.normalizeScore(a.answer);
      else if (qId.startsWith('islamic_')) scores.islamic = this.normalizeScore(a.answer);
    });

    return scores;
  }

  private normalizeScore(answer: unknown): number {
    if (typeof answer === 'number') return Math.min(100, Math.max(0, answer * 20));
    if (typeof answer === 'boolean') return answer ? 70 : 30;
    return 50;
  }

  private generateReportSummary(scores: Record<string, number>): string {
    const weakest = Object.entries(scores)
      .sort(([, a], [, b]) => a - b)
      .slice(0, 2)
      .map(([dim]) => dim);

    const strongest = Object.entries(scores)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 1)
      .map(([dim]) => dim);

    return (
      `Your child shows strength in ${strongest.join(' and ')}. ` +
      `Key growth areas for the next 4 weeks: ${weakest.join(' and ')}. ` +
      `Your personalized growth plan has been created!`
    );
  }

  private mapChildToDto(child: {
    id: string;
    name: string;
    nickname?: string | null;
    avatarUrl?: string | null;
    dob: Date;
    grade: string;
    school?: string | null;
    languagePreference: string;
    allergies: string[];
    foodPreferences: string[];
    favoriteActivities: string[];
    islamicModuleEnabled: boolean;
    wellbeingScore?: number | null;
    currentStreak: number;
    totalPoints: number;
    level: number;
    xp: number;
    createdAt: Date;
  }): ChildProfile {
    const dob = new Date(child.dob);
    const age = new Date().getFullYear() - dob.getFullYear();

    return {
      id: child.id,
      name: child.name,
      nickname: child.nickname ?? undefined,
      avatarUrl: child.avatarUrl ?? undefined,
      age,
      grade: child.grade,
      dob: child.dob.toISOString(),
      school: child.school ?? undefined,
      languagePreference: child.languagePreference as 'en' | 'bn' | 'ar',
      allergies: child.allergies,
      foodPreferences: child.foodPreferences,
      favoriteActivities: child.favoriteActivities,
      islamicModuleEnabled: child.islamicModuleEnabled,
      wellbeingScore: child.wellbeingScore ?? undefined,
      currentStreak: child.currentStreak,
      totalPoints: child.totalPoints,
      level: child.level,
      xp: child.xp,
    };
  }
}
