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
