import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsNotEmpty,
  MaxLength,
  IsIn,
  IsInt,
  Min,
  Max,
  IsISO8601,
  IsArray,
  ArrayMinSize,
} from 'class-validator';

const EVENT_TYPES = [
  'EXAM',
  'APPOINTMENT',
  'BIRTHDAY',
  'TRIP',
  'SCHOOL',
  'SPORTS',
  'TUITION',
  'EID',
  'CUSTOM',
] as const;

export class CreateFamilyCalendarEventDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title!: string;

  @ApiProperty({ enum: EVENT_TYPES })
  @IsString()
  @IsIn([...EVENT_TYPES])
  type!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({ description: 'Optional place or address (plain text)' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  location?: string;

  @ApiProperty({ description: 'ISO 8601 — first occurrence / anchor time' })
  @IsISO8601()
  startAt!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsISO8601()
  endAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  childId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(30)
  reminderDays?: number;

  @ApiPropertyOptional({ enum: ['NONE', 'WEEKLY'], default: 'NONE' })
  @IsOptional()
  @IsString()
  @IsIn(['NONE', 'WEEKLY'])
  recurrenceKind?: 'NONE' | 'WEEKLY';

  @ApiPropertyOptional({ description: '0 = Sunday … 6 = Saturday; legacy single day when array not sent' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(6)
  recurrenceByWeekday?: number;

  @ApiPropertyOptional({
    type: [Number],
    description: '0 = Sunday … 6 = Saturday; when WEEKLY, send at least one day (or use recurrenceByWeekday)',
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(6, { each: true })
  recurrenceByWeekdays?: number[];

  @ApiPropertyOptional({ type: [String], description: 'Family member user IDs involved in this event' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  assigneeUserIds?: string[];

  @ApiPropertyOptional({ type: [String], description: 'Child profile IDs involved in this event' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  assigneeChildIds?: string[];
}

export class UpdateFamilyCalendarEventDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional({ enum: EVENT_TYPES })
  @IsOptional()
  @IsString()
  @IsIn([...EVENT_TYPES])
  type?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  location?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsISO8601()
  startAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsISO8601()
  endAt?: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  childId?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(30)
  reminderDays?: number | null;

  @ApiPropertyOptional({ enum: ['NONE', 'WEEKLY'] })
  @IsOptional()
  @IsString()
  @IsIn(['NONE', 'WEEKLY'])
  recurrenceKind?: 'NONE' | 'WEEKLY';

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(6)
  recurrenceByWeekday?: number | null;

  @ApiPropertyOptional({ type: [Number], nullable: true })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(6, { each: true })
  recurrenceByWeekdays?: number[] | null;

  @ApiPropertyOptional({ type: [String], nullable: true })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  assigneeUserIds?: string[] | null;

  @ApiPropertyOptional({ type: [String], nullable: true })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  assigneeChildIds?: string[] | null;
}
