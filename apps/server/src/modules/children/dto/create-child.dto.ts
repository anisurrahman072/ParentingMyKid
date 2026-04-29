/**
 * @module create-child.dto.ts
 * @description DTOs for child profile creation and baseline assessment submission.
 */

import {
  IsString,
  IsOptional,
  IsBoolean,
  IsArray,
  IsDateString,
  MinLength,
  IsEnum,
  Matches,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateChildDto {
  @ApiProperty({ example: 'Ahmed' })
  @IsString()
  @MinLength(2)
  name!: string;

  @ApiProperty({ required: false, example: 'Ahmo' })
  @IsOptional()
  @IsString()
  nickname?: string;

  @ApiProperty({ example: '2016-03-15', description: 'Date of birth in ISO format' })
  @IsDateString()
  dob!: string;

  @ApiProperty({ example: 'Grade 4' })
  @IsString()
  grade!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  school?: string;

  @ApiProperty({ enum: ['en', 'bn', 'ar'], default: 'en' })
  @IsOptional()
  @IsString()
  languagePreference?: string;

  @ApiProperty({ required: false, example: ['nuts', 'dairy'] })
  @IsOptional()
  @IsArray()
  allergies?: string[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsArray()
  foodPreferences?: string[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsArray()
  favoriteActivities?: string[];

  @ApiProperty({ default: false })
  @IsOptional()
  @IsBoolean()
  islamicModuleEnabled?: boolean;

  @ApiProperty({
    required: false,
    description: 'Optional 4-digit PIN for legacy child device login (Milestone 1: omit — kids use parent device + Kid Identity flow)',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}$/, { message: 'initialPin must be exactly 4 digits' })
  initialPin?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  familyId?: string;
}

export class BaselineAnswerDto {
  @ApiProperty()
  @IsString()
  questionId!: string;

  @ApiProperty()
  answer!: unknown; // Can be string, number, or array depending on question type
}

export class SubmitBaselineDto {
  @ApiProperty({ type: [BaselineAnswerDto] })
  @IsArray()
  answers!: BaselineAnswerDto[];
}
