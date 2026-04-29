/**
 * @module media.controller.ts
 * @description Media endpoints — YouTube search proxy and Cloudinary upload.
 *              All routes are under /api/v1/media/
 */

import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { MediaService } from './media.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

class UploadBase64Dto {
  @ApiProperty()
  @IsString()
  base64!: string;

  @ApiProperty()
  @IsString()
  folder!: string;

  @ApiProperty()
  @IsString()
  contentType!: string;
}

@ApiTags('Media')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @ApiOperation({ summary: 'Server-side YouTube search proxy with safe-search filtering' })
  @ApiQuery({ name: 'q', required: true })
  @ApiQuery({ name: 'lang', required: false })
  @ApiQuery({ name: 'safeSearch', required: false })
  @ApiQuery({ name: 'religion', required: false })
  @ApiQuery({ name: 'gender', required: false })
  @ApiQuery({ name: 'ageGroup', required: false })
  @Get('youtube-search')
  youtubeSearch(
    @Query('q') q: string,
    @Query('lang') lang?: string,
    @Query('safeSearch') safeSearch?: string,
    @Query('religion') religion?: string,
    @Query('gender') gender?: string,
    @Query('ageGroup') ageGroup?: string,
  ) {
    return this.mediaService.youtubeSearch({ q, lang, safeSearch, religion, gender, ageGroup });
  }

  @ApiOperation({ summary: 'Upload base64-encoded media to Cloudinary' })
  @Post('upload-base64')
  uploadBase64(@Body() dto: UploadBase64Dto) {
    return this.mediaService.uploadBase64(dto);
  }
}
