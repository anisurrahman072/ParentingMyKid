import { Controller, Get, Post, Param, Body, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MissionsService, CompleteMissionDto } from './missions.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('missions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('missions')
export class MissionsController {
  constructor(private readonly missions: MissionsService) {}

  @Get('today/:childId')
  @ApiOperation({ summary: "Get today's missions for a child" })
  getTodaysMissions(@Param('childId') childId: string) {
    return this.missions.getTodaysMissions(childId);
  }

  @Post(':missionId/complete/:childId')
  @ApiOperation({ summary: 'Mark a mission as complete' })
  completeMission(
    @Param('childId') childId: string,
    @Param('missionId') missionId: string,
    @Body() dto: CompleteMissionDto,
  ) {
    return this.missions.completeMission(childId, missionId, dto);
  }
}
