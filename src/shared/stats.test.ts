import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// D-1: config.ts resolves its storage handle once at module evaluation, while
// stats.ts resolves it lazily per call. Both must see the per-test mock, so
// beforeEach resets the module registry, injects the in-memory storage, and
// only then dynamically imports the modules under test.

type MockArea = {
  data: Record<string, any>;
  calls: { get: number; set: number; remove: number };
  removes: string[][];
  get: (keys: string | string[] | null, callback?: (items: any) => void) => any;
  set: (items: Record<string, any>, callback?: () => void) => any;
  remove: (keys: string | string[], callback?: () => void) => any;
};

// Callback-style mock (get.length / set.length / remove.length >= 2), matching
// the Chrome callback API branch in both config.ts and stats.ts.
const createMockArea = (initial: Record<string, any> = {}): MockArea => {
  const data: Record<string, any> = { ...initial };
  const calls = { get: 0, set: 0, remove: 0 };
  const removes: string[][] = [];
  return {
    data,
    calls,
    removes,
    get(keys, callback) {
      calls.get += 1;
      const keysList = (Array.isArray(keys) ? keys : [keys]).filter(
        (key): key is string => typeof key === 'string',
      );
      const items: Record<string, any> = {};
      for (const key of keysList) {
        if (key in data) {
          items[key] = data[key];
        }
      }
      if (callback) {
        callback(items);
        return;
      }
      return Promise.resolve(items);
    },
    set(items, callback) {
      calls.set += 1;
      Object.assign(data, items);
      if (callback) {
        callback();
        return;
      }
      return Promise.resolve();
    },
    remove(keys, callback) {
      calls.remove += 1;
      const keysList = (Array.isArray(keys) ? keys : [keys]).filter(
        (key): key is string => typeof key === 'string',
      );
      removes.push(keysList);
      for (const key of keysList) {
        delete data[key];
      }
      if (callback) {
        callback();
        return;
      }
      return Promise.resolve();
    },
  };
};

let mockLocal: MockArea;
let mockSync: MockArea;
let stats: typeof import('@/src/shared/stats');
let config: typeof import('@/src/shared/config');

// Seeds the sync config blob the way an old (pre-D-1) version would have
// written it, including a possibly-invalid legacy stats value.
const seedSyncConfig = (timeSavedSeconds: unknown) => {
  mockSync.data[config.STORAGE_KEY] = {
    version: 1,
    global: {
      defaultSpeed: 1,
      preferredQuality: 'auto',
      showVideoWidget: true,
      videoWidgetPosition: 'topLeft',
    },
    channels: {},
    stats: { timeSavedSeconds },
  };
};

beforeEach(async () => {
  vi.resetModules();
  mockLocal = createMockArea();
  mockSync = createMockArea();
  (globalThis as any).browser = { storage: { local: mockLocal, sync: mockSync } };
  stats = await import('@/src/shared/stats');
  config = await import('@/src/shared/config');
});

afterEach(() => {
  delete (globalThis as any).browser;
  delete (globalThis as any).chrome;
  vi.restoreAllMocks();
});

