import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class NutritionService {
  constructor(private readonly prisma: PrismaService) {}
}
