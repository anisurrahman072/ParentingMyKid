import { Controller, Post, Get, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SocialMonitorService, ScanContentDto } from './social-monitor.service';

@ApiTags('social-monitor')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('social-monitor')
export class SocialMonitorController {
  constructor(private readonly service: SocialMonitorService) {}

  @Post('scan')
  @ApiOperation({ summary: 'Scan content from child device companion app' })
  scanContent(@Body() dto: ScanContentDto) {
    return this.service.scanContent(dto);
  }

  @Get(':childId/summary')
  @ApiOperation({ summary: 'Get monitoring summary for a child' })
  getSummary(
    @Param('childId') childId: string,
    @Query('days') days?: string,
  ) {
    return this.service.getMonitoringSummary(childId, days ? parseInt(days) : 7);
  }

  @Post(':childId/toggle')
  @ApiOperation({ summary: 'Enable or disable monitoring for a child' })
  toggleMonitoring(
    @Param('childId') childId: string,
    @Body('enabled') enabled: boolean,
  ) {
    return this.service.setMonitoring(childId, enabled);
  }
}
