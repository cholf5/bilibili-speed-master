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

export const STORAGE_KEY = 'bilibiliSpeedMaster';

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

export const mergeConfig = (raw: any): SpeedMasterConfig => {
  if (!raw || typeof raw !== 'object') {
    return { ...DEFAULT_CONFIG };
  }

  const global = raw.global && typeof raw.global === 'object' ? raw.global : {};
  const stats = raw.stats && typeof raw.stats === 'object' ? raw.stats : {};

  return {
    version: 1,
    global: {
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
    },
    channels: sanitizeChannels(raw.channels),
    stats: {
      timeSavedSeconds:
        typeof stats.timeSavedSeconds === 'number'
          ? stats.timeSavedSeconds
          : DEFAULT_CONFIG.stats.timeSavedSeconds,
    },
  };
};

const getFromStorage = (): Promise<Record<string, any>> => {
  if (!storage) {
    return Promise.resolve({});
  }

  if (storage.get.length >= 2) {
    return new Promise((resolve) => {
      storage.get(STORAGE_KEY, (items: Record<string, any>) => resolve(items || {}));
    });
  }

  return Promise.resolve(storage.get(STORAGE_KEY));
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

export const getConfig = async (): Promise<SpeedMasterConfig> => {
  const items = await getFromStorage();
  return mergeConfig(items?.[STORAGE_KEY]);
};

// Single write entry point: every persistence path (content-script rate
// changes and channel visits, popup/options updates, imports) lands here, so
// the LRU cap is enforced exactly once. Returns the config as persisted so
// callers can mirror storage state instead of their pre-cap input.
export const setConfig = async (config: SpeedMasterConfig): Promise<SpeedMasterConfig> => {
  const next = capChannels(config);
  await setInStorage({ [STORAGE_KEY]: next });
  return next;
};

export const updateConfig = async (
  updater: (current: SpeedMasterConfig) => SpeedMasterConfig,
): Promise<SpeedMasterConfig> => {
  const current = await getConfig();
  return setConfig(updater(current));
};
