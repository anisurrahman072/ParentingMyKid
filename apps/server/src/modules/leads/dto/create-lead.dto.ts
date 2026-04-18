import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

/**
 * Public marketing-site submissions — newsletter (Lead) or feedback (SiteFeedback).
 */
export class CreateLeadDto {
  @ApiProperty({ example: 'parent@example.com' })
  @IsEmail()
  @MaxLength(320)
  email!: string;

  @ApiPropertyOptional({ example: 'Sam' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  /** Short region hint from the client (optional). */
  @ApiPropertyOptional({ example: 'BD' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  country?: string;

  @ApiProperty({ enum: ['en', 'bn'], example: 'en' })
  @IsString()
  @IsIn(['en', 'bn'])
  language!: 'en' | 'bn';

  @ApiPropertyOptional({ example: 'landing_en' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  source?: string;

  /** When set, stored as SiteFeedback instead of Lead (duplicate emails allowed). */
  @ApiPropertyOptional({ example: 'Love the site!' })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(4000)
  message?: string;
}
