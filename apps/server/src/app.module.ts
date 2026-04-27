/**
 * @module app.module.ts
 * @description Root NestJS application module. Registers all feature modules,
 *              global configuration, throttling, and the database connection.
 *
 * @business-rule Every feature module represents a domain of the ParentingMyKid business.
 *               Adding a new feature always means: create a new module, register it here.
 */

import { join } from 'node:path';

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';

// Shared Infrastructure
import { DatabaseModule } from './database/database.module';
import { RedisModule } from './common/redis/redis.module';

// Feature Modules
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { FamiliesModule } from './modules/families/families.module';
import { ChildrenModule } from './modules/children/children.module';
import { HabitsModule } from './modules/habits/habits.module';
import { MissionsModule } from './modules/missions/missions.module';
import { RewardsModule } from './modules/rewards/rewards.module';
import { GamingModule } from './modules/gaming/gaming.module';
import { NutritionModule } from './modules/nutrition/nutrition.module';
import { SafetyModule } from './modules/safety/safety.module';
import { SocialMonitorModule } from './modules/social-monitor/social-monitor.module';
import { AiModule } from './modules/ai/ai.module';
import { TutorsModule } from './modules/tutors/tutors.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { IslamicModule } from './modules/islamic/islamic.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { MemoryModule } from './modules/memory/memory.module';
import { CalendarModule } from './modules/calendar/calendar.module';
import { FinanceModule } from './modules/finance/finance.module';
import { CommunityModule } from './modules/community/community.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { LeadsModule } from './modules/leads/leads.module';
import { FamilyChatModule } from './modules/family-chat/family-chat.module';
import { FriendsModule } from './modules/friends/friends.module';

@Module({
  imports: [
    // Global config — loads .env file and validates environment variables
    ConfigModule.forRoot({
      isGlobal: true,
      // Nest resolves `.env` from process.cwd(). When the API is started from the repo root
      // (turbo, some IDEs), cwd may not be `apps/server`, so `RESEND_API_KEY` would be missing
      // while `DATABASE_URL` still works if set in the shell. Include both locations.
      envFilePath: [
        join(process.cwd(), '.env'),
        join(process.cwd(), '.env.local'),
        join(process.cwd(), 'apps', 'server', '.env'),
        join(process.cwd(), 'apps', 'server', '.env.local'),
      ],
    }),

    // Rate limiting — protects AI endpoints and auth from abuse
    // AI endpoints have their own stricter throttling via module-level guards
    ThrottlerModule.forRoot([
      {
        ttl: 60000,  // 1 minute window
        limit: 100,  // Max 100 requests per minute per IP
      },
    ]),

    // Cron jobs for scheduled tasks (weekly reports, reminders)
    ScheduleModule.forRoot(),

    // Database (Prisma + Neon PostgreSQL) — global, available to all modules
    DatabaseModule,

    // Redis (Upstash) — global, available to all modules
    RedisModule,

    // Feature Modules — each owns its domain
    AuthModule,
    UsersModule,
    FamiliesModule,
    ChildrenModule,
    HabitsModule,
    MissionsModule,
    RewardsModule,
    GamingModule,
    NutritionModule,
    SafetyModule,
    SocialMonitorModule,
    AiModule,
    TutorsModule,
    NotificationsModule,
    IslamicModule,
    PaymentsModule,
    MemoryModule,
    CalendarModule,
    FinanceModule,
    CommunityModule,
    AnalyticsModule,
    LeadsModule,
    FamilyChatModule,
    FriendsModule,
  ],
})
export class AppModule {}
