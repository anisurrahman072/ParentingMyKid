/**
 * Video Manager persisted shape (stored in ScreenTimeControls.videoSettings JSON).
 * Keeps legacy filter keys stable for existing loads/saves.
 */

export type VideoFilterKey =
  | 'ageGroup'
  | 'music'
  | 'language'
  | 'contentType'
  | 'genderFilter'
  | 'theme';

export type VideoFilterSettings = {
  ageGroup: 'TODDLER' | 'CHILD' | 'TEEN' | 'ALL';
  music: 'NONE' | 'NASHEEDS_ONLY' | 'ALL';
  language: 'EN' | 'BN' | 'AR' | 'ALL';
  contentType: 'STRICT_HALAL' | 'GENERAL_ISLAMIC' | 'NORMAL';
  genderFilter: 'BOYS' | 'GIRLS' | 'BOTH';
  theme: 'EDUCATIONAL' | 'ENTERTAINMENT' | 'BOTH';
};

export const DEFAULT_VIDEO_FILTERS: VideoFilterSettings = {
  ageGroup: 'CHILD',
  music: 'NASHEEDS_ONLY',
  language: 'EN',
  contentType: 'GENERAL_ISLAMIC',
  genderFilter: 'BOTH',
  theme: 'BOTH',
};

export type VideoPlaybackMode = 'IN_APP_CURATED' | 'EXTERNAL_GUIDED';

export type VideoPlatformId = 'youtube' | 'instagram' | 'tiktok' | 'facebook' | 'other_video';

export type PlatformVideoToggles = {
  allowApp: boolean;
  allowShorts: boolean;
  allowLongForm: boolean;
};

export type VideoBlockEntryKind = 'CHANNEL' | 'VIDEO';

export type YoutubeBlockEntry = {
  id: string;
  label: string;
  kind: VideoBlockEntryKind;
  /** Optional UX hint */
  sublabel?: string;
  thumbnail?: string;
};

export type VideoScheduleMode = 'same_every_day' | 'weekday_weekend';

export type PerPlatformVideoLimit = {
  limitMode: 'inherit' | 'custom';
  sameMinutes: number;
  weekdayMinutes: number;
  weekendMinutes: number;
};

export type VideoTimeBudget = {
  scheduleMode: VideoScheduleMode;
  /** Total video time cap across YouTube + social video apps (minutes). */
  globalSameMinutes: number;
  globalWeekdayMinutes: number;
  globalWeekendMinutes: number;
  perPlatform: Partial<Record<VideoPlatformId, PerPlatformVideoLimit>>;
};

export type PersistedVideoManager = VideoFilterSettings & {
  customUrls: string[];
  /** Extra content tone beyond contentType — used for in-app queries & copy. */
  cartoonStyle: 'ANY' | 'LIVE_ACTION_OK' | 'CARTOON_FORWARD' | 'EDUCATIONAL_CLIPS';
  playbackMode: VideoPlaybackMode;
  platformToggles: Record<VideoPlatformId, PlatformVideoToggles>;
  /** Curated allow URLs remain customUrls; blocks are explicit for YouTube. */
  youtubeBlocked: YoutubeBlockEntry[];
  timeBudget: VideoTimeBudget;
  /** Parent nudges — enforcement comes in later milestones. */
  learningNudges: {
    discussAfterWatch: boolean;
    focusSessionHints: boolean;
    rewardReflectionPrompt: boolean;
  };
};

const PLATFORM_ORDER: VideoPlatformId[] = ['youtube', 'instagram', 'tiktok', 'facebook', 'other_video'];

const defaultPlatformToggles = (): Record<VideoPlatformId, PlatformVideoToggles> => ({
  youtube: { allowApp: true, allowShorts: true, allowLongForm: true },
  instagram: { allowApp: true, allowShorts: true, allowLongForm: true },
  tiktok: { allowApp: true, allowShorts: true, allowLongForm: true },
  facebook: { allowApp: true, allowShorts: true, allowLongForm: true },
  other_video: { allowApp: true, allowShorts: true, allowLongForm: true },
});

const defaultPerPlatformLimit = (tb: VideoTimeBudget): PerPlatformVideoLimit => ({
  limitMode: 'inherit',
  sameMinutes: tb.globalSameMinutes,
  weekdayMinutes: tb.globalWeekdayMinutes,
  weekendMinutes: tb.globalWeekendMinutes,
});

export function defaultVideoTimeBudget(defaultCap = 60): VideoTimeBudget {
  return {
    scheduleMode: 'same_every_day',
    globalSameMinutes: defaultCap,
    globalWeekdayMinutes: defaultCap,
    globalWeekendMinutes: defaultCap,
    perPlatform: {},
  };
}

