/**
 * @module auth.controller.ts
 * @description REST endpoints for authentication flows.
 *              All endpoints are under /api/v1/auth/
 */

import { Controller, Post, Body, UseGuards, Get, Param } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
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
} from './dto/register.dto';
import { UserRole, AuthResponse, PairingCodeResponse, AuthTokenPayload } from '@parentingmykid/shared-types';

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

  @ApiOperation({ summary: 'Generate 6-digit pairing code for child device' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PARENT)
  @Post('pair-device/generate')
  generatePairingCode(@CurrentUser() user: AuthTokenPayload): Promise<PairingCodeResponse> {
    return this.authService.generatePairingCode(user.sub);
  }

  @ApiOperation({ summary: 'Confirm device pairing with code from parent device' })
  @Post('pair-device/confirm')
  confirmPairing(@Body() dto: ConfirmPairingDto): Promise<AuthResponse> {
    return this.authService.confirmDevicePairing(dto);
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
