// Saved-time statistics (D-1 storage, D-12 counting rule): stats are
// device-local data with no cross-device sync value, so they live in
// chrome.storage.local under their own key instead of riding the sync config
// blob, whose hard MAX_WRITE_OPERATIONS_PER_HOUR quota the previous ~3s flush
// used to exhaust.

import { getConfig, removeLegacyConfigKeyOnce } from '@/src/shared/config';

// ---- D-12: wall-clock proportion check -------------------------------------
//
// handleTimeUpdate used to discard any media delta above a fixed 2s
// (TIME_UPDATE_MAX_DELTA_S) as a "seek". That is a suspected failure mode for
// background tabs: Chrome's documented intensive throttling covers timers in
// muted background tabs (roughly once per minute); `timeupdate` is derived
// from the media pipeline rather than a timer, so whether its dispatch
// frequency is reduced there is UNVERIFIED. If it is, a legitimate 2x
// playback stretch arrives as a single timeupdate carrying ~120s of media
// delta and the old cutoff discarded it wholesale. Either way, whether a
// delta is a seek is not a question of absolute size but of proportion:
// between two ticks media time may only advance by about (wall time x rate).

// A jump beyond the proportion expectation is tolerated when it is small: the
// 50% relative headroom absorbs event-dispatch jitter, timestamp rounding,
// and mid-interval rate changes — but only in the speed-up direction, where
// the media ends up BEHIND the expectation computed with the new (higher)
// rate. Crossing DOWN to a lower rate can leave the fast segment's media
// ahead of the new rate's expectation and get the tick discarded (e.g. 4x
// for 9s then 2x for 1s, judged with rate=2: media 38 > 30.5) — a
// conservative undercount of one interval, while the old fixed 2s cutoff
// discarded everything over 2s outright, so the tolerance is still a net
// recovery. The 0.5s absolute floor keeps short foreground ticks (timeupdate
// fires ~4x/s) safe from noise. Both are deliberately loose: over-counting a
// rare anomaly costs seconds of accuracy, while a false discard loses the
// whole (possibly minutes-long) interval.
export const SEEK_TOLERANCE_RATIO = 1.5;
export const SEEK_TOLERANCE_FLOOR_S = 0.5;

// Absolute fallback, replacing the old 2s threshold as a sanity ceiling only.
// It must sit far ABOVE what documented throttling can legitimately produce
// (one tick/minute at 4x = 240s of media time) so it never clips the real
// background case; its only job is to bound catastrophic pollution
// (monotonic-clock anomalies, runaway media elements).
export const MEDIA_DELTA_HARD_CAP_S = 600;

// Decides whether one timeupdate interval counts as playback progress for the
// time-saved statistic. `mediaDeltaS` is the currentTime advance since the
// previous tick, `wallDeltaMs` the monotonic wall-clock advance
// (performance.now()) over the same interval, `rate` the playback rate in
// effect. See the block comment above for the rationale of each rule.
export const shouldCountPlaybackDelta = ({
  mediaDeltaS,
  wallDeltaMs,
  rate,
}: {
  mediaDeltaS: number;
  wallDeltaMs: number;
  rate: number;
}): boolean => {
  // Defensive: a non-finite timestamp (media element quirks) must never be
  // counted — NaN comparisons below would silently pass every branch.
  if (
    !Number.isFinite(mediaDeltaS) ||
    !Number.isFinite(wallDeltaMs) ||
    !Number.isFinite(rate)
  ) {
    return false;
  }
  // Only rates above 1x save time (existing semantics, unchanged).
  if (rate <= 1) {
    return false;
  }
  // Non-positive media deltas are rewinds, replays, pause ticks, or the
  // "just attached" baseline tick — no progress, never counted.
  if (mediaDeltaS <= 0) {
    return false;
  }
  // No wall-clock basis (same-tick double dispatch, jitter): proportion
  // cannot be established, so the tick is dropped. The caller has already
  // advanced its stored timestamps, so this tick's media advance (at most
  // one tick's worth) is lost rather than merged into the next interval —
  // a conservative undercount, harmless at that scale.
  if (wallDeltaMs <= 0) {
    return false;
  }
  // Absolute ceiling (see constant comment): discard regardless of proportion.
  if (mediaDeltaS > MEDIA_DELTA_HARD_CAP_S) {
    return false;
  }
  // Seek / anomaly test. Media running BEHIND the expectation (buffering,
  // stalls) still counts — the actual media delta is what gets saved, so a
  // stall simply saves less and no time is ever invented. Running AHEAD of
  // wall x rate beyond the tolerance means the jump was not playback.
  const expectedS = (wallDeltaMs / 1000) * rate;
  return mediaDeltaS <= expectedS * SEEK_TOLERANCE_RATIO + SEEK_TOLERANCE_FLOOR_S;
};

export const STATS_STORAGE_KEY = 'bilibiliSpeedMasterStats';

export type SavedStats = {
  timeSavedSeconds: number;
};

type StorageLike = {
  get: (keys: string | string[] | null, callback?: (items: any) => void) => any;
  set: (items: Record<string, any>, callback?: () => void) => any;
};

type StorageAreaName = 'local' | 'sync';

// Storage handles are resolved lazily on every call instead of captured in a
// module-level constant (config.ts's module singleton is the known
// counter-example): a constant is frozen at module evaluation time, so mocks
// injected afterwards would never be seen. Testability wins here.
const getStorageArea = (area: StorageAreaName): StorageLike | null => {
  const root = globalThis as typeof globalThis & {
    browser?: { storage?: Partial<Record<StorageAreaName, StorageLike>> };
    chrome?: { storage?: Partial<Record<StorageAreaName, StorageLike>> };
  };
  return root.browser?.storage?.[area] ?? root.chrome?.storage?.[area] ?? null;
};

