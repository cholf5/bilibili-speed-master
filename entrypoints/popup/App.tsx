import './App.css';
import { useEffect, useMemo, useRef, useState } from 'react';
import { getConfig, updateConfig, type SpeedMasterConfig } from '@/src/shared/config';
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
  const portRef = useRef<any>(null);

  useEffect(() => {
    getConfig().then(setConfig);
  }, []);

  const hoursSaved = useMemo(() => {
    const seconds = config?.stats.timeSavedSeconds ?? 0;
    return (seconds / 3600).toFixed(3);
  }, [config]);

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
        <a
          className="donate-button"
          href="https://x.com/cholf5"
          target="_blank"
          rel="noreferrer"
        >
          {t('donate')}
        </a>
      </header>

      <section className="panel">
        <div className="row">
          <div className="row__label">{t('currentSpeed')}</div>
          <div className="stepper">
            <button
              type="button"
              onClick={() => changeCurrentSpeed(-SPEED_STEP)}
              aria-label="Decrease speed"
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
              aria-label="Increase speed"
            >
              +
            </button>
          </div>
        </div>
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
