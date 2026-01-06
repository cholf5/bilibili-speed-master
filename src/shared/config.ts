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

const mergeConfig = (raw: any): SpeedMasterConfig => {
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
    },
    channels: raw.channels && typeof raw.channels === 'object' ? raw.channels : {},
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

const setInStorage = (items: Record<string, any>): Promise<void> => {
  if (!storage) {
    return Promise.resolve();
  }

  if (storage.set.length >= 2) {
    return new Promise((resolve) => {
      storage.set(items, () => resolve());
    });
  }

  return Promise.resolve(storage.set(items));
};

export const getConfig = async (): Promise<SpeedMasterConfig> => {
  const items = await getFromStorage();
  return mergeConfig(items?.[STORAGE_KEY]);
};

export const setConfig = async (config: SpeedMasterConfig): Promise<void> => {
  await setInStorage({ [STORAGE_KEY]: config });
};

export const updateConfig = async (
  updater: (current: SpeedMasterConfig) => SpeedMasterConfig,
): Promise<SpeedMasterConfig> => {
  const current = await getConfig();
  const next = updater(current);
  await setConfig(next);
  return next;
};
