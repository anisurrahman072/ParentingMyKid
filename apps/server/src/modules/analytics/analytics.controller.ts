import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AnalyticsService } from './analytics.service';

@ApiTags('analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Get('child/:childId')
  @ApiOperation({ summary: 'Get child analytics for a given period' })
  getChildAnalytics(
    @Param('childId') childId: string,
    @Query('days') days?: string,
  ) {
    return this.analytics.getChildAnalytics(childId, days ? parseInt(days) : 30);
  }
}
