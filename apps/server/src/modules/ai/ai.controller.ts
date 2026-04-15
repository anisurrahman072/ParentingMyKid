/**
 * @module ai.controller.ts
 * @description REST endpoints for all AI features.
 *              AI endpoints are rate-limited more strictly than regular endpoints
 *              to prevent abuse and manage OpenAI costs.
 */

import { Controller, Post, Get, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional } from 'class-validator';
import { AiService } from './ai.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import {
  UserRole,
  AuthTokenPayload,
  GrowthPlan,
  WellbeingScore,
  AICoachRequest,
  AICoachResponse,
  SafeAIStudyResponse,
} from '@parentingmykid/shared-types';
import { ApiProperty } from '@nestjs/swagger';

class CoachRequestDto implements Omit<AICoachRequest, 'childAge'> {
  @ApiProperty()
  @IsString()
  situation!: string;

  @ApiProperty()
  @IsString()
  childId!: string;

  @ApiProperty()
  @IsNumber()
  childAge!: number;
}

class StudyAssistDto {
  @ApiProperty()
  @IsString()
  question!: string;

  @ApiProperty()
  @IsString()
  subject!: string;
}

class GeneratePracticeDto {
  @ApiProperty()
  @IsString()
  subject!: string;

  @ApiProperty({ enum: ['EASY', 'MEDIUM', 'HARD'] })
  @IsString()
  difficulty!: 'EASY' | 'MEDIUM' | 'HARD';

  @ApiProperty({ required: false, default: 5 })
  @IsOptional()
  @IsNumber()
  count?: number;
}

@ApiTags('AI')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @ApiOperation({ summary: 'Get AI behavioral coaching script for a parenting situation' })
  @Roles(UserRole.PARENT)
  @Post('coach')
  getCoachScript(@Body() dto: CoachRequestDto): Promise<AICoachResponse> {
    return this.aiService.getParentingCoachScript(dto);
  }

  @ApiOperation({ summary: 'Get AI weekly growth plan for a child' })
  @Roles(UserRole.PARENT)
  @Get('growth-plan/:childId')
  getGrowthPlan(@Param('childId') childId: string): Promise<GrowthPlan> {
    return this.aiService.generateWeeklyGrowthPlan(childId);
  }

  @ApiOperation({ summary: "Get child's daily wellbeing score (0-100)" })
  @Get('wellbeing/:childId')
  getWellbeingScore(@Param('childId') childId: string): Promise<WellbeingScore> {
    return this.aiService.calculateWellbeingScore(childId);
  }

  @ApiOperation({ summary: 'Get AI nutrition advice for child based on weekly logs' })
  @Roles(UserRole.PARENT)
  @Get('nutrition-advice/:childId')
  getNutritionAdvice(@Param('childId') childId: string): Promise<string> {
    return this.aiService.getNutritionAdvice(childId);
  }

  @ApiOperation({ summary: 'Child asks safe AI study assistant a question' })
  @Roles(UserRole.CHILD)
  @Post('study/question')
  studyAssist(
    @CurrentUser() user: AuthTokenPayload,
    @Param('childId') childId: string,
    @Body() dto: StudyAssistDto,
  ): Promise<SafeAIStudyResponse> {
    return this.aiService.safeStudyAssist(childId || user.sub, dto.question, dto.subject);
  }

  @ApiOperation({ summary: 'Generate practice questions for a subject' })
  @Post('study/practice/:childId')
  generatePractice(
    @Param('childId') childId: string,
    @Body() dto: GeneratePracticeDto,
  ): Promise<Array<{ questionText: string; options: string[]; correctAnswer: string; explanation: string }>> {
    return this.aiService.generatePracticeQuestions(childId, dto.subject, dto.difficulty, dto.count);
  }
}
