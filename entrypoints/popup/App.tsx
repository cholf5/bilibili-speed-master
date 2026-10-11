import './App.css';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  CHANNELS_STORAGE_KEY,
  GLOBAL_STORAGE_KEY,
  getConfig,
  removeChannelOverride,
  updateConfig,
  type SpeedMasterConfig,
} from '@/src/shared/config';
import { STATS_STORAGE_KEY, getSavedStats } from '@/src/shared/stats';
import { t } from '@/src/shared/i18n';

const SPEED_STEP = 0.1;
const SPEED_MIN = 0.1;
const SPEED_MAX = 4;

const clampSpeed = (value: number) =>
  Math.min(SPEED_MAX, Math.max(SPEED_MIN, Math.round(value * 10) / 10));

const formatSpeed = (value: number) => {
  const rounded = Math.round(value * 100) / 100;
  return Number(rounded.toFixed(2)).toString();
};

type CurrentChannel = {
  channelId: string;
  channelName: string;
  avatarUrl?: string;
};

const normalizeAvatarUrl = (url?: string | null): string | undefined => {
  if (!url) {
    return undefined;
  }
  return url.startsWith('//') ? `https:${url}` : url;
};

const fetchCurrentChannel = async (): Promise<CurrentChannel | null> => {
  const root = globalThis as typeof globalThis & { browser?: any; chrome?: any };
  const tabsApi = root.browser?.tabs ?? root.chrome?.tabs ?? null;
  if (!tabsApi?.query || !tabsApi?.sendMessage) {
    return null;
  }

  try {
    const tabs = await tabsApi.query({ active: true, currentWindow: true });
    const tabId = tabs?.[0]?.id;
    if (!tabId) {
      return null;
    }
    const response = await tabsApi.sendMessage(tabId, {
      type: 'speed-master:get-current-channel',
    });
    return response?.channel ?? null;
  } catch {
    // Content script not available (not a video page, or tabs opened before
    // the extension was installed).
    return null;
  }
};

const QUALITY_OPTIONS = [
  { value: 'auto', label: 'Auto' },
  { value: '1080p', label: '1080p' },
  { value: '720p', label: '720p' },
  { value: '480p', label: '480p' },
  { value: '360p', label: '360p' },
];

