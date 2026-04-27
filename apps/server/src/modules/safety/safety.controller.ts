/**
 * @module safety.controller.ts
 * @description Safety endpoints — child location, SOS, screen time, alerts.
 */

import { Controller, Get, Post, Patch, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import {
  SafetyService,
  LogLocationDto,
  CreateGeofenceDto,
  UpdateScreenTimeDto,
} from './safety.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import {
  UserRole,
  AuthTokenPayload,
  ChildLocation,
  Geofence,
  SafetyAlert,
  ScreenTimeControls,
} from '@parentingmykid/shared-types';

@ApiTags('Safety')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('safety')
export class SafetyController {
  constructor(private readonly safetyService: SafetyService) {}

  @ApiOperation({ summary: "Get child's real-time location" })
  @Roles(UserRole.PARENT)
  @Get(':childId/location')
  getLocation(
    @CurrentUser() user: AuthTokenPayload,
    @Param('childId') childId: string,
  ): Promise<ChildLocation | null> {
    return this.safetyService.getChildLocation(user.sub, childId);
  }

  @ApiOperation({ summary: 'Child device logs a location ping' })
  @Roles(UserRole.CHILD)
  @Post(':childId/location')
  logLocation(@Param('childId') childId: string, @Body() dto: LogLocationDto): Promise<void> {
    return this.safetyService.logLocation(childId, dto);
  }

  @ApiOperation({ summary: '🚨 SOS — child pressed emergency button' })
  @Roles(UserRole.CHILD)
  @Post(':childId/sos')
  triggerSOS(@Param('childId') childId: string): Promise<void> {
    return this.safetyService.triggerSOS(childId);
  }

  @ApiOperation({ summary: 'Create a geofence safe zone for child' })
  @Roles(UserRole.PARENT)
  @Post(':childId/geofences')
  createGeofence(
    @CurrentUser() user: AuthTokenPayload,
    @Param('childId') childId: string,
    @Body() dto: CreateGeofenceDto,
  ): Promise<Geofence> {
    return this.safetyService.createGeofence(user.sub, childId, dto);
  }

  @ApiOperation({ summary: 'Get screen time controls for child' })
  @Roles(UserRole.PARENT)
  @Get(':childId/controls')
  getControls(
    @CurrentUser() user: AuthTokenPayload,
    @Param('childId') childId: string,
  ): Promise<ScreenTimeControls> {
    return this.safetyService.getScreenTimeControls(user.sub, childId);
  }

  @ApiOperation({ summary: "Get screen time controls — child's own device (read-only for policy sync)" })
  @Roles(UserRole.CHILD)
  @Get(':childId/controls/self')
  getControlsSelf(
    @CurrentUser() user: AuthTokenPayload,
    @Param('childId') childId: string,
  ): Promise<ScreenTimeControls> {
    return this.safetyService.getScreenTimeControlsForChild(user.sub, childId);
  }

  @ApiOperation({ summary: 'Update screen time rules (includes pause internet)' })
  @Roles(UserRole.PARENT)
  @Patch(':childId/controls')
  updateControls(
    @CurrentUser() user: AuthTokenPayload,
    @Param('childId') childId: string,
    @Body() dto: UpdateScreenTimeDto,
  ): Promise<ScreenTimeControls> {
    return this.safetyService.updateScreenTimeControls(user.sub, childId, dto);
  }

  @ApiOperation({ summary: 'Get safety alerts for child' })
  @Roles(UserRole.PARENT)
  @Get(':childId/alerts')
  getAlerts(
    @CurrentUser() user: AuthTokenPayload,
    @Param('childId') childId: string,
  ): Promise<SafetyAlert[]> {
    return this.safetyService.getAlerts(user.sub, childId);
  }
}
