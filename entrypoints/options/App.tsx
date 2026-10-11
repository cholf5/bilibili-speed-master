import { useEffect, useMemo, useRef, useState } from 'react';
import './App.css';
import {
  getConfig,
  mergeConfig,
  updateConfig,
  type ChannelOverride,
  type SpeedMasterConfig,
} from '@/src/shared/config';
import { STATS_STORAGE_KEY, getSavedStats, updateSavedStats } from '@/src/shared/stats';
import { t } from '@/src/shared/i18n';
import {
  SHORTCUT_ACTION_ORDER,
  bindingEquals,
  captureShortcut,
  cloneDefaultShortcuts,
  findBindingConflict,
  formatShortcutBinding,
  type ShortcutActionId,
  type ShortcutBinding,
  type ShortcutBindings,
} from '@/src/shared/shortcuts';

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
  const rounded = Math.round(value * 100) / 100;
  return Number(rounded.toFixed(2)).toString();
};

const normalizeAvatarUrl = (url?: string | null): string | undefined => {
  if (!url) {
    return undefined;
  }
  if (url.startsWith('//')) {
    return `https:${url}`;
  }
  return url;
};

// D-5: formatTimestamp used to print UTC via toISOString(), an 8-hour lie
// for UTC+8 users. Build the same YYYY-MM-DD HH:mm:ss shape from local
// components instead; invalid/missing timestamps still render '-'.
export const formatTimestamp = (value?: string) => {
  if (!value) {
    return '-';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '-';
  }
  const pad = (part: number, width = 2) => String(part).padStart(width, '0');
  const day = `${pad(date.getFullYear(), 4)}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  const time = `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  return `${day} ${time}`;
};

// D-9: action id → i18n key. seekToPercent0..9 share one template key with a
// {n} placeholder; togglePlaySpace shares the togglePlay name (both are
// "play / pause", split into two actions so either key can be remapped).
const SHORTCUT_ACTION_NAME_KEYS: Record<ShortcutActionId, string> = {
  togglePlay: 'actionTogglePlay',
  togglePlaySpace: 'actionTogglePlay',
  toggleMute: 'actionToggleMute',
  seekBackwardLarge: 'actionSeekBackwardLarge',
  seekForwardLarge: 'actionSeekForwardLarge',
  seekBackwardSmall: 'actionSeekBackwardSmall',
  seekForwardSmall: 'actionSeekForwardSmall',
  volumeUp: 'actionVolumeUp',
  volumeDown: 'actionVolumeDown',
  seekToStart: 'actionSeekToStart',
  seekToEnd: 'actionSeekToEnd',
  stepForward: 'actionStepForward',
  stepBackward: 'actionStepBackward',
  speedUp: 'actionSpeedUp',
  slowDown: 'actionSlowDown',
  toggleFullscreen: 'actionToggleFullscreen',
  toggleCaptions: 'actionToggleCaptions',
  toggleMiniPlayer: 'actionToggleMiniPlayer',
  nextVideo: 'actionNextVideo',
  prevVideo: 'actionPrevVideo',
  focusSearch: 'actionFocusSearch',
  seekToPercent0: 'actionSeekPercent',
  seekToPercent1: 'actionSeekPercent',
  seekToPercent2: 'actionSeekPercent',
  seekToPercent3: 'actionSeekPercent',
  seekToPercent4: 'actionSeekPercent',
  seekToPercent5: 'actionSeekPercent',
  seekToPercent6: 'actionSeekPercent',
  seekToPercent7: 'actionSeekPercent',
  seekToPercent8: 'actionSeekPercent',
  seekToPercent9: 'actionSeekPercent',
  mediaPlayPause: 'actionMediaPlayPause',
  mediaStop: 'actionMediaStop',
  mediaTrackNext: 'actionMediaTrackNext',
};

const shortcutActionName = (id: ShortcutActionId): string => {
  if (SHORTCUT_ACTION_NAME_KEYS[id] === 'actionSeekPercent') {
    const percent = Number(id.slice('seekToPercent'.length)) * 10;
    return t('actionSeekPercent').replace('{n}', String(percent));
  }
  return t(SHORTCUT_ACTION_NAME_KEYS[id]);
};

