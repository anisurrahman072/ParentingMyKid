/**
 * @module leads.module.ts
 * @description Marketing-site lead capture — public API, Prisma + optional Resend.
 */

import { Module } from '@nestjs/common';

import { LeadsController } from './leads.controller';
import { LeadsService } from './leads.service';

@Module({
  controllers: [LeadsController],
  providers: [LeadsService],
  exports: [LeadsService],
})
export class LeadsModule {}
