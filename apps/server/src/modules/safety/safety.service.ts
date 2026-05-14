/**
 * @module safety.service.ts
 * @description The safety and protection engine — the #1 reason parents pay.
 *
 *              Key capabilities:
 *              - Real-time GPS location tracking
 *              - Geofence management (home, school, safe zones)
 *              - SOS emergency button handler
 *              - Screen time controls (pause, limits, bedtime, driving mode)
 *              - App/website blocking rules management
 *              - AI content monitoring alert ingestion
 *              - Digital wellbeing report generation
 *
 * @business-rule Bark monitored 7.3 million children and detected:
 *               5.2 million severe self-harm situations
 *               8.3 million severe bullying situations
 *               This is why parents pay — IMMEDIATELY — without price objection.
 *               Safety is the #1 payment trigger in this market.
 */

import { Injectable, ForbiddenException, NotFoundException, Logger } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  ChildLocation,
  Geofence,
  SafetyAlert,
  ScreenTimeControls,
  AlertSeverity,
  normalizeDomainForPolicy,
  NotificationType,
  LocationEventType,
  GeofenceType,
} from '@parentingmykid/shared-types';
import {
  IsString,
  IsNumber,
  IsOptional,
  IsBoolean,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class LogLocationDto {
  @ApiProperty()
  @IsNumber()
  lat!: number;

  @ApiProperty()
  @IsNumber()
  lon!: number;

  @ApiProperty()
  @IsNumber()
  accuracy!: number;

  @ApiProperty()
  @IsString()
  eventType!: string;
}

export class CreateGeofenceDto {
  @ApiProperty()
  @IsString()
  name!: string;

  @ApiProperty({ enum: ['HOME', 'SCHOOL', 'SAFE_ZONE'] })
  @IsString()
  type!: string;

  @ApiProperty()
  @IsNumber()
  centerLat!: number;

  @ApiProperty()
  @IsNumber()
  centerLon!: number;

  @ApiProperty({ description: 'Radius in meters' })
  @IsNumber()
  radiusMeters!: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  address?: string;
}

export class UpdateScreenTimeDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  dailyLimitMinutes?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  isPaused?: boolean; // Emergency internet pause

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  bedtimeStart?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  bedtimeEnd?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  youtubeRestrictedMode?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsArray()
  blockedApps?: string[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  blockedWebsites?: string[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  youtubeAllowedChannelIds?: string[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  youtubeBlockedChannelIds?: string[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  youtubeAllowlistMode?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  blockAllAppsEnabled?: boolean;
}

export class BatchScreenUsageSessionDto {
  @ApiProperty()
  @IsString()
  pkg!: string;

  @ApiProperty({ description: 'YYYY-MM-DD (device-local calendar day)' })
  @IsString()
  date!: string;

  @ApiProperty()
  @IsNumber()
  startMs!: number;

  @ApiProperty()
  @IsNumber()
  endMs!: number;

  @ApiProperty()
  @IsNumber()
  durationMs!: number;
}

export class BatchScreenUsageBodyDto {
  @ApiProperty({ type: [BatchScreenUsageSessionDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BatchScreenUsageSessionDto)
  sessions!: BatchScreenUsageSessionDto[];
}

@Injectable()
export class SafetyService {
  private readonly logger = new Logger(SafetyService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly notifications: NotificationsService,
  ) {}

  // ─── Location Tracking ────────────────────────────────────────────────────

  /**
   * Logs a location event from the child's device.
   * Automatically checks if the child has exited any geofence and alerts parents.
   */
  async logLocation(childId: string, dto: LogLocationDto): Promise<void> {
    await this.db.locationEvent.create({
      childId,
      lat: dto.lat,
      lon: dto.lon,
      accuracy: dto.accuracy,
      eventType: dto.eventType as LocationEventType,
    });

    await this.checkGeofences(childId, dto.lat, dto.lon, dto.eventType as LocationEventType);
  }

  async getChildLocation(parentId: string, childId: string): Promise<ChildLocation | null> {
    await this.assertParentChildAccess(parentId, childId);

    const latest = await this.db.locationEvent.findOne({ childId }).sort({ timestamp: -1 }).lean();

    if (!latest) return null;

    return {
      childId: latest.childId,
      lat: latest.lat,
      lon: latest.lon,
      accuracy: latest.accuracy,
      timestamp: (latest.timestamp as Date).toISOString(),
      eventType: latest.eventType as LocationEventType,
      address: latest.address ?? undefined,
    };
  }

  // ─── SOS Emergency Button ─────────────────────────────────────────────────

  /**
   * Triggered by child pressing the big RED SOS button on their screen.
   * Immediately sends CRITICAL notification to all parents and emergency contacts.
   * This is the highest-priority action in the entire app — no throttling.
   */
  async triggerSOS(childId: string): Promise<void> {
    const child = await this.db.childProfile.findOne({ _id: childId }).lean();
    if (!child) throw new NotFoundException('Child not found');

    const latestLocation = await this.db.locationEvent
      .findOne({ childId })
      .sort({ timestamp: -1 })
      .lean();

    await this.db.locationEvent.create({
      childId,
      lat: latestLocation?.lat ?? 0,
      lon: latestLocation?.lon ?? 0,
      accuracy: latestLocation?.accuracy ?? 0,
      eventType: LocationEventType.SOS,
    });

    await this.db.safetyAlert.create({
      childId,
      category: 'CYBERBULLYING',
      severity: 'CRITICAL',
      title: `🚨 SOS Alert: ${child.name} needs help!`,
      description: `${child.name} has pressed the SOS button. Please check on them immediately.`,
    });

    await this.notifications.sendSafetyAlertToFamily(String(child.familyId), childId, {
      type: NotificationType.SOS,
      title: `🚨 SOS: ${child.name} needs help!`,
      body: 'Your child pressed the emergency button. Check their location and call them immediately.',
      data: { screen: 'safety/location', childId },
      priority: 'max',
    });

    this.logger.warn(`SOS triggered by child ${childId} (${child.name})`);
  }

  // ─── Geofences ────────────────────────────────────────────────────────────

  async createGeofence(
    parentId: string,
    childId: string,
    dto: CreateGeofenceDto,
  ): Promise<Geofence> {
    await this.assertParentChildAccess(parentId, childId);

    const geofence = await this.db.geofence.create({
      childId,
      name: dto.name,
      type: dto.type as GeofenceType,
      centerLat: dto.centerLat,
      centerLon: dto.centerLon,
      radiusMeters: dto.radiusMeters,
      address: dto.address,
    });

    return {
      id: String(geofence._id),
      childId: geofence.childId,
      name: geofence.name,
      type: geofence.type as GeofenceType,
      centerLat: geofence.centerLat,
      centerLon: geofence.centerLon,
      radiusMeters: geofence.radiusMeters,
      address: geofence.address ?? undefined,
      isActive: geofence.isActive,
    };
  }

  // ─── Screen Time Controls ─────────────────────────────────────────────────

  /** Normalizes Mongoose `Mixed` / API payloads into `string[]` for domain lists. */
  private jsonToStringArray(value: unknown): string[] {
    if (value == null) return [];
    const parts: string[] = [];
    const pushNormalized = (s: unknown) => {
      if (typeof s !== 'string') return;
      const n = normalizeDomainForPolicy(s);
      if (n) parts.push(n);
    };
    if (Array.isArray(value)) {
      for (const item of value) pushNormalized(item);
    } else if (typeof value === 'string') {
      const t = value.trim();
      if (!t) return [];
      try {
        parts.push(...this.jsonToStringArray(JSON.parse(t) as unknown));
        return [...new Set(parts)];
      } catch {
        pushNormalized(t);
      }
    }
    return [...new Set(parts)];
  }

  /** Effective mode for API / clients; DB column added in migration may be absent on old rows until migrate. */
  private normalizeWebsiteFilterMode(controls: {
    websiteFilterMode?: string | null;
    allowedDomains: unknown;
  }): 'WHITELIST' | 'BLACKLIST' {
    const m = controls.websiteFilterMode;
    if (m === 'WHITELIST' || m === 'BLACKLIST') return m;
    return this.jsonToStringArray(controls.allowedDomains).length > 0 ? 'WHITELIST' : 'BLACKLIST';
  }

  private parseGameSettingsJson(value: unknown): Record<string, unknown> {
    if (value == null || typeof value !== 'object') return {};
    return value as Record<string, unknown>;
  }

  private mapToScreenTimeControls(controls: {
    childId: string;
    dailyLimitMinutes: number;
    socialMediaLimitMinutes: number;
    gamingLimitMinutes: number;
    youtubeLimitMinutes: number;
    youtubeRestrictedMode: boolean;
    safeSearchEnabled: boolean;
    youtubeAllowedChannelIds: string[];
    youtubeBlockedChannelIds: string[];
    youtubeAllowlistMode: boolean;
    controlsVersion: number;
    bedtimeStart: string;
    bedtimeEnd: string;
    morningUnlockTime: string;
    focusTimeStart: string | null | undefined;
    focusTimeEnd: string | null | undefined;
    drivingModeEnabled: boolean;
    isPaused: boolean;
    blockedApps: string[];
    blockedWebsites: string[];
    appGuardEnabled: boolean;
    blockAllAppsEnabled?: boolean;
    stopInternetEnabled: boolean;
    stopInternetActivation?: string;
    stopInternetDelayedMinutes?: number;
    stopInternetBlockStartsAtUtc?: Date | string | null;
    websiteFilteringEnabled?: boolean;
    websiteFilterMode?: string | null;
    blockNetworkChanges?: boolean;
    silentCameraEnabled: boolean;
    blockedDomains: unknown;
    allowedDomains: unknown;
    gamesEnabled?: boolean;
    gameSettingsJson?: unknown;
    videoSettings?: unknown;
  }): ScreenTimeControls {
    const startsRaw = controls.stopInternetBlockStartsAtUtc;
    const startsIso =
      startsRaw instanceof Date
        ? startsRaw.toISOString()
        : startsRaw != null && typeof startsRaw === 'string'
          ? startsRaw
          : undefined;
    return {
      childId: controls.childId,
      dailyLimitMinutes: controls.dailyLimitMinutes,
      socialMediaLimitMinutes: controls.socialMediaLimitMinutes,
      gamingLimitMinutes: controls.gamingLimitMinutes,
      youtubeLimitMinutes: controls.youtubeLimitMinutes,
      youtubeRestrictedMode: controls.youtubeRestrictedMode,
      safeSearchEnabled: controls.safeSearchEnabled,
      youtubeAllowedChannelIds: controls.youtubeAllowedChannelIds,
      youtubeBlockedChannelIds: controls.youtubeBlockedChannelIds,
      youtubeAllowlistMode: controls.youtubeAllowlistMode,
      controlsVersion: controls.controlsVersion,
      bedtimeStart: controls.bedtimeStart,
      bedtimeEnd: controls.bedtimeEnd,
      morningUnlockTime: controls.morningUnlockTime,
      focusTimeStart: controls.focusTimeStart ?? undefined,
      focusTimeEnd: controls.focusTimeEnd ?? undefined,
      drivingModeEnabled: controls.drivingModeEnabled,
      isPaused: controls.isPaused,
      blockedApps: controls.blockedApps,
      blockedWebsites: controls.blockedWebsites,
      appGuardEnabled: controls.appGuardEnabled,
      blockAllAppsEnabled: controls.blockAllAppsEnabled ?? false,
      stopInternetEnabled: controls.stopInternetEnabled,
      stopInternetActivation: controls.stopInternetActivation ?? 'IMMEDIATE',
      stopInternetDelayedMinutes: controls.stopInternetDelayedMinutes ?? 30,
      stopInternetBlockStartsAtUtc: startsIso,
      websiteFilteringEnabled: controls.websiteFilteringEnabled ?? false,
      websiteFilterMode: this.normalizeWebsiteFilterMode(controls),
      blockNetworkChanges: controls.blockNetworkChanges ?? false,
      silentCameraEnabled: controls.silentCameraEnabled,
      blockedDomains: this.jsonToStringArray(controls.blockedDomains),
      allowedDomains: this.jsonToStringArray(controls.allowedDomains),
      gamesEnabled: controls.gamesEnabled ?? true,
      gameSettings: this.parseGameSettingsJson(controls.gameSettingsJson ?? {}),
      videoSettings:
        controls.videoSettings == null || typeof controls.videoSettings !== 'object'
          ? undefined
          : (controls.videoSettings as Record<string, unknown>),
    };
  }

  async getScreenTimeControls(parentId: string, childId: string): Promise<ScreenTimeControls> {
    await this.assertParentChildAccess(parentId, childId);

    let row: any = await this.db.screenTimeControls.findOne({ childId }).lean();
    if (!row) {
      const created = await this.db.screenTimeControls.create({ childId });
      row = created.toObject();
    }

    return this.mapToScreenTimeControls(row);
  }

  /** Child JWT — same rules as parent view, but only for own profile. */
  async getScreenTimeControlsForChild(
    userId: string,
    childId: string,
  ): Promise<ScreenTimeControls> {
    const child = await this.db.childProfile.findOne({ _id: childId }).lean();
    if (!child || child.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    let row: any = await this.db.screenTimeControls.findOne({ childId }).lean();
    if (!row) {
      const created = await this.db.screenTimeControls.create({ childId });
      row = created.toObject();
    }

    return this.mapToScreenTimeControls(row);
  }

  /**
   * Updates screen time controls. The "isPaused" toggle is the one-tap
   * "Pause the Internet" feature parents love — takes effect immediately.
   */
  async updateScreenTimeControls(
    parentId: string,
    childId: string,
    dto: UpdateScreenTimeDto,
  ): Promise<ScreenTimeControls> {
    await this.assertParentChildAccess(parentId, childId);

    const clean = Object.fromEntries(
      Object.entries(dto as object).filter(([, v]) => v !== undefined),
    ) as Record<string, unknown>;

    const controls = await this.db.screenTimeControls
      .findOneAndUpdate({ childId }, { $set: clean, $inc: { controlsVersion: 1 } }, { new: true })
      .lean();

    if (!controls) throw new NotFoundException('Screen time controls not found');

    if (dto.isPaused === true) {
      const child = await this.db.childProfile.findOne({ _id: childId }).lean();
      if (child) {
        const childUser = await this.db.user
          .findOne({ _id: child.userId }, { expoPushToken: 1 })
          .lean();
        if (childUser?.expoPushToken) {
          await this.notifications.sendToUser(String(child.userId), {
            type: NotificationType.SAFETY_ALERT,
            title: 'Screen time paused',
            body: 'Your parent has paused your device. Take a break! 😊',
            data: { action: 'PAUSE' },
            priority: 'high',
          });
        }
      }
    }

    return this.mapToScreenTimeControls(controls as any);
  }

  // ─── AI Content Monitoring Alerts ─────────────────────────────────────────

  /**
   * Ingests an AI-generated safety alert from the social monitoring service.
   * Routes to parent based on severity.
   */
  async createSafetyAlert(
    childId: string,
    alertData: {
      category: string;
      severity: string;
      title: string;
      description: string;
      evidenceSnippet?: string;
      platform?: string;
    },
  ): Promise<void> {
    const child = await this.db.childProfile.findOne({ _id: childId }).lean();
    if (!child) throw new NotFoundException('Child not found');

    const alert = await this.db.safetyAlert.create({
      childId,
      category: alertData.category,
      severity: alertData.severity,
      title: alertData.title,
      description: alertData.description,
      evidenceSnippet: alertData.evidenceSnippet,
      platform: alertData.platform,
    });

    const isCritical = ['HIGH', 'CRITICAL'].includes(alertData.severity);
    if (isCritical) {
      await this.notifications.sendSafetyAlertToFamily(String(child.familyId), childId, {
        type: NotificationType.SAFETY_ALERT,
        title: `⚠️ Safety Alert: ${child.name}`,
        body: alertData.title,
        data: { screen: 'safety/alerts', alertId: String(alert._id), childId },
        priority: alertData.severity === 'CRITICAL' ? 'max' : 'high',
      });
    }
  }

  async getAlerts(parentId: string, childId: string): Promise<SafetyAlert[]> {
    await this.assertParentChildAccess(parentId, childId);

    const alerts = await this.db.safetyAlert
      .find({ childId })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    return alerts.map((a) => {
      const created =
        'createdAt' in a && a.createdAt != null ? new Date(a.createdAt as Date) : null;
      return {
        id: String(a._id),
        childId: a.childId,
        category: a.category as never,
        severity: a.severity as AlertSeverity,
        title: a.title,
        description: a.description,
        evidenceSnippet: a.evidenceSnippet ?? undefined,
        isRead: a.isRead,
        actionTaken: a.actionTaken ?? undefined,
        createdAt: (created ?? new Date()).toISOString(),
      };
    });
  }

  // ─── Extended Parental Controls ───────────────────────────────────────────

  async getParentalControls(parentId: string, childId: string) {
    await this.assertParentChildAccess(parentId, childId);

    let row: any = await this.db.screenTimeControls.findOne({ childId }).lean();
    if (!row) {
      const created = await this.db.screenTimeControls.create({ childId });
      row = created.toObject();
    }

    const allowedDomains = this.jsonToStringArray(row.allowedDomains);
    const blockedDomains = this.jsonToStringArray(row.blockedDomains);
    const websiteFilterMode = this.normalizeWebsiteFilterMode({
      websiteFilterMode: row.websiteFilterMode as string | null | undefined,
      allowedDomains,
    });
    return {
      ...row,
      allowedDomains,
      blockedDomains,
      websiteFilterMode,
      websiteFilteringEnabled: row.websiteFilteringEnabled ?? false,
    };
  }

  async updateParentalControls(parentId: string, childId: string, raw: Record<string, unknown>) {
    await this.assertParentChildAccess(parentId, childId);

    let row: any = await this.db.screenTimeControls.findOne({ childId }).lean();
    if (!row) {
      const created = await this.db.screenTimeControls.create({ childId });
      row = created.toObject();
    }

    const filtered: Record<string, unknown> = { ...raw };
    delete filtered.stopInternetBlockStartsAtUtc;

    const scheduleSlots = filtered.scheduleSlots;
    delete filtered.scheduleSlots;

    const patch: Record<string, unknown> = Object.fromEntries(
      Object.entries(filtered).filter(([, v]) => v !== undefined),
    );
    if (Array.isArray(scheduleSlots)) {
      patch.stopInternetSchedule = scheduleSlots;
    }

    const nextEnabled =
      typeof patch.stopInternetEnabled === 'boolean'
        ? patch.stopInternetEnabled
        : row.stopInternetEnabled;
    const nextActivation =
      typeof patch.stopInternetActivation === 'string'
        ? patch.stopInternetActivation
        : (row.stopInternetActivation ?? 'IMMEDIATE');
    const nextDelayMin =
      typeof patch.stopInternetDelayedMinutes === 'number'
        ? patch.stopInternetDelayedMinutes
        : (row.stopInternetDelayedMinutes ?? 30);

    const stopFieldsTouched =
      raw.stopInternetEnabled !== undefined ||
      raw.stopInternetActivation !== undefined ||
      raw.stopInternetDelayedMinutes !== undefined;

    if (!nextEnabled) {
      patch.stopInternetBlockStartsAtUtc = null;
    } else if (nextActivation !== 'DELAYED') {
      patch.stopInternetBlockStartsAtUtc = null;
    } else if (stopFieldsTouched) {
      const mins = Math.max(1, Number(nextDelayMin) || 30);
      patch.stopInternetBlockStartsAtUtc = new Date(Date.now() + mins * 60_000);
    }

    const websiteFieldsTouched =
      raw.websiteFilterMode !== undefined ||
      raw.allowedDomains !== undefined ||
      raw.blockedDomains !== undefined ||
      raw.websiteFilteringEnabled !== undefined;

    if (websiteFieldsTouched) {
      const rowMode = row.websiteFilterMode as string | undefined;
      const mergedWebsiteEnabled =
        typeof patch.websiteFilteringEnabled === 'boolean'
          ? patch.websiteFilteringEnabled
          : row.websiteFilteringEnabled;
      if (mergedWebsiteEnabled) {
        const fromPatch = patch.websiteFilterMode;
        const mergedMode =
          fromPatch === 'WHITELIST' || fromPatch === 'BLACKLIST'
            ? fromPatch
            : rowMode === 'WHITELIST' || rowMode === 'BLACKLIST'
              ? rowMode
              : 'BLACKLIST';
        patch.websiteFilterMode = mergedMode;
        const rowAllowed = this.jsonToStringArray(row.allowedDomains);
        const rowBlocked = this.jsonToStringArray(row.blockedDomains);
        const mergedAllowed =
          patch.allowedDomains !== undefined
            ? this.jsonToStringArray(patch.allowedDomains)
            : rowAllowed;
        const mergedBlocked =
          patch.blockedDomains !== undefined
            ? this.jsonToStringArray(patch.blockedDomains)
            : rowBlocked;
        if (mergedMode === 'WHITELIST') {
          patch.allowedDomains = mergedAllowed;
          patch.blockedDomains = [];
        } else {
          patch.blockedDomains = mergedBlocked;
          patch.allowedDomains = [];
        }
      } else {
        if (patch.websiteFilterMode !== undefined) {
          const m = patch.websiteFilterMode;
          if (m === 'WHITELIST' || m === 'BLACKLIST') {
            patch.websiteFilterMode = m;
          }
        }
        if (patch.allowedDomains !== undefined) {
          patch.allowedDomains = this.jsonToStringArray(patch.allowedDomains);
        }
        if (patch.blockedDomains !== undefined) {
          patch.blockedDomains = this.jsonToStringArray(patch.blockedDomains);
        }
      }
    }

    return this.db.screenTimeControls
      .findOneAndUpdate({ childId }, { $set: patch }, { new: true })
      .lean();
  }

  /** Upsert native kid-scoped segments into aggregated daily ScreenUsageLog rows. */
  async batchUpsertScreenUsage(
    parentUserId: string,
    childId: string,
    dto: BatchScreenUsageBodyDto,
  ): Promise<{ accepted: number }> {
    await this.assertParentChildAccess(parentUserId, childId);
    let accepted = 0;
    const sessions = Array.isArray(dto.sessions) ? dto.sessions : [];
    for (const s of sessions) {
      const pkg = (s.pkg ?? '').trim().toLowerCase();
      if (!pkg || !this.isIsoDateString(s.date)) continue;
      const sec = Math.max(1, Math.round(Number(s.durationMs ?? 0) / 1000));

      await this.db.screenUsageLog.findOneAndUpdate(
        { childId, date: s.date, packageName: pkg },
        {
          $inc: { durationSeconds: sec },
          $setOnInsert: { appName: pkg, appCategory: 'TRACKED_ANDROID' },
        },
        { upsert: true },
      );
      accepted++;
    }
    return { accepted };
  }

  /** Grouped totals for parental reports (calendar-day range inclusive). */
  async getUsageReport(
    parentUserId: string,
    childId: string,
    from: string,
    to: string,
  ): Promise<
    Array<{
      date: string;
      appName: string;
      packageName: string | null;
      totalSeconds: number;
    }>
  > {
    await this.assertParentChildAccess(parentUserId, childId);

    const rows = await this.db.screenUsageLog.aggregate([
      {
        $match: {
          childId,
          date: { $gte: from, $lte: to },
        },
      },
      {
        $group: {
          _id: { date: '$date', appName: '$appName', packageName: '$packageName' },
          totalSeconds: { $sum: '$durationSeconds' },
        },
      },
    ]);

    return rows
      .map((r: any) => ({
        date: r._id.date as string,
        appName: r._id.appName as string,
        packageName: (r._id.packageName as string | undefined) ?? null,
        totalSeconds: r.totalSeconds as number,
      }))
      .sort((a, b) =>
        b.totalSeconds !== a.totalSeconds
          ? b.totalSeconds - a.totalSeconds
          : a.date.localeCompare(b.date),
      );
  }

  private isIsoDateString(d: string): boolean {
    return typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d);
  }

  // ─── Private Helpers ──────────────────────────────────────────────────────

  private async assertParentChildAccess(parentId: string, childId: string): Promise<void> {
    const child = await this.db.childProfile.findOne({ _id: childId }).lean();
    if (!child) throw new NotFoundException('Child not found');

    const membership = await this.db.familyMember
      .findOne({
        familyId: child.familyId,
        userId: parentId,
      })
      .lean();
    if (!membership) throw new ForbiddenException('Access denied');
  }

  private async checkGeofences(
    childId: string,
    lat: number,
    lon: number,
    eventType: LocationEventType,
  ): Promise<void> {
    const geofences = await this.db.geofence.find({ childId, isActive: true }).lean();

    for (const fence of geofences) {
      const distance = this.calculateDistance(lat, lon, fence.centerLat, fence.centerLon);
      const isInside = distance <= fence.radiusMeters;

      if (!isInside && eventType === LocationEventType.CHECK_IN) {
        const child = await this.db.childProfile.findOne({ _id: childId }).lean();
        if (!child) throw new NotFoundException('Child not found');

        await this.notifications.sendSafetyAlertToFamily(String(child.familyId), childId, {
          type: NotificationType.SAFETY_ALERT,
          title: `📍 ${child.name} left ${fence.name}`,
          body: `${child.name} is no longer at ${fence.name}. Check their location.`,
          data: { screen: 'safety/location', childId },
          priority: 'high',
        });
      }
    }
  }

  /**
   * Haversine formula — calculates distance between two GPS coordinates in meters.
   * Used for geofence boundary checking.
   */
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371000; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }
}
