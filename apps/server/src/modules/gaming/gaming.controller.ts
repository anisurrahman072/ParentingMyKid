import { Controller, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GamingService } from './gaming.service';

@ApiTags('gaming')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('gaming')
export class GamingController {
  constructor(private readonly service: GamingService) {}
}
