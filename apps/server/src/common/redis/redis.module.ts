/**
 * @module redis.module.ts
 * @description Global Redis module — provides RedisService to all feature modules.
 *              Uses Upstash Redis (HTTP-based, free tier, no server needed).
 */

import { Global, Module } from '@nestjs/common';
import { RedisService } from './redis.service';

@Global()
@Module({
  providers: [RedisService],
  exports: [RedisService],
})
export class RedisModule {}
