/**
 * @module prisma.service.ts
 * @description Singleton Prisma client service that manages the database connection lifecycle.
 *              Connects to Neon.tech PostgreSQL on startup and gracefully disconnects on shutdown.
 *
 * @business-rule Neon.tech is a serverless PostgreSQL that auto-scales to zero when idle.
 *               This is why we explicitly connect on startup — Neon needs a moment to wake up
 *               if it has been idle. The connect-on-startup pattern avoids first-request latency.
 */

import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    });
  }

  async onModuleInit(): Promise<void> {
    try {
      await this.$connect();
      this.logger.log('Connected to Neon PostgreSQL database');
    } catch (error) {
      this.logger.error('Failed to connect to database', error);
      throw error;
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
    this.logger.log('Disconnected from database');
  }
}
