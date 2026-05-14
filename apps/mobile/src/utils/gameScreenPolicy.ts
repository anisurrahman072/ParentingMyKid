/**
 * Game Settings screen ↔ server (`gameSettingsJson`) ↔ native policy (`gameQuota`).
 */

export type GameScheduleMode = 'same_every_day' | 'weekday_weekend';

export type GamePerAppLimit = {
  limitMode: 'inherit' | 'custom';
  /** Used when schedule is same_every_day */
  sameMinutes: number;
  weekdayMinutes: number;
  weekendMinutes: number;
};

export type PersistedGameSettings = {
  v: 1;
  scheduleMode: GameScheduleMode;
  globalSameMinutes: number;
  globalWeekdayMinutes: number;
  globalWeekendMinutes: number;
  perPackage: Record<string, GamePerAppLimit>;
  /** Last scanned game packages on save — drives native quota list */
  trackedGamePackages: string[];
  /** Friendly line parents set; kids Games Zone may show it */
  celebrationLine?: string;
};

const DEFAULT_PKG_LIMIT = (): GamePerAppLimit => ({
  limitMode: 'inherit',
  sameMinutes: 30,
  weekdayMinutes: 30,
  weekendMinutes: 45,
});

export function defaultPersistedGameSettings(gamingFallbackMinutes: number): PersistedGameSettings {
  const m = Math.max(0, Math.min(480, gamingFallbackMinutes || 45));
  return {
    v: 1,
    scheduleMode: 'same_every_day',
    globalSameMinutes: m,
    globalWeekdayMinutes: m,
    globalWeekendMinutes: Math.min(480, Math.round(m * 1.5)),
    perPackage: {},
    trackedGamePackages: [],
    celebrationLine: '',
  };
}

export function coercePersistedGameSettings(raw: unknown, gamingFallbackMinutes: number): PersistedGameSettings {
  const base = defaultPersistedGameSettings(gamingFallbackMinutes);
  if (raw == null || typeof raw !== 'object') return base;
  const o = raw as Record<string, unknown>;
  const scheduleMode =
    o.scheduleMode === 'weekday_weekend' ? 'weekday_weekend' : ('same_every_day' as const);
  const globalSameMinutes = clampMin(clampNum(o.globalSameMinutes, base.globalSameMinutes));
  const globalWeekdayMinutes = clampMin(clampNum(o.globalWeekdayMinutes, base.globalWeekdayMinutes));
  const globalWeekendMinutes = clampMin(clampNum(o.globalWeekendMinutes, base.globalWeekendMinutes));
  const per: Record<string, GamePerAppLimit> = {};
  if (typeof o.perPackage === 'object' && o.perPackage != null && !Array.isArray(o.perPackage)) {
    for (const [k, val] of Object.entries(o.perPackage as Record<string, unknown>)) {
      const kk = normalizePkg(k);
      if (!kk || typeof val !== 'object' || val == null) continue;
      const p = val as Record<string, unknown>;
      const limitMode = p.limitMode === 'custom' ? 'custom' : 'inherit';
      per[kk] = {
        limitMode,
        sameMinutes: clampMin(clampNum(p.sameMinutes, globalSameMinutes)),
        weekdayMinutes: clampMin(clampNum(p.weekdayMinutes, globalWeekdayMinutes)),
        weekendMinutes: clampMin(clampNum(p.weekendMinutes, globalWeekendMinutes)),
      };
    }
  }
  let trackedGamePackages = Array.isArray(o.trackedGamePackages)
    ? o.trackedGamePackages.filter((x): x is string => typeof x === 'string').map(normalizePkg).filter(Boolean)
    : [];

  trackedGamePackages = [...new Set(trackedGamePackages)];

  const celebrationLine = typeof o.celebrationLine === 'string' ? o.celebrationLine.trim() : '';

  return {
    ...base,
    scheduleMode,
    globalSameMinutes,
    globalWeekdayMinutes,
    globalWeekendMinutes,
    perPackage: per,
    trackedGamePackages,
    celebrationLine: celebrationLine.slice(0, 200),
  };
}

export function serializePersisted(settings: PersistedGameSettings): Record<string, unknown> {
  return { ...settings, v: 1 as const };
}

