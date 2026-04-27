import { Module } from '@nestjs/common';
import { ChildrenController } from './children.controller';
import { ChildrenService } from './children.service';
import { ChildPinCryptoModule } from '../../common/child-pin-crypto/child-pin-crypto.module';

@Module({
  imports: [ChildPinCryptoModule],
  controllers: [ChildrenController],
  providers: [ChildrenService],
  exports: [ChildrenService],
})
export class ChildrenModule {}
