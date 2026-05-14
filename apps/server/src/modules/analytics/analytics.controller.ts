import {
  Controller,
  Get,
  Param,
  Post,
  Query,
  Headers,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AnalyticsService } from './analytics.service';

@ApiTags('analytics')
@Controller('analytics')
export class AnalyticsController {
  constructor(
    private readonly analytics: AnalyticsService,
    private readonly config: ConfigService,
  ) {}

  @Get('child/:childId')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get child analytics for a given period' })
  getChildAnalytics(
    @Param('childId') childId: string,
    @Query('days') days?: string,
  ) {
    return this.analytics.getChildAnalytics(childId, days ? parseInt(days) : 30);
  }

  /**
   * Triggered by an external cron runner (e.g. GitHub Actions, EasyCron).
   * Protected by a shared secret in the X-Cron-Secret header so it is never
   * callable by unauthenticated users.
   */
  @Post('cron/weekly-analytics')
  @ApiOperation({ summary: 'Trigger weekly analytics report (cron only)' })
  async runWeeklyAnalytics(
    @Headers('x-cron-secret') secret: string,
  ): Promise<{ ok: boolean }> {
    const expected = this.config.get<string>('CRON_SECRET');
    if (!expected || secret !== expected) {
      throw new UnauthorizedException('Invalid cron secret');
    }
    await this.analytics.runWeeklyAnalytics();
    return { ok: true };
  }
}
