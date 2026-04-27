/**
 * @module register.dto.ts
 * @description DTOs for parent registration and child PIN login.
 *              All inputs are validated by NestJS's ValidationPipe before
 *              reaching the service — invalid data never enters business logic.
 */

import { IsEmail, IsString, MinLength, IsBoolean, IsOptional, IsPhoneNumber, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterParentDto {
  @ApiProperty({ example: 'parent@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  password!: string;

  @ApiProperty({ example: 'Ahmed Rahman' })
  @IsString()
  @MinLength(2)
  name!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({
    description: 'Parent must explicitly consent before any data collection. Required: true.',
    example: true,
  })
  @IsBoolean()
  parentalConsentGiven!: boolean;

  @ApiProperty({ required: false, example: 'en' })
  @IsOptional()
  @IsString()
  languagePreference?: string;
}

export class LoginDto {
  @ApiProperty()
  @IsEmail()
  email!: string;

  @ApiProperty()
  @IsString()
  password!: string;
}

export class ChildPinLoginDto {
  @ApiProperty({ description: 'Child profile ID' })
  @IsString()
  childId!: string;

  @ApiProperty({ description: '4-digit PIN', example: '1234' })
  @IsString()
  @Length(4, 4, { message: 'PIN must be exactly 4 digits' })
  pin!: string;
}

export class RefreshTokenDto {
  @ApiProperty()
  @IsString()
  refreshToken!: string;
}

export class SetChildPinDto {
  @ApiProperty({ description: '4-digit PIN for child app login' })
  @IsString()
  @Length(4, 4)
  pin!: string;
}

export class ConfirmPairingDto {
  @ApiProperty({ description: 'QR payload scanned on child device (base64 json)' , required: false})
  @IsOptional()
  @IsString()
  qrToken?: string;

  @ApiProperty({ description: '6-digit pairing code shown on parent device' })
  @IsOptional()
  @IsString()
  @Length(6, 6)
  code?: string;

  @ApiProperty({ description: 'Child profile ID this device belongs to' })
  @IsOptional()
  @IsString()
  childId?: string;

  @ApiProperty({ description: 'Expo push token for this device' })
  @IsString()
  expoPushToken!: string;

  @ApiProperty({ description: "Platform: 'android' | 'ios'" })
  @IsString()
  platform!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  deviceName?: string;
}

export class GeneratePairingCodeDto {
  @ApiProperty({ description: 'Child profile ID that this QR should pair to' })
  @IsString()
  childId!: string;
}

export class AutoPairDeviceDto {
  @ApiProperty({ description: 'Child profile ID this device belongs to' })
  @IsString()
  childId!: string;

  @ApiProperty({ description: 'Expo push token for this device' })
  @IsString()
  expoPushToken!: string;

  @ApiProperty({ description: "Platform: 'android' | 'ios'" })
  @IsString()
  platform!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  deviceName?: string;
}

export class PairDeviceStatusDto {
  @ApiProperty({ description: 'Expo push token for this device (from Notifications.getExpoPushTokenAsync)' })
  @IsString()
  expoPushToken!: string;
}
