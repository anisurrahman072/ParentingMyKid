import { Controller, Get, Post, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { HabitsService, CreateHabitDto } from './habits.service';

@ApiTags('habits')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('habits')
export class HabitsController {
  constructor(private readonly habits: HabitsService) {}

  @Get(':childId')
  @ApiOperation({ summary: "Get child's habits" })
  getHabits(@Param('childId') childId: string) {
    return this.habits.getChildHabits(childId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a habit for a child' })
  createHabit(@Body() dto: CreateHabitDto) {
    return this.habits.createHabit(dto);
  }

  @Post(':habitId/complete/:childId')
  @ApiOperation({ summary: 'Log a habit completion' })
  completeHabit(
    @Param('habitId') habitId: string,
    @Param('childId') childId: string,
    @Body('note') note?: string,
  ) {
    return this.habits.logHabitCompletion(habitId, childId, note);
  }

  @Delete(':habitId/:childId')
  @ApiOperation({ summary: 'Deactivate a habit' })
  deleteHabit(@Param('habitId') habitId: string, @Param('childId') childId: string) {
    return this.habits.deleteHabit(habitId, childId);
  }
}
