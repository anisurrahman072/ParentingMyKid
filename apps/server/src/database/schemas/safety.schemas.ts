import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export type LocationEventDocument = LocationEvent & Document;

@Schema({ timestamps: true, collection: 'location_events' })
export class LocationEvent {
  @Prop({ type: String, default: () => uuidv4() })
  _id: string;

  @Prop({ required: true, index: true })
  childId: string;

  @Prop({ required: true })
  lat: number;

  @Prop({ required: true })
  lon: number;

  @Prop({ required: true })
  accuracy: number;

  @Prop({ required: true })
  eventType: string;

  @Prop({ required: false })
  address?: string;

  @Prop({ default: () => new Date(), index: true })
  timestamp: Date;
}

export const LocationEventSchema = SchemaFactory.createForClass(LocationEvent);
LocationEventSchema.virtual('id').get(function () {
  return this._id;
});
// Compound index: covers location history queries { childId, timestamp }
LocationEventSchema.index({ childId: 1, timestamp: -1 });
// TTL: GPS pings expire after 30 days — no feature needs older location history
LocationEventSchema.index({ createdAt: 1 }, { expireAfterSeconds: 2_592_000 });

// ---------------------------------------------------------------------------

export type GeofenceDocument = Geofence & Document;

@Schema({ timestamps: true, collection: 'geofences' })
export class Geofence {
  @Prop({ type: String, default: () => uuidv4() })
  _id: string;

  @Prop({ required: true, index: true })
  childId: string;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  type: string;

  @Prop({ required: true })
  centerLat: number;

  @Prop({ required: true })
  centerLon: number;

  @Prop({ required: true })
  radiusMeters: number;

  @Prop({ required: false })
  address?: string;

  @Prop({ default: true })
  isActive: boolean;
}

export const GeofenceSchema = SchemaFactory.createForClass(Geofence);
GeofenceSchema.virtual('id').get(function () {
  return this._id;
});

// ---------------------------------------------------------------------------

export type ScreenUsageLogDocument = ScreenUsageLog & Document;

@Schema({ timestamps: true, collection: 'screen_usage_logs' })
export class ScreenUsageLog {
  @Prop({ type: String, default: () => uuidv4() })
  _id: string;

  @Prop({ required: true, index: true })
  childId: string;

  @Prop({ required: true })
  appName: string;

  @Prop({ required: false })
  packageName?: string;

  @Prop({ required: true })
  appCategory: string;

  @Prop({ required: true })
  durationSeconds: number;

  @Prop({ default: () => new Date() })
  loggedAt: Date;

  @Prop({ required: true, index: true })
  date: string;
}

export const ScreenUsageLogSchema =
  SchemaFactory.createForClass(ScreenUsageLog);
ScreenUsageLogSchema.virtual('id').get(function () {
  return this._id;
});
// Compound index: covers screen usage queries { childId, date }
ScreenUsageLogSchema.index({ childId: 1, date: 1 });
// TTL: screen usage logs expire after 90 days — analytics uses last 30 days max
ScreenUsageLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7_776_000 });

// ---------------------------------------------------------------------------

export type ScreenTimeControlsDocument = ScreenTimeControls & Document;

@Schema({ timestamps: true, collection: 'screen_time_controls' })
export class ScreenTimeControls {
  @Prop({ type: String, default: () => uuidv4() })
  _id: string;

  @Prop({ required: true, unique: true })
  childId: string;

  @Prop({ default: 120 })
  dailyLimitMinutes: number;

  @Prop({ default: 30 })
  socialMediaLimitMinutes: number;

  @Prop({ default: 45 })
  gamingLimitMinutes: number;

  @Prop({ default: 60 })
  youtubeLimitMinutes: number;

  @Prop({ default: true })
  youtubeRestrictedMode: boolean;

  @Prop({ default: true })
  safeSearchEnabled: boolean;

  @Prop({ default: '21:00' })
  bedtimeStart: string;

  @Prop({ default: '07:00' })
  bedtimeEnd: string;

  @Prop({ default: '07:00' })
  morningUnlockTime: string;

  @Prop({ required: false })
  focusTimeStart?: string;

  @Prop({ required: false })
  focusTimeEnd?: string;

  @Prop({ default: true })
  drivingModeEnabled: boolean;

  @Prop({ default: false })
  isPaused: boolean;