export function defaultPersistedVideoManager(): PersistedVideoManager {
  const timeBudget = defaultVideoTimeBudget(60);
  return {
    ...DEFAULT_VIDEO_FILTERS,
    customUrls: [],
    cartoonStyle: 'ANY',
    playbackMode: 'IN_APP_CURATED',
    platformToggles: defaultPlatformToggles(),
    youtubeBlocked: [],
    timeBudget,
    learningNudges: {
      discussAfterWatch: true,
      focusSessionHints: false,
      rewardReflectionPrompt: true,
    },
  };
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

/**
 * Some API responses may carry Json columns as stringified JSON.
 * Normalize once so policy builders don't silently fall back to defaults.
 */
function coerceRecordFromUnknown(raw: unknown): Record<string, unknown> | null {
  if (isRecord(raw)) return raw;
  if (typeof raw !== 'string') return null;
  const t = raw.trim();
  if (!t) return null;
  try {
    const parsed = JSON.parse(t) as unknown;
    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function coercePlatformToggles(raw: unknown): Record<VideoPlatformId, PlatformVideoToggles> {
  const base = defaultPlatformToggles();
  if (!isRecord(raw)) return base;
  for (const key of PLATFORM_ORDER) {
    const row = raw[key];
    if (!isRecord(row)) continue;
    base[key] = {
      allowApp: typeof row.allowApp === 'boolean' ? row.allowApp : base[key].allowApp,
      allowShorts: typeof row.allowShorts === 'boolean' ? row.allowShorts : base[key].allowShorts,
      // Long-form controls were removed from Video Manager UI; always allow long-form paths.
      allowLongForm: true,
    };
  }
  return base;
}

function coerceYoutubeBlocked(raw: unknown): YoutubeBlockEntry[] {
  if (!Array.isArray(raw)) return [];
  const out: YoutubeBlockEntry[] = [];
  for (const item of raw) {
    if (!isRecord(item)) continue;
    const id = typeof item.id === 'string' ? item.id.trim() : '';
    if (!id) continue;
    const kind = item.kind === 'CHANNEL' || item.kind === 'VIDEO' ? item.kind : 'VIDEO';
    const label = typeof item.label === 'string' && item.label.trim() ? item.label.trim() : id;
    const sublabel = typeof item.sublabel === 'string' ? item.sublabel : undefined;
    const thumbnail = typeof item.thumbnail === 'string' ? item.thumbnail : undefined;
    out.push({ id, label, kind, sublabel, thumbnail });
  }
  return out;
}

function coerceTimeBudget(raw: unknown): VideoTimeBudget {
  const def = defaultVideoTimeBudget(60);
  if (!isRecord(raw)) return def;
  const scheduleMode = raw.scheduleMode === 'weekday_weekend' ? 'weekday_weekend' : 'same_every_day';
  const globalSameMinutes = typeof raw.globalSameMinutes === 'number' ? Math.max(0, raw.globalSameMinutes) : def.globalSameMinutes;
  const globalWeekdayMinutes =
    typeof raw.globalWeekdayMinutes === 'number' ? Math.max(0, raw.globalWeekdayMinutes) : def.globalWeekdayMinutes;
  const globalWeekendMinutes =
    typeof raw.globalWeekendMinutes === 'number' ? Math.max(0, raw.globalWeekendMinutes) : def.globalWeekendMinutes;
  const perRaw = raw.perPlatform;
  const perPlatform: VideoTimeBudget['perPlatform'] = {};
  if (isRecord(perRaw)) {
    for (const key of PLATFORM_ORDER) {
      const row = perRaw[key];
      if (!isRecord(row)) continue;
      perPlatform[key] = {
        limitMode: row.limitMode === 'custom' ? 'custom' : 'inherit',
        sameMinutes: typeof row.sameMinutes === 'number' ? Math.max(0, row.sameMinutes) : globalSameMinutes,
        weekdayMinutes: typeof row.weekdayMinutes === 'number' ? Math.max(0, row.weekdayMinutes) : globalWeekdayMinutes,
        weekendMinutes: typeof row.weekendMinutes === 'number' ? Math.max(0, row.weekendMinutes) : globalWeekendMinutes,
      };
    }
  }
  return {
    scheduleMode,
    globalSameMinutes,
    globalWeekdayMinutes,
    globalWeekendMinutes,
    perPlatform,
  };
}

function coerceLearningNudges(raw: unknown): PersistedVideoManager['learningNudges'] {
  const def = defaultPersistedVideoManager().learningNudges;
  if (!isRecord(raw)) return def;
  return {
    discussAfterWatch: typeof raw.discussAfterWatch === 'boolean' ? raw.discussAfterWatch : def.discussAfterWatch,
    focusSessionHints: typeof raw.focusSessionHints === 'boolean' ? raw.focusSessionHints : def.focusSessionHints,
    rewardReflectionPrompt:
      typeof raw.rewardReflectionPrompt === 'boolean' ? raw.rewardReflectionPrompt : def.rewardReflectionPrompt,
  };
}

function pickEnum<T extends string>(v: unknown, allowed: readonly T[], fallback: T): T {
  return typeof v === 'string' && (allowed as readonly string[]).includes(v) ? (v as T) : fallback;
}

/** Merge server JSON with defaults without dropping unknown future keys from raw filters. */
export function coercePersistedVideoManager(raw: unknown): PersistedVideoManager {
  const base = defaultPersistedVideoManager();
  const normalized = coerceRecordFromUnknown(raw);
  if (!normalized) return base;
  const row = normalized;

  const filters: VideoFilterSettings = {
    ageGroup: pickEnum(row.ageGroup, ['TODDLER', 'CHILD', 'TEEN', 'ALL'] as const, DEFAULT_VIDEO_FILTERS.ageGroup),
    music: pickEnum(row.music, ['NONE', 'NASHEEDS_ONLY', 'ALL'] as const, DEFAULT_VIDEO_FILTERS.music),
    language: pickEnum(row.language, ['EN', 'BN', 'AR', 'ALL'] as const, DEFAULT_VIDEO_FILTERS.language),
    contentType: pickEnum(
      row.contentType,
      ['STRICT_HALAL', 'GENERAL_ISLAMIC', 'NORMAL'] as const,
      DEFAULT_VIDEO_FILTERS.contentType,
    ),
    genderFilter: pickEnum(row.genderFilter, ['BOYS', 'GIRLS', 'BOTH'] as const, DEFAULT_VIDEO_FILTERS.genderFilter),
    theme: pickEnum(row.theme, ['EDUCATIONAL', 'ENTERTAINMENT', 'BOTH'] as const, DEFAULT_VIDEO_FILTERS.theme),
  };

  const cartoonRaw = row.cartoonStyle;
  const cartoonStyle =
    cartoonRaw === 'LIVE_ACTION_OK' ||
    cartoonRaw === 'CARTOON_FORWARD' ||
    cartoonRaw === 'EDUCATIONAL_CLIPS'
      ? cartoonRaw
      : 'ANY';

  const playbackRaw = row.playbackMode;
  const playbackMode: VideoPlaybackMode = playbackRaw === 'EXTERNAL_GUIDED' ? 'EXTERNAL_GUIDED' : 'IN_APP_CURATED';

  const customUrls = Array.isArray(row.customUrls)
    ? row.customUrls.filter((x): x is string => typeof x === 'string').map((s) => s.trim()).filter(Boolean)
    : [];

  let youtubeBlocked = coerceYoutubeBlocked(row.youtubeBlocked);
  if (youtubeBlocked.length === 0 && Array.isArray(row.youtubeBlockedLegacy)) {
    youtubeBlocked = coerceYoutubeBlocked(row.youtubeBlockedLegacy);
  }

  return {
    ...filters,
    customUrls,
    cartoonStyle,
    playbackMode,
    platformToggles: coercePlatformToggles(row.platformToggles),
    youtubeBlocked,
    timeBudget: coerceTimeBudget(row.timeBudget),
    learningNudges: coerceLearningNudges(row.learningNudges),
  };
}

export function youtubeBlockedChannelIds(entries: YoutubeBlockEntry[]): string[] {
  const ids = entries.filter((e) => e.kind === 'CHANNEL').map((e) => e.id.trim()).filter(Boolean);
  return [...new Set(ids)];
}

export function youtubeBlockedVideoIds(entries: YoutubeBlockEntry[]): string[] {
  const ids = entries.filter((e) => e.kind === 'VIDEO').map((e) => e.id.trim()).filter(Boolean);
  return [...new Set(ids)];
}

/** Compact mirror for Android `policy.videoPolicy` (additive; native consumes incrementally). */
export type NativeVideoPolicyV1 = {
  v: 1;
  blockedVideoIds: string[];
  blockedChannelIds: string[];
  platformToggles: PersistedVideoManager['platformToggles'];
  timeBudget: VideoTimeBudget;
  playbackMode: VideoPlaybackMode;
  /**
   * When true, Accessibility may attempt to disrupt YouTube Shorts surfaces (experimental, Android).
   * Derived: YouTube allowed + Shorts disabled (kid mode / apply-to-parent), regardless of curated vs guided playback.
   */
  officialYoutubeShortsExperiment: boolean;
  officialYoutubeLongFormExperiment: boolean;
};

export function buildNativeVideoPolicy(raw: unknown): NativeVideoPolicyV1 {
  const vm = coercePersistedVideoManager(raw);
  const officialYoutubeShortsExperiment =
    vm.platformToggles.youtube.allowApp === true && vm.platformToggles.youtube.allowShorts === false;
  return {
    v: 1,
    blockedVideoIds: youtubeBlockedVideoIds(vm.youtubeBlocked),
    blockedChannelIds: youtubeBlockedChannelIds(vm.youtubeBlocked),
    platformToggles: vm.platformToggles,
    timeBudget: vm.timeBudget,
    playbackMode: vm.playbackMode,
    officialYoutubeShortsExperiment,
    officialYoutubeLongFormExperiment: false,
  };
}

export function youtubeSearchBlocklistParams(
  vm: PersistedVideoManager,
  serverBlockedChannels?: string[],
): { blockedVideoIds: string; blockedChannelIds: string } {
  const vids = youtubeBlockedVideoIds(vm.youtubeBlocked);
  const ch = [...new Set([...youtubeBlockedChannelIds(vm.youtubeBlocked), ...(serverBlockedChannels ?? [])])];
  const cap = (arr: string[], max: number) => arr.slice(0, max).join(',');
  return {
    blockedVideoIds: cap(vids, 80),
    blockedChannelIds: cap(ch, 80),
  };
}

export function isYoutubeVideoBlocked(videoId: string | undefined, vm: PersistedVideoManager): boolean {
  const id = typeof videoId === 'string' ? videoId.trim() : '';
  if (!id) return false;
  return youtubeBlockedVideoIds(vm.youtubeBlocked).includes(id);
}

export function extractYoutubeVideoId(raw: string): string | null {
  const t = raw.trim();
  const m =
    t.match(/[?&]v=([a-zA-Z0-9_-]{6,})/) ||
    t.match(/youtu\.be\/([a-zA-Z0-9_-]{6,})/) ||
    t.match(/\/shorts\/([a-zA-Z0-9_-]{6,})/) ||
    t.match(/\/embed\/([a-zA-Z0-9_-]{6,})/);
  if (m) return m[1];
  if (/^[a-zA-Z0-9_-]{6,}$/.test(t)) return t;
  return null;
}

export function extractYoutubeChannelId(raw: string): string | null {
  const m = raw.match(/channel\/(UC[a-zA-Z0-9_-]+)/);
  if (m) return m[1];
  const t = raw.trim();
  if (t.startsWith('UC') && t.length >= 12) return t;
  if (t.startsWith('@')) return null;
  return null;
}

// ---------------------------------------------------------------------------
// YouTube Network-Level Filter
// Derives which CDN domains to block/bypass at DNS level in the VPN based on
// the parent's Video Manager toggles. This is independent of Accessibility
// heuristics and works reliably regardless of YouTube app version changes.
//
// YouTube CDN architecture:
//   Shorts video streams → reel.googlevideo.com, reel-yt.googlevideo.com
// ---------------------------------------------------------------------------

export type YoutubeNetworkFilter = {
  youtubeNetworkFilteringEnabled: boolean;
  /** Domains to respond with NXDOMAIN when the kid attempts to resolve them. */
  youtubeBlockedDomains: string[];
  /** Domains that bypass parent-domain blocks (unused while long-form blocking is disabled). */
  youtubeBypassDomains: string[];
};

const YOUTUBE_SHORTS_CDN: readonly string[] = ['reel.googlevideo.com', 'reel-yt.googlevideo.com'];

/**
 * Build the YouTube-specific DNS filter policy from Video Manager settings.
 *
 * allowApp=false  → Accessibility Service blocks the whole package; no DNS
 *                   filter needed here (avoids over-blocking CDN used by other apps).
 * Long-form is always allowed (see coercePlatformToggles). When the app is allowed
 * and Shorts are turned off, we only NXDOMAIN the Shorts CDN hosts.
 */
export function buildYoutubeNetworkFilter(raw: unknown): YoutubeNetworkFilter {
  const vm = coercePersistedVideoManager(raw);
  const yt = vm.platformToggles.youtube;

  if (!yt.allowApp || yt.allowShorts) {
    return { youtubeNetworkFilteringEnabled: false, youtubeBlockedDomains: [], youtubeBypassDomains: [] };
  }

  return {
    youtubeNetworkFilteringEnabled: true,
    youtubeBlockedDomains: [...YOUTUBE_SHORTS_CDN],
    youtubeBypassDomains: [],
  };
}

export function mergePerPlatformInherited(tb: VideoTimeBudget): VideoTimeBudget {
  const next = { ...tb, perPlatform: { ...tb.perPlatform } };
  for (const key of PLATFORM_ORDER) {
    const row = next.perPlatform[key];
    if (!row || row.limitMode !== 'inherit') continue;
    next.perPlatform[key] = {
      ...defaultPerPlatformLimit(next),
      limitMode: 'inherit',
    };
  }
  return next;
}
