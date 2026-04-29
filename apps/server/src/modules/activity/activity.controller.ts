/**
 * @module activity.controller.ts
 * @description REST endpoints for child activity logging and retrieval.
 *              All routes are under /api/v1/activity/
 */

import { Controller, Post, Get, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ActivityService } from './activity.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { IsString, IsOptional, IsNumber, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

class LogScreenshotDto {
  @ApiProperty()
  @IsString()
  activeKidId!: string;

  @ApiProperty()
  @IsString()
  cloudinaryUrl!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  claimedKidId?: string;
}

class LogUrlVisitedDto {
  @ApiProperty()
  @IsString()
  activeKidId!: string;

  @ApiProperty()
  @IsString()
  url!: string;

  @ApiProperty()
  @IsString()
  domain!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  claimedKidId?: string;
}

class LogAppOpenedDto {
  @ApiProperty()
  @IsString()
  activeKidId!: string;

  @ApiProperty()
  @IsString()
  packageName!: string;

  @ApiProperty()
  @IsString()
  appName!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  claimedKidId?: string;
}

class LogSectionTimeDto {
  @ApiProperty()
  @IsString()
  childId!: string;

  @ApiProperty({ description: 'YYYY-MM-DD' })
  @IsString()
  date!: string;

  @ApiProperty()
  @IsString()
  section!: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  minutes!: number;
}

class LogIdentityClaimedDto {
  @ApiProperty()
  @IsString()
  activeKidId!: string;

  @ApiProperty()
  @IsString()
  claimedKidId!: string;
}

@ApiTags('Activity')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('activity')
export class ActivityController {
  constructor(private readonly activityService: ActivityService) {}

  @ApiOperation({ summary: 'Log a screenshot captured from child device' })
  @Post('screenshot')
  logScreenshot(@Body() dto: LogScreenshotDto) {
    return this.activityService.logScreenshot(dto);
  }

  @ApiOperation({ summary: 'Log a URL visited by child' })
  @Post('url-visited')
  logUrlVisited(@Body() dto: LogUrlVisitedDto) {
    return this.activityService.logUrlVisited(dto);
  }

  @ApiOperation({ summary: 'Log an app opened by child' })
  @Post('app-opened')
  logAppOpened(@Body() dto: LogAppOpenedDto) {
    return this.activityService.logAppOpened(dto);
  }

  @ApiOperation({ summary: 'Upsert section time log for child' })
  @Post('section-time')
  logSectionTime(@Body() dto: LogSectionTimeDto) {
    return this.activityService.logSectionTime(dto);
  }

  @ApiOperation({ summary: "Get today's activity + section time logs for a child" })
  @Get(':childId/today')
  getTodayActivity(@Param('childId') childId: string) {
    return this.activityService.getTodayActivity(childId);
  }

  @ApiOperation({ summary: 'Log child identity claimed on shared device' })
  @Post('identity-claimed')
  logIdentityClaimed(@Body() dto: LogIdentityClaimedDto) {
    return this.activityService.logIdentityClaimed(dto);
  }
}
