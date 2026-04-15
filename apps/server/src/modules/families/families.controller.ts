import { Controller, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FamiliesService } from './families.service';

@ApiTags('families')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('families')
export class FamiliesController {
  constructor(private readonly service: FamiliesService) {}
}
