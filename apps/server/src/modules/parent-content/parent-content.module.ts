import { Module } from '@nestjs/common';
import { ParentContentController } from './parent-content.controller';
import { ParentContentService } from './parent-content.service';

@Module({
  controllers: [ParentContentController],
  providers: [ParentContentService],
  exports: [ParentContentService],
})
export class ParentContentModule {}
