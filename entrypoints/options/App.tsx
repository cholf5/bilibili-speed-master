import { useEffect, useMemo, useState } from 'react';
import './App.css';
import { getConfig, updateConfig, type ChannelOverride, type SpeedMasterConfig } from '@/src/shared/config';

const SPEED_STEP = 0.1;
const SPEED_MIN = 0.1;
const SPEED_MAX = 4;

const QUALITY_OPTIONS = [
  { value: 'auto', label: 'Auto' },
  { value: '1080p', label: '1080p' },
  { value: '720p', label: '720p' },
  { value: '480p', label: '480p' },
  { value: '360p', label: '360p' },
];

const clampSpeed = (value: number) =>
  Math.min(SPEED_MAX, Math.max(SPEED_MIN, Math.round(value * 10) / 10));

const formatSpeed = (value: number) => {
  const rounded = Math.round(value * 10) / 10;
  return Number(rounded.toFixed(1)).toString();
};

const formatTimestamp = (value?: string) => {
  if (!value) {
    return '-';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '-';
  }
  return date.toISOString().replace('T', ' ').slice(0, 19);
};

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

  const updateChannel = async (channelId: string, patch: Partial<ChannelOverride>) => {
    const next = await updateConfig((current) => {
      const existing = current.channels[channelId];
      if (!existing) {
        return current;
      }
      return {
        ...current,
        channels: {
          ...current.channels,
          [channelId]: {
            ...existing,
            ...patch,
          },
        },
      };
    });
    setConfig(next);
  };

  const deleteChannel = async (channelId: string) => {
    const next = await updateConfig((current) => {
      const channels = { ...current.channels };
      delete channels[channelId];
      return {
        ...current,
        channels,
      };
    });
    setConfig(next);
  };

  const sortedChannels = useMemo(() => {
    const entries = Object.values(config?.channels ?? {});
    return entries.sort((a, b) => (b.lastVisit || '').localeCompare(a.lastVisit || ''));
  }, [config]);

  const defaultSpeed = config?.global.defaultSpeed ?? 1;
  const preferredQuality = config?.global.preferredQuality ?? 'auto';

  return (
    <div className="options">
      <header className="options__header">
        <div className="brand">
          <div className="brand__logo" aria-hidden="true">
            <span className="brand__ring" />
            <span className="brand__play" />
          </div>
          <div className="brand__text">
            <div className="brand__title">bilibili Speed Master</div>
            <a
              className="brand__subtitle"
              href="https://x.com/cholf5"
              target="_blank"
              rel="noreferrer"
            >
              Made by cholf5
            </a>
          </div>
        </div>
        <div className="header__actions">
          <div className="rating">
            <span>Rate me:</span>
            <span className="rating__stars" aria-hidden="true">
              &#9733;&#9733;&#9733;&#9733;&#9733;
            </span>
          </div>
          <a
            className="donate-button"
            href="https://x.com/cholf5"
            target="_blank"
            rel="noreferrer"
          >
            Donate
          </a>
        </div>
      </header>

      <section className="summary">
        <div className="card">
          <div className="card__label">Total Time Saved</div>
          <div className="card__value">{hoursSaved} hours</div>
        </div>
        <div className="card">
          <div className="card__label">Default Speed</div>
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
        <div className="card">
          <div className="card__label">Preferred Quality</div>
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

      <section className="table">
        <div className="table__header">
          <div>Channel</div>
          <div>Last Visit</div>
          <div>Speed</div>
        </div>
        <div className="table__body">
          {sortedChannels.length === 0 ? (
            <div className="table__empty">No channel overrides yet.</div>
          ) : (
            sortedChannels.map((channel) => (
              <div className="table__row" key={channel.channelId}>
                <div className="table__cell table__cell--channel">
                  <div className="avatar">
                    {channel.avatarUrl ? (
                      <img src={channel.avatarUrl} alt="" />
                    ) : (
                      <span>{channel.channelName.slice(0, 1)}</span>
                    )}
                  </div>
                  <span className="channel-name">{channel.channelName}</span>
                </div>
                <div className="table__cell table__cell--visit">
                  {formatTimestamp(channel.lastVisit)}
                </div>
                <div className="table__cell table__cell--speed">
                  <div className="stepper stepper--compact">
                    <button
                      type="button"
                      onClick={() =>
                        updateChannel(channel.channelId, {
                          speed: clampSpeed(channel.speed - SPEED_STEP),
                        })
                      }
                      aria-label={`Decrease speed for ${channel.channelName}`}
                    >
                      -
                    </button>
                    <span>{formatSpeed(channel.speed)}</span>
                    <button
                      type="button"
                      onClick={() =>
                        updateChannel(channel.channelId, {
                          speed: clampSpeed(channel.speed + SPEED_STEP),
                        })
                      }
                      aria-label={`Increase speed for ${channel.channelName}`}
                    >
                      +
                    </button>
                    <button
                      type="button"
                      className="delete"
                      onClick={() => deleteChannel(channel.channelId)}
                      aria-label={`Delete ${channel.channelName}`}
                    >
                      ×
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

export default App;
