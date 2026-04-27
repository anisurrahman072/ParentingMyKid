/**
 * @module children.controller.ts
 * @description REST endpoints for child profile management and family dashboard.
 */

import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ChildrenService } from './children.service';
import { CreateChildDto, SubmitBaselineDto } from './dto/create-child.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole, AuthTokenPayload, ChildProfile, FamilyDashboard } from '@parentingmykid/shared-types';

@ApiTags('Children')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class ChildrenController {
  constructor(private readonly childrenService: ChildrenService) {}

  @ApiOperation({ summary: 'Create a new child profile' })
  @Roles(UserRole.PARENT)
  @Post('children')
  createChild(
    @CurrentUser() user: AuthTokenPayload,
    @Body() dto: CreateChildDto,
  ): Promise<ChildProfile> {
    return this.childrenService.createChild(user.sub, dto);
  }

  @ApiOperation({ summary: 'Get child profile by ID' })
  @Get('children/:childId')
  getChildProfile(
    @CurrentUser() user: AuthTokenPayload,
    @Param('childId') childId: string,
  ): Promise<ChildProfile> {
    return this.childrenService.getChildProfile(user.sub, childId);
  }

  @ApiOperation({ summary: 'Parent home: family + children summary (fast path; same payload as dashboard)' })
  @Roles(UserRole.PARENT)
  @Get('families/:familyId/home')
  getFamilyHome(
    @CurrentUser() user: AuthTokenPayload,
    @Param('familyId') familyId: string,
  ): Promise<FamilyDashboard> {
    return this.childrenService.getFamilyDashboard(user.sub, familyId);
  }

  @ApiOperation({ summary: 'Get full family dashboard (alias of home; same response)' })
  @Roles(UserRole.PARENT)
  @Get('families/:familyId/dashboard')
  getFamilyDashboard(
    @CurrentUser() user: AuthTokenPayload,
    @Param('familyId') familyId: string,
  ): Promise<FamilyDashboard> {
    return this.childrenService.getFamilyDashboard(user.sub, familyId);
  }

  @ApiOperation({ summary: 'Submit 10-minute baseline assessment — triggers 14-day trial' })
  @Roles(UserRole.PARENT)
  @Post('children/:childId/baseline')
  submitBaseline(
    @CurrentUser() user: AuthTokenPayload,
    @Param('childId') childId: string,
    @Body() dto: SubmitBaselineDto,
  ): Promise<{ scores: Record<string, number>; reportSummary: string }> {
    return this.childrenService.submitBaseline(user.sub, childId, dto);
  }
}
