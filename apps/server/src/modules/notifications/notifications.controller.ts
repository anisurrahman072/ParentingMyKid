import { Controller, Post, Patch, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthTokenPayload } from '@parentingmykid/shared-types';

class RegisterTokenDto {
  @ApiProperty()
  @IsString()
  expoPushToken!: string;
}

@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @ApiOperation({ summary: 'Register Expo push token for this device' })
  @Post('expo-token')
  registerToken(
    @CurrentUser() user: AuthTokenPayload,
    @Body() dto: RegisterTokenDto,
  ): Promise<void> {
    return this.notificationsService.registerPushToken(user.sub, dto.expoPushToken);
  }
}
