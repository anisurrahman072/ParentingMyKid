/**
 * @module parent-content.controller.ts
 * @description REST endpoints for parent-curated content library.
 *              All routes are under /api/v1/parent-content/
 */

import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ParentContentService, CreateParentContentDto } from './parent-content.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Parent Content')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('parent-content')
export class ParentContentController {
  constructor(private readonly parentContentService: ParentContentService) {}

  @ApiOperation({ summary: 'Create new parent content item' })
  @Post()
  create(@Body() dto: CreateParentContentDto) {
    return this.parentContentService.create(dto);
  }

  @ApiOperation({ summary: 'Get all content for a family' })
  @Get('family/:familyId')
  findByFamily(@Param('familyId') familyId: string) {
    return this.parentContentService.findByFamily(familyId);
  }

  @ApiOperation({ summary: 'Get content for a specific child (includes family-wide)' })
  @Get('child/:childId')
  findByChild(@Param('childId') childId: string) {
    return this.parentContentService.findByChild(childId);
  }

  @ApiOperation({ summary: 'Mark content as read/unread' })
  @Patch(':id/read')
  markRead(@Param('id') id: string, @Body() body: { isRead: boolean }) {
    return this.parentContentService.markRead(id, body.isRead);
  }

  @ApiOperation({ summary: 'Delete a content item' })
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.parentContentService.remove(id);
  }
}