  @Prop({ type: [String], default: [] })
  blockedApps: string[];

  @Prop({ type: [String], default: [] })
  blockedWebsiteCategories: string[];

  @Prop({ type: [String], default: [] })
  blockedWebsites: string[];

  @Prop({ default: true })
  appDownloadApproval: boolean;

  @Prop({ type: [String], default: [] })
  youtubeAllowedChannelIds: string[];

  @Prop({ type: [String], default: [] })
  youtubeBlockedChannelIds: string[];

  @Prop({ default: false })
  youtubeAllowlistMode: boolean;

  @Prop({ default: 1 })
  controlsVersion: number;

  @Prop({ type: [Object], default: [] })
  blockedAppsJson: unknown[];

  @Prop({ type: [Object], default: [] })
  allowedDomains: unknown[];

  @Prop({ type: [Object], default: [] })
  blockedDomains: unknown[];

  @Prop({ default: true })
  gamesEnabled: boolean;

  @Prop({ type: Object, default: {} })
  gameSettingsJson: Record<string, unknown>;

  @Prop({ default: false })
  appGuardEnabled: boolean;

  @Prop({ default: false })
  blockAllAppsEnabled: boolean;

  @Prop({ default: false })
  silentCameraEnabled: boolean;

  @Prop({ default: false })
  stopInternetEnabled: boolean;

  @Prop({ default: 'IMMEDIATE' })
  stopInternetActivation: string;

  @Prop({ default: 30 })
  stopInternetDelayedMinutes: number;

  @Prop({ required: false })
  stopInternetBlockStartsAtUtc?: Date;

  @Prop({ default: false })
  websiteFilteringEnabled: boolean;

  @Prop({ default: 'BLACKLIST' })
  websiteFilterMode: string;

  @Prop({ default: false })
  blockNetworkChanges: boolean;

  @Prop({ type: Object, required: false })
  stopInternetSchedule?: Record<string, unknown>;

  @Prop({ type: Object, required: false })
  videoSettings?: Record<string, unknown>;

  @Prop({ type: [Object], default: [] })
  customVideos: unknown[];

  @Prop({ default: 3 })
  screenshotIntervalMin: number;

  @Prop({ default: 5 })
  cameraIntervalMin: number;
}

export const ScreenTimeControlsSchema =
  SchemaFactory.createForClass(ScreenTimeControls);
ScreenTimeControlsSchema.virtual('id').get(function () {
  return this._id;
});

// ---------------------------------------------------------------------------

export type ContentFilterEventDocument = ContentFilterEvent & Document;

@Schema({ timestamps: true, collection: 'content_filter_events' })
export class ContentFilterEvent {
  @Prop({ type: String, default: () => uuidv4() })
  _id: string;

  @Prop({ required: true, index: true })
  childId: string;

  @Prop({ required: true })
  blockedUrl: string;

  @Prop({ required: true })
  reason: string;

  @Prop({ default: () => new Date() })
  timestamp: Date;
}

export const ContentFilterEventSchema =
  SchemaFactory.createForClass(ContentFilterEvent);
ContentFilterEventSchema.virtual('id').get(function () {
  return this._id;
});
// Compound index: covers content filter history queries { childId, timestamp }
ContentFilterEventSchema.index({ childId: 1, timestamp: -1 });
// TTL: blocked-URL events expire after 30 days — short-term forensics only
ContentFilterEventSchema.index({ createdAt: 1 }, { expireAfterSeconds: 2_592_000 });

// ---------------------------------------------------------------------------

export type SafetyAlertDocument = SafetyAlert & Document;

@Schema({ timestamps: true, collection: 'safety_alerts' })
export class SafetyAlert {
  @Prop({ type: String, default: () => uuidv4() })
  _id: string;

  @Prop({ required: true, index: true })
  childId: string;

  @Prop({ required: true })
  category: string;

  @Prop({ required: true })
  severity: string;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  description: string;

  @Prop({ required: false })
  evidenceSnippet?: string;

  @Prop({ required: false })
  platform?: string;

  @Prop({ default: false, index: true })
  isRead: boolean;

  @Prop({ required: false })
  actionTaken?: string;
}

export const SafetyAlertSchema = SchemaFactory.createForClass(SafetyAlert);
SafetyAlertSchema.virtual('id').get(function () {
  return this._id;
});
