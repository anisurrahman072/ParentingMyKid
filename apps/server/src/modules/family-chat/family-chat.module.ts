import { Module } from '@nestjs/common';
import { FamilyChatService } from './family-chat.service';
import { FamilyChatController } from './family-chat.controller';
import { DatabaseModule } from '../../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [FamilyChatController],
  providers: [FamilyChatService],
  exports: [FamilyChatService],
})
export class FamilyChatModule {}
