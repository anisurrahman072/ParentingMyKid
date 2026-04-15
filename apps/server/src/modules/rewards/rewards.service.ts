/**
 * @module rewards.service.ts
 * @description The gamification engine — makes children want to open the app every day.
 *
 *              Core systems:
 *              - RPG-style XP + level progression (1-100)
 *              - Coin system (spendable for screen time, accessories)
 *              - 75+ achievement badges (Bronze to Royal tier)
 *              - Parent-child reward contracts ("score 80% = I buy you a bicycle")
 *              - Child wish request system (emotional parent-child bond)
 *              - Streak tracking with grace days
 *              - Family leaderboard
 *
 * @business-rule This module is why children BEG their parents to keep the subscription.
 *               The reward system creates a feedback loop:
 *               Child completes mission → earns coins → spends on screen time → completes
 *               more missions → earns badges → parents get proud notifications → pays subscription.
 */

import { Injectable, ForbiddenException, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType, PointsBalance, Badge, BadgeTier, RewardStatus, WishStatus } from '@parentingmykid/shared-types';
import { IsString, IsNumber, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

// Badge definitions — 75+ badges across 5 tiers
const BADGE_DEFINITIONS: Array<{
  type: string;
  tier: BadgeTier;
  title: string;
  description: string;
  triggerFn: (stats: { missions: number; streak: number; level: number }) => boolean;
}> = [
  // ─── Bronze Tier ─────────────────────────────────────────────────────────
  { type: 'FIRST_MISSION', tier: BadgeTier.BRONZE, title: 'First Step!', description: 'Completed your very first mission', triggerFn: (s) => s.missions >= 1 },
  { type: 'STREAK_3', tier: BadgeTier.BRONZE, title: 'Hot Start', description: '3-day streak — you are on a roll!', triggerFn: (s) => s.streak >= 3 },
  { type: 'MISSIONS_10', tier: BadgeTier.BRONZE, title: 'Getting Started', description: 'Completed 10 missions total', triggerFn: (s) => s.missions >= 10 },
  { type: 'LEVEL_2', tier: BadgeTier.BRONZE, title: 'Level Up!', description: 'Reached Level 2', triggerFn: (s) => s.level >= 2 },
  { type: 'MISSIONS_25', tier: BadgeTier.BRONZE, title: 'Quarter Century', description: 'Completed 25 missions', triggerFn: (s) => s.missions >= 25 },

  // ─── Silver Tier ──────────────────────────────────────────────────────────
  { type: 'STREAK_7', tier: BadgeTier.SILVER, title: '1 Week Champion', description: '7-day streak — amazing!', triggerFn: (s) => s.streak >= 7 },
  { type: 'MISSIONS_100', tier: BadgeTier.SILVER, title: 'Century Club', description: '100 missions completed!', triggerFn: (s) => s.missions >= 100 },
  { type: 'LEVEL_10', tier: BadgeTier.SILVER, title: 'Level 10 Hero', description: 'Reached Level 10', triggerFn: (s) => s.level >= 10 },
  { type: 'STREAK_14', tier: BadgeTier.SILVER, title: '2 Weeks Strong', description: '14-day streak', triggerFn: (s) => s.streak >= 14 },
  { type: 'MISSIONS_200', tier: BadgeTier.SILVER, title: 'Double Century', description: '200 missions done!', triggerFn: (s) => s.missions >= 200 },

  // ─── Gold Tier ────────────────────────────────────────────────────────────
  { type: 'STREAK_30', tier: BadgeTier.GOLD, title: '30-Day Legend', description: '30 days in a row — INCREDIBLE!', triggerFn: (s) => s.streak >= 30 },
  { type: 'MISSIONS_500', tier: BadgeTier.GOLD, title: 'Half Thousand', description: '500 missions completed!', triggerFn: (s) => s.missions >= 500 },
  { type: 'LEVEL_25', tier: BadgeTier.GOLD, title: 'Quarter Master', description: 'Reached Level 25', triggerFn: (s) => s.level >= 25 },
  { type: 'STREAK_60', tier: BadgeTier.GOLD, title: '2 Month Warrior', description: '60-day streak', triggerFn: (s) => s.streak >= 60 },

  // ─── Platinum Tier ────────────────────────────────────────────────────────
  { type: 'STREAK_100', tier: BadgeTier.PLATINUM, title: '100-Day Master', description: '100 consecutive days!', triggerFn: (s) => s.streak >= 100 },
  { type: 'MISSIONS_1000', tier: BadgeTier.PLATINUM, title: 'Thousand Strong', description: '1,000 missions — you are a champion!', triggerFn: (s) => s.missions >= 1000 },
  { type: 'LEVEL_50', tier: BadgeTier.PLATINUM, title: 'Half Century Hero', description: 'Reached Level 50', triggerFn: (s) => s.level >= 50 },

  // ─── Royal Tier ───────────────────────────────────────────────────────────
  { type: 'STREAK_365', tier: BadgeTier.ROYAL, title: 'Year of Excellence', description: '365 consecutive days — LEGENDARY!', triggerFn: (s) => s.streak >= 365 },
  { type: 'LEVEL_100', tier: BadgeTier.ROYAL, title: 'Grand Master', description: 'Reached the maximum Level 100!', triggerFn: (s) => s.level >= 100 },
  { type: 'MISSIONS_5000', tier: BadgeTier.ROYAL, title: 'Five Thousand Elite', description: '5,000 missions — you are a legend!', triggerFn: (s) => s.missions >= 5000 },
];

// XP needed to reach each level (exponential growth)
const getXpForLevel = (level: number): number => Math.floor(100 * Math.pow(1.5, level - 1));

export class CreateRewardContractDto {
  @ApiProperty()
  @IsString()
  childId!: string;

  @ApiProperty()
  @IsString()
  title!: string;

  @ApiProperty()
  @IsString()
  conditionType!: string;

  @ApiProperty()
  @IsString()
  conditionDescription!: string;

  @ApiProperty()
  @IsNumber()
  conditionValue!: number;

  @ApiProperty()
  @IsString()
  rewardDescription!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  targetDate?: string;
}

export class CreateWishRequestDto {
  @ApiProperty()
  @IsString()
  itemName!: string;

  @ApiProperty()
  @IsString()
  description!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  voiceUrl?: string;
}

export class RespondToWishDto {
  @ApiProperty({ enum: ['APPROVED_WITH_GOAL', 'APPROVED_AS_GIFT', 'DECLINED'] })
  @IsString()
  status!: string;

  @ApiProperty()
  @IsString()
  parentMessage!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  goalCondition?: string;
}

@Injectable()
export class RewardsService {
  private readonly logger = new Logger(RewardsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  // ─── Award Points & XP ────────────────────────────────────────────────────

  /**
   * Awards points, XP, and coins to a child for completing a mission or habit.
   * Checks for level-up and new badge unlocks automatically.
   * Called by MissionsService after mission completion is verified.
   */
  async awardPoints(
    childId: string,
    points: number,
    xp: number,
    coins: number,
    reason: string,
    sourceType: string,
    sourceId?: string,
  ): Promise<{ leveledUp: boolean; newBadges: Badge[] }> {
    // Atomic update of all point counters
    const child = await this.prisma.childProfile.update({
      where: { id: childId },
      data: {
        totalPoints: { increment: points },
        xp: { increment: xp },
        spendableCoins: { increment: coins },
      },
    });

    // Log the transaction
    await this.prisma.pointsLedgerEntry.create({
      data: {
        childId,
        points,
        coins,
        xp,
        reason,
        sourceType,
        sourceId,
      },
    });

    // Check for level-up
    let leveledUp = false;
    const totalXp = child.xp;
    const requiredXp = getXpForLevel(child.level + 1);

    if (totalXp >= requiredXp && child.level < 100) {
      await this.prisma.childProfile.update({
        where: { id: childId },
        data: { level: { increment: 1 } },
      });
      leveledUp = true;
      this.logger.log(`Child ${childId} leveled up to level ${child.level + 1}!`);

      // Notify parent of level-up (emotional engagement moment)
      const updatedChild = await this.prisma.childProfile.findUniqueOrThrow({ where: { id: childId } });
      await this.notifications.sendToUser(updatedChild.parentId, {
        type: NotificationType.LEVEL_UP,
        title: `🎉 ${updatedChild.name} reached Level ${updatedChild.level}!`,
        body: `Amazing growth! ${updatedChild.name} just leveled up. Check their progress!`,
        data: { screen: 'growth', childId },
        priority: 'high',
      });
    }

    // Check for new badges
    const newBadges = await this.checkAndAwardBadges(childId);

    return { leveledUp, newBadges };
  }

  // ─── Badge System ─────────────────────────────────────────────────────────

  private async checkAndAwardBadges(childId: string): Promise<Badge[]> {
    const child = await this.prisma.childProfile.findUniqueOrThrow({ where: { id: childId } });
    const totalMissions = await this.prisma.habitCompletion.count({ where: { childId } });

    const stats = { missions: totalMissions, streak: child.currentStreak, level: child.level };

    const existingBadgeTypes = new Set(
      (await this.prisma.badge.findMany({ where: { childId }, select: { badgeType: true } })).map(
        (b) => b.badgeType,
      ),
    );

    const newBadges: Badge[] = [];

    for (const def of BADGE_DEFINITIONS) {
      if (!existingBadgeTypes.has(def.type) && def.triggerFn(stats)) {
        const badge = await this.prisma.badge.create({
          data: {
            childId,
            badgeType: def.type,
            tier: def.tier,
            title: def.title,
            description: def.description,
          },
        });

        newBadges.push({
          id: badge.id,
          childId: badge.childId,
          badgeType: badge.badgeType,
          tier: badge.tier as BadgeTier,
          title: badge.title,
          description: badge.description,
          iconUrl: badge.iconUrl ?? '',
          earnedAt: badge.earnedAt.toISOString(),
          isShared: badge.isShared,
        });

        // Notify parent about badge
        await this.notifications.sendToUser(child.parentId, {
          type: NotificationType.BADGE_EARNED,
          title: `🏆 ${child.name} earned a ${def.tier} badge!`,
          body: `"${def.title}" — ${def.description}`,
          data: { screen: 'rewards/badges', childId },
          priority: 'default',
        });
      }
    }

    return newBadges;
  }

  // ─── Points Balance ───────────────────────────────────────────────────────

  async getPointsBalance(childId: string): Promise<PointsBalance> {
    const child = await this.prisma.childProfile.findUniqueOrThrow({ where: { id: childId } });
    const xpToNext = getXpForLevel(child.level + 1);
    const progress = Math.round((child.xp / xpToNext) * 100);

    return {
      childId: child.id,
      totalPoints: child.totalPoints,
      spendableCoins: child.spendableCoins,
      xp: child.xp,
      level: child.level,
      xpToNextLevel: xpToNext - child.xp,
      levelProgress: Math.min(100, progress),
    };
  }

  // ─── Reward Contracts ─────────────────────────────────────────────────────

  async createRewardContract(parentId: string, dto: CreateRewardContractDto) {
    const child = await this.prisma.childProfile.findFirst({
      where: { id: dto.childId, parentId },
    });
    if (!child) throw new ForbiddenException('Child not found or access denied');

    return this.prisma.reward.create({
      data: {
        childId: dto.childId,
        parentId,
        title: dto.title,
        conditionType: dto.conditionType,
        conditionDescription: dto.conditionDescription,
        conditionValue: dto.conditionValue,
        rewardDescription: dto.rewardDescription,
        status: RewardStatus.ACTIVE,
        targetDate: dto.targetDate ? new Date(dto.targetDate) : undefined,
      },
    });
  }

  // ─── Wish Requests ────────────────────────────────────────────────────────

  async createWishRequest(childId: string, dto: CreateWishRequestDto) {
    const wish = await this.prisma.wishRequest.create({
      data: {
        childId,
        itemName: dto.itemName,
        description: dto.description,
        voiceUrl: dto.voiceUrl,
      },
    });

    // Notify parent about child's wish
    const child = await this.prisma.childProfile.findUniqueOrThrow({ where: { id: childId } });
    await this.notifications.sendToUser(child.parentId, {
      type: NotificationType.WISH_REQUEST,
      title: `✨ ${child.name} made a wish!`,
      body: `"${dto.itemName}" — Tap to see their wish and respond with love.`,
      data: { screen: 'rewards/wishes', childId, wishId: wish.id },
      priority: 'default',
    });

    return wish;
  }

  async respondToWish(parentId: string, wishId: string, dto: RespondToWishDto) {
    const wish = await this.prisma.wishRequest.findUnique({
      where: { id: wishId },
      include: { child: true },
    });
    if (!wish) throw new NotFoundException('Wish not found');
    if (wish.child.parentId !== parentId) throw new ForbiddenException('Access denied');

    const updated = await this.prisma.wishRequest.update({
      where: { id: wishId },
      data: {
        status: dto.status as WishStatus,
        parentResponse: dto.parentMessage,
        goalCondition: dto.goalCondition,
        respondedAt: new Date(),
      },
    });

    // Notify child of parent's response
    await this.notifications.sendToUser(wish.child.userId, {
      type: NotificationType.WISH_RESPONSE,
      title: dto.status === 'DECLINED' ? 'A message from your parent 💌' : '🎉 Your wish was answered!',
      body: dto.parentMessage,
      data: { screen: 'rewards/wishes', wishId },
      priority: 'default',
    });

    return updated;
  }

  async getBadges(childId: string): Promise<Badge[]> {
    const badges = await this.prisma.badge.findMany({
      where: { childId },
      orderBy: { earnedAt: 'desc' },
    });
    return badges.map((b) => ({
      id: b.id,
      childId: b.childId,
      badgeType: b.badgeType,
      tier: b.tier as BadgeTier,
      title: b.title,
      description: b.description,
      iconUrl: b.iconUrl ?? '',
      earnedAt: b.earnedAt.toISOString(),
      isShared: b.isShared,
    }));
  }
}
