/**
 * @module missions.service.ts
 * @description Daily mission management — AI-generated mission lists + completion tracking.
 *
 *              Mission flow:
 *              1. Each morning, AI generates a mission list for the child
 *              2. Child sees missions in the colorful kids UI
 *              3. Child completes mission (one-tap, photo, or voice)
 *              4. Completion triggers: points + XP + streak update + badge check
 *              5. Parent receives notification thumbnail for photo proofs
 */

import { Injectable, ForbiddenException, NotFoundException, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { RewardsService } from '../rewards/rewards.service';
import { NotificationsService } from '../notifications/notifications.service';
import { MissionCategory, ProofType, NotificationType, Mission } from '@parentingmykid/shared-types';
import { IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CompleteMissionDto {
  @ApiProperty({ enum: ['MANUAL', 'PHOTO', 'VOICE', 'SENSOR'] })
  @IsString()
  proofType!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  proofUrl?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  voiceTranscript?: string;
}

// Default mission templates per category — used when AI is unavailable
const DEFAULT_MISSIONS: Array<Omit<Mission, 'id' | 'childId' | 'isCompleted' | 'date'>> = [
  {
    title: 'Read for 15 minutes',
    description: 'Pick any book you love and read quietly',
    category: MissionCategory.ACADEMIC,
    pointsValue: 20,
    xpValue: 25,
    proofRequired: false,
    autoApprove: true,
  },
  {
    title: 'Do 10 push-ups or jumping jacks',
    description: 'Get your body moving! Any exercise counts',
    category: MissionCategory.PHYSICAL,
    pointsValue: 15,
    xpValue: 20,
    proofRequired: false,
    autoApprove: true,
  },
  {
    title: 'Make your bed',
    description: 'Start the day with a tidy room — it sets you up for success',
    category: MissionCategory.HABIT,
    pointsValue: 10,
    xpValue: 10,
    proofRequired: false,
    autoApprove: true,
  },
  {
    title: 'Drink 6 glasses of water',
    description: 'Stay hydrated! Tick it off as you go',
    category: MissionCategory.SELF_CARE,
    pointsValue: 10,
    xpValue: 10,
    proofRequired: false,
    autoApprove: true,
  },
  {
    title: 'Say something kind to someone',
    description: 'A compliment, a thank you, or a helping hand — kindness matters',
    category: MissionCategory.SOCIAL,
    pointsValue: 15,
    xpValue: 15,
    proofRequired: false,
    autoApprove: true,
  },
];

@Injectable()
export class MissionsService {
  private readonly logger = new Logger(MissionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly rewardsService: RewardsService,
    private readonly notifications: NotificationsService,
  ) {}

  // ─── Get Today's Missions ──────────────────────────────────────────────────

  /**
   * Returns today's mission list for a child.
   * Creates default missions if none have been generated yet today.
   */
  async getTodaysMissions(childId: string): Promise<{ missions: Mission[] }> {
    const today = new Date().toISOString().split('T')[0];

    let dailyMission = await this.prisma.dailyMission.findFirst({
      where: { childId, date: today },
    });

    if (!dailyMission) {
      // Generate default missions (in production, AI service generates these)
      dailyMission = await this.generateDefaultMissions(childId, today);
    }

    const missionsJson = dailyMission.missionsJson as unknown as Mission[];

    return { missions: missionsJson };
  }

  // ─── Complete a Mission ────────────────────────────────────────────────────

  /**
   * Marks a mission as complete, validates proof, awards points.
   * This is one of the highest-frequency endpoints — must be fast (<200ms).
   */
  async completeMission(childId: string, missionId: string, dto: CompleteMissionDto) {
    const today = new Date().toISOString().split('T')[0];

    const dailyMission = await this.prisma.dailyMission.findFirst({
      where: { childId, date: today },
    });

    if (!dailyMission) throw new NotFoundException('No missions found for today');

    const missions = dailyMission.missionsJson as unknown as Mission[];
    const missionIndex = missions.findIndex((m) => m.id === missionId);

    if (missionIndex === -1) throw new NotFoundException('Mission not found');
    if (missions[missionIndex].isCompleted) {
      return { message: 'Mission already completed', alreadyDone: true };
    }

    // Mark mission as complete
    missions[missionIndex] = {
      ...missions[missionIndex],
      isCompleted: true,
      completedAt: new Date().toISOString(),
      proofType: dto.proofType as ProofType,
      proofUrl: dto.proofUrl,
    };

    const completedCount = missions.filter((m) => m.isCompleted).length;
    const completionPct = (completedCount / missions.length) * 100;

    // Update the daily mission record
    await this.prisma.dailyMission.update({
      where: { id: dailyMission.id },
      data: {
        missionsJson: missions as unknown as Prisma.InputJsonValue,
        completionPct,
      },
    });

    const mission = missions[missionIndex];

    // Award points, XP, and coins
    const { leveledUp, newBadges } = await this.rewardsService.awardPoints(
      childId,
      mission.pointsValue,
      mission.xpValue,
      Math.floor(mission.pointsValue / 2), // Coins = half of points
      `Completed mission: ${mission.title}`,
      'MISSION',
      missionId,
    );

    // Update streak counter
    await this.updateStreak(childId);

    // If photo proof, notify parent
    if (dto.proofType === ProofType.PHOTO && dto.proofUrl) {
      const child = await this.prisma.childProfile.findUniqueOrThrow({ where: { id: childId } });
      await this.notifications.sendToUser(child.parentId, {
        type: NotificationType.MISSION_REMINDER,
        title: `📸 ${child.name} completed: ${mission.title}`,
        body: 'Tap to see their photo proof and approve it',
        data: { screen: 'growth', childId, proofUrl: dto.proofUrl },
        priority: 'default',
      });
    }

    return {
      success: true,
      pointsEarned: mission.pointsValue,
      xpEarned: mission.xpValue,
      coinsEarned: Math.floor(mission.pointsValue / 2),
      leveledUp,
      newBadges,
      allComplete: completedCount === missions.length,
    };
  }

  // ─── Streak Management ────────────────────────────────────────────────────

  private async updateStreak(childId: string): Promise<void> {
    const child = await this.prisma.childProfile.findUniqueOrThrow({ where: { id: childId } });

    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    // Check if yesterday had missions completed (to continue streak)
    const yesterdayMissions = await this.prisma.dailyMission.findFirst({
      where: { childId, date: yesterday },
    });

    const yesterdayCompleted = yesterdayMissions && yesterdayMissions.completionPct >= 40;
    const newStreak = yesterdayCompleted ? child.currentStreak + 1 : 1;

    await this.prisma.childProfile.update({
      where: { id: childId },
      data: {
        currentStreak: newStreak,
        longestStreak: Math.max(child.longestStreak, newStreak),
      },
    });
  }

  // ─── Generate Default Missions ────────────────────────────────────────────

  private async generateDefaultMissions(childId: string, date: string) {
    const child = await this.prisma.childProfile.findUniqueOrThrow({ where: { id: childId } });

    // Build mission list with unique IDs
    const missions: Mission[] = DEFAULT_MISSIONS.map((m, index) => ({
      ...m,
      id: `${childId}-${date}-${index}`,
      childId,
      date,
      isCompleted: false,
      completedAt: undefined,
      proofUrl: undefined,
    }));

    // Add Islamic missions if module is enabled
    if (child.islamicModuleEnabled) {
      missions.push({
        id: `${childId}-${date}-islamic`,
        childId,
        date,
        title: 'Complete 5 daily prayers',
        description: 'Pray Fajr, Dhuhr, Asr, Maghrib, and Isha on time',
        category: MissionCategory.ISLAMIC,
        pointsValue: 30,
        xpValue: 40,
        isCompleted: false,
        proofRequired: false,
        autoApprove: true,
      });
    }

    const totalPoints = missions.reduce((sum, m) => sum + m.pointsValue, 0);

    return this.prisma.dailyMission.create({
      data: {
        childId,
        date,
        missionsJson: missions as unknown as Prisma.InputJsonValue,
        totalPoints,
        completionPct: 0,
        generatedByAi: false,
      },
    });
  }
}