function App() {
  const [config, setConfig] = useState<SpeedMasterConfig | null>(null);
  const [avatarMap, setAvatarMap] = useState<Record<string, string>>({});
  const [timeSavedSeconds, setTimeSavedSeconds] = useState(0);
  const avatarUrlsRef = useRef<string[]>([]);
  // D-9: shortcut recording state. `recording` is the action awaiting a new
  // key; `pending` holds a captured binding that conflicts with another
  // enabled action until the user confirms the swap or cancels.
  const [recording, setRecording] = useState<ShortcutActionId | null>(null);
  const [pending, setPending] = useState<{
    binding: ShortcutBinding;
    conflict: ShortcutActionId;
  } | null>(null);
  const recordingRowRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    getConfig().then(setConfig);
    // D-1: stats live in storage.local, not in the sync config.
    void getSavedStats().then((stats) => setTimeSavedSeconds(stats.timeSavedSeconds));
  }, []);

  // D-1: refresh the stats display whenever the local stats key changes.
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

  useEffect(() => {
    let cancelled = false;

    const loadAvatars = async () => {
      const channels = Object.values(config?.channels ?? {});
      const nextMap: Record<string, string> = {};
      const createdUrls: string[] = [];

      await Promise.all(
        channels.map(async (channel) => {
          const raw = normalizeAvatarUrl(channel.avatarUrl);
          if (!raw) {
            return;
          }
          if (raw.startsWith('data:') || raw.startsWith('blob:')) {
            nextMap[channel.channelId] = raw;
            return;
          }
          try {
            const response = await fetch(raw);
            if (!response.ok) {
              return;
            }
            const blob = await response.blob();
            const objectUrl = URL.createObjectURL(blob);
            nextMap[channel.channelId] = objectUrl;
            createdUrls.push(objectUrl);
          } catch {
            // Ignore failed avatar fetches.
          }
        }),
      );

      if (cancelled) {
        createdUrls.forEach((url) => URL.revokeObjectURL(url));
        return;
      }

      avatarUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      avatarUrlsRef.current = createdUrls;
      setAvatarMap(nextMap);
    };

    void loadAvatars();

    return () => {
      cancelled = true;
    };
  }, [config]);

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

  const exportConfig = async () => {
    // D-1: the file keeps its v1 shape (config + stats) for backward
    // compatibility, but the stats section now comes from storage.local.
    const [current, stats] = await Promise.all([getConfig(), getSavedStats()]);
    const payload = { ...current, stats };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'bilibili-speed-master-config.json';
    link.click();
    URL.revokeObjectURL(url);
  };

  const importConfig = async (file: File) => {
    const text = await file.text();
    const raw = JSON.parse(text);
    if (!raw || typeof raw !== 'object' || raw.version !== 1) {
      throw new Error('invalid');
    }

    // Sanitize before persisting (D-3): mergeConfig validates global/stats and
    // every channel entry, and setConfig caps channels to the LRU limit (D-4).
    const merged = mergeConfig(raw);
    const next = await updateConfig(() => merged);
    setConfig(next);

    // D-1: stats live in storage.local now. Merge the imported value with max
    // semantics so restoring an older backup cannot roll the counter
    // backwards; the stats field inside the sync config is only kept for
    // old-version import compatibility.
    const stats = await updateSavedStats((current) => ({
      timeSavedSeconds: Math.max(current.timeSavedSeconds, merged.stats.timeSavedSeconds),
    }));
    setTimeSavedSeconds(stats.timeSavedSeconds);
  };

  const handleImportClick = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) {
        return;
      }
      try {
        if (!window.confirm('Import settings and overwrite current configuration?')) {
          return;
        }
        await importConfig(file);
      } catch {
        window.alert('Invalid configuration file.');
      }
    };
    input.click();
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

  const handleWidgetToggle = (event: React.ChangeEvent<HTMLInputElement>) => {
    void updateGlobal({ showVideoWidget: event.target.checked });
  };

  const handleWidgetPositionChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    if (event.target.value === 'topLeft' || event.target.value === 'topRight') {
      void updateGlobal({ videoWidgetPosition: event.target.value });
    }
  };

  // D-9: shortcut remapping writes through the shared updateConfig channel
  // (single writer, same as every other options control). storage.onChanged
  // fans the change out to content scripts, so remaps apply on video pages
  // without a reload.
  const shortcuts = config?.global.shortcuts ?? null;

  const applyShortcut = async (id: ShortcutActionId, binding: ShortcutBinding | null) => {
    const current = config?.global.shortcuts;
    if (!current) {
      return;
    }
    // Reference/shape-equal binding: skip the storage write entirely.
    if (bindingEquals(current[id], binding)) {
      return;
    }
    await updateGlobal({ shortcuts: { ...current, [id]: binding } });
  };

  // PM decision (D-9): a recorded key held by another enabled action is
  // resolved by SWAPPING the two bindings (the other action gets this
  // action's previous binding, null included) instead of blocking the save.
  const swapShortcut = async () => {
    if (!recording || !pending || !config) {
      return;
    }
    const target = recording;
    const other = pending.conflict;
    const current = config.global.shortcuts;
    await updateGlobal({
      shortcuts: { ...current, [target]: pending.binding, [other]: current[target] },
    });
    setRecording(null);
    setPending(null);
  };

  const restoreDefaultShortcuts = async () => {
    // Review fix (D-9): bulk reset wipes every remap at once — confirm first,
    // aligned with the import flow's dialog.
    if (!window.confirm(t('shortcutsRestoreConfirm'))) {
      return;
    }
    // cloneDefaultShortcuts: never hand the shared DEFAULT table to storage.
    await updateGlobal({ shortcuts: cloneDefaultShortcuts() });
  };

  const startRecording = (id: ShortcutActionId) => {
    setRecording(id);
    setPending(null);
  };

  const cancelRecording = () => {
    setRecording(null);
    setPending(null);
  };

  // While recording, capture the next keydown (Esc cancels; bare modifiers
  // are ignored; clicking outside the row cancels). Capture-phase window
  // listeners so the recorded key can neither scroll the page nor trigger
  // any other control, and re-record while a conflict is pending.
  useEffect(() => {
    if (!recording) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      event.preventDefault();
      event.stopImmediatePropagation();
      if (event.key === 'Escape') {
        setRecording(null);
        setPending(null);
        return;
      }
      const binding = captureShortcut(event);
      if (!binding) {
        return;
      }
      const current = config?.global.shortcuts;
      if (!current) {
        return;
      }
      const conflict = findBindingConflict(current, recording, binding);
      if (!conflict) {
        if (bindingEquals(current[recording], binding)) {
          // Same key as before: nothing to write, just leave recording.
          setRecording(null);
          return;
        }
        void applyShortcut(recording, binding);
        setRecording(null);
        return;
      }
      setPending({ binding, conflict });
    };
    const onPointerDown = (event: PointerEvent) => {
      const row = recordingRowRef.current;
      if (row && event.target instanceof Node && row.contains(event.target)) {
        return;
      }
      setRecording(null);
      setPending(null);
    };
    window.addEventListener('keydown', onKeyDown, true);
    window.addEventListener('pointerdown', onPointerDown, true);
    return () => {
      window.removeEventListener('keydown', onKeyDown, true);
      window.removeEventListener('pointerdown', onPointerDown, true);
    };
  }, [recording, config]);

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
        <div className="header__actions">
          <div className="rating">
            <span>{t('rateMe')}:</span>
            <span className="rating__stars" aria-hidden="true">
              &#9733;&#9733;&#9733;&#9733;&#9733;
            </span>
          </div>
        </div>
      </header>

      <section className="summary">
        <div className="card">
          <div className="card__label">{t('totalTimeSaved')}</div>
          <div className="card__value">
            {hoursSaved} {t('hours')}
          </div>
        </div>
        <div className="card">
          <div className="card__label">{t('defaultSpeed')}</div>
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
        <div className="card">
          <div className="card__label">{t('preferredQuality')}</div>
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
        <div className="card">
          <div className="card__label">{t('showVideoWidget')}</div>
          <label className="switch">
            <input
              type="checkbox"
              checked={config?.global.showVideoWidget ?? true}
              onChange={handleWidgetToggle}
            />
            <span className="switch__track" aria-hidden="true" />
          </label>
          <div className="card__sub">
            <span>{t('widgetPosition')}</span>
            <select
              className="select select--compact"
              value={config?.global.videoWidgetPosition ?? 'topLeft'}
              onChange={handleWidgetPositionChange}
              disabled={!(config?.global.showVideoWidget ?? true)}
            >
              <option value="topLeft">Top left</option>
              <option value="topRight">Top right</option>
            </select>
          </div>
        </div>
      </section>

      <section className="shortcuts">
        <div className="shortcuts__header">
          <div className="shortcuts__title">{t('optionsShortcuts')}</div>
          <button
            type="button"
            className="shortcuts__button"
            onClick={restoreDefaultShortcuts}
            disabled={!shortcuts}
          >
            {t('shortcutsRestoreDefaults')}
          </button>
        </div>
        <div className="shortcuts__list">
          {SHORTCUT_ACTION_ORDER.map((id) => {
            const isRecording = recording === id;
            const binding = shortcuts ? shortcuts[id] : null;
            const conflictAction = isRecording && pending ? pending.conflict : null;
            return (
              <div
                key={id}
                className={`shortcuts__row${isRecording ? ' shortcuts__row--recording' : ''}`}
                ref={isRecording ? recordingRowRef : undefined}
              >
                <span className="shortcuts__name">{shortcutActionName(id)}</span>
                <span className="shortcuts__binding">
                  {isRecording
                    ? pending
                      ? formatShortcutBinding(pending.binding)
                      : t('shortcutsRecordHint')
                    : !shortcuts
                      ? '-'
                      : binding
                        ? formatShortcutBinding(binding)
                        : t('shortcutsDisabled')}
                </span>
                <span className="shortcuts__controls">
                  {isRecording ? (
                    conflictAction ? (
                      <>
                        <button
                          type="button"
                          className="shortcuts__button shortcuts__button--primary"
                          onClick={() => void swapShortcut()}
                        >
                          {t('shortcutsSwap')}
                        </button>
                        <button
                          type="button"
                          className="shortcuts__button"
                          onClick={cancelRecording}
                        >
                          {t('shortcutsCancel')}
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        className="shortcuts__button"
                        onClick={cancelRecording}
                      >
                        {t('shortcutsCancel')}
                      </button>
                    )
                  ) : (
                    <>
                      <button
                        type="button"
                        className="shortcuts__button"
                        onClick={() => startRecording(id)}
                        disabled={!shortcuts}
                      >
                        {t('shortcutsChange')}
                      </button>
                      {binding && (
                        <button
                          type="button"
                          className="shortcuts__button"
                          onClick={() => void applyShortcut(id, null)}
                        >
                          {t('shortcutsDisable')}
                        </button>
                      )}
                    </>
                  )}
                </span>
                {conflictAction && (
                  <div className="shortcuts__conflict">
                    {t('shortcutsConflictWith').replace(
                      '{action}',
                      shortcutActionName(conflictAction),
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section className="table">
        <div className="table__header">
          <div>{t('channel')}</div>
          <div>{t('lastVisit')}</div>
          <div>{t('speed')}</div>
        </div>
        <div className="table__body">
          {sortedChannels.length === 0 ? (
            <div className="table__empty">{t('noOverrides')}</div>
          ) : (
            sortedChannels.map((channel) => {
              const avatarSrc =
                avatarMap[channel.channelId] ?? normalizeAvatarUrl(channel.avatarUrl);
              return (
                <div className="table__row" key={channel.channelId}>
                  <div className="table__cell table__cell--channel">
                    <div className="avatar">
                      {avatarSrc ? (
                        <img src={avatarSrc} alt="" />
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
                        &times;
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      <section className="transfer">
        <button type="button" className="transfer__button" onClick={exportConfig}>
          {t('export')}
        </button>
        <button type="button" className="transfer__button" onClick={handleImportClick}>
          {t('import')}
        </button>
      </section>
    </div>
  );
}

export default App;
