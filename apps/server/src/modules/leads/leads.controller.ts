/**
 * @module leads.controller.ts
 * @description Public POST endpoint for marketing-site newsletter + feedback (no JWT).
 */

import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CreateLeadDto } from './dto/create-lead.dto';
import { LeadsService } from './leads.service';

@ApiTags('leads')
@Controller('leads')
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Subscribe (newsletter) or submit feedback from the marketing site' })
  @ApiBody({ type: CreateLeadDto })
  async create(@Body() dto: CreateLeadDto): Promise<{ ok: true; kind: 'lead' | 'feedback' }> {
    return this.leadsService.create(dto);
  }
}
