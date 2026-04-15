/**
 * @module redis.service.ts
 * @description Upstash Redis client wrapper for NestJS.
 *              Uses HTTP-based Redis (Upstash) — no TCP connection needed.
 *              This works with Railway deployment without any Redis server setup.
 *
 * @business-rule Redis is used for:
 *   1. JWT refresh token session cache (fast auth on every request, avoids DB hit)
 *   2. Rate limiting (protect AI endpoints from abuse)
 *   3. Streak counters (O(1) sorted sets)
 *   4. Notification deduplication (prevent sending same alert twice)
 *   5. Pairing code TTL (6-digit code expires in 5 minutes)
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from '@upstash/redis';

@Injectable()
export class RedisService {
  private readonly client: Redis;
  private readonly logger = new Logger(RedisService.name);

  constructor(private readonly config: ConfigService) {
    this.client = new Redis({
      url: config.getOrThrow<string>('UPSTASH_REDIS_REST_URL'),
      token: config.getOrThrow<string>('UPSTASH_REDIS_REST_TOKEN'),
    });

    this.logger.log('Connected to Upstash Redis');
  }

  // ─── Session / Token Cache ─────────────────────────────────────────────────

  /**
   * Stores a session token hash in Redis with a TTL.
   * Used to validate refresh tokens without hitting the database on every request.
   */
  async setSession(userId: string, tokenHash: string, ttlSeconds: number): Promise<void> {
    await this.client.setex(`session:${userId}:${tokenHash}`, ttlSeconds, '1');
  }

  async sessionExists(userId: string, tokenHash: string): Promise<boolean> {
    const result = await this.client.get(`session:${userId}:${tokenHash}`);
    return result !== null;
  }

  async deleteSession(userId: string, tokenHash: string): Promise<void> {
    await this.client.del(`session:${userId}:${tokenHash}`);
  }

  /** Revoke ALL sessions for a user (e.g., password change, account compromise) */
  async revokeAllSessions(userId: string): Promise<void> {
    const keys = await this.client.keys(`session:${userId}:*`);
    if (keys.length > 0) {
      await this.client.del(...keys);
    }
  }

  // ─── Pairing Codes ─────────────────────────────────────────────────────────

  /**
   * Stores a 6-digit device pairing code.
   * Code expires in 5 minutes — prevents stale codes from being used.
   */
  async setPairingCode(code: string, parentId: string): Promise<void> {
    await this.client.setex(`pair:${code}`, 300, parentId); // 5 minute TTL
  }

  async getPairingCode(code: string): Promise<string | null> {
    return this.client.get<string>(`pair:${code}`);
  }

  async deletePairingCode(code: string): Promise<void> {
    await this.client.del(`pair:${code}`);
  }

  // ─── Rate Limiting ─────────────────────────────────────────────────────────

  /**
   * Increments a rate limit counter for a given key (usually IP + endpoint).
   * Returns the current count after increment.
   */
  async incrementRateLimit(key: string, windowSeconds: number): Promise<number> {
    const count = await this.client.incr(`ratelimit:${key}`);
    if (count === 1) {
      // Set TTL only on first increment to avoid resetting the window
      await this.client.expire(`ratelimit:${key}`, windowSeconds);
    }
    return count;
  }

  // ─── Notification Deduplication ───────────────────────────────────────────

  /**
   * Marks a notification as sent for a given child and alert type.
   * Prevents sending duplicate alerts for the same event.
   * TTL: 24 hours — after 24h the same alert type can trigger again.
   */
  async markNotificationSent(childId: string, alertType: string): Promise<void> {
    await this.client.setex(`notif:${childId}:${alertType}`, 86400, '1');
  }

  async wasNotificationSent(childId: string, alertType: string): Promise<boolean> {
    const result = await this.client.get(`notif:${childId}:${alertType}`);
    return result !== null;
  }

  // ─── Wellbeing Score Cache ─────────────────────────────────────────────────

  /**
   * Caches the AI-calculated wellbeing score for a child.
   * Score is recalculated daily — cached for 23 hours to avoid redundant AI calls.
   */
  async cacheWellbeingScore(childId: string, score: number): Promise<void> {
    await this.client.setex(`wellbeing:${childId}`, 82800, score.toString()); // 23 hours
  }

  async getCachedWellbeingScore(childId: string): Promise<number | null> {
    const value = await this.client.get<string>(`wellbeing:${childId}`);
    return value !== null ? parseFloat(value) : null;
  }

  // ─── Generic Get/Set ───────────────────────────────────────────────────────

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (ttlSeconds) {
      await this.client.setex(key, ttlSeconds, value);
    } else {
      await this.client.set(key, value);
    }
  }

  async get(key: string): Promise<string | null> {
    return this.client.get<string>(key);
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }
}
