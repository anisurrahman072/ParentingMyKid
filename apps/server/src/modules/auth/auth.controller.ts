/**
 * @module auth.controller.ts
 * @description REST endpoints for authentication flows.
 *              All endpoints are under /api/v1/auth/
 */

import { Controller, Post, Body, UseGuards, Get, Param } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AuthService } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { Roles } from './decorators/roles.decorator';
import { RolesGuard } from './guards/roles.guard';
import {
  RegisterParentDto,
  LoginDto,
  ChildPinLoginDto,
  RefreshTokenDto,
  ConfirmPairingDto,
  SetChildPinDto,
  GeneratePairingCodeDto,
  AutoPairDeviceDto,
  PairDeviceStatusDto,
} from './dto/register.dto';
import {
  UserRole,
  AuthResponse,
  PairingCodeResponse,
  AuthTokenPayload,
  UserProfile,
} from '@parentingmykid/shared-types';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @ApiOperation({ summary: 'Register a new parent account with parental consent' })
  @Post('register')
  register(@Body() dto: RegisterParentDto): Promise<AuthResponse> {
    return this.authService.registerParent(dto);
  }

  @ApiOperation({ summary: 'Login with email and password' })
  @Post('login')
  login(@Body() dto: LoginDto): Promise<AuthResponse> {
    return this.authService.login(dto);
  }

  @ApiOperation({ summary: 'Child PIN login — age-appropriate login without email' })
  @Post('child-login')
  childLogin(@Body() dto: ChildPinLoginDto): Promise<AuthResponse> {
    return this.authService.childPinLogin(dto);
  }

  @ApiOperation({ summary: 'Refresh access token using refresh token' })
  @Post('refresh')
  refresh(@Body() dto: RefreshTokenDto): Promise<Omit<AuthResponse, 'user'>> {
    return this.authService.refreshTokens(dto.refreshToken);
  }

  @ApiOperation({ summary: 'Current user profile (restore session / validate access token)' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('me')
  getMe(@CurrentUser() user: AuthTokenPayload): Promise<UserProfile> {
    return this.authService.getCurrentUserProfile(user.sub, user.role);
  }

  @ApiOperation({ summary: 'Generate 6-digit pairing code for child device' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PARENT)
  @Post('pair-device/generate')
  generatePairingCode(
    @CurrentUser() user: AuthTokenPayload,
    @Body() dto: GeneratePairingCodeDto,
  ): Promise<PairingCodeResponse> {
    return this.authService.generatePairingCode(user.sub, dto.childId);
  }

  @ApiOperation({ summary: 'Confirm device pairing with code from parent device' })
  @Post('pair-device/confirm')
  confirmPairing(@Body() dto: ConfirmPairingDto): Promise<AuthResponse> {
    return this.authService.confirmDevicePairing(dto);
  }

  @ApiOperation({ summary: 'Auto-pair this device from parent session on same phone' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PARENT)
  @Post('pair-device/auto')
  autoPairDevice(@CurrentUser() user: AuthTokenPayload, @Body() dto: AutoPairDeviceDto): Promise<void> {
    return this.authService.autoPairDeviceForParent(user.sub, dto);
  }

  @ApiOperation({ summary: 'List child profile(s) this device is paired to (Expo token match)' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PARENT)
  @Post('pair-device/status')
  pairDeviceStatus(
    @CurrentUser() user: AuthTokenPayload,
    @Body() dto: PairDeviceStatusDto,
  ): Promise<{ pairs: { childId: string; name: string }[] }> {
    return this.authService.getPairingStatusForDevice(user.sub, dto);
  }

  @ApiOperation({ summary: 'Parent sets child PIN for app login' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PARENT)
  @Post('children/:childId/pin')
  setChildPin(
    @CurrentUser() user: AuthTokenPayload,
    @Param('childId') childId: string,
    @Body() dto: SetChildPinDto,
  ): Promise<void> {
    return this.authService.setChildPin(user.sub, childId, dto);
  }

  @ApiOperation({ summary: 'Logout — revoke refresh token' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  logout(
    @CurrentUser() user: AuthTokenPayload,
    @Body() dto: RefreshTokenDto,
  ): Promise<void> {
    return this.authService.logout(user.sub, dto.refreshToken);
  }
}
