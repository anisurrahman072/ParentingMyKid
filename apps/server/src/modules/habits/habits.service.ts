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
import { DatabaseService } from '../../database/database.service';
import { MissionCategory, ProofType } from '@parentingmykid/shared-types';
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
  constructor(private readonly db: DatabaseService) {}

  async getChildHabits(
    childId: string,
  ): Promise<{ habits: Array<Record<string, unknown>> }> {
    const habits = await this.db.habit
      .find({ childId, isActive: true })
      .sort({ createdAt: 1 })
      .lean();

    const todayStart = new Date(new Date().setHours(0, 0, 0, 0));
    const habitIds = habits.map((h) => h._id);

    const todayCompletions = await this.db.habitCompletion
      .find({ habitId: { $in: habitIds }, completedAt: { $gte: todayStart } })
      .lean();

    const completionsByHabit = todayCompletions.reduce(
      (acc, c) => {
        const key = String(c.habitId);
        acc[key] = (acc[key] ?? 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    return {
      habits: habits.map((h) => {
        const count = completionsByHabit[String(h._id)] ?? 0;
        return {
          ...h,
          completedToday: count >= 1,
          completionCount: count,
        } as Record<string, unknown>;
      }),
    };
  }

  async createHabit(dto: CreateHabitDto) {
    const child = await this.db.childProfile.findOne({ _id: dto.childId }).lean();
    if (!child) throw new NotFoundException('Child not found');

    const habit = await this.db.habit.create({
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
    });

    return { habit };
  }

  async logHabitCompletion(habitId: string, childId: string, _note?: string) {
    const habit = await this.db.habit.findOne({ _id: habitId, childId }).lean();
    if (!habit) throw new NotFoundException('Habit not found');

    const completion = await this.db.habitCompletion.create({
      habitId,
      childId,
      completedAt: new Date(),
      proofType: ProofType.MANUAL,
    });

    // Update streak
    const yesterday = new Date(Date.now() - 86400000);
    yesterday.setHours(0, 0, 0, 0);
    const todayStart = new Date(new Date().setHours(0, 0, 0, 0));

    const yesterdayCompletions = await this.db.habitCompletion.countDocuments({
      habitId,
      completedAt: { $gte: yesterday, $lt: todayStart },
    });

    const newStreak = yesterdayCompletions > 0 ? habit.currentStreak + 1 : 1;
    await this.db.habit.findOneAndUpdate(
      { _id: habitId },
      {
        currentStreak: newStreak,
        longestStreak: Math.max(habit.longestStreak, newStreak),
      },
      { new: true },
    );

    return { success: true, completion, newStreak };
  }

  async deleteHabit(habitId: string, childId: string) {
    await this.db.habit.updateMany({ _id: habitId, childId }, { isActive: false });
    return { success: true };
  }
}