function App() {
  const [config, setConfig] = useState<SpeedMasterConfig | null>(null);
  const [currentSpeed, setCurrentSpeed] = useState<number | null>(null);
  const [channel, setChannel] = useState<CurrentChannel | null>(null);
  const [timeSavedSeconds, setTimeSavedSeconds] = useState(0);
  const portRef = useRef<any>(null);

  useEffect(() => {
    getConfig().then(setConfig);
    // D-1: stats live in storage.local, not in the sync config.
    void getSavedStats().then((stats) => setTimeSavedSeconds(stats.timeSavedSeconds));
    void fetchCurrentChannel().then(setChannel);
  }, []);

  // Channel-card speed changes persist through the content script's
  // ratechange path, so config must be reloaded when storage moves.
  useEffect(() => {
    const root = globalThis as typeof globalThis & { browser?: any; chrome?: any };
    const api = root.browser?.storage?.onChanged ?? root.chrome?.storage?.onChanged ?? null;
    if (!api?.addListener) {
      return;
    }
    const listener = (changes: Record<string, any>, areaName: string) => {
      // D-2: the sync config lives under the two split keys; the legacy merged
      // key is not watched (nothing writes it anymore after the first split
      // write).
      if (
        areaName === 'sync' &&
        (changes?.[GLOBAL_STORAGE_KEY] || changes?.[CHANNELS_STORAGE_KEY])
      ) {
        void getConfig().then(setConfig);
      }
    };
    api.addListener(listener);
    return () => api.removeListener(listener);
  }, []);

  // D-1: refresh the stats display whenever the local stats key changes (the
  // sync listener above stays for config updates).
  useEffect(() => {
    const root = globalThis as typeof globalThis & { browser?: any; chrome?: any };
    const api = root.browser?.storage?.onChanged ?? root.chrome?.storage?.onChanged ?? null;
    if (!api?.addListener) {
      return;
    }
    const listener = (changes: Record<string, any>, areaName: string) => {
      if (areaName === 'local' && changes?.[STATS_STORAGE_KEY]) {
        void getSavedStats().then((stats) => setTimeSavedSeconds(stats.timeSavedSeconds));
      }
    };
    api.addListener(listener);
    return () => api.removeListener(listener);
  }, []);

  const hoursSaved = useMemo(
    () => (timeSavedSeconds / 3600).toFixed(3),
    [timeSavedSeconds],
  );

  const updateGlobal = async (patch: Partial<SpeedMasterConfig['global']>) => {
    const next = await updateConfig((current) => ({
      ...current,
      global: {
        ...current.global,
        ...patch,
      },
    }));
    setConfig(next);
  };

  const changeDefaultSpeed = (delta: number) => {
    if (!config) {
      return;
    }

    const nextSpeed = clampSpeed(config.global.defaultSpeed + delta);
    void updateGlobal({ defaultSpeed: nextSpeed });
  };

  const sendCurrentSpeed = async (speed: number) => {
    const root = globalThis as typeof globalThis & { browser?: any; chrome?: any };
    const tabsApi = root.browser?.tabs ?? root.chrome?.tabs ?? null;
    if (!tabsApi?.query) {
      return;
    }

    if (portRef.current) {
      portRef.current.postMessage({
        type: 'speed-master:set-current-speed',
        speed,
      });
      return;
    }

    try {
      const tabs = await tabsApi.query({ active: true, currentWindow: true });
      const tabId = tabs?.[0]?.id;
      if (!tabId || !tabsApi.sendMessage) {
        return;
      }
      await tabsApi.sendMessage(tabId, {
        type: 'speed-master:set-current-speed',
        speed,
      });
    } catch {
      // Ignore if content script is not available.
    }
  };

  const changeCurrentSpeed = (delta: number) => {
    const base = currentSpeed ?? config?.global.defaultSpeed ?? 1;
    const nextSpeed = clampSpeed(base + delta);
    setCurrentSpeed(nextSpeed);
    void sendCurrentSpeed(nextSpeed);
  };

  const handleQualityChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    void updateGlobal({ preferredQuality: event.target.value });
  };

  // D-10: one click drops the channel's override and returns it to the global
  // speed. The removal goes through the shared removeChannelOverride helper
  // (same implementation as options' table delete, D-10 notes) inside the
  // single updateConfig writer; the content script's storage.onChanged chain
  // re-applies the global speed and pushes the new rate back over the popup
  // port. The reference-equality short-circuit keeps a no-op clear (override
  // already gone) from writing storage.
  const clearChannelOverride = async () => {
    if (!channel) {
      return;
    }
    const channelId = channel.channelId;
    const next = await updateConfig((current) => {
      const channels = removeChannelOverride(current.channels, channelId);
      if (channels === current.channels) {
        return current;
      }
      return { ...current, channels };
    });
    setConfig(next);
  };

  const openOptions = () => {
    const runtime =
      (globalThis as typeof globalThis & { browser?: any; chrome?: any }).browser
        ?.runtime ??
      (globalThis as typeof globalThis & { browser?: any; chrome?: any }).chrome
        ?.runtime;

    const root = globalThis as typeof globalThis & { browser?: any; chrome?: any };
    const tabsApi = root.browser?.tabs ?? root.chrome?.tabs ?? null;
    const url = runtime?.getURL?.('options.html');

    if (tabsApi?.create && url) {
      tabsApi.create({ url });
      return;
    }

    if (url) {
      window.open(url, '_blank');
      return;
    }

    runtime?.openOptionsPage?.();
  };

  const fetchCurrentSpeed = async () => {
    const root = globalThis as typeof globalThis & { browser?: any; chrome?: any };
    const tabsApi = root.browser?.tabs ?? root.chrome?.tabs ?? null;
    if (!tabsApi?.query || !tabsApi?.sendMessage) {
      return;
    }

    try {
      const tabs = await tabsApi.query({ active: true, currentWindow: true });
      const tabId = tabs?.[0]?.id;
      if (!tabId) {
        return;
      }
      const response = await tabsApi.sendMessage(tabId, {
        type: 'speed-master:get-current-speed',
      });
      if (response && typeof response.speed === 'number') {
        setCurrentSpeed(response.speed);
      }
    } catch {
      // Ignore if content script is not available.
    }
  };

  useEffect(() => {
    const root = globalThis as typeof globalThis & { browser?: any; chrome?: any };
    const tabsApi = root.browser?.tabs ?? root.chrome?.tabs ?? null;
    if (!tabsApi?.query || !tabsApi?.connect) {
      void fetchCurrentSpeed();
      return;
    }

    const connect = async () => {
      try {
        const tabs = await tabsApi.query({ active: true, currentWindow: true });
        const tabId = tabs?.[0]?.id;
        if (!tabId) {
          return;
        }

        const port = tabsApi.connect(tabId, { name: 'speed-master:popup' });
        portRef.current = port;

        port.onMessage.addListener((message: any) => {
          if (message?.type === 'speed-master:current-speed') {
            if (typeof message.speed === 'number') {
              setCurrentSpeed(message.speed);
            }
          }
        });

        port.postMessage({ type: 'speed-master:request-current-speed' });
      } catch {
        void fetchCurrentSpeed();
      }
    };

    void connect();

    return () => {
      if (portRef.current) {
        portRef.current.disconnect();
        portRef.current = null;
      }
    };
  }, []);

  const defaultSpeed = config?.global.defaultSpeed ?? 1;
  const preferredQuality = config?.global.preferredQuality ?? 'auto';

  // Tells the user where the channel's effective speed comes from: a stored
  // channel override or the global default.
  const channelSpeedMeta = channel
    ? config?.channels[channel.channelId]
      ? `${t('channelOverride')} · ${formatSpeed(config.channels[channel.channelId].speed)}`
      : `${t('followingGlobal')} · ${formatSpeed(defaultSpeed)}`
    : '';

  // D-10: an entry in `channels` IS an override — even when its speed happens
  // to equal the global default (B-4's phantom-override background), the entry
  // still diverts this channel from following the global stepper. Only then is
  // the one-click "follow global" escape hatch rendered.
  const hasChannelOverride = Boolean(channel && config?.channels[channel.channelId]);

  return (
    <div className="popup">
      <header className="popup__header">
        <div className="brand">
          <div className="brand__logo" aria-hidden="true">
            <span className="brand__ring" />
            <span className="brand__play" />
          </div>
          <div className="brand__text">
            <div className="brand__title">{t('appTitle')}</div>
            <a
              className="brand__subtitle"
              href="https://x.com/cholf5"
              target="_blank"
              rel="noreferrer"
            >
              {t('madeBy')}
            </a>
          </div>
        </div>
      </header>

      {channel && (
        <section className="channel-card">
          <div className="channel-card__label">{t('currentChannel')}</div>
          <div className="channel-card__row">
            <div className="channel-card__avatar">
              {normalizeAvatarUrl(channel.avatarUrl) ? (
                <img src={normalizeAvatarUrl(channel.avatarUrl)} alt="" />
              ) : (
                <span>{channel.channelName.slice(0, 1)}</span>
              )}
            </div>
            <div className="channel-card__text">
              <span className="channel-card__name" title={channel.channelName}>
                {channel.channelName}
              </span>
              {/* D-10: meta line plus the one-click "follow global" action;
                  the button only exists while an override entry does. */}
              <span className="channel-card__meta-row">
                <span className="channel-card__meta">{channelSpeedMeta}</span>
                {hasChannelOverride && (
                  <button
                    type="button"
                    className="channel-card__follow-global"
                    onClick={() => void clearChannelOverride()}
                  >
                    {t('followGlobal')}
                  </button>
                )}
              </span>
            </div>
            <div className="stepper">
              <button
                type="button"
                onClick={() => changeCurrentSpeed(-SPEED_STEP)}
                aria-label="Decrease speed for this channel"
              >
                -
              </button>
              {/* Unknown until the content script reports a rate (e.g. tabs
                  opened before the extension was installed); never show the
                  default speed here, it would look like a real reading. */}
              <span>{currentSpeed === null ? '–' : formatSpeed(currentSpeed)}</span>
              <button
                type="button"
                onClick={() => changeCurrentSpeed(SPEED_STEP)}
                aria-label="Increase speed for this channel"
              >
                +
              </button>
            </div>
          </div>
        </section>
      )}

      <section className="panel">
        <div className="row">
          <div className="row__label">{t('defaultSpeed')}</div>
          <div className="stepper">
            <button
              type="button"
              onClick={() => changeDefaultSpeed(-SPEED_STEP)}
              aria-label="Decrease global speed"
            >
              -
            </button>
            <span>{formatSpeed(defaultSpeed)}</span>
            <button
              type="button"
              onClick={() => changeDefaultSpeed(SPEED_STEP)}
              aria-label="Increase global speed"
            >
              +
            </button>
          </div>
        </div>
        <div className="row">
          <div className="row__label">{t('preferredQuality')}</div>
          <select
            className="select"
            value={preferredQuality}
            onChange={handleQualityChange}
          >
            {QUALITY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </section>

      <section className="stats">
        <span>{t('totalTimeSaved')}:</span>
        <strong>
          {hoursSaved} {t('hours')}
        </strong>
      </section>

      <section className="rating" aria-label="Rating">
        <span aria-hidden="true">&#9733;</span>
        <span aria-hidden="true">&#9733;</span>
        <span aria-hidden="true">&#9733;</span>
        <span aria-hidden="true">&#9733;</span>
        <span aria-hidden="true">&#9733;</span>
      </section>

      <button className="options-button" type="button" onClick={openOptions}>
        <span className="options-button__icon" aria-hidden="true" />
        {t('moreOptions')}
      </button>
    </div>
  );
}

export default App;
