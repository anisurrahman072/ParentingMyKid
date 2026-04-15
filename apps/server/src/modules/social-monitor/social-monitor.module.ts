import { Module } from '@nestjs/common';
import { SocialMonitorController } from './social-monitor.controller';
import { SocialMonitorService } from './social-monitor.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [SocialMonitorController],
  providers: [SocialMonitorService],
  exports: [SocialMonitorService],
})
export class SocialMonitorModule {}
