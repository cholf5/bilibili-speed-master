// Copyright (c) 2026 cholf5
//
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at https://mozilla.org/MPL/2.0/.
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  CHANNELS_STORAGE_KEY,
  DEFAULT_CONFIG,
  GLOBAL_STORAGE_KEY,
  type ChannelOverride,
  type SpeedMasterConfig,
} from '@/src/shared/config';
import { DEFAULT_SHORTCUT_BINDINGS } from '@/src/shared/shortcuts';
import { createConfigCache } from '@/src/shared/config-cache';

const flushAsync = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

const makeChannel = (id: string, speed: number): ChannelOverride => ({
  channelId: id,
  channelName: `UP ${id}`,
  speed,
  lastVisit: '2026-10-01T00:00:00.000Z',
});

const makeConfig = (overrides?: {
  defaultSpeed?: number;
  channels?: Record<string, ChannelOverride>;
}): SpeedMasterConfig => ({
  version: 1,
  global: {
    defaultSpeed: overrides?.defaultSpeed ?? 1,
    preferredQuality: 'auto',
    showVideoWidget: true,
    videoWidgetPosition: 'topLeft',
    uiLanguage: 'auto',
    shortcuts: DEFAULT_SHORTCUT_BINDINGS,
  },
  channels: overrides?.channels ?? {},
  stats: { timeSavedSeconds: 0 },
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('createConfigCache', () => {
  it('awaits the initial storage read, then serves every read from memory', async () => {
    const configA = makeConfig({ defaultSpeed: 1.5 });
    const readConfig = vi.fn().mockResolvedValue(configA);
    const cache = createConfigCache(readConfig);

    expect(cache.peek()).toEqual(DEFAULT_CONFIG); // nothing loaded yet

    await expect(cache.read()).resolves.toEqual(configA);
    expect(readConfig).toHaveBeenCalledTimes(1);

    await expect(cache.read()).resolves.toEqual(configA);
    await expect(cache.read()).resolves.toEqual(configA);
    expect(readConfig).toHaveBeenCalledTimes(1); // no storage re-reads
  });

  it('shares one initial load across concurrent first reads', async () => {
    let resolveRead!: (config: SpeedMasterConfig) => void;
    const readConfig = vi.fn(
      () =>
        new Promise<SpeedMasterConfig>((resolve) => {
          resolveRead = resolve;
        }),
    );
    const cache = createConfigCache(readConfig);

    const first = cache.read();
    const second = cache.read();
    resolveRead(makeConfig({ defaultSpeed: 2 }));

    const [a, b] = await Promise.all([first, second]);
    expect(a).toEqual(b);
    expect(readConfig).toHaveBeenCalledTimes(1);
  });

  it('ignores non-sync areas and sync changes without config keys (stats writes do not touch the cache)', async () => {
    const configA = makeConfig();
    const readConfig = vi.fn().mockResolvedValue(configA);
    const cache = createConfigCache(readConfig);
    await cache.read();

    const appliedLocal = cache.handleStorageChanged(
      { [GLOBAL_STORAGE_KEY]: { newValue: { version: 1, global: {} } } },
      'local',
    );
    const appliedOtherKey = cache.handleStorageChanged({ unrelated: { newValue: 1 } }, 'sync');
    const appliedNullChanges = cache.handleStorageChanged(null, 'sync');
    const appliedUndefinedChanges = cache.handleStorageChanged(undefined, 'sync');

    expect(appliedLocal).toBe(false);
    expect(appliedOtherKey).toBe(false);
    expect(appliedNullChanges).toBe(false);
    expect(appliedUndefinedChanges).toBe(false);
    expect(readConfig).toHaveBeenCalledTimes(1); // no reload triggered
    expect(cache.peek()).toEqual(configA); // cache untouched
  });

  it('applies a sync-area config change: immediate patch plus converging reload', async () => {
    const configA = makeConfig({ defaultSpeed: 1 });
    const configB = makeConfig({ defaultSpeed: 2.5, channels: { '42': makeChannel('42', 3) } });
    const readConfig = vi.fn().mockResolvedValueOnce(configA).mockResolvedValue(configB);
    const cache = createConfigCache(readConfig);
    await cache.read();

    const applied = cache.handleStorageChanged(
      {
        [GLOBAL_STORAGE_KEY]: { newValue: { version: 1, global: { defaultSpeed: 2.5 } } },
        [CHANNELS_STORAGE_KEY]: {
          newValue: { version: 1, channels: { '42': makeChannel('42', 3) } },
        },
      },
      'sync',
    );

    expect(applied).toBe(true);
    // Patched synchronously from the payload: readers never see the old value.
    expect(cache.peek().global.defaultSpeed).toBe(2.5);
    expect(cache.peek().channels['42']?.speed).toBe(3);

    await flushAsync();
    // Background reload reconciles the merged view with storage truth.
    expect(readConfig).toHaveBeenCalledTimes(2);
    expect(cache.peek()).toEqual(configB);
  });

  it('discards a stale initial read when onChanged lands before it resolves (startup race)', async () => {
    const staleConfig = makeConfig({ defaultSpeed: 1 });
    const freshConfig = makeConfig({ defaultSpeed: 4 });
    let resolveInitial!: (config: SpeedMasterConfig) => void;
    const readConfig = vi
      .fn<() => Promise<SpeedMasterConfig>>()
      .mockImplementationOnce(
        () =>
          new Promise<SpeedMasterConfig>((resolve) => {
            resolveInitial = resolve;
          }),
      )
      .mockResolvedValue(freshConfig);
    const cache = createConfigCache(readConfig);

    const pendingRead = cache.read(); // initial read starts, token 0
    await flushAsync();

    const applied = cache.handleStorageChanged(
      { [GLOBAL_STORAGE_KEY]: { newValue: { version: 1, global: { defaultSpeed: 4 } } } },
      'sync',
    );
    expect(applied).toBe(true);

    resolveInitial(staleConfig); // the pre-change read lands LAST
    await expect(pendingRead).resolves.toEqual(freshConfig);

    await flushAsync();
    expect(readConfig).toHaveBeenCalledTimes(2); // stale read was retried
    expect(cache.peek()).toEqual(freshConfig); // old value never overwrote the patch
  });

  it('leaves a removed partition to the reload (legacy fallback handled by a fresh read)', async () => {
    const configA = makeConfig({ channels: { '42': makeChannel('42', 2) } });
    const configAfterRemoval = makeConfig({ channels: {} });
    const readConfig = vi
      .fn<() => Promise<SpeedMasterConfig>>()
      .mockResolvedValueOnce(configA)
      .mockResolvedValue(configAfterRemoval);
    const cache = createConfigCache(readConfig);
    await cache.read();

    const applied = cache.handleStorageChanged(
      { [CHANNELS_STORAGE_KEY]: { oldValue: { version: 1, channels: {} }, newValue: undefined } },
      'sync',
    );

    expect(applied).toBe(true);
    expect(cache.peek().channels['42']).toBeDefined(); // no destructive patch
    await flushAsync();
    expect(cache.peek()).toEqual(configAfterRemoval); // reload reconciled
  });

  it('does not touch the global partition when only the channels key updates (no removal)', async () => {
    const configA = makeConfig({
      defaultSpeed: 1.5,
      channels: { '42': makeChannel('42', 2) },
    });
    const configB = makeConfig({
      defaultSpeed: 1.5,
      channels: { '42': makeChannel('42', 3) },
    });
    const readConfig = vi
      .fn<() => Promise<SpeedMasterConfig>>()
      .mockResolvedValueOnce(configA)
      .mockResolvedValue(configB);
    const cache = createConfigCache(readConfig);
    await cache.read();

    const applied = cache.handleStorageChanged(
      {
        [CHANNELS_STORAGE_KEY]: {
          newValue: { version: 1, channels: { '42': makeChannel('42', 3) } },
        },
      },
      'sync',
    );

    expect(applied).toBe(true);
    // Updated partition patched synchronously; the untouched global partition
    // keeps the initial read's values (a DEFAULT-fallback clobber would show
    // up as defaultSpeed 1 instead of 1.5 here).
    expect(cache.peek().channels['42']?.speed).toBe(3);
    expect(cache.peek().global).toEqual(configA.global);

    await flushAsync();
    expect(cache.peek()).toEqual(configB); // reload reconciled
  });

  it('in a mixed event (one partition updated, the other removed) patches the update and defers the removal', async () => {
    const configA = makeConfig({
      defaultSpeed: 1.5,
      channels: { '42': makeChannel('42', 2) },
    });
    // Storage truth after the mixed write: fresh channels, global key gone
    // (fresh reads then fall back to the legacy blob — represented here by
    // the re-read result).
    const configAfterMixedWrite = makeConfig({
      defaultSpeed: 2.5,
      channels: { '7': makeChannel('7', 4) },
    });
    const readConfig = vi
      .fn<() => Promise<SpeedMasterConfig>>()
      .mockResolvedValueOnce(configA)
      .mockResolvedValue(configAfterMixedWrite);
    const cache = createConfigCache(readConfig);
    await cache.read();

    const applied = cache.handleStorageChanged(
      {
        [GLOBAL_STORAGE_KEY]: {
          oldValue: { version: 1, global: {} },
          newValue: undefined, // removal: no patch, left to the reload
        },
        [CHANNELS_STORAGE_KEY]: {
          newValue: { version: 1, channels: { '7': makeChannel('7', 4) } },
        },
      },
      'sync',
    );

    expect(applied).toBe(true);
    // Updated partition patched immediately...
    expect(cache.peek().channels['7']?.speed).toBe(4);
    // ...while the removed partition keeps its last known value.
    expect(cache.peek().global).toEqual(configA.global);

    await flushAsync();
    expect(cache.peek()).toEqual(configAfterMixedWrite); // reload reconciled both
  });

  it('applies patches with the same merge/sanitize semantics as a fresh read', async () => {
    const readConfig = vi.fn().mockResolvedValue(makeConfig());
    const cache = createConfigCache(readConfig);
    await cache.read();

    cache.handleStorageChanged(
      {
        [GLOBAL_STORAGE_KEY]: {
          // Partial raw global: mergeGlobalRaw must fill the defaults.
          newValue: { version: 1, global: { defaultSpeed: 2.5 } },
        },
        [CHANNELS_STORAGE_KEY]: {
          newValue: {
            version: 1,
            channels: {
              valid: makeChannel('valid', 3),
              // Missing channelName and speed: dropped by sanitizeChannels.
              bad: { channelId: 'bad' },
            },
          },
        },
      },
      'sync',
    );

    expect(cache.peek().global).toEqual({
      defaultSpeed: 2.5,
      preferredQuality: 'auto',
      showVideoWidget: true,
      videoWidgetPosition: 'topLeft',
      uiLanguage: 'auto',
      // D-9: the raw global carries no shortcuts — mergeGlobalRaw fills the
      // default keymap exactly as a fresh read would.
      shortcuts: DEFAULT_SHORTCUT_BINDINGS,
    });
    expect(Object.keys(cache.peek().channels)).toEqual(['valid']);
  });

  it('never rejects: a failed read serves the last known config and stops retrying', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const configB = makeConfig({ defaultSpeed: 2 });
    const readConfig = vi
      .fn<() => Promise<SpeedMasterConfig>>()
      .mockRejectedValueOnce(new Error('Extension context invalidated'))
      .mockResolvedValue(configB);
    const cache = createConfigCache(readConfig);

    // First load fails: read() resolves with the fallback instead of throwing.
    await expect(cache.read()).resolves.toEqual(DEFAULT_CONFIG);
    expect(warnSpy).toHaveBeenCalledTimes(1);

    // A dead storage context must not turn every media event into a retry.
    await expect(cache.read()).resolves.toEqual(DEFAULT_CONFIG);
    expect(readConfig).toHaveBeenCalledTimes(1);

    // Recovery stays with onChanged, the single invalidation source.
    cache.handleStorageChanged(
      { [GLOBAL_STORAGE_KEY]: { newValue: { version: 1, global: { defaultSpeed: 2 } } } },
      'sync',
    );
    await flushAsync();
    expect(cache.peek()).toEqual(configB);
    expect(readConfig).toHaveBeenCalledTimes(2);
  });

  it('keeps the last known value when a reload triggered by a change fails', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const configA = makeConfig({ defaultSpeed: 1.5 });
    const readConfig = vi
      .fn<() => Promise<SpeedMasterConfig>>()
      .mockResolvedValueOnce(configA)
      .mockRejectedValueOnce(new Error('storage unavailable'));
    const cache = createConfigCache(readConfig);
    await cache.read();

    cache.handleStorageChanged(
      { [GLOBAL_STORAGE_KEY]: { newValue: { version: 1, global: { defaultSpeed: 3 } } } },
      'sync',
    );
    await flushAsync();

    // The synchronous patch survived (readers see the change); only the
    // reconciliation read failed, and it warned without throwing.
    expect(cache.peek().global.defaultSpeed).toBe(3);
    expect(warnSpy).toHaveBeenCalledTimes(1);
  });
});