// Values coming from storage or import files are untrusted: anything that is
// not a finite, non-negative number degrades to 0 instead of poisoning the
// arithmetic downstream.
const sanitizeSeconds = (value: unknown): number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : 0;

const getFromArea = (area: StorageAreaName, key: string): Promise<Record<string, any>> => {
  const storage = getStorageArea(area);
  if (!storage) {
    return Promise.resolve({});
  }

  if (storage.get.length >= 2) {
    return new Promise((resolve) => {
      storage.get(key, (items: Record<string, any>) => resolve(items || {}));
    });
  }

  return Promise.resolve(storage.get(key));
};

// storage.local has no write-operations quota (unlike sync), but writes can
// still fail (browser shutdown, corrupted profile); like config.ts, failures
// warn instead of staying silent. Callers keep working — the next flush may
// succeed.
const warnStatsWriteFailure = (error: unknown): void => {
  console.warn('[speed-master] storage.local set failed; stats update was not persisted:', error);
};

const setInArea = (area: StorageAreaName, items: Record<string, any>): Promise<void> => {
  const storage = getStorageArea(area);
  if (!storage) {
    return Promise.resolve();
  }

  if (storage.set.length >= 2) {
    return new Promise((resolve) => {
      storage.set(items, () => {
        // chrome.storage signals callback-style failures through
        // runtime.lastError instead of throwing.
        const root = globalThis as typeof globalThis & {
          chrome?: { runtime?: { lastError?: { message?: string } } };
        };
        const lastError = root.chrome?.runtime?.lastError;
        if (lastError?.message) {
          warnStatsWriteFailure(lastError.message);
        }
        resolve();
      });
    });
  }

  return Promise.resolve(storage.set(items)).catch((error) => {
    warnStatsWriteFailure(error);
  });
};

const readLocalSeconds = async (): Promise<number> => {
  const items = await getFromArea('local', STATS_STORAGE_KEY);
  return sanitizeSeconds(items?.[STATS_STORAGE_KEY]?.timeSavedSeconds);
};

// One-time, idempotent migration (D-1): stats used to live inside the sync
// config blob. The first stats access merges the legacy value into local with
// max semantics (the larger value wins), so nothing is lost on upgrade.
// Re-running is a no-op once local >= legacy, which also makes concurrent
// calls from multiple tabs safe — worst case both tabs write the same max
// value.
//
// Legacy-key retirement (PM review fix for D-2): the legacy merged key
// doubles as this migration's source, so it is retired HERE — strictly after
// a successful migration — and never by config writes (config writes call
// persistConfig, which does not touch it). Ordering guarantee: the migration's
// read of the legacy key (getConfig below) always precedes the removal, so a
// first config write landing before the 30s flush can no longer orphan the
// legacy stats value. If anything in between throws, the removal line is
// never reached and the key stays as the retry's source. Each context runs
// its own memoized migration and its own once-flag; removal is idempotent, so
// multi-tab needs no coordination — a tab whose migration runs after another
// tab removed the key reads legacy=0 while the value already lives in local.
const migrateLegacyStats = async (): Promise<void> => {
  const config = await getConfig();
  const legacy = sanitizeSeconds(config.stats?.timeSavedSeconds);
  if (legacy <= 0) {
    // Nothing to migrate (fresh install or already-migrated data); the legacy
    // key is obsolete either way, so retire it on this successful path too —
    // removeLegacyConfigKeyOnce itself holds until the config split keys are
    // in place, since the blob is still the global/channels read fallback.
    await removeLegacyConfigKeyOnce();
    return;
  }

  const local = await readLocalSeconds();
  if (legacy > local) {
    await setInArea('local', { [STATS_STORAGE_KEY]: { timeSavedSeconds: legacy } });
  }
  // Migration succeeded (the larger value now lives in local): the legacy key
  // can be retired, subject to the same split-keys-in-place guard.
  await removeLegacyConfigKeyOnce();
};

// Memoized one-shot migration (D-1, PM review fix): BOTH entry points go
// through this, so the first flush after an upgrade migrates the legacy value
// BEFORE new accumulation stacks on top — otherwise a larger legacy value
// would later swallow everything accumulated since the update. The promise
// (not the result) is cached, so concurrent callers share one run and later
// calls, including every 30s flush, skip the extra sync read entirely.
let migrationPromise: Promise<void> | null = null;

const ensureMigrated = (): Promise<void> => {
  if (!migrationPromise) {
    migrationPromise = migrateLegacyStats().catch((error) => {
      // Never cache a failure: reset so the next stats access retries, and
      // let the current caller proceed on the unmigrated value.
      migrationPromise = null;
      console.warn('[speed-master] stats migration failed:', error);
    });
  }
  return migrationPromise;
};

export const getSavedStats = async (): Promise<SavedStats> => {
  await ensureMigrated();
  return { timeSavedSeconds: await readLocalSeconds() };
};

// Read-modify-write over the local stats key. Resolves with the persisted
// (sanitized) value so callers can mirror storage state instead of their
// pre-sanitize input.
export const updateSavedStats = async (
  updater: (current: SavedStats) => SavedStats,
): Promise<SavedStats> => {
  await ensureMigrated();
  const current: SavedStats = { timeSavedSeconds: await readLocalSeconds() };
  const next = updater(current);
  const timeSavedSeconds = sanitizeSeconds(next?.timeSavedSeconds);
  await setInArea('local', { [STATS_STORAGE_KEY]: { timeSavedSeconds } });
  return { timeSavedSeconds };
};
