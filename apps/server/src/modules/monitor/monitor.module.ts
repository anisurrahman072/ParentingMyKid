import { Module } from '@nestjs/common';
import { MonitorGateway } from './monitor.gateway';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  providers: [MonitorGateway],
})
export class MonitorModule {}
