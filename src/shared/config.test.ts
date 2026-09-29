import { describe, expect, it } from 'vitest';
import {
  DEFAULT_CONFIG,
  MAX_CHANNELS,
  capChannels,
  mergeConfig,
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