export function normalizePkg(pkg: string): string {
  return pkg.trim().toLowerCase();
}

export type NativeGameQuota = {
  scheduleMode: GameScheduleMode;
  globalSameMinutes: number;
  globalWeekdayMinutes: number;
  globalWeekendMinutes: number;
  perPackageMinutes: Record<
    string,
    { inherit: boolean; sameMinutes: number; weekdayMinutes: number; weekendMinutes: number }
  >;
  packages: string[];
};

/** Build quota blob for Accessibility enforcement (Android). */
export function buildNativeGameQuota(settings: PersistedGameSettings): NativeGameQuota {
  const perPackageMinutes: NativeGameQuota['perPackageMinutes'] = {};
  for (const pkg of settings.trackedGamePackages) {
    const row = settings.perPackage[pkg] ?? DEFAULT_PKG_LIMIT();
    perPackageMinutes[pkg] =
      row.limitMode === 'custom'
        ? {
            inherit: false,
            sameMinutes: row.sameMinutes,
            weekdayMinutes: row.weekdayMinutes,
            weekendMinutes: row.weekendMinutes,
          }
        : {
            inherit: true,
            sameMinutes: settings.globalSameMinutes,
            weekdayMinutes: settings.globalWeekdayMinutes,
            weekendMinutes: settings.globalWeekendMinutes,
          };
  }
  return {
    scheduleMode: settings.scheduleMode,
    globalSameMinutes: settings.globalSameMinutes,
    globalWeekdayMinutes: settings.globalWeekdayMinutes,
    globalWeekendMinutes: settings.globalWeekendMinutes,
    perPackageMinutes,
    packages: [...settings.trackedGamePackages],
  };
}

/**
 * Merge game blocks into blockedApps: games not in merged list strip by known game pkgs scan;
 * on allow-off, bulk-block all detected games.
 */
export function mergeBlockedAppsWithGameChoices(
  currentBlockedPackages: readonly string[],
  detectedGamePkgsLower: readonly string[],
  gamesEnabled: boolean,
  explicitlyBlockedGames: ReadonlySet<string>,
): string[] {
  const gset = new Set(detectedGamePkgsLower.map((p) => p.toLowerCase()));
  const blockedLower = currentBlockedPackages.map((p) => p.toLowerCase());
  const nonGameLower = new Set(blockedLower.filter((p) => !gset.has(p)));
  const base = filterPackagesKeepingCase(currentBlockedPackages, nonGameLower);

  if (!gamesEnabled) {
    return [...new Set([...base, ...detectedGamePkgsLower.map((x) => x.toLowerCase())])];
  }
  const gameBlocks = [...explicitlyBlockedGames].map((x) => x.toLowerCase());
  return [...new Set([...base, ...gameBlocks])];
}

/** Initial explicit blocked games = intersection of server blocks + scanned games */
export function deriveExplicitBlockedFromServer(serverBlocked: readonly string[], gamePkgsLower: readonly string[]): string[] {
  const g = new Set(gamePkgsLower.map((p) => p.toLowerCase()));
  return [...new Set(serverBlocked.map((p) => p.toLowerCase()).filter((p) => g.has(p)))];
}

/** Primary column `gamingLimitMinutes`: mirror flat global when schedule is same */
export function gamingLimitMirrorFromSettings(s: PersistedGameSettings): number {
  return s.scheduleMode === 'same_every_day' ? s.globalSameMinutes : s.globalWeekdayMinutes;
}

function clampNum(v: unknown, fallback: number): number {
  if (typeof v === 'number' && Number.isFinite(v)) return Math.round(v);
  if (typeof v === 'string' && /^-?\d+$/.test(v.trim())) return Math.round(Number(v.trim()));
  return fallback;
}

/** 0 = unlimited */
function clampMin(m: number): number {
  return Math.max(0, Math.min(24 * 60, m));
}

function filterPackagesKeepingCase(orig: readonly string[], allowedLower: ReadonlySet<string>): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const pkg of orig) {
    const l = pkg.toLowerCase();
    if (!allowedLower.has(l) || seen.has(l)) continue;
    seen.add(l);
    out.push(pkg.toLowerCase());
  }
  return out;
}