describe('getSavedStats', () => {
  it('returns 0 when nothing is stored anywhere', async () => {
    await expect(stats.getSavedStats()).resolves.toEqual({ timeSavedSeconds: 0 });
  });

  it('returns the stored local value', async () => {
    mockLocal.data[stats.STATS_STORAGE_KEY] = { timeSavedSeconds: 42.5 };
    await expect(stats.getSavedStats()).resolves.toEqual({ timeSavedSeconds: 42.5 });
  });

  it('migrates a larger legacy sync value into local and keeps the legacy key while the splits are missing', async () => {
    seedSyncConfig(100);

    await expect(stats.getSavedStats()).resolves.toEqual({ timeSavedSeconds: 100 });

    expect(mockLocal.data[stats.STATS_STORAGE_KEY]).toEqual({ timeSavedSeconds: 100 });
    // No sync write. (D-2 PM review fix) The legacy merged key survives this
    // migration: the config split keys are not in place yet, so the blob is
    // still the read fallback for global/channels. Its stats value has been
    // consumed, and a later migration attempt (once the splits exist) retires
    // the key.
    expect(mockSync.calls.set).toBe(0);
    expect(mockSync.calls.remove).toBe(0);
    expect(mockSync.data[config.STORAGE_KEY].stats).toEqual({ timeSavedSeconds: 100 });
  });

  it('retires the legacy key after the migration when both config split keys are in place', async () => {
    seedSyncConfig(100);
    mockSync.data[config.GLOBAL_STORAGE_KEY] = {
      version: 1,
      global: { ...config.DEFAULT_CONFIG.global },
    };
    mockSync.data[config.CHANNELS_STORAGE_KEY] = { version: 1, channels: {} };

    await expect(stats.getSavedStats()).resolves.toEqual({ timeSavedSeconds: 100 });

    // The persisted local value proves the migration READ the legacy key
    // before the removal ran (ordering guarantee from the D-2 review fix).
    expect(mockLocal.data[stats.STATS_STORAGE_KEY]).toEqual({ timeSavedSeconds: 100 });
    expect(mockSync.data[config.STORAGE_KEY]).toBeUndefined();
    expect(mockSync.removes).toEqual([[config.STORAGE_KEY]]);
    expect(mockSync.calls.set).toBe(0);
  });

  it('keeps the larger local value when legacy is smaller (max semantics)', async () => {
    seedSyncConfig(50);
    mockLocal.data[stats.STATS_STORAGE_KEY] = { timeSavedSeconds: 200 };

    await expect(stats.getSavedStats()).resolves.toEqual({ timeSavedSeconds: 200 });
    expect(mockLocal.calls.set).toBe(0);
  });

  it('migration is idempotent: repeated calls write local only once', async () => {
    seedSyncConfig(100);

    await stats.getSavedStats();
    const writesAfterFirst = mockLocal.calls.set;

    await stats.getSavedStats();
    await stats.getSavedStats();

    expect(mockLocal.calls.set).toBe(writesAfterFirst);
    await expect(stats.getSavedStats()).resolves.toEqual({ timeSavedSeconds: 100 });
  });

  it('migration is safe under concurrent calls from multiple tabs', async () => {
    seedSyncConfig(100);

    const [a, b] = await Promise.all([stats.getSavedStats(), stats.getSavedStats()]);

    expect(a.timeSavedSeconds).toBe(100);
    expect(b.timeSavedSeconds).toBe(100);
    expect(mockLocal.data[stats.STATS_STORAGE_KEY].timeSavedSeconds).toBe(100);
  });

  it('treats an invalid legacy sync value as 0 and writes nothing', async () => {
    seedSyncConfig('garbage');
    await expect(stats.getSavedStats()).resolves.toEqual({ timeSavedSeconds: 0 });
    expect(mockLocal.calls.set).toBe(0);
    // The no-op migration does not retire the legacy key either while the
    // config split keys are missing (it is still the read fallback).
    expect(mockSync.data[config.STORAGE_KEY]).toBeDefined();
  });

  it('treats a NaN legacy sync value as 0 (it survives mergeConfig typeof check)', async () => {
    seedSyncConfig(NaN);
    await expect(stats.getSavedStats()).resolves.toEqual({ timeSavedSeconds: 0 });
    expect(mockLocal.calls.set).toBe(0);
  });

  it('falls back to 0 for invalid stored local values', async () => {
    const invalidValues = ['x', null, undefined, NaN, Infinity, -Infinity, -5, { nope: 1 }];
    for (const timeSavedSeconds of invalidValues) {
      mockLocal.data[stats.STATS_STORAGE_KEY] = { timeSavedSeconds };
      await expect(stats.getSavedStats()).resolves.toEqual({ timeSavedSeconds: 0 });
    }
  });
});

