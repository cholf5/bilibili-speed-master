export type ChannelOverride = {
  channelId: string;
  channelName: string;
  speed: number;
  lastVisit: string;
  avatarUrl?: string;
};

export type SpeedMasterConfig = {
  version: 1;
  global: {
    defaultSpeed: number;
    preferredQuality: string;
    showVideoWidget: boolean;
    videoWidgetPosition: 'topLeft' | 'topRight';
  };
  channels: Record<string, ChannelOverride>;
  stats: {
    timeSavedSeconds: number;
  };
};

// D-2: the sync config is split into two per-partition keys so a stale
// full-config write to one partition can no longer be triggered by (or stack
// on top of) the other partition's traffic, and the tiny global item never
// fails the per-item sync quota because of a large channels record.
// STORAGE_KEY is the legacy pre-D-2 merged blob: it is still read as a
// fallback (upgrades stay invisible to the user) and is retired only by the
// stats migration after it has consumed the legacy value (see
// removeLegacyConfigKeyOnce) — config writes never remove it.
export const STORAGE_KEY = 'bilibiliSpeedMaster';
export const GLOBAL_STORAGE_KEY = 'bilibiliSpeedMasterGlobal';
export const CHANNELS_STORAGE_KEY = 'bilibiliSpeedMasterChannels';

export const DEFAULT_CONFIG: SpeedMasterConfig = {
  version: 1,
  global: {
    defaultSpeed: 1,
    preferredQuality: 'auto',
    showVideoWidget: true,
    videoWidgetPosition: 'topLeft',
  },
  channels: {},
  stats: {
    timeSavedSeconds: 0,
  },
};

type StorageLike = {
  get: (keys: string | string[] | null, callback?: (items: any) => void) => any;
  set: (items: Record<string, any>, callback?: () => void) => any;
  // Optional because minimal test mocks may omit it; the only caller
  // (removeLegacyConfigKeyOnce) guards for its absence.
  remove?: (keys: string | string[], callback?: () => void) => any;
};

const storage = (() => {
  const root = globalThis as typeof globalThis & {
    browser?: { storage?: { sync?: StorageLike } };
    chrome?: { storage?: { sync?: StorageLike } };
  };
  return root.browser?.storage?.sync ?? root.chrome?.storage?.sync ?? null;
})();

const SPEED_MIN = 0.1;
const SPEED_MAX = 4;

// Entries whose lastVisit failed validation keep the entry without that
// field (readers tolerate its absence), so the sanitizer works with the
// optional shape and widens it only at the record boundary.
type SanitizedChannelOverride = Omit<ChannelOverride, 'lastVisit'> & { lastVisit?: string };

// Per-entry guard for channels records coming from storage or imported files
// (D-3): drop entries that cannot be trusted instead of letting NaN/garbage
// reach the UI, and never throw — bad data degrades to "fewer channels".
export const sanitizeChannels = (raw: unknown): Record<string, ChannelOverride> => {
  if (!raw || typeof raw !== 'object') {
    return {};
  }

  const channels: Record<string, ChannelOverride> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      continue;
    }
    const entry = value as Record<string, unknown>;

    // channelId wins over the record key when they disagree.
    const channelId =
      typeof entry.channelId === 'string' && entry.channelId.trim() !== '' ? entry.channelId : null;
    if (!channelId) {
      continue;
    }
    const channelName =
      typeof entry.channelName === 'string' && entry.channelName.trim() !== ''
        ? entry.channelName
        : null;
    if (!channelName) {
      continue;
    }
    if (typeof entry.speed !== 'number' || !Number.isFinite(entry.speed)) {
      continue;
    }

    const channel: SanitizedChannelOverride = {
      channelId,
      channelName,
      speed: Math.min(SPEED_MAX, Math.max(SPEED_MIN, entry.speed)),
    };

    // lastVisit and avatarUrl are optional at the boundary: an invalid value
    // drops the field, not the whole entry.
    if (
      typeof entry.lastVisit === 'string' &&
      !Number.isNaN(new Date(entry.lastVisit).getTime())
    ) {
      channel.lastVisit = entry.lastVisit;
    }
    if (typeof entry.avatarUrl === 'string') {
      channel.avatarUrl = entry.avatarUrl;
    }

    channels[channelId] = channel as ChannelOverride;
  }

  return channels;
};

// Timestamp used for LRU eviction; entries without a parseable lastVisit are
// treated as the oldest so unknown recency is evicted first.
const lastVisitTime = (channel: ChannelOverride): number => {
  if (!channel.lastVisit) {
    return 0;
  }
  const time = new Date(channel.lastVisit).getTime();
  return Number.isNaN(time) ? 0 : time;
};

// Hard cap for channels in chrome.storage.sync (D-4): the sync quota is per
// item and total, and an over-quota write fails silently, losing every config
// change. Eviction is LRU by lastVisit, oldest first.
export const MAX_CHANNELS = 200;

