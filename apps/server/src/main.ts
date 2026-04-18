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

import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

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
    logger.log(`Swagger docs: http://localhost:${port}/api/docs`);
  }

  await app.listen(port, '0.0.0.0');
  logger.log(`ParentingMyKid server running on port ${port} [${nodeEnv}]`);
}

bootstrap();