describe('updateSavedStats', () => {
  it('reads, updates, and persists the local value', async () => {
    mockLocal.data[stats.STATS_STORAGE_KEY] = { timeSavedSeconds: 10 };

    const result = await stats.updateSavedStats((current) => ({
      timeSavedSeconds: current.timeSavedSeconds + 5,
    }));

    expect(result).toEqual({ timeSavedSeconds: 15 });
    expect(mockLocal.data[stats.STATS_STORAGE_KEY]).toEqual({ timeSavedSeconds: 15 });
    expect(mockLocal.calls.set).toBe(1);
  });

  it('starts from 0 when local is empty', async () => {
    const result = await stats.updateSavedStats((current) => ({
      timeSavedSeconds: current.timeSavedSeconds + 2.5,
    }));

    expect(result).toEqual({ timeSavedSeconds: 2.5 });
    expect(mockLocal.data[stats.STATS_STORAGE_KEY]).toEqual({ timeSavedSeconds: 2.5 });
  });

  it('persists 0 for invalid updater results', async () => {
    expect(
      (await stats.updateSavedStats(() => ({ timeSavedSeconds: NaN }))).timeSavedSeconds,
    ).toBe(0);
    expect(
      (await stats.updateSavedStats(() => ({ timeSavedSeconds: Infinity }))).timeSavedSeconds,
    ).toBe(0);
    expect((await stats.updateSavedStats(() => ({ timeSavedSeconds: -1 }))).timeSavedSeconds).toBe(
      0,
    );
    expect(
      (
        await stats.updateSavedStats(() => ({
          timeSavedSeconds: 'x' as unknown as number,
        }))
      ).timeSavedSeconds,
    ).toBe(0);

    expect(mockLocal.data[stats.STATS_STORAGE_KEY]).toEqual({ timeSavedSeconds: 0 });
  });

  it('writes only the stats key and leaves other local keys alone', async () => {
    mockLocal.data['unrelatedKey'] = { keep: true };
    mockLocal.data[stats.STATS_STORAGE_KEY] = { timeSavedSeconds: 1 };

    await stats.updateSavedStats((current) => ({
      timeSavedSeconds: current.timeSavedSeconds + 1,
    }));

    expect(mockLocal.data['unrelatedKey']).toEqual({ keep: true });
  });

  it('triggers the legacy migration on its first call (PM review fix)', async () => {
    seedSyncConfig(100);

    const result = await stats.updateSavedStats((current) => ({
      timeSavedSeconds: current.timeSavedSeconds + 5,
    }));

    // Migration ran before the read-modify-write, so the legacy value and the
    // new delta stack instead of the max merge swallowing the delta later.
    expect(result).toEqual({ timeSavedSeconds: 105 });
    expect(mockLocal.data[stats.STATS_STORAGE_KEY]).toEqual({ timeSavedSeconds: 105 });
    // Exactly one sync read for the migration itself, plus the removal
    // attempt's split-keys check (the removal is skipped while the splits are
    // missing — D-2 PM review fix); sync is never written.
    expect(mockSync.calls.get).toBe(2);
    expect(mockSync.calls.set).toBe(0);
  });

  it('migration runs once across both entry points (memoized)', async () => {
    seedSyncConfig(100);

    await stats.getSavedStats();
    const syncReadsAfterFirst = mockSync.calls.get;
    const localWritesAfterFirst = mockLocal.calls.set;

    await stats.updateSavedStats((current) => ({
      timeSavedSeconds: current.timeSavedSeconds + 1,
    }));
    await stats.getSavedStats();

    // No further sync reads after the memoized migration; the only local
    // write in between is the read-modify-write itself.
    expect(mockSync.calls.get).toBe(syncReadsAfterFirst);
    expect(mockLocal.calls.set).toBe(localWritesAfterFirst + 1);
    expect(mockLocal.data[stats.STATS_STORAGE_KEY].timeSavedSeconds).toBe(101);
  });
});

describe('write failure handling', () => {
  it('proceeds and retries later when the migration itself fails', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const syncRemove = vi.fn();
    (globalThis as any).browser = {
      storage: {
        local: mockLocal,
        sync: {
          get: () => {
            throw new Error('sync unavailable');
          },
          set: () => {},
          remove: syncRemove,
        },
      },
    };
    vi.resetModules();
    stats = await import('@/src/shared/stats');

    // The failed migration is not cached as a rejection: the read proceeds on
    // the unmigrated value and the next access will retry the migration.
    await expect(stats.getSavedStats()).resolves.toEqual({ timeSavedSeconds: 0 });
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0][0])).toContain('[speed-master]');
    // A failed migration must not retire the legacy key: it is the retry's
    // source (D-2 PM review fix).
    expect(syncRemove).not.toHaveBeenCalled();
  });

  it('warns and resolves when the callback-style write reports lastError', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    // Finish the (no-op) stats migration before staging the failure: the mock
    // exposes chrome.runtime.lastError as one global, and the migration's
    // legacy-key removal path must not be attributed to it.
    await stats.getSavedStats();
    (globalThis as any).chrome = { runtime: { lastError: { message: 'quota exceeded' } } };

    const result = await stats.updateSavedStats((current) => ({
      timeSavedSeconds: current.timeSavedSeconds + 1,
    }));

    expect(result).toEqual({ timeSavedSeconds: 1 });
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0][0])).toContain('[speed-master]');
  });

  it('warns and resolves when the promise-style write rejects', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    (globalThis as any).browser = {
      storage: {
        local: {
          get: (keys: string | string[] | null) => Promise.resolve({}),
          set: () => Promise.reject(new Error('disk error')),
        },
      },
    };
    vi.resetModules();
    stats = await import('@/src/shared/stats');

    const result = await stats.updateSavedStats((current) => ({
      timeSavedSeconds: current.timeSavedSeconds + 1,
    }));

    expect(result).toEqual({ timeSavedSeconds: 1 });
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0][0])).toContain('[speed-master]');
  });

  it('degrades gracefully when no storage API is available', async () => {
    delete (globalThis as any).browser;
    vi.resetModules();
    stats = await import('@/src/shared/stats');
    config = await import('@/src/shared/config');

    await expect(stats.getSavedStats()).resolves.toEqual({ timeSavedSeconds: 0 });
    await expect(
      stats.updateSavedStats((current) => ({
        timeSavedSeconds: current.timeSavedSeconds + 7,
      })),
    ).resolves.toEqual({ timeSavedSeconds: 7 });
  });
});