export const capChannels = (
  config: SpeedMasterConfig,
  max: number = MAX_CHANNELS,
): SpeedMasterConfig => {
  const channels = Object.values(config.channels);
  if (channels.length <= max) {
    return config;
  }

  const kept = channels
    .slice()
    .sort((a, b) => lastVisitTime(a) - lastVisitTime(b))
    .slice(channels.length - max);

  const next: Record<string, ChannelOverride> = {};
  for (const channel of kept) {
    next[channel.channelId] = channel;
  }
  return { ...config, channels: next };
};

// Partition-level merge helpers (D-2): mergeConfig assembles a full config
// from a raw merged blob (import files, legacy storage), and getConfig reuses
// the same per-section merging for the split keys' values. mergeGlobalRaw is
// additionally exported for the content-side config cache (D-6), which applies
// storage.onChanged patches with the exact same semantics as a fresh read.
export const mergeGlobalRaw = (raw: any): SpeedMasterConfig['global'] => {
  const global = raw && typeof raw === 'object' ? raw : {};
  return {
    defaultSpeed:
      typeof global.defaultSpeed === 'number'
        ? global.defaultSpeed
        : DEFAULT_CONFIG.global.defaultSpeed,
    preferredQuality:
      typeof global.preferredQuality === 'string'
        ? global.preferredQuality
        : DEFAULT_CONFIG.global.preferredQuality,
    showVideoWidget:
      typeof global.showVideoWidget === 'boolean'
        ? global.showVideoWidget
        : DEFAULT_CONFIG.global.showVideoWidget,
    videoWidgetPosition:
      global.videoWidgetPosition === 'topLeft' || global.videoWidgetPosition === 'topRight'
        ? global.videoWidgetPosition
        : DEFAULT_CONFIG.global.videoWidgetPosition,
  };
};

const mergeStatsRaw = (raw: any): SpeedMasterConfig['stats'] => {
  const stats = raw && typeof raw === 'object' ? raw : {};
  return {
    timeSavedSeconds:
      typeof stats.timeSavedSeconds === 'number'
        ? stats.timeSavedSeconds
        : DEFAULT_CONFIG.stats.timeSavedSeconds,
  };
};

export const mergeConfig = (raw: any): SpeedMasterConfig => {
  if (!raw || typeof raw !== 'object') {
    return { ...DEFAULT_CONFIG };
  }

  return {
    version: 1,
    global: mergeGlobalRaw(raw.global),
    channels: sanitizeChannels(raw.channels),
    stats: mergeStatsRaw(raw.stats),
  };
};

const getFromStorage = (keys: string[]): Promise<Record<string, any>> => {
  if (!storage) {
    return Promise.resolve({});
  }

  if (storage.get.length >= 2) {
    return new Promise((resolve) => {
      storage.get(keys, (items: Record<string, any>) => resolve(items || {}));
    });
  }

  return Promise.resolve(storage.get(keys));
};

// storage.sync writes can fail silently (quota exceeded, browser restart,
// corrupted area). Losing data without a trace made quota overflows (D-4)
// invisible, so warn here; callers keep working — the next write may succeed.
const warnStorageWriteFailure = (error: unknown): void => {
  console.warn('[speed-master] storage.sync set failed; config change was not persisted:', error);
};

const setInStorage = (items: Record<string, any>): Promise<void> => {
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
          warnStorageWriteFailure(lastError.message);
        }
        resolve();
      });
    });
  }

  return Promise.resolve(storage.set(items)).catch((error) => {
    warnStorageWriteFailure(error);
  });
};

const removeFromStorage = (keys: string[]): Promise<void> => {
  if (!storage || typeof storage.remove !== 'function') {
    return Promise.resolve();
  }
  const remove = storage.remove;

  if (remove.length >= 2) {
    return new Promise((resolve) => {
      remove(keys, () => {
        const root = globalThis as typeof globalThis & {
          chrome?: { runtime?: { lastError?: { message?: string } } };
        };
        const lastError = root.chrome?.runtime?.lastError;
        if (lastError?.message) {
          warnStorageWriteFailure(lastError.message);
        }
        resolve();
      });
    });
  }

  return Promise.resolve(storage.remove(keys)).catch((error) => {
    warnStorageWriteFailure(error);
  });
};

// D-2 (PM review fix): retires the legacy merged key — but never from a
// config write. The legacy blob still carries the pre-D-1 stats value (the
// stats migration's source), so the ordering guarantee is:
// config writes never remove it → removal is triggered only by the stats
// migration after it completed successfully (see stats.ts) → the migration's
// read of the legacy key always precedes its removal.
// The removal additionally waits until BOTH split keys are in place: until
// the first config write, the legacy blob is still the read fallback for
// global/channels, and deleting it earlier would drop the user's settings.
// The once-flag is consumed only when the removal actually runs (removal
// itself is best-effort: a failed removal is warned about and never retried,
// it just leaves dead data behind since reads prefer the split keys). Each
// context (tab / content script / popup) has its own module instance and its
// own flag, but removal is idempotent, so multi-tab needs no coordination.
let legacyKeyRemovalAttempted = false;

