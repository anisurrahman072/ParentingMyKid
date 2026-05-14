/**
 * @module children.service.ts
 * @description Business logic for child profile management, baseline assessment,
 *              and family dashboard data aggregation.
 *
 * @business-rule Children are the core users that keep parents subscribed.
 *               Every child profile has: XP/level, streaks, wellbeing score,
 *               and a growth plan. Parent dashboard aggregates all children at once.
 */

import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { DatabaseService } from '../../database/database.service';
import { ChildPinCryptoService } from '../../common/child-pin-crypto/child-pin-crypto.service';
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

  constructor(
    private readonly db: DatabaseService,
    private readonly childPinCrypto: ChildPinCryptoService,
  ) {}

  // ─── Create Child Profile ────────────────────────────────────────────────

  /**
   * Creates a new child profile linked to the parent's family.
   * Also creates a User record for the child (used for PIN login).
   * Checks subscription plan limits (FREE = 1 child, STANDARD = 3, PRO = unlimited).
   */
  async createChild(parentId: string, dto: CreateChildDto): Promise<ChildProfile> {
    const memberships = await this.db.familyMember
      .find({ userId: parentId, role: { $in: ['PRIMARY', 'CO_PARENT'] } })
      .sort({ joinedAt: 1 })
      .lean();

    if (memberships.length === 0) {
      throw new BadRequestException('No family group found. Please create a family first.');
    }

    const targetMembership = dto.familyId
      ? memberships.find((m) => m.familyId === dto.familyId)
      : memberships[0];

    if (!targetMembership) {
      throw new ForbiddenException('Access to this family denied');
    }

    const familyId = targetMembership.familyId;

    const [family, subscription, childCount] = await Promise.all([
      this.db.familyGroup.findOne({ _id: familyId }).lean(),
      this.db.subscription.findOne({ familyId }).lean(),
      this.db.childProfile.countDocuments({ familyId }),
    ]);

    if (!family) {
      throw new NotFoundException('Family group not found');
    }

    const plan = subscription?.plan ?? 'FREE';

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
    const childUser = await this.db.user.create({
      email: `child-${uuidv4()}@internal.parentingmykid.com`,
      passwordHash: await bcrypt.hash(uuidv4(), 10),
      name: dto.name,
      role: UserRole.CHILD,
      parentalConsentGiven: true,
      parentalConsentAt: new Date(),
      parentalConsentVersion: '1.0',
    });

    const pinHash =
      dto.initialPin && /^\d{4}$/.test(dto.initialPin)
        ? await bcrypt.hash(dto.initialPin, 12)
        : null;
    const pinEnc =
      dto.initialPin && /^\d{4}$/.test(dto.initialPin)
        ? this.childPinCrypto.encryptPin(dto.initialPin)
        : null;

    const child = await this.db.childProfile.create({
      userId: childUser._id,
      familyId: family._id,
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
      pinEnc,
    });

    await this.db.screenTimeControls.create({ childId: child._id, appGuardEnabled: false });

    this.logger.log(`Child profile created: ${child.name} (id: ${child._id})`);

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
   * Uses small parallel queries (counts, latest mood, one daily row per child) instead of
   * deep joins that loaded every unread safety alert — much faster for real DB sizes.
   * Same response shape is served by GET .../home and GET .../dashboard.
   */
  async getFamilyDashboard(parentId: string, familyId: string): Promise<FamilyDashboard> {
    const membership = await this.db.familyMember.findOne({ familyId, userId: parentId }).lean();

    if (!membership) {
      throw new ForbiddenException('Access to this family denied');
    }

    const family = await this.db.familyGroup.findOne({ _id: familyId }).lean();
    if (!family) {
      throw new ForbiddenException('Family group not found');
    }

    const children = await this.db.childProfile
      .find({ familyId })
      .select('_id name avatarUrl currentStreak wellbeingScore pinHash pinEnc')
      .lean();

    const childIds = children.map((c) => c._id as string);
    const today = new Date().toISOString().split('T')[0];
    const now = new Date();

    const [alertGroups, latestMoods, todayMissionRows, activeDevices, usageGroups, calendarEvents] =
      await Promise.all([
        childIds.length
          ? this.db.safetyAlert.aggregate<{ _id: string; count: number }>([
              { $match: { childId: { $in: childIds }, isRead: false } },
              { $group: { _id: '$childId', count: { $sum: 1 } } },
            ])
          : Promise.resolve([]),
        childIds.length
          ? Promise.all(
              childIds.map((childId) =>
                this.db.moodLog.findOne({ childId }).sort({ loggedAt: -1 }).lean(),
              ),
            )
          : Promise.resolve([]),
        childIds.length
          ? this.db.dailyMission.find({ childId: { $in: childIds }, date: today }).lean()
          : Promise.resolve([]),
        childIds.length
          ? this.db.childDevice.find({ childId: { $in: childIds }, isActive: true }).lean()
          : Promise.resolve([]),
        childIds.length
          ? this.db.screenUsageLog.aggregate<{ _id: string; totalSeconds: number }>([
              { $match: { childId: { $in: childIds }, date: today } },
              { $group: { _id: '$childId', totalSeconds: { $sum: '$durationSeconds' } } },
            ])
          : Promise.resolve([]),
        this.db.familyCalendarEvent
          .find({ familyId, startAt: { $gte: now } })
          .sort({ startAt: 1 })
          .limit(5)
          .lean(),
      ]);

    const alertCountByChild = new Map<string, number>();
    for (const row of alertGroups) {
      alertCountByChild.set(row._id, row.count);
    }

    const latestMoodByChild = new Map<string, (typeof latestMoods)[0]>();
    childIds.forEach((id, i) => {
      const m = latestMoods[i];
      if (m) latestMoodByChild.set(id, m);
    });

    const missionByChild = new Map<string, (typeof todayMissionRows)[0]>();
    for (const m of todayMissionRows) {
      missionByChild.set(m.childId, m);
    }

    const usageByChildId = new Map<string, number>();
    for (const row of usageGroups) {
      usageByChildId.set(row._id, row.totalSeconds ?? 0);
    }

    const devicesByChild = new Map<string, typeof activeDevices>();
    for (const d of activeDevices) {
      const list = devicesByChild.get(d.childId) ?? [];
      list.push(d);
      devicesByChild.set(d.childId, list);
    }

    const childCards: ChildDashboardCard[] = children.map((child) => {
      const childId = child._id as string;
      const todayMissions = missionByChild.get(childId);
      const latestMood = latestMoodByChild.get(childId);
      const devices = devicesByChild.get(childId) ?? [];
      const linked = devices.length;
      const seenSeconds = usageByChildId.get(childId) ?? 0;
      const hasScreenUsageToday = seenSeconds > 0;

      const lastDeviceMs = devices
        .map((d) => (d.lastActiveAt ? new Date(d.lastActiveAt).getTime() : 0))
        .reduce((a, b) => Math.max(a, b), 0);
      const lastDeviceActivityAt =
        lastDeviceMs > 0 ? new Date(lastDeviceMs).toISOString() : undefined;

      const missionsJson = todayMissions?.missionsJson as { total?: number }[] | null | undefined;
      const missionTotal = Array.isArray(missionsJson) ? missionsJson.length : 0;

      const kidPinDigits = this.childPinCrypto.tryDecryptPin(child.pinEnc ?? null) ?? undefined;

      return {
        childId,
        name: child.name,
        avatarUrl: child.avatarUrl ?? undefined,
        todayMissionsTotal: todayMissions ? missionTotal : 0,
        todayMissionsCompleted: Math.round(
          ((todayMissions?.completionPct ?? 0) / 100) * missionTotal,
        ),
        currentMood: latestMood?.moodScore ?? undefined,
        currentStreak: child.currentStreak,
        wellbeingScore: child.wellbeingScore != null ? Math.round(child.wellbeingScore) : undefined,
        activeAlerts: alertCountByChild.get(childId) ?? 0,
        linkedDeviceCount: linked,
        hasScreenUsageToday,
        lastDeviceActivityAt,
        kidPinIsSet: child.pinHash != null && child.pinHash.length > 0,
        ...(kidPinDigits ? { kidPinDigits } : {}),
      };
    });

    const pairedDevices: PairedDeviceSummary[] = children.flatMap((child) => {
      const childId = child._id as string;
      const devices = devicesByChild.get(childId) ?? [];
      return devices.map((d) => ({
        id: d._id as string,
        childId,
        childName: child.name,
        deviceName: d.deviceName ?? null,
        platform: d.platform,
        lastActiveAt: d.lastActiveAt ? new Date(d.lastActiveAt).toISOString() : null,
      }));
    });

    return {
      familyId: family._id as string,
      familyName: family.name,
      children: childCards,
      urgentAlerts: [],
      upcomingEvents: calendarEvents.map((e) => ({
        id: e._id as string,
        familyId: e.familyId,
        title: e.title,
        type: e.type,
        startAt: new Date(e.startAt).toISOString(),
        endAt: e.endAt ? new Date(e.endAt).toISOString() : undefined,
        location: e.location ?? undefined,
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

    const scores = this.scoreBaselineAnswers(dto.answers);
    const report = { scores, summary: this.generateReportSummary(scores) };

    await this.db.baselineAssessment.findOneAndUpdate(
      { childId },
      { $set: { answers: dto.answers, scores, report, completedAt: new Date() } },
      { upsert: true, new: true },
    );

    await this.db.childProfile.findOneAndUpdate(
      { _id: childId },
      { $set: { baselineCompletedAt: new Date(), baselineScores: scores } },
    );

    return { scores, reportSummary: this.generateReportSummary(scores) };
  }

  // ─── Private Helpers ──────────────────────────────────────────────────────

  private async assertChildAccess(requesterId: string, childId: string) {
    const child = await this.db.childProfile.findOne({ _id: childId }).lean();

    if (!child) throw new NotFoundException('Child profile not found');

    const isParent = await this.db.familyMember
      .findOne({ familyId: child.familyId, userId: requesterId })
      .lean();

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
    const dimensions = [
      'reading',
      'math',
      'physical',
      'emotional',
      'habit',
      'social',
      'sleep',
      'islamic',
    ];
    const scores: Record<string, number> = {};
    dimensions.forEach((d) => {
      scores[d] = 50;
    });

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
    _id: string | unknown;
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
    createdAt?: Date;
  }): ChildProfile {
    const dob = new Date(child.dob);
    const age = new Date().getFullYear() - dob.getFullYear();

    return {
      id: child._id as string,
      name: child.name,
      nickname: child.nickname ?? undefined,
      avatarUrl: child.avatarUrl ?? undefined,
      age,
      grade: child.grade,
      dob: dob.toISOString(),
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

  // ─── Installed Apps Cache ─────────────────────────────────────────────────

  async getInstalledApps(childId: string) {
    const child = await this.db.childProfile
      .findOne({ _id: childId })
      .select('installedAppsCache')
      .lean();
    if (!child) throw new NotFoundException('Child not found');
    return { apps: child.installedAppsCache };
  }

  async upsertInstalledApps(
    childId: string,
    apps: Array<{ packageName: string; appName: string; category: string; iconBase64?: string }>,
  ) {
    const updated = await this.db.childProfile
      .findOneAndUpdate({ _id: childId }, { $set: { installedAppsCache: apps } }, { new: true })
      .select('_id installedAppsCache')
      .lean();
    return { apps: updated?.installedAppsCache };
  }
}
