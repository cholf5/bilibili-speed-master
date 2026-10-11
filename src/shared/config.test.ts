import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_CONFIG,
  MAX_CHANNELS,
  capChannels,
  mergeConfig,
  removeChannelOverride,
  sanitizeChannels,
} from '@/src/shared/config';
import type { ChannelOverride, SpeedMasterConfig } from '@/src/shared/config';

const makeChannel = (overrides: Partial<ChannelOverride> = {}): ChannelOverride => ({
  channelId: '1',
  channelName: 'Channel 1',
  speed: 1.5,
  lastVisit: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

const makeConfig = (channels: Record<string, ChannelOverride>): SpeedMasterConfig => ({
  ...DEFAULT_CONFIG,
  channels,
});

describe('sanitizeChannels', () => {
  it('returns an empty record for non-object input', () => {
    expect(sanitizeChannels(null)).toEqual({});
    expect(sanitizeChannels(undefined)).toEqual({});
    expect(sanitizeChannels('channels')).toEqual({});
    expect(sanitizeChannels(42)).toEqual({});
    expect(sanitizeChannels(true)).toEqual({});
  });

  it('keeps a fully valid entry, keyed by channelId', () => {
    const channel = makeChannel();
    expect(sanitizeChannels({ '1': channel })).toEqual({ '1': channel });
  });

  it('drops entries that are not plain objects', () => {
    const good = makeChannel({ channelId: 'good' });
    expect(
      sanitizeChannels({
        bad1: null,
        bad2: 'channel',
        bad3: 42,
        bad4: [good],
        good,
      }),
    ).toEqual({ good });
  });

  it('drops entries with a missing or non-numeric speed', () => {
    const { speed: _speed, ...withoutSpeed } = makeChannel({ channelId: 'a' });
    expect(sanitizeChannels({ a: withoutSpeed })).toEqual({});
    expect(sanitizeChannels({ a: makeChannel({ channelId: 'a', speed: '1.5' as unknown as number }) })).toEqual({});
  });

  it('drops entries with non-finite speed (NaN / Infinity)', () => {
    expect(sanitizeChannels({ a: makeChannel({ speed: NaN }) })).toEqual({});
    expect(sanitizeChannels({ a: makeChannel({ speed: Infinity }) })).toEqual({});
    expect(sanitizeChannels({ a: makeChannel({ speed: -Infinity }) })).toEqual({});
  });

  it('clamps speed into [0.1, 4]', () => {
    const channels = sanitizeChannels({
      low: makeChannel({ channelId: 'low', speed: 0.01 }),
      high: makeChannel({ channelId: 'high', speed: 8 }),
      mid: makeChannel({ channelId: 'mid', speed: 2.5 }),
      min: makeChannel({ channelId: 'min', speed: 0.1 }),
      max: makeChannel({ channelId: 'max', speed: 4 }),
    });
    expect(channels.low.speed).toBe(0.1);
    expect(channels.high.speed).toBe(4);
    expect(channels.mid.speed).toBe(2.5);
    expect(channels.min.speed).toBe(0.1);
    expect(channels.max.speed).toBe(4);
  });

  it('drops entries with a missing, empty, or whitespace-only channelId', () => {
    const { channelId: _channelId, ...withoutId } = makeChannel();
    expect(sanitizeChannels({ a: withoutId })).toEqual({});
    expect(sanitizeChannels({ a: makeChannel({ channelId: '' }) })).toEqual({});
    expect(sanitizeChannels({ a: makeChannel({ channelId: '   ' }) })).toEqual({});
  });

  it('drops entries with a missing or empty channelName', () => {
    const { channelName: _name, ...withoutName } = makeChannel();
    expect(sanitizeChannels({ a: withoutName })).toEqual({});
    expect(sanitizeChannels({ a: makeChannel({ channelName: '' }) })).toEqual({});
  });

  it('lets channelId win over the record key when they disagree', () => {
    const channels = sanitizeChannels({ '999': makeChannel({ channelId: '1' }) });
    expect(channels['1']).toEqual(makeChannel({ channelId: '1' }));
    expect(channels['999']).toBeUndefined();
  });

  it('keeps the entry but drops an invalid lastVisit field', () => {
    const { lastVisit: _dropped, ...expected } = makeChannel({ channelId: 'a' });

    const badDate = { ...makeChannel({ channelId: 'a' }), lastVisit: 'not-a-date' };
    expect(sanitizeChannels({ a: badDate })).toEqual({ a: expected });

    const numericLastVisit = { ...makeChannel({ channelId: 'a' }), lastVisit: 123 as unknown as string };
    expect(sanitizeChannels({ a: numericLastVisit })).toEqual({ a: expected });
  });

  it('keeps a valid lastVisit', () => {
    const channels = sanitizeChannels({
      a: makeChannel({ channelId: 'a', lastVisit: '2026-09-29T10:00:00Z' }),
    });
    expect(channels.a.lastVisit).toBe('2026-09-29T10:00:00Z');
  });

  it('drops a non-string avatarUrl but keeps a string one', () => {
    const badAvatar = { ...makeChannel({ channelId: 'a' }), avatarUrl: 42 as unknown as string };
    expect(sanitizeChannels({ a: badAvatar })).toEqual({ a: makeChannel({ channelId: 'a' }) });

    const goodAvatar = makeChannel({ channelId: 'a', avatarUrl: '//i0.hdslb.com/face.png' });
    expect(sanitizeChannels({ a: goodAvatar })).toEqual({ a: goodAvatar });
  });

  it('never throws on garbage shapes', () => {
    expect(() => sanitizeChannels({ a: [], b: {}, c: { channelId: 1, channelName: 2, speed: {} } }))
      .not.toThrow();
    expect(sanitizeChannels({ b: {} })).toEqual({});
  });
});

describe('capChannels', () => {
  const channelsAt = (
    count: number,
    keyPrefix = '',
    withLastVisit = true,
  ): Record<string, ChannelOverride> => {
    const channels: Record<string, ChannelOverride> = {};
    for (let i = 0; i < count; i += 1) {
      const key = `${keyPrefix}${i}`;
      channels[key] = makeChannel({
        channelId: key,
        lastVisit: withLastVisit
          ? new Date(Date.UTC(2026, 0, 1, 0, 0, i)).toISOString()
          : undefined,
      });
    }
    return channels;
  };

  it('exposes the sync-quota cap of 200', () => {
    expect(MAX_CHANNELS).toBe(200);
  });

  it('returns the identical object (no copy) when at or under the cap', () => {
    const config = makeConfig(channelsAt(200));
    expect(capChannels(config)).toBe(config);

    const small = makeConfig({ a: makeChannel({ channelId: 'a' }) });
    expect(capChannels(small)).toBe(small);
  });

  it('evicts the oldest 50 of 250 entries by lastVisit, keeping the newest 200', () => {
    const channels = channelsAt(250);
    const capped = capChannels(makeConfig(channels));

    expect(Object.keys(capped.channels)).toHaveLength(200);
    expect(capped.channels['0']).toBeUndefined(); // oldest
    expect(capped.channels['49']).toBeUndefined(); // still among the oldest 50
    expect(capped.channels['50']).toEqual(channels['50']); // first survivor
    expect(capped.channels['249']).toEqual(channels['249']); // newest
  });

  it('treats entries without a lastVisit as the oldest and evicts them first', () => {
    // 200 timestamped entries + 10 without lastVisit + 1 very recent entry:
    // the 10 no-lastVisit entries are treated as oldest, and the oldest
    // timestamped entry ('0') is evicted with them to get back to 200.
    const channels = {
      ...channelsAt(200),
      ...channelsAt(10, 'stale-', false),
      newer: makeChannel({ channelId: 'newer', lastVisit: '2026-06-01T00:00:00.000Z' }),
    };
    const capped = capChannels(makeConfig(channels), 200);

    expect(Object.keys(capped.channels)).toHaveLength(200);
    for (let i = 0; i < 10; i += 1) {
      expect(capped.channels[`stale-${i}`]).toBeUndefined();
    }
    expect(capped.channels['0']).toBeUndefined();
    expect(capped.channels['1']).toBeDefined();
    expect(capped.channels['199']).toBeDefined();
    expect(capped.channels['newer']).toEqual(
      makeChannel({ channelId: 'newer', lastVisit: '2026-06-01T00:00:00.000Z' }),
    );
  });

  it('keeps the rest of the config untouched when evicting', () => {
    const config = makeConfig(channelsAt(250));
    const capped = capChannels(config);
    expect(capped.version).toBe(config.version);
    expect(capped.global).toEqual(config.global);
    expect(capped.stats).toEqual(config.stats);
  });
});

// D-10: shared channel-override removal used by options' table delete and the
// popup's "follow global" button.
describe('removeChannelOverride (D-10)', () => {
  it('removes the entry for the given channelId and keeps the others', () => {
    const channels = {
      a: makeChannel({ channelId: 'a', speed: 2 }),
      b: makeChannel({ channelId: 'b', speed: 1.25 }),
      c: makeChannel({ channelId: 'c', speed: 3 }),
    };
    const next = removeChannelOverride(channels, 'b');

    expect(Object.keys(next)).toEqual(['a', 'c']);
    expect(next.a).toBe(channels.a);
    expect(next.c).toBe(channels.c);
    expect(next.b).toBeUndefined();
  });

  it('does not mutate the input record or its entries', () => {
    const channels = {
      a: makeChannel({ channelId: 'a' }),
      b: makeChannel({ channelId: 'b' }),
    };
    const next = removeChannelOverride(channels, 'a');

    expect(next).not.toBe(channels);
    expect(channels.a).toEqual(makeChannel({ channelId: 'a' }));
    expect(Object.keys(channels)).toEqual(['a', 'b']);
  });

  it('returns the same record when the channelId is absent (no-op write skip)', () => {
    const channels = { a: makeChannel({ channelId: 'a' }) };
    expect(removeChannelOverride(channels, 'missing')).toBe(channels);
    expect(removeChannelOverride(channels, '')).toBe(channels);
  });

  it('handles an empty channels record', () => {
    const channels: Record<string, ChannelOverride> = {};
    expect(removeChannelOverride(channels, 'a')).toBe(channels);
    expect(removeChannelOverride(channels, 'a')).toEqual({});
  });

  it('also removes an entry whose channelId disagrees with its record key', () => {
    // sanitizeChannels keys the record by entry.channelId, so key and channelId
    // agree after any read; a disagreeing legacy blob must not survive a
    // targeted removal either.
    const channels = {
      legacyKey: makeChannel({ channelId: 'actual' }),
      other: makeChannel({ channelId: 'other' }),
    };
    const next = removeChannelOverride(channels, 'actual');

    expect(Object.keys(next)).toEqual(['other']);
    expect(removeChannelOverride(channels, 'legacyKey').other).toBe(channels.other);
  });

  it('removes every entry referencing the id, keyed or not', () => {
    const channels = {
      a: makeChannel({ channelId: 'dup' }),
      dup: makeChannel({ channelId: 'dup', speed: 2 }),
      keep: makeChannel({ channelId: 'keep' }),
    };
    const next = removeChannelOverride(channels, 'dup');
    expect(Object.keys(next)).toEqual(['keep']);
  });
});

describe('mergeConfig', () => {
  it('returns the defaults for non-object input', () => {
    expect(mergeConfig(null)).toEqual(DEFAULT_CONFIG);
    expect(mergeConfig(undefined)).toEqual(DEFAULT_CONFIG);
    expect(mergeConfig(42)).toEqual(DEFAULT_CONFIG);
    expect(mergeConfig('config')).toEqual(DEFAULT_CONFIG);
  });

  it('returns the defaults for an empty object', () => {
    expect(mergeConfig({})).toEqual(DEFAULT_CONFIG);
  });

  it('falls back to defaults for each global field with a wrong type', () => {
    const merged = mergeConfig({
      global: {
        defaultSpeed: '2',
        preferredQuality: 1080,
        showVideoWidget: 'yes',
        videoWidgetPosition: 'bottomLeft',
      },
    });
    expect(merged.global).toEqual(DEFAULT_CONFIG.global);
  });

  it('keeps valid global values', () => {
    const merged = mergeConfig({
      global: {
        defaultSpeed: 1.5,
        preferredQuality: '1080p',
        showVideoWidget: false,
        videoWidgetPosition: 'topRight',
      },
    });
    expect(merged.global).toEqual({
      defaultSpeed: 1.5,
      preferredQuality: '1080p',
      showVideoWidget: false,
      videoWidgetPosition: 'topRight',
      // D-9: shortcuts absent from the raw global fall back to the defaults.
      shortcuts: DEFAULT_CONFIG.global.shortcuts,
    });
  });

  // D-9: global.shortcuts merge compatibility. The per-entry repair rules
  // (unknown ids, empty codes, __proto__ safety, …) live in
  // src/shared/shortcuts.test.ts; here we verify the config-schema wiring.
  describe('global.shortcuts (D-9)', () => {
    it('fills the default keymap for old data without a shortcuts field (TC4)', () => {
      const merged = mergeConfig({
        global: { defaultSpeed: 1.5 },
      });
      expect(merged.global.shortcuts).toEqual(DEFAULT_CONFIG.global.shortcuts);
      expect(merged.global.shortcuts.togglePlay).toEqual({ code: 'KeyK', key: 'k' });
    });

    it('keeps custom bindings and explicit disables on a round-trip', () => {
      const shortcuts = {
        ...DEFAULT_CONFIG.global.shortcuts,
        togglePlay: { code: 'KeyP', key: 'p' },
        toggleMute: null,
      };
      const merged = mergeConfig({ global: { shortcuts } });
      expect(merged.global.shortcuts.togglePlay).toEqual({ code: 'KeyP', key: 'p' });
      expect(merged.global.shortcuts.toggleMute).toBeNull();
      // A second merge of the merged output is stable.
      expect(mergeConfig(merged).global.shortcuts).toEqual(merged.global.shortcuts);
    });

    it('repairs invalid entries instead of leaking them into the schema', () => {
      const merged = mergeConfig({
        global: {
          shortcuts: {
            togglePlay: { code: '' },
            turboMode: { code: 'KeyT' },
          },
        },
      });
      expect(merged.global.shortcuts.togglePlay).toEqual({ code: 'KeyK', key: 'k' });
      expect('turboMode' in merged.global.shortcuts).toBe(false);
    });
  });

  it('treats a non-object global/stats section as absent', () => {
    const merged = mergeConfig({ global: 'nope', stats: 7 });
    expect(merged.global).toEqual(DEFAULT_CONFIG.global);
    expect(merged.stats).toEqual(DEFAULT_CONFIG.stats);
  });

  it('falls back to 0 for a non-numeric timeSavedSeconds and keeps numeric ones', () => {
    expect(mergeConfig({ stats: { timeSavedSeconds: 'many' } }).stats.timeSavedSeconds).toBe(0);
    expect(mergeConfig({ stats: { timeSavedSeconds: 12.5 } }).stats.timeSavedSeconds).toBe(12.5);
  });

  it('sanitizes channels instead of trusting nested data', () => {
    const merged = mergeConfig({
      channels: {
        good: makeChannel({ channelId: 'good' }),
        bad: { channelId: 'bad', channelName: 'Bad', speed: 'fast' },
      },
    });
    expect(merged.channels).toEqual({
      good: makeChannel({ channelId: 'good' }),
    });
  });

  it('always produces version 1 regardless of the raw version', () => {
    expect(mergeConfig({ version: 2 }).version).toBe(1);
    expect(mergeConfig({}).version).toBe(1);
  });

  it('round-trips a valid config unchanged', () => {
    const valid = makeConfig({
      '1': makeChannel({ avatarUrl: '//i0.hdslb.com/face.png' }),
      '2': makeChannel({ channelId: '2', channelName: 'Channel 2', speed: 4 }),
    });
    expect(mergeConfig(valid)).toEqual(valid);
    expect(mergeConfig(mergeConfig(valid))).toEqual(valid);
  });

  it('round-trips DEFAULT_CONFIG unchanged', () => {
    expect(mergeConfig(DEFAULT_CONFIG)).toEqual(DEFAULT_CONFIG);
  });
});

// D-2 storage tests: split keys, read fallback, and the in-context write
// queue. config.ts resolves its storage handle once at module evaluation, so
// (mirroring stats.test.ts) each test resets the module registry, injects the
// in-memory storage, and only then dynamically imports the module under test.
// The pure-function tests above keep their static import; both module
// instances coexist without interference.
describe('storage split keys and write queue (D-2)', () => {
  type GatedSync = {
    area: Record<string, any>;
    data: Record<string, any>;
    setCalls: Array<Record<string, any>>;
    removeCalls: string[][];
    getWaiters: Array<() => void>;
    // When false (default) every get responds immediately; queue tests flip
    // this on so read-modify-write interleavings can be staged by hand via
    // releaseNextGet.
    holdGets: boolean;
    releaseNextGet: () => void;
  };

  // Callback-style sync mock (get/set/remove length >= 2, matching the
  // chrome callback API branch). Reads snapshot `data` at delivery time.
  const createGatedSync = (): GatedSync => {
    const data: Record<string, any> = {};
    const setCalls: Array<Record<string, any>> = [];
    const removeCalls: string[][] = [];
    const getWaiters: Array<() => void> = [];
    const state: GatedSync = {
      area: {} as Record<string, any>,
      data,
      setCalls,
      removeCalls,
      getWaiters,
      holdGets: false,
      releaseNextGet: () => {
        const waiter = getWaiters.shift();
        if (!waiter) {
          throw new Error('no pending storage.get to release');
        }
        waiter();
      },
    };

    const keysOf = (keys: unknown): string[] =>
      (Array.isArray(keys) ? keys : [keys]).filter(
        (key): key is string => typeof key === 'string',
      );

    state.area = {
      get(keys: unknown, callback?: (items: any) => void) {
        const keysList = keysOf(keys);
        const deliver = () => {
          const items: Record<string, any> = {};
          for (const key of keysList) {
            if (key in data) {
              items[key] = data[key];
            }
          }
          callback?.(items);
        };
        if (state.holdGets) {
          getWaiters.push(deliver);
        } else {
          deliver();
        }
      },
      set(items: Record<string, any>, callback?: () => void) {
        setCalls.push(items);
        Object.assign(data, items);
        callback?.();
      },
      remove(keys: unknown, callback?: () => void) {
        const keysList = keysOf(keys);
        removeCalls.push(keysList);
        for (const key of keysList) {
          delete data[key];
        }
        callback?.();
      },
    };

    return state;
  };

  // A macrotask tick flushes every pending microtask, so queued units have
  // started (or finished) deterministically by the time it resolves.
  const tick = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

  let gated: GatedSync;
  let config: typeof import('@/src/shared/config');

  const seedLegacyConfig = () => {
    gated.data[config.STORAGE_KEY] = {
      version: 1,
      global: { ...config.DEFAULT_CONFIG.global, defaultSpeed: 1.5 },
      channels: {
        legacy: {
          channelId: 'legacy',
          channelName: 'Legacy',
          speed: 1.25,
          lastVisit: '2026-01-01T00:00:00.000Z',
        },
      },
      stats: { timeSavedSeconds: 99 },
    };
  };

  beforeEach(async () => {
    vi.resetModules();
    gated = createGatedSync();
    (globalThis as any).browser = { storage: { sync: gated.area } };
    config = await import('@/src/shared/config');
  });

  afterEach(() => {
    delete (globalThis as any).browser;
    delete (globalThis as any).chrome;
    vi.restoreAllMocks();
  });

  describe('read fallback', () => {
    it('reads the legacy merged key when the split keys are absent (upgrade path)', async () => {
      seedLegacyConfig();

      await expect(config.getConfig()).resolves.toEqual({
        version: 1,
        global: { ...config.DEFAULT_CONFIG.global, defaultSpeed: 1.5 },
        channels: {
          legacy: {
            channelId: 'legacy',
            channelName: 'Legacy',
            speed: 1.25,
            lastVisit: '2026-01-01T00:00:00.000Z',
          },
        },
        stats: { timeSavedSeconds: 99 },
      });
    });

    it('prefers the split keys over the legacy blob when both exist', async () => {
      seedLegacyConfig();
      gated.data[config.GLOBAL_STORAGE_KEY] = {
        version: 1,
        global: { ...config.DEFAULT_CONFIG.global, defaultSpeed: 2 },
      };
      gated.data[config.CHANNELS_STORAGE_KEY] = {
        version: 1,
        channels: {
          split: { channelId: 'split', channelName: 'Split', speed: 3 },
        },
      };

      const loaded = await config.getConfig();
      expect(loaded.global.defaultSpeed).toBe(2);
      expect(loaded.channels.split).toBeDefined();
      expect(loaded.channels.legacy).toBeUndefined();
      // stats only ever lived in the legacy blob (D-1), so they still surface
      // from it even when both split keys win for their own partitions.
      expect(loaded.stats).toEqual({ timeSavedSeconds: 99 });
    });

    it('falls back per partition when only one split key exists', async () => {
      seedLegacyConfig();
      gated.data[config.GLOBAL_STORAGE_KEY] = {
        version: 1,
        global: { ...config.DEFAULT_CONFIG.global, defaultSpeed: 2 },
      };

      const loaded = await config.getConfig();
      expect(loaded.global.defaultSpeed).toBe(2);
      // No channels split key → the legacy channels record is still served.
      expect(loaded.channels.legacy).toBeDefined();
    });
  });

  describe('split writes', () => {
    it('writes only the split keys and keeps the legacy key in place (stats migration owns removal)', async () => {
      seedLegacyConfig();

      const next = await config.setConfig({
        ...config.DEFAULT_CONFIG,
        global: { ...config.DEFAULT_CONFIG.global, defaultSpeed: 2.5 },
        channels: {
          a: { channelId: 'a', channelName: 'A', speed: 1.5, lastVisit: '2026-02-01T00:00:00.000Z' },
        },
      });

      expect(gated.data[config.GLOBAL_STORAGE_KEY]).toEqual({
        version: 1,
        global: { ...config.DEFAULT_CONFIG.global, defaultSpeed: 2.5 },
      });
      expect(gated.data[config.CHANNELS_STORAGE_KEY]).toEqual({
        version: 1,
        channels: {
          a: { channelId: 'a', channelName: 'A', speed: 1.5, lastVisit: '2026-02-01T00:00:00.000Z' },
        },
      });
      expect(next.global.defaultSpeed).toBe(2.5);

      // (PM review fix) The legacy merged key still carries the pre-D-1 stats
      // value and serves as the global/channels read fallback until the splits
      // are read back, so config writes must never remove it — the stats
      // migration retires it after consuming it.
      expect(config.STORAGE_KEY in gated.data).toBe(true);
      for (const items of gated.setCalls) {
        expect(config.STORAGE_KEY in items).toBe(false);
      }
      expect(gated.removeCalls).toEqual([]);

      // A later write does not remove it either.
      await config.setConfig(config.DEFAULT_CONFIG);
      expect(gated.removeCalls).toEqual([]);
    });

    it('removeLegacyConfigKeyOnce retires the legacy key exactly once once both splits are in place', async () => {
      seedLegacyConfig();
      await config.setConfig({ ...config.DEFAULT_CONFIG }); // splits in place

      await config.removeLegacyConfigKeyOnce();

      expect(config.STORAGE_KEY in gated.data).toBe(false);
      expect(gated.removeCalls).toEqual([[config.STORAGE_KEY]]);

      // The once-flag prevents any further removal attempts.
      await config.removeLegacyConfigKeyOnce();
      expect(gated.removeCalls).toHaveLength(1);
    });

    it('removeLegacyConfigKeyOnce is a no-op while a split key is missing, and still works later', async () => {
      seedLegacyConfig(); // no split keys yet

      await config.removeLegacyConfigKeyOnce();

      // The legacy blob is still the read fallback for global/channels, so it
      // stays — and the once-flag is NOT consumed by the skipped attempt.
      expect(config.STORAGE_KEY in gated.data).toBe(true);
      expect(gated.removeCalls).toEqual([]);

      await config.setConfig({ ...config.DEFAULT_CONFIG }); // splits in place now
      await config.removeLegacyConfigKeyOnce();

      expect(config.STORAGE_KEY in gated.data).toBe(false);
      expect(gated.removeCalls).toEqual([[config.STORAGE_KEY]]);
    });

    it('keeps the setConfig round-trip contract: capping and full-config return', async () => {
      const channels: Record<string, ChannelOverride> = {};
      for (let i = 0; i < config.MAX_CHANNELS + 10; i += 1) {
        channels[String(i)] = {
          channelId: String(i),
          channelName: `Channel ${i}`,
          speed: 1.5,
          lastVisit: new Date(Date.UTC(2026, 0, 1, 0, 0, i)).toISOString(),
        };
      }

      const persisted = await config.setConfig({ ...config.DEFAULT_CONFIG, channels });

      expect(Object.keys(persisted.channels)).toHaveLength(config.MAX_CHANNELS);
      expect(persisted.channels['0']).toBeUndefined(); // oldest evicted
      expect(persisted.channels['209']).toBeDefined();
      expect(gated.data[config.CHANNELS_STORAGE_KEY].channels).toEqual(persisted.channels);
      await expect(config.getConfig()).resolves.toEqual(persisted);
    });
  });

  describe('write queue', () => {
    const seedSplitDefaults = () => {
      gated.data[config.GLOBAL_STORAGE_KEY] = {
        version: 1,
        global: { ...config.DEFAULT_CONFIG.global },
      };
      gated.data[config.CHANNELS_STORAGE_KEY] = { version: 1, channels: {} };
    };

    it('serializes concurrent updateConfig calls so the later writer builds on the earlier result', async () => {
      seedSplitDefaults();
      gated.holdGets = true;

      const first = config.updateConfig((current) => ({
        ...current,
        global: { ...current.global, defaultSpeed: 2 },
      }));
      await tick();
      expect(gated.getWaiters).toHaveLength(1);

      let seenBySecond: number | null = null;
      const second = config.updateConfig((current) => {
        seenBySecond = current.global.defaultSpeed;
        return {
          ...current,
          global: { ...current.global, defaultSpeed: current.global.defaultSpeed + 1 },
        };
      });
      await tick();
      // The second unit is queued: it must not read before the first write.
      expect(gated.getWaiters).toHaveLength(1);

      gated.releaseNextGet();
      await first;
      expect(gated.data[config.GLOBAL_STORAGE_KEY].global.defaultSpeed).toBe(2);

      await tick();
      expect(gated.getWaiters).toHaveLength(1);
      gated.releaseNextGet();
      await second;

      // The second writer read the first writer's persisted value (2), not
      // the original 1 — the read-modify-write cycles did not interleave.
      expect(seenBySecond).toBe(2);
      expect(gated.data[config.GLOBAL_STORAGE_KEY].global.defaultSpeed).toBe(3);
    });

    it('keeps a concurrent popup-style global write and content-style channels write from clobbering each other', async () => {
      seedSplitDefaults();
      gated.holdGets = true;

      // Both writes are in flight before either settles, mirroring a popup
      // global change racing a content-script channel override.
      const popupWrite = config.updateConfig((current) => ({
        ...current,
        global: { ...current.global, defaultSpeed: 2.5 },
      }));
      const contentWrite = config.updateConfig((current) => ({
        ...current,
        channels: {
          ...current.channels,
          '42': {
            channelId: '42',
            channelName: 'Channel 42',
            speed: 2,
            lastVisit: '2026-03-01T00:00:00.000Z',
          },
        },
      }));
      await tick();

      gated.releaseNextGet();
      await popupWrite;
      await tick();
      gated.releaseNextGet();
      await contentWrite;

      // Both partitions landed; no set call ever carried the legacy merged
      // key (the split-key evidence: a stale global write can no longer
      // transport a channels snapshot under the old merged key).
      expect(gated.data[config.GLOBAL_STORAGE_KEY].global.defaultSpeed).toBe(2.5);
      expect(gated.data[config.CHANNELS_STORAGE_KEY].channels['42'].speed).toBe(2);
      for (const items of gated.setCalls) {
        expect(Object.keys(items).sort()).toEqual(
          [config.CHANNELS_STORAGE_KEY, config.GLOBAL_STORAGE_KEY].sort(),
        );
      }
    });

    it('does not lose same-key updates across queued consecutive read-modify-writes', async () => {
      gated.holdGets = true;
      gated.data[config.GLOBAL_STORAGE_KEY] = {
        version: 1,
        global: { ...config.DEFAULT_CONFIG.global },
      };
      gated.data[config.CHANNELS_STORAGE_KEY] = {
        version: 1,
        channels: {
          '42': {
            channelId: '42',
            channelName: 'Channel 42',
            speed: 1,
            lastVisit: '2026-03-01T00:00:00.000Z',
          },
        },
      };

      // Two relative channel-speed bumps issued concurrently: each must apply
      // on top of the previous writer's result (1 → 1.5 → 2), not both on 1.
      const bump = () =>
        config.updateConfig((current) => ({
          ...current,
          channels: {
            ...current.channels,
            '42': { ...current.channels['42'], speed: current.channels['42'].speed + 0.5 },
          },
        }));
      const bumpA = bump();
      const bumpB = bump();

      await tick();
      gated.releaseNextGet();
      await bumpA;
      await tick();
      gated.releaseNextGet();
      await bumpB;

      expect(gated.data[config.CHANNELS_STORAGE_KEY].channels['42'].speed).toBe(2);
    });

    it('skips the storage write when the updater returns the config unchanged', async () => {
      seedSplitDefaults();
      gated.holdGets = true;

      const unchanged = config.updateConfig((current) => current);
      await tick();
      gated.releaseNextGet();
      await expect(unchanged).resolves.toEqual({ ...config.DEFAULT_CONFIG });

      expect(gated.setCalls).toHaveLength(0);
      expect(gated.removeCalls).toHaveLength(0);

      // The queue still works afterwards.
      const changed = config.updateConfig((current) => ({
        ...current,
        global: { ...current.global, defaultSpeed: 2 },
      }));
      await tick();
      gated.releaseNextGet();
      await changed;
      expect(gated.data[config.GLOBAL_STORAGE_KEY].global.defaultSpeed).toBe(2);
    });
  });
});