export const removeLegacyConfigKeyOnce = async (): Promise<void> => {
  if (legacyKeyRemovalAttempted) {
    return;
  }
  const items = await getFromStorage([GLOBAL_STORAGE_KEY, CHANNELS_STORAGE_KEY]);
  const splitsInPlace =
    items?.[GLOBAL_STORAGE_KEY] != null && items?.[CHANNELS_STORAGE_KEY] != null;
  if (!splitsInPlace) {
    // The legacy blob is still needed as the read fallback; leave the flag
    // unconsumed so a later attempt (after the first config write) can run.
    return;
  }
  legacyKeyRemovalAttempted = true;
  await removeFromStorage([STORAGE_KEY]);
};

export const getConfig = async (): Promise<SpeedMasterConfig> => {
  const items = await getFromStorage([GLOBAL_STORAGE_KEY, CHANNELS_STORAGE_KEY, STORAGE_KEY]);
  const globalItem = items?.[GLOBAL_STORAGE_KEY];
  const channelsItem = items?.[CHANNELS_STORAGE_KEY];
  const legacyItem = items?.[STORAGE_KEY];
  // Per-partition read: a partition prefers its split key and falls back to
  // the legacy merged blob when the split key is absent. An upgrade therefore
  // reads the old key seamlessly, and even a half-persisted state (one split
  // write failed) still serves every partition. stats only ever lived in the
  // legacy blob: the live counter moved to storage.local (D-1) and the field
  // is kept for old-format import compatibility.
  return {
    version: 1,
    global: mergeGlobalRaw(globalItem != null ? globalItem.global : legacyItem?.global),
    channels: sanitizeChannels(
      channelsItem != null ? channelsItem.channels : legacyItem?.channels,
    ),
    stats: mergeStatsRaw(legacyItem?.stats),
  };
};

// Actual persistence, called only from queued units (setConfig/updateConfig):
// one storage.sync.set carries both partitions — a single write operation for
// the quota, and the two partitions cannot be observed half-written.
const persistConfig = async (config: SpeedMasterConfig): Promise<SpeedMasterConfig> => {
  const next = capChannels(config);
  await setInStorage({
    [GLOBAL_STORAGE_KEY]: { version: 1, global: next.global },
    [CHANNELS_STORAGE_KEY]: { version: 1, channels: next.channels },
  });
  // Deliberately NO legacy-key removal here (PM review fix): the legacy blob
  // doubles as the stats migration's source (D-1) and, until the splits above
  // are observed by a reader, as the global/channels read fallback. stats.ts
  // retires it via removeLegacyConfigKeyOnce, strictly after the migration.
  return next;
};

// D-2: within one context (content script, popup, options) several code paths
// can issue read-modify-write cycles concurrently (a debounced rate-change
// flush racing a channel visit, or two popup steppers in flight). Writes are
// serialized through this promise chain: each queued unit runs to completion
// before the next starts, so a later writer always builds on the earlier
// writer's persisted result instead of on a pre-write snapshot. A failed unit
// must not block the queue, so the chain itself never rejects. Cross-context
// races are narrowed by the split keys, not by this queue.
let writeChain: Promise<unknown> = Promise.resolve();

const enqueueWrite = <T>(task: () => Promise<T>): Promise<T> => {
  const run = writeChain.then(task, task);
  writeChain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
};

// Single write entry point: every persistence path (content-script rate
// changes and channel visits, popup/options updates, imports) lands here, so
// the LRU cap is enforced exactly once. Queued behind other writers in this
// context (see writeChain). Returns the config as persisted so callers can
// mirror storage state instead of their pre-cap input.
export const setConfig = (config: SpeedMasterConfig): Promise<SpeedMasterConfig> =>
  enqueueWrite(() => persistConfig(config));

// Read-modify-write as ONE queued unit: the read happens inside the queue, so
// a concurrent update in this context cannot interleave between this read and
// its write. Reference-equality short-circuit: when the updater returns the
// config it received, storage already holds exactly that state and the write
// is skipped — this carries the content script's "updateConfigIfChanged"
// semantics, keeping no-op rate changes from touching storage at all.
export const updateConfig = (
  updater: (current: SpeedMasterConfig) => SpeedMasterConfig,
): Promise<SpeedMasterConfig> =>
  enqueueWrite(async () => {
    const current = await getConfig();
    const next = updater(current);
    if (next === current) {
      return current;
    }
    return persistConfig(next);
  });
