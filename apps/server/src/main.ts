/**
 * @module main.ts
 * @description NestJS application bootstrap entry point.
 *              Uses Fastify adapter for better performance than Express.
 *              Sets up global validation, versioning, Swagger docs, and CORS.
 *
 * @business-rule This server serves the ParentingMyKid mobile app (Expo).
 *               During local development: default port 3001 (override with PORT)
 *               In production: deployed to Railway.app with auto-SSL
 */

import * as os from 'os';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

/** Non-loopback IPv4 addresses (for phone / Expo on the same Wi‑Fi). */
function getLanIPv4Addresses(): string[] {
  const out: string[] = [];
  const ifaces = os.networkInterfaces();
  for (const name of Object.keys(ifaces)) {
    for (const net of ifaces[name] ?? []) {
      const isV4 = net.family === 'IPv4' || String(net.family) === '4';
      if (isV4 && !net.internal) {
        out.push(net.address);
      }
    }
  }
  return out;
}

async function bootstrap(): Promise<void> {
  const logger = new Logger('Bootstrap');

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: false }),
  );

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 3001);
  const nodeEnv = configService.get<string>('NODE_ENV', 'development');
  const allowedOrigins = configService.get<string>('ALLOWED_ORIGINS', '').split(',');

  // Global validation pipe — rejects any request with invalid DTO data
  // This protects against malformed input that could crash business logic
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,         // Strip unknown fields from request bodies
      forbidNonWhitelisted: true, // Throw error on unknown fields
      transform: true,         // Auto-transform types (string '5' → number 5)
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // CORS — allow the Expo app (local dev + production app URLs)
  app.enableCors({
    origin: nodeEnv === 'production' ? allowedOrigins : true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
  });

  // Global API prefix — all routes are under /api/v1/
  app.setGlobalPrefix('api/v1');

  // Swagger API documentation — only in development
  if (nodeEnv !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('ParentingMyKid API')
      .setDescription(
        'The ParentingMyKid backend API — powers the family growth platform for parents and children.',
      )
      .setVersion('1.0')
      .addBearerAuth()
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document);
  }

  await app.listen(port, '0.0.0.0');
  logStartupUrls(logger, port, nodeEnv);
}

/**
 * Print where the API is reachable (local + LAN) so mobile/Expo can use the right base URL.
 */
function logStartupUrls(logger: Logger, port: number, nodeEnv: string): void {
  const line = '─'.repeat(58);
  logger.log(line);
  logger.log(`  ParentingMyKid API  ·  port ${port}  ·  ${nodeEnv}`);
  logger.log(line);
  logger.log(`  This machine:     http://127.0.0.1:${port}`);
  logger.log(`  This machine:     http://localhost:${port}`);
  logger.log(`  API base (v1):    http://127.0.0.1:${port}/api/v1`);
  if (nodeEnv !== 'production') {
    logger.log(`  Swagger:          http://127.0.0.1:${port}/api/docs`);
  }
  if (nodeEnv !== 'production') {
    const lanIps = getLanIPv4Addresses();
    if (lanIps.length > 0) {
      logger.log('  — Other devices on your Wi‑Fi (phone, tablet, Expo): —');
      for (const ip of lanIps) {
        logger.log(
          `  http://${ip}:${port}/api/v1  ← use this as EXPO_PUBLIC_API_BASE_URL on a device`,
        );
      }
    } else {
      logger.log('  (No LAN IPv4 found — connect Wi‑Fi/Ethernet to show a shareable URL.)');
    }
  }
  logger.log(line);
}

bootstrap();
