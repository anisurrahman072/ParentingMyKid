import { Controller, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CommunityService } from './community.service';

@ApiTags('community')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('community')
export class CommunityController {
  constructor(private readonly service: CommunityService) {}
}
