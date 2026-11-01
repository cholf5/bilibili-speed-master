// Copyright (c) 2026 cholf5
//
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at https://mozilla.org/MPL/2.0/.
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
// D-14: speed constants/formatters and the channel-info shape come from the
// shared modules instead of local copies (previously re-defined here).
import { SPEED_STEP, clampSpeed, formatSpeed } from '@/src/shared/speed';
import { normalizeAvatarUrl, type ChannelInfo } from '@/src/shared/video';
import { LICENSE_NAME, LICENSE_URL, RATE_URL, SOURCE_REPO_URL } from '@/src/shared/about';
import { setUiLocale, t } from '@/src/shared/i18n';

// Same gear glyph as the on-player widget, one icon shape across surfaces.
const GEAR_SVG = (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.07-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.74,8.87C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.8,11.69,4.8,12s0.02,0.64,0.07,0.94l-2.03,1.58c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.44-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.47-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z" />
  </svg>
);

const fetchCurrentChannel = async (): Promise<ChannelInfo | null> => {
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
  const [channel, setChannel] = useState<ChannelInfo | null>(null);
  const [timeSavedSeconds, setTimeSavedSeconds] = useState(0);
  const portRef = useRef<any>(null);

  useEffect(() => {
    // D-18: hydrate the module locale with the first config read so popup
    // strings follow the stored UI language.
    getConfig().then((loaded) => {
      setUiLocale(loaded.global.uiLanguage);
      setConfig(loaded);
    });
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
        // D-18: keep the module locale in sync when another surface (the
        // options page) changes the UI language while this popup is open.
        void getConfig().then((loaded) => {
          setUiLocale(loaded.global.uiLanguage);
          setConfig(loaded);
        });
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
  // channel override or the global default (the pill on the hero card).
  // D-10: an entry in `channels` IS an override — even when its speed happens
  // to equal the global default (B-4's phantom-override background), the
  // entry still diverts this channel from following the global stepper. Only
  // then is the one-click "follow global" escape hatch rendered.
  const hasChannelOverride = Boolean(channel && config?.channels[channel.channelId]);
  const channelSpeedPill = channel
    ? hasChannelOverride && config?.channels[channel.channelId]
      ? `${t('channelOverride')} · ${formatSpeed(config.channels[channel.channelId].speed)}`
      : `${t('followingGlobal')} · ${formatSpeed(defaultSpeed)}`
    : '';

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
        <button
          type="button"
          className="header__gear"
          onClick={openOptions}
          aria-label={t('moreOptions')}
        >
          {GEAR_SVG}
        </button>
      </header>

      {channel && (
        <section className="channel-card">
          <div className="channel-card__top">
            <div className="channel-card__label">{t('currentChannel')}</div>
            {/* Core concept at a glance: override vs following global. */}
            <span
              className={`channel-card__pill${
                hasChannelOverride ? ' channel-card__pill--override' : ''
              }`}
            >
              {channelSpeedPill}
            </span>
          </div>
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
              {/* D-10: the one-click "follow global" action; the button only
                  exists while an override entry does. */}
              {hasChannelOverride && (
                <button
                  type="button"
                  className="channel-card__follow-global"
                  onClick={() => void clearChannelOverride()}
                >
                  {t('followGlobal')}
                </button>
              )}
            </div>
          </div>
          <div className="channel-card__speed">
            {/* The hero reading: the rate this video plays at. Unknown until
                the content script reports it (e.g. tabs opened before the
                extension was installed); never show the default speed here,
                it would look like a real reading. */}
            <span
              className={`channel-card__value${
                currentSpeed === null ? ' channel-card__value--unknown' : ''
              }`}
            >
              {currentSpeed === null ? '–' : formatSpeed(currentSpeed)}
              <span className="channel-card__value-unit">x</span>
            </span>
            <div className="stepper">
              <button
                type="button"
                onClick={() => changeCurrentSpeed(-SPEED_STEP)}
                aria-label="Decrease speed for this channel"
              >
                −
              </button>
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
              −
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
        <span>{t('totalTimeSaved')}</span>
        <strong>
          {hoursSaved} {t('hours')}
        </strong>
      </section>

      <button className="options-button" type="button" onClick={openOptions}>
        {t('moreOptions')}
      </button>

      {/* One quiet footer line: repo, license and — once a store listing
          exists (RATE_URL in src/shared/about.ts) — the rating link. The
          header already links the author. */}
      <footer className="oss-line">
        <a href={SOURCE_REPO_URL} target="_blank" rel="noreferrer">
          {t('openSourceRepo')}
        </a>
        <span className="oss-line__dot" aria-hidden="true">·</span>
        <a href={LICENSE_URL} target="_blank" rel="noreferrer">{LICENSE_NAME}</a>
        {RATE_URL && (
          <>
            <span className="oss-line__dot" aria-hidden="true">·</span>
            <a className="oss-line__rate" href={RATE_URL} target="_blank" rel="noreferrer">
              <span className="oss-line__star" aria-hidden="true">★</span>
              {t('rateMe')}
            </a>
          </>
        )}
      </footer>
    </div>
  );
}

export default App;
