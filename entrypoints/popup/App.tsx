import './App.css';
import { useEffect, useMemo, useState } from 'react';
import { getConfig, updateConfig, type SpeedMasterConfig } from '@/src/shared/config';
import { t } from '@/src/shared/i18n';

const SPEED_STEP = 0.1;
const SPEED_MIN = 0.1;
const SPEED_MAX = 4;

const clampSpeed = (value: number) =>
  Math.min(SPEED_MAX, Math.max(SPEED_MIN, Math.round(value * 10) / 10));

const formatSpeed = (value: number) => {
  const rounded = Math.round(value * 10) / 10;
  return Number(rounded.toFixed(1)).toString();
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

  const handleQualityChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    void updateGlobal({ preferredQuality: event.target.value });
  };

  const openOptions = () => {
    const runtime =
      (globalThis as typeof globalThis & { browser?: any; chrome?: any }).browser
        ?.runtime ??
      (globalThis as typeof globalThis & { browser?: any; chrome?: any }).chrome
        ?.runtime;

    runtime?.openOptionsPage?.();
  };

  const currentSpeed = config?.global.defaultSpeed ?? 1;
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
          <div className="stepper stepper--disabled" aria-disabled="true">
            <button type="button" disabled aria-label="Decrease speed">
              -
            </button>
            <span>{formatSpeed(currentSpeed)}</span>
            <button type="button" disabled aria-label="Increase speed">
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
              aria-label="Decrease default speed"
            >
              -
            </button>
            <span>{formatSpeed(defaultSpeed)}</span>
            <button
              type="button"
              onClick={() => changeDefaultSpeed(SPEED_STEP)}
              aria-label="Increase default speed"
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
