// D-6: content-side in-memory cache over getConfig. loadedmetadata / play /
// emptied and navigation used to re-read storage.sync on every event; after
// the first read this cache serves every apply path from memory.
//
// Invalidation contract (card Notes): storage.onChanged is the ONLY source
// that mutates the cached value — media events and timers never re-read. Two
// subtleties the design covers:
//
// 1. Area/key filtering (D-1/D-2): config lives in storage.sync under the two
//    split keys; stats flushes live in storage.local and fire onChanged far
//    more often than config changes, so they must neither touch the cache nor
//    trigger the apply chain (handleStorageChanged returns false for them).
// 2. Startup race: whether the initial read resolves before or after the
//    first onChanged, the stale read must never overwrite fresher data. Every
//    applied change bumps a generation counter; a read that started before a
//    bump is discarded and retried, so the cache converges on the newest
//    applied change instead of the oldest snapshot.
//
// Why the legacy merged key (`bilibiliSpeedMaster`, STORAGE_KEY) is NOT
// watched — three invariants guaranteed by config.ts (D-1/D-2):
// 1. Every config write goes through persistConfig, whose single
//    storage.sync.set ALWAYS carries BOTH split keys together.
// 2. The legacy key's only removal point (removeLegacyConfigKeyOnce, run by
//    the stats migration) is gated on BOTH split keys already being in place.
// 3. Reads prefer the split keys per partition and only fall back to the
//    legacy blob when a split key is absent.
// Together these rule out the event shape "the legacy key changed while the
// effective config changed, yet no split-key event fired" — so ignoring the
// legacy key never misses a real config change. Caveat: if a future write
// bypasses persistConfig and writes storage directly, this cache will
// silently serve stale values for that change.
//
// Each applied change is ALSO patched in synchronously from the onChanged
// payload (reusing config.ts's merge/sanitize), so readers see a change the
// moment the event fires, while a background re-read reconciles the merged
// view (legacy-key fallback, key removals) exactly as a fresh getConfig would.

import {
  CHANNELS_STORAGE_KEY,
  DEFAULT_CONFIG,
  GLOBAL_STORAGE_KEY,
  mergeGlobalRaw,
  sanitizeChannels,
  type SpeedMasterConfig,
} from '@/src/shared/config';

export type StorageChange = { oldValue?: unknown; newValue?: unknown };
export type StorageChanges = Record<string, StorageChange> | null | undefined;

export type ConfigCache = {
  /** Resolves the cached config; awaits the initial storage read first. */
  read: () => Promise<SpeedMasterConfig>;
  /**
   * Current in-memory value without awaiting the initial load. Test /
   * future-diagnostics hook: production code reads through `read` only
   * (kept intentionally for tests and debugging).
   */
  peek: () => SpeedMasterConfig;
  /**
   * Feed storage.onChanged events. Returns true only when a sync-area config
   * change was applied (callers can skip re-apply work otherwise). This is
   * the single invalidation source — nothing else mutates the cache.
   */
  handleStorageChanged: (changes: StorageChanges, areaName: string) => boolean;
};

export const createConfigCache = (
  readConfig: () => Promise<SpeedMasterConfig>,
): ConfigCache => {
  let value: SpeedMasterConfig = { ...DEFAULT_CONFIG };
  let loaded = false;
  // Bumped by every applied onChanged; reads carry the generation they
  // started at and are discarded when it moved underneath them.
  let generation = 0;
  let reloadPromise: Promise<void> | null = null;

  const warnReloadFailure = (error: unknown): void => {
    console.warn(
      '[speed-master] config re-read failed; serving the last known config until the next change:',
      error,
    );
  };

  // Read storage fresh and commit only when no change landed mid-read. A read
  // whose generation moved is stale by definition (it may predate the write),
  // so the loop retries against the newest state. Converges because the
  // generation only moves through applied onChanged events.
  const reload = (): Promise<void> => {
    if (reloadPromise) {
      return reloadPromise;
    }
    reloadPromise = (async () => {
      for (;;) {
        const token = generation;
        let fresh: SpeedMasterConfig;
        try {
          fresh = await readConfig();
        } catch (error) {
          // Keep the last known value (DEFAULT before the first successful
          // read). loaded is set regardless so a dead extension context
          // cannot turn every media event into a failing storage read;
          // recovery stays with the next onChanged.
          warnReloadFailure(error);
          loaded = true;
          break;
        }
        if (token === generation) {
          value = fresh;
          loaded = true;
          break;
        }
      }
    })().finally(() => {
      reloadPromise = null;
    });
    return reloadPromise;
  };

  // Synchronous best-effort patch from the onChanged payload, with the exact
  // merge semantics of a fresh read. A partition whose key was REMOVED
  // (newValue undefined — nothing in this codebase does that) is left as-is
  // and corrected by the reload below, which re-merges from storage
  // including the legacy-key fallback.
  const applySyncPatch = (changes: Record<string, StorageChange>): void => {
    const globalRaw = changes[GLOBAL_STORAGE_KEY]?.newValue as { global?: unknown } | undefined;
    if (globalRaw != null && typeof globalRaw === 'object') {
      value = { ...value, global: mergeGlobalRaw(globalRaw.global) };
    }
    const channelsRaw = changes[CHANNELS_STORAGE_KEY]?.newValue as
      | { channels?: unknown }
      | undefined;
    if (channelsRaw != null && typeof channelsRaw === 'object') {
      value = { ...value, channels: sanitizeChannels(channelsRaw.channels) };
    }
  };

  return {
    read: async () => {
      if (!loaded) {
        await reload();
      }
      return value;
    },
    peek: () => value,
    handleStorageChanged: (changes, areaName) => {
      // Deliberately sync-only (D-1): local-area stats writes must never
      // reach the cache or the apply chain. D-2: only the two split keys are
      // watched; the legacy merged key is not (nothing writes it anymore
      // after the first split write).
      if (areaName !== 'sync' || !changes) {
        return false;
      }
      if (changes[GLOBAL_STORAGE_KEY] == null && changes[CHANNELS_STORAGE_KEY] == null) {
        return false;
      }
      applySyncPatch(changes);
      generation += 1;
      void reload();
      return true;
    },
  };
};