describe('shouldCountPlaybackDelta (D-12 wall-clock proportion rule)', () => {
  const count = (mediaDeltaS: number, wallDeltaMs: number, rate: number) =>
    stats.shouldCountPlaybackDelta({ mediaDeltaS, wallDeltaMs, rate });

  it('counts a normal foreground 2x tick', () => {
    // timeupdate fires ~4x/s: ~0.25s wall, ~0.5s media at 2x.
    expect(count(0.5, 250, 2)).toBe(true);
  });

  it('counts a throttled muted-background interval: 60s wall at 2x arrives as ~120s media in one tick (core D-12 fix)', () => {
    // The old fixed 2s cutoff discarded exactly this case, losing all muted
    // background playback time.
    expect(count(120, 60000, 2)).toBe(true);
  });

  it('never counts 1x playback, even when throttled (rate <= 1)', () => {
    expect(count(60, 60000, 1)).toBe(false);
  });

  it('never counts sub-1x playback (slow motion)', () => {
    expect(count(5, 10000, 0.5)).toBe(false);
  });

  it('discards a forward seek: 30s media jump within 1s wall at 2x', () => {
    // expected = 2s, tolerance ceiling = 2 * 1.5 + 0.5 = 3.5s << 30s.
    expect(count(30, 1000, 2)).toBe(false);
  });

  it('discards a backward seek / replay', () => {
    expect(count(-10, 1000, 2)).toBe(false);
  });

  it('discards pause / stall ticks (media did not advance)', () => {
    expect(count(0, 10000, 2)).toBe(false);
  });

  it('counts media running BEHIND the wall expectation (buffering): the actual delta is what saves', () => {
    // 10s wall at 2x but only 5s of media actually played (mid-interval
    // stall): not a seek — count the real 5s (saving 2.5s), never invent the
    // stalled time.
    expect(count(5, 10000, 2)).toBe(true);
  });

  it('discards an interval crossing a rate DROP whose fast segment dominates (conservative undercount)', () => {
    // 4x for 9s then 2x for 1s, tick judged with the current rate=2:
    // media = 9*4 + 1*2 = 38s over 10s wall; expected = 20s, tolerance
    // ceiling = 20 * 1.5 + 0.5 = 30.5s -> discarded. Direction-only headroom:
    // speed-up crossings (media behind the new higher expectation) are always
    // absorbed, a dominant fast segment before a drop can be misjudged —
    // one interval undercounted, old fixed 2s cutoff discarded it too.
    expect(count(38, 10000, 2)).toBe(false);
  });

  it('skips same-tick double dispatch (no wall-clock basis)', () => {
    expect(count(0.2, 0, 2)).toBe(false);
  });

  it('skips the sentinel baseline tick (just attached / navigated)', () => {
    expect(count(0, 0, 2)).toBe(false);
  });

  it('enforces the tolerance boundary: expected x 1.5 + 0.5s', () => {
    // 1s wall at 2x -> expected 2s; allowed up to exactly 3.5s.
    expect(count(3.5, 1000, 2)).toBe(true);
    expect(count(3.51, 1000, 2)).toBe(false);
  });

  it('enforces the absolute fallback cap even when proportional', () => {
    // 300s wall at 2x would legitimately produce 600s of media, but anything
    // beyond the cap is discarded as a catastrophic anomaly.
    expect(count(600, 300000, 2)).toBe(true);
    expect(count(601, 300500, 2)).toBe(false);
  });

  it('still requires proportion after passing the cap boundary (rule order)', () => {
    // media=600 passes the cap check (600 > 600 is false) but the interval is
    // proportionally impossible (1s wall at 2x -> expected 2s, ceiling 3.5s),
    // so the proportion rule discards it: the cap is a ceiling, not a pass.
    expect(count(600, 1000, 2)).toBe(false);
  });

  it('defends against non-finite inputs', () => {
    expect(count(NaN, 1000, 2)).toBe(false);
    expect(count(1, NaN, 2)).toBe(false);
    expect(count(1, 1000, NaN)).toBe(false);
    expect(count(Infinity, 1000, 2)).toBe(false);
    expect(count(1, Infinity, 2)).toBe(false);
    expect(count(1, 1000, Infinity)).toBe(false);
  });
});
