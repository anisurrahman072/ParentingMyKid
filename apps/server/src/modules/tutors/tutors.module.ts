import { Module } from '@nestjs/common';
import { TutorsController } from './tutors.controller';
import { TutorsService } from './tutors.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [NotificationsModule, AiModule],
  controllers: [TutorsController],
  providers: [TutorsService],
  exports: [TutorsService],
})
export class TutorsModule {}
