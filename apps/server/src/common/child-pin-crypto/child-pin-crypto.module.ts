import { Module } from '@nestjs/common';
import { ChildPinCryptoService } from './child-pin-crypto.service';

@Module({
  providers: [ChildPinCryptoService],
  exports: [ChildPinCryptoService],
})
export class ChildPinCryptoModule {}
