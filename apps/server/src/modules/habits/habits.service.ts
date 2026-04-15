/**
 * @module habits.service.ts
 * @description Daily habit tracking — the foundation of child routine building.
 *
 *              Habits vs Missions:
 *              - Missions: AI-generated daily tasks, varied, gamified
 *              - Habits: parent-set recurring routines, consistent, logged daily
 *
 *              Examples: brush teeth, read 15 min, make bed, pray Fajr, drink 8 glasses of water
 */

import { Injectable, NotFoundException } from '@nestjs/common';
import { MissionCategory, ProofType } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { IsString, IsOptional, IsNumber, IsArray } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateHabitDto {
  @ApiProperty()
  @IsString()
  childId!: string;

  @ApiProperty()
  @IsString()
  name!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  icon?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  targetFrequency?: number; // Times per day

  @ApiProperty({ required: false })
  @IsOptional()
  @IsArray()
  scheduledDays?: string[]; // ['MON', 'TUE', ...] or empty for daily

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  pointsValue?: number;
}

@Injectable()
export class HabitsService {
  constructor(private readonly prisma: PrismaService) {}

  async getChildHabits(childId: string) {
    const habits = await this.prisma.habit.findMany({
      where: { childId, isActive: true },
      include: {
        completions: {
          where: {
            completedAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return {
      habits: habits.map((h) => ({
        ...h,
        completedToday: h.completions.length >= 1,
        completionCount: h.completions.length,
      })),
    };
  }

  async createHabit(dto: CreateHabitDto) {
    const child = await this.prisma.childProfile.findUniqueOrThrow({ where: { id: dto.childId } });

    const habit = await this.prisma.habit.create({
      data: {
        childId: dto.childId,
        parentId: child.parentId,
        title: dto.name,
        category: MissionCategory.HABIT,
        description: dto.description,
        iconEmoji: dto.icon ?? '✅',
        scheduleDays: dto.scheduledDays ?? [],
        pointsValue: dto.pointsValue ?? 10,
        isActive: true,
        currentStreak: 0,
        longestStreak: 0,
      },
    });

    return { habit };
  }

  async logHabitCompletion(habitId: string, childId: string, _note?: string) {
    const habit = await this.prisma.habit.findFirst({ where: { id: habitId, childId } });
    if (!habit) throw new NotFoundException('Habit not found');

    const completion = await this.prisma.habitCompletion.create({
      data: {
        habitId,
        childId,
        completedAt: new Date(),
        proofType: ProofType.MANUAL,
      },
    });

    // Update streak
    const yesterday = new Date(Date.now() - 86400000);
    yesterday.setHours(0, 0, 0, 0);
    const yesterdayCompletions = await this.prisma.habitCompletion.count({
      where: {
        habitId,
        completedAt: { gte: yesterday, lt: new Date(new Date().setHours(0, 0, 0, 0)) },
      },
    });

    const newStreak = yesterdayCompletions > 0 ? habit.currentStreak + 1 : 1;
    await this.prisma.habit.update({
      where: { id: habitId },
      data: {
        currentStreak: newStreak,
        longestStreak: Math.max(habit.longestStreak, newStreak),
      },
    });

    return { success: true, completion, newStreak };
  }

  async deleteHabit(habitId: string, childId: string) {
    await this.prisma.habit.updateMany({
      where: { id: habitId, childId },
      data: { isActive: false },
    });
    return { success: true };
  }
}
