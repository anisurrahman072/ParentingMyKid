import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

interface SessionCacheDocument {
  _id: string;
  key: string;
  value: string;
  expiresAt: Date;
}

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);

  constructor(
    @InjectModel('SessionCache') private readonly cacheModel: Model<SessionCacheDocument>,
  ) {}

  private async upsertCache(key: string, value: string, ttlSeconds: number): Promise<void> {
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
    await this.cacheModel.findOneAndUpdate(
      { key },
      { key, value, expiresAt },
      { upsert: true, new: true },
    );
  }

  private async getCacheValue(key: string): Promise<string | null> {
    const doc = await this.cacheModel.findOne({ key, expiresAt: { $gt: new Date() } }).lean();
    return doc ? doc.value : null;
  }

  // ─── Session / Token Cache ─────────────────────────────────────────────────

  async setSession(userId: string, tokenHash: string, ttlSeconds: number): Promise<void> {
    await this.upsertCache(`session:${userId}:${tokenHash}`, '1', ttlSeconds);
  }

  async sessionExists(userId: string, tokenHash: string): Promise<boolean> {
    const val = await this.getCacheValue(`session:${userId}:${tokenHash}`);
    return val !== null;
  }

  async deleteSession(userId: string, tokenHash: string): Promise<void> {
    await this.cacheModel.deleteOne({ key: `session:${userId}:${tokenHash}` });
  }

  async revokeAllSessions(userId: string): Promise<void> {
    await this.cacheModel.deleteMany({ key: { $regex: `^session:${userId}:` } });
  }

  // ─── Pairing Codes ─────────────────────────────────────────────────────────

  async setPairingCode(code: string, payload: { parentId: string; childId: string }): Promise<void> {
    await this.upsertCache(`pair:${code}`, JSON.stringify(payload), 300);
  }

  async getPairingCode(code: string): Promise<{ parentId: string; childId: string } | null> {
    const raw = await this.getCacheValue(`pair:${code}`);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as { parentId?: string; childId?: string };
      if (!parsed.parentId || !parsed.childId) return null;
      return { parentId: parsed.parentId, childId: parsed.childId };
    } catch {
      return null;
    }
  }

  async deletePairingCode(code: string): Promise<void> {
    await this.cacheModel.deleteOne({ key: `pair:${code}` });
  }

  // ─── Rate Limiting ─────────────────────────────────────────────────────────

  async incrementRateLimit(key: string, windowSeconds: number): Promise<number> {
    const cacheKey = `ratelimit:${key}`;
    const expiresAt = new Date(Date.now() + windowSeconds * 1000);
    const doc = await this.cacheModel.findOneAndUpdate(
      { key: cacheKey },
      { $inc: { value: 1 } as any, $setOnInsert: { expiresAt } },
      { upsert: true, new: true },
    ).lean();
    return parseInt(String(doc?.value ?? '1'), 10);
  }

  // ─── Notification Deduplication ───────────────────────────────────────────

  async markNotificationSent(childId: string, alertType: string): Promise<void> {
    await this.upsertCache(`notif:${childId}:${alertType}`, '1', 86400);
  }

  async wasNotificationSent(childId: string, alertType: string): Promise<boolean> {
    const val = await this.getCacheValue(`notif:${childId}:${alertType}`);
    return val !== null;
  }

  // ─── Wellbeing Score Cache ─────────────────────────────────────────────────

  async cacheWellbeingScore(childId: string, score: number): Promise<void> {
    await this.upsertCache(`wellbeing:${childId}`, score.toString(), 82800);
  }

  async getCachedWellbeingScore(childId: string): Promise<number | null> {
    const value = await this.getCacheValue(`wellbeing:${childId}`);
    return value !== null ? parseFloat(value) : null;
  }

  // ─── Generic Get/Set ───────────────────────────────────────────────────────

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    await this.upsertCache(key, value, ttlSeconds ?? 86400 * 365);
  }

  async get(key: string): Promise<string | null> {
    return this.getCacheValue(key);
  }

  async del(key: string): Promise<void> {
    await this.cacheModel.deleteOne({ key });
  }
}
