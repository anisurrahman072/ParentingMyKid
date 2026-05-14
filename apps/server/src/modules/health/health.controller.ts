import { Controller, Get } from '@nestjs/common';

/**
 * Lightweight liveness probe for orchestrators (e.g. Render health checks).
 * No auth — must stay cheap and resilient (no DB access).
 */
@Controller('health')
export class HealthController {
  @Get()
  live(): { status: string; service: string } {
    return { status: 'ok', service: 'pmk-api' };
  }
}
