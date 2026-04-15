import { Controller, Get, Post, Patch, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { RewardsService, CreateRewardContractDto, CreateWishRequestDto, RespondToWishDto } from './rewards.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole, AuthTokenPayload, PointsBalance, Badge } from '@parentingmykid/shared-types';

@ApiTags('Rewards & Gamification')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class RewardsController {
  constructor(private readonly rewardsService: RewardsService) {}

  @ApiOperation({ summary: "Get child's points balance, XP, and level" })
  @Get('children/:childId/points')
  getPoints(@Param('childId') childId: string): Promise<PointsBalance> {
    return this.rewardsService.getPointsBalance(childId);
  }

  @ApiOperation({ summary: "Get child's earned badges" })
  @Get('children/:childId/badges')
  getBadges(@Param('childId') childId: string): Promise<Badge[]> {
    return this.rewardsService.getBadges(childId);
  }

  @ApiOperation({ summary: 'Parent creates a reward contract for child' })
  @Roles(UserRole.PARENT)
  @Post('rewards')
  createReward(
    @CurrentUser() user: AuthTokenPayload,
    @Body() dto: CreateRewardContractDto,
  ) {
    return this.rewardsService.createRewardContract(user.sub, dto);
  }

  @ApiOperation({ summary: 'Child sends a wish request to parent' })
  @Roles(UserRole.CHILD)
  @Post('wishes')
  createWish(
    @CurrentUser() user: AuthTokenPayload,
    @Body() dto: CreateWishRequestDto,
  ) {
    return this.rewardsService.createWishRequest(user.sub, dto);
  }

  @ApiOperation({ summary: 'Parent responds to child wish (approve/decline/set goal)' })
  @Roles(UserRole.PARENT)
  @Patch('wishes/:wishId/respond')
  respondToWish(
    @CurrentUser() user: AuthTokenPayload,
    @Param('wishId') wishId: string,
    @Body() dto: RespondToWishDto,
  ) {
    return this.rewardsService.respondToWish(user.sub, wishId, dto);
  }
}
