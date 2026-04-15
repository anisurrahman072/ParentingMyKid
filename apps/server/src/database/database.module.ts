/**
 * @module database.module.ts
 * @description Provides the Prisma service as a global singleton.
 *              Prisma connects to Neon.tech PostgreSQL via DATABASE_URL from .env.
 *              All feature modules import PrismaService to access the database.
 */

import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class DatabaseModule {}
