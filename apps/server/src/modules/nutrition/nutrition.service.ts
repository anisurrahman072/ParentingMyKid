import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';

@Injectable()
export class NutritionService {
  constructor(private readonly db: DatabaseService) {}
}
