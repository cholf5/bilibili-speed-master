import {
  CHANNELS_STORAGE_KEY,
  GLOBAL_STORAGE_KEY,
  getConfig,
  updateConfig,
} from '@/src/shared/config';
import { updateSavedStats } from '@/src/shared/stats';
import { computeTimeSaved, getVideoIdFromUrl, sanitizeChannelName } from '@/src/shared/video';

const URL_POLL_INTERVAL_MS = 800;
const KEYBOARD_SPEED_STEP = 0.25;
const SPEED_MIN = 0.1;
const SPEED_MAX = 4;
const SEEK_STEP_SMALL = 5;
const SEEK_STEP_LARGE = 10;
const VOLUME_STEP = 0.05;
const FRAME_STEP = 1 / 30;
// Stats live in storage.local (D-1) with no write-ops quota, but the flush is
// still throttled to 30s to keep storage traffic low; pause / visibilitychange
// / pagehide / beforeunload flushes bound the loss window.
const TIME_SAVE_FLUSH_MS = 30000;
const MEDIA_LOAD_GUARD_MS = 500;
const WIDGET_CLASS = 'speed-master-widget';
const PLAYER_CONTAINER_SELECTOR = '.bpx-player-container, .bilibili-player';
// Bilibili's player can re-apply its own globally remembered speed seconds
// after a video starts (outside the 500ms media-load guard); unexplained rate
// changes in this window are treated as player init, not user intent.
const PLAYER_INIT_GRACE_MS = 6000;
const USER_INTENT_WINDOW_MS = 2000;
const TIME_UPDATE_MAX_DELTA_S = 2;
const QUALITY_APPLY_DELAY_MS = 1200;
// SPA transitions swap the media seconds before the DOM's UP link updates, so
// channel identity for /video/ pages is resolved authoritatively from the view
// API (keyed by the URL's video id, which updates together with the media).
const VIEW_API_URL = 'https://api.bilibili.com/x/web-interface/view';

// The player's own speed control (menu items and the slider live inside this
// container); touching it counts as user intent even though the resulting
// ratechange itself is indistinguishable from Bilibili's automatic restores.
const SPEED_CONTROL_SELECTOR =
  '.bpx-player-ctrl-playbackrate, .bilibili-player-video-btn-speed, .squirtle-speed-select';

type ChannelInfo = {
  channelId: string;
  channelName: string;
  avatarUrl?: string;
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

const isManagedVideoPage = (): boolean => {
  const path = location.pathname;
  return path.includes('/video/') || path.includes('/bangumi/play/');
};

const getChannelInfo = (): ChannelInfo | null => {
  const root = globalThis as typeof globalThis & {
    __INITIAL_STATE__?: any;
  };
  const owner = root.__INITIAL_STATE__?.videoData?.owner;
  if (owner?.mid) {
    return {
      channelId: String(owner.mid),
      channelName: sanitizeChannelName(owner.name),
      avatarUrl: normalizeAvatarUrl(owner.face),
    };
  }

  // The watch page renders several space.bilibili.com links (UP panel,
  // related videos, comments); the UP-panel one is marked with an "upinfo"
  // spm parameter, so prefer it before falling back to the first link.
  const link =
    document.querySelector<HTMLAnchorElement>(
      'a[href*="space.bilibili.com/"][href*="upinfo"]',
    ) ?? document.querySelector<HTMLAnchorElement>('a[href*="space.bilibili.com/"]');
  if (!link) {
    return null;
  }

  const href = link.getAttribute('href') ?? '';
  const match = href.match(/space\.bilibili\.com\/(\d+)/);
  if (!match) {
    return null;
  }

  const upName =
    document.querySelector('.up-info .up-name, .up-info__name, .up-name')?.textContent?.trim();
  const channelName = sanitizeChannelName(upName || link.textContent?.trim());
  const avatarElement = document.querySelector<HTMLImageElement>(
    [
      '.up-info img',
      '.up-info__avatar img',
      '.up-info__face img',
      '.up-info-container img',
      '.up-panel-container img',
      'img.bili-avatar-img',
      'img[data-src*="hdslb.com/bfs/face"]',
    ].join(', '),
  );
  const avatar =
    avatarElement?.getAttribute('data-src') ??
    avatarElement?.getAttribute('src') ??
    undefined;

  return {
    channelId: match[1],
    channelName,
    avatarUrl: normalizeAvatarUrl(avatar),
  };
};

// D-2: the read-modify-write runs as ONE unit inside config.ts's write queue,
// so a concurrent update in this context cannot interleave between the read
// and the write. The reference-equality short-circuit (the updater returned
// the config it read → storage already holds that state → no write) lives in
// the queued updateConfig, keeping no-op calls from touching storage.
const updateConfigIfChanged = (
  updater: (current: Awaited<ReturnType<typeof getConfig>>) => Awaited<ReturnType<typeof getConfig>>,
) => updateConfig(updater);

const applyPlaybackRate = (video: HTMLVideoElement, speed: number): void => {
  if (Number.isNaN(speed) || speed <= 0) {
    return;
  }

  const clamped = Math.min(SPEED_MAX, Math.max(SPEED_MIN, speed));
  // defaultPlaybackRate makes the browser land on our target speed whenever it
  // resets playbackRate during a media load (e.g. autoplaying the next video).
  video.defaultPlaybackRate = clamped;
  video.playbackRate = clamped;
};

const formatWidgetSpeed = (value: number): string => {
  const rounded = Math.round(value * 100) / 100;
  return `${Number(rounded.toFixed(2))}x`;
};

const seekBy = (video: HTMLVideoElement, delta: number) => {
  const duration = Number.isFinite(video.duration) ? video.duration : 0;
  const next = Math.min(Math.max(video.currentTime + delta, 0), duration || Infinity);
  video.currentTime = next;
};

const seekToPercent = (video: HTMLVideoElement, percent: number) => {
  if (!Number.isFinite(video.duration) || video.duration <= 0) {
    return;
  }
  video.currentTime = Math.min(video.duration * percent, video.duration);
};

const togglePlay = (video: HTMLVideoElement) => {
  if (video.paused) {
    void video.play();
  } else {
    video.pause();
  }
};

const toggleFullscreen = (video: HTMLVideoElement) => {
  const container =
    video.closest<HTMLElement>('.bpx-player-container, .bilibili-player-video') ?? video;

  if (document.fullscreenElement) {
    void document.exitFullscreen();
    return;
  }
  void container.requestFullscreen?.();
};

const toggleCaptions = (video: HTMLVideoElement) => {
  const tracks = video.textTracks;
  if (!tracks || tracks.length === 0) {
    return;
  }
  const anyShowing = Array.from(tracks).some((track) => track.mode === 'showing');
  Array.from(tracks).forEach((track) => {
    track.mode = anyShowing ? 'disabled' : 'showing';
  });
};

const focusSearch = () => {
  const input = document.querySelector<HTMLInputElement>(
    'input.nav-search-input, input[type="search"], input[placeholder*="search" i], input[name*="search" i], input[name="keyword"]',
  );
  if (input) {
    input.focus();
  }
};

const clickPlayerButton = (selectors: string[]) => {
  for (const selector of selectors) {
    const button = document.querySelector<HTMLButtonElement>(selector);
    if (button) {
      button.click();
      return true;
    }
  }
  return false;
};

const findVideo = (): HTMLVideoElement | null => {
  const video = document.querySelector('video');
  return video instanceof HTMLVideoElement ? video : null;
};

export default defineContentScript({
  matches: ['*://*.bilibili.com/*'],
  main() {
    let activeVideo: HTMLVideoElement | null = null;
    let programmaticRate: number | null = null;
    let programmaticRateTimer: number | null = null;
    let mediaLoadGuardUntil = 0;
    let lastUrl = location.href;
    let urlPoller: number | null = null;
    let lastPlaybackTime = -1;
    let lastPlaybackRate = 1;
    let timeSavedBuffer = 0;
    let timeSaveTimer: number | null = null;
    let lastChannelId: string | null = null;
    let lastVideoId: string | null = null;
    // Speed we last applied programmatically and the video id it was for;
    // lets the resolve reconciler tell "rate untouched since our provisional
    // apply" apart from "user changed the rate while detection lagged".
    let appliedRate: number | null = null;
    let appliedForVideoId: string | null = null;
    const authoritativeChannels = new Map<string, ChannelInfo>();
    const pendingResolves = new Map<string, Promise<ChannelInfo | null>>();
    // Timestamp of the last speed change that came from a known user path
    // (extension shortcuts, popup stepper, or the player's own speed control);
    // lets handleRateChange tell user intent apart from player-init noise.
    let lastUserIntentAt = 0;
    let playerInitUntil = 0;

    const clearProgrammaticRate = () => {
      if (programmaticRateTimer !== null) {
        window.clearTimeout(programmaticRateTimer);
        programmaticRateTimer = null;
      }
      programmaticRate = null;
    };

    const markMediaLoadGuard = () => {
      mediaLoadGuardUntil = Date.now() + MEDIA_LOAD_GUARD_MS;
      playerInitUntil = Date.now() + PLAYER_INIT_GRACE_MS;
    };

    const getAuthoritativeChannel = (): ChannelInfo | null => {
      const videoId = getVideoIdFromUrl(location.href);
      return (videoId && authoritativeChannels.get(videoId)) || null;
    };

    const getCurrentChannel = (): ChannelInfo | null =>
      getAuthoritativeChannel() ?? getChannelInfo();

    const resolveChannel = (videoId: string): Promise<ChannelInfo | null> => {
      const cached = authoritativeChannels.get(videoId);
      if (cached) {
        return Promise.resolve(cached);
      }
      const pending = pendingResolves.get(videoId);
      if (pending) {
        return pending;
      }

      const request = (async () => {
        try {
          const aidMatch = /^av(\d+)$/.exec(videoId);
          const query = aidMatch ? `aid=${aidMatch[1]}` : `bvid=${videoId}`;
          const response = await fetch(`${VIEW_API_URL}?${query}`, {
            credentials: 'omit',
          });
          const payload = await response.json();
          const owner = payload?.data?.owner;
          if (payload?.code === 0 && owner?.mid) {
            const info: ChannelInfo = {
              channelId: String(owner.mid),
              channelName: sanitizeChannelName(owner.name),
              avatarUrl: normalizeAvatarUrl(owner.face),
            };
            authoritativeChannels.set(videoId, info);
            return info;
          }
        } catch {
          // Transient network failure: stay unauthoritative for this video;
          // the next navigation or media event retries.
        }
        return null;
      })();

      pendingResolves.set(videoId, request);
      void request.then(() => {
        if (pendingResolves.get(videoId) === request) {
          pendingResolves.delete(videoId);
        }
      });
      return request;
    };

    // Runs once the real channel for the current video is known: corrects our
    // provisional speed apply, or persists the rate the user set while
    // detection was still lagging behind the media swap.
    const reconcileAfterResolve = (videoId: string) => {
      if (!activeVideo || getVideoIdFromUrl(location.href) !== videoId) {
        return;
      }
      if (appliedForVideoId === videoId) {
        const rateIsOurs =
          appliedRate !== null &&
          Math.abs(activeVideo.playbackRate - appliedRate) < 0.001;
        if (rateIsOurs) {
          void applySpeedForVideo(activeVideo);
        } else {
          void handleRateChange();
        }
      }
      void recordChannelVisit();
    };

    const ensureChannelResolved = () => {
      const videoId = getVideoIdFromUrl(location.href);
      if (!videoId) {
        return;
      }
      void resolveChannel(videoId).then((info) => {
        if (info) {
          reconcileAfterResolve(videoId);
        }
      });
    };

    // D-2: persisting the channel override is trailing-debounced so a slider
    // drag (one ratechange per frame) coalesces into a single storage write
    // carrying the final rate. Only THIS persistence is debounced: the gating
    // above, the programmaticRate marking, and the player-init re-assert path
    // still run on every event. The channel/speed captured here were already
    // validated by that gating, so the flush persists exactly the last
    // validated decision.
    const RATE_PERSIST_DEBOUNCE_MS = 300;
    let ratePersistTimer: number | null = null;
    let runPendingRatePersist: (() => void) | null = null;

    // Tab-close safety net: a pending debounced write must not die with the
    // page — changing the speed and closing the tab right away would lose the
    // override. Mounted alongside the stats flush on visibilitychange hidden
    // / pagehide / beforeunload (see flushBufferedStats below).
    const flushPendingRatePersist = () => {
      if (ratePersistTimer !== null) {
        window.clearTimeout(ratePersistTimer);
        ratePersistTimer = null;
      }
      const run = runPendingRatePersist;
      runPendingRatePersist = null;
      run?.();
    };

    const scheduleRatePersist = (channel: ChannelInfo, speed: number) => {
      runPendingRatePersist = () => {
        void updateConfigIfChanged((config) => {
          const existing = config.channels[channel.channelId];
          if (
            existing &&
            existing.speed === speed &&
            existing.channelName === channel.channelName &&
            existing.avatarUrl === channel.avatarUrl
          ) {
            return config;
          }
          return {
            ...config,
            channels: {
              ...config.channels,
              [channel.channelId]: {
                channelId: channel.channelId,
                channelName: channel.channelName,
                avatarUrl: channel.avatarUrl,
                speed,
                lastVisit: new Date().toISOString(),
              },
            },
          };
        });
      };
      if (ratePersistTimer !== null) {
        window.clearTimeout(ratePersistTimer);
      }
      ratePersistTimer = window.setTimeout(flushPendingRatePersist, RATE_PERSIST_DEBOUNCE_MS);
    };

    const handleRateChange = async () => {
      if (!activeVideo) {
        return;
      }

      lastPlaybackRate = activeVideo.playbackRate;

      if (
        programmaticRate !== null &&
        Math.abs(activeVideo.playbackRate - programmaticRate) < 0.001
      ) {
        // Assigning defaultPlaybackRate and playbackRate each fires a
        // ratechange; keep the marker until its timer expires so the second
        // event is swallowed too instead of reading as user intent. Genuine
        // user changes to a different rate never match and pass through.
        return;
      }

      // While media is loading the element resets its own rate (and Bilibili's
      // player may too, when advancing to the next video); those resets are not
      // user intent and must never be persisted as a channel override.
      if (Date.now() < mediaLoadGuardUntil) {
        return;
      }

      if (!isManagedVideoPage()) {
        return;
      }

      // On SPA transitions the DOM fallback can still describe the previous
      // video's channel for seconds after the media swap; persisting before
      // the authoritative channel resolves would corrupt that channel's
      // override. The resolve reconciler persists genuine user changes once
      // the real channel is known.
      if (getVideoIdFromUrl(location.href) && !getAuthoritativeChannel()) {
        return;
      }

      const channel = getCurrentChannel();
      if (!channel) {
        return;
      }

      // Inside the player-init window an unexplained rate change is Bilibili's
      // own doing (e.g. restoring its globally remembered speed), not user
      // intent: it must neither overwrite the channel override nor be
      // persisted as one, so re-assert the target speed instead. Changes
      // through the player's speed control set lastUserIntentAt and pass.
      const userIntentRecent = Date.now() - lastUserIntentAt < USER_INTENT_WINDOW_MS;
      if (!userIntentRecent && Date.now() < playerInitUntil) {
        void applySpeedForVideo(activeVideo);
        return;
      }

      const currentSpeed = activeVideo.playbackRate;
      scheduleRatePersist(channel, currentSpeed);
    };

    const recordChannelVisit = async () => {
      if (!isManagedVideoPage()) {
        return;
      }

      // Same gating as handleRateChange: the visit must not be recorded for
      // the previous video's channel while DOM detection is still lagging.
      if (getVideoIdFromUrl(location.href) && !getAuthoritativeChannel()) {
        return;
      }

      const channel = getCurrentChannel();
      if (!channel) {
        return;
      }

      const currentVideoId = getVideoIdFromUrl(location.href);
      if (channel.channelId === lastChannelId && currentVideoId === lastVideoId) {
        return;
      }

      await updateConfigIfChanged((config) => {
        const existing = config.channels[channel.channelId];
        if (existing) {
          return {
            ...config,
            channels: {
              ...config.channels,
              [channel.channelId]: {
                ...existing,
                channelName: channel.channelName,
                avatarUrl: channel.avatarUrl,
                lastVisit: new Date().toISOString(),
              },
            },
          };
        }

        return config;
      });

      lastChannelId = channel.channelId;
      lastVideoId = currentVideoId;
    };

    const applySpeedForVideo = async (video: HTMLVideoElement) => {
      const config = await getConfig();
      const channel = getCurrentChannel();
      const channelOverride =
        channel?.channelId ? config.channels[channel.channelId] : undefined;
      const targetSpeed = channelOverride?.speed ?? config.global.defaultSpeed;

      programmaticRate = targetSpeed;
      if (programmaticRateTimer !== null) {
        window.clearTimeout(programmaticRateTimer);
      }
      programmaticRateTimer = window.setTimeout(() => {
        clearProgrammaticRate();
      }, 1000);
      applyPlaybackRate(video, targetSpeed);
      appliedRate = targetSpeed;
      appliedForVideoId = getVideoIdFromUrl(location.href);
    };

    // Corner widget in the player's top-left/top-right: always expanded, and
    // its visibility mirrors the player's own controls — fades in on
    // mouseenter of the player area, fades out on mouseleave. Lives inside the
    // player container so fullscreen and web-fullscreen keep showing it.
    const ensureWidgetStyles = () => {
      if (document.getElementById('speed-master-widget-styles')) {
        return;
      }
      const style = document.createElement('style');
      style.id = 'speed-master-widget-styles';
      style.textContent = `
        .${WIDGET_CLASS} {
          position: absolute;
          top: 12px;
          right: 12px;
          z-index: 9999;
          display: flex;
          align-items: center;
          gap: 4px;
          height: 28px;
          padding: 0 6px;
          border-radius: 14px;
          background: rgba(28, 28, 28, 0.75);
          color: #fff;
          font-size: 13px;
          line-height: 28px;
          opacity: 1;
          transition: opacity 0.2s ease;
          cursor: default;
          pointer-events: auto;
          user-select: none;
        }
        .${WIDGET_CLASS}.smw--left {
          left: 12px;
          right: auto;
        }
        .${WIDGET_CLASS}.smw--covered {
          opacity: 0;
          pointer-events: none;
        }
        .${WIDGET_CLASS}.smw--off {
          display: none;
        }
        .${WIDGET_CLASS} .smw__btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 22px;
          height: 22px;
          border: 0;
          border-radius: 5px;
          background: rgba(255, 255, 255, 0.16);
          color: inherit;
          font: inherit;
          font-weight: 600;
          padding: 0;
          cursor: pointer;
          transition: background 0.15s ease;
        }
        .${WIDGET_CLASS} .smw__btn:hover {
          background: rgba(255, 255, 255, 0.34);
        }
        .${WIDGET_CLASS} .smw__btn:active {
          background: rgba(255, 255, 255, 0.5);
        }
        .${WIDGET_CLASS} .smw__label {
          min-width: 36px;
          text-align: center;
        }
        .${WIDGET_CLASS} .smw__gear svg {
          width: 14px;
          height: 14px;
          fill: currentColor;
          display: block;
        }
      `;
      document.head.appendChild(style);
    };

    const GEAR_SVG =
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.07-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.74,8.87C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.8,11.69,4.8,12s0.02,0.64,0.07,0.94l-2.03,1.58c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.44-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.47-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z"/></svg>';

    const speedWidgetRoot = document.createElement('div');
    speedWidgetRoot.className = `${WIDGET_CLASS} smw--covered`;
    const speedWidgetGear = document.createElement('button');
    speedWidgetGear.type = 'button';
    speedWidgetGear.className = 'smw__btn smw__gear';
    speedWidgetGear.setAttribute('aria-label', 'Open settings');
    speedWidgetGear.innerHTML = GEAR_SVG;
    const speedWidgetMinus = document.createElement('button');
    speedWidgetMinus.type = 'button';
    speedWidgetMinus.className = 'smw__btn smw__minus';
    speedWidgetMinus.textContent = '−';
    speedWidgetMinus.setAttribute('aria-label', 'Decrease speed');
    const speedWidgetLabel = document.createElement('span');
    speedWidgetLabel.className = 'smw__label';
    speedWidgetLabel.textContent = '-';
    const speedWidgetPlus = document.createElement('button');
    speedWidgetPlus.type = 'button';
    speedWidgetPlus.className = 'smw__btn smw__plus';
    speedWidgetPlus.textContent = '+';
    speedWidgetPlus.setAttribute('aria-label', 'Increase speed');
    speedWidgetRoot.append(speedWidgetGear, speedWidgetMinus, speedWidgetLabel, speedWidgetPlus);

    const showSpeedWidget = () => {
      speedWidgetRoot.classList.remove('smw--covered');
    };

    const hideSpeedWidget = () => {
      speedWidgetRoot.classList.add('smw--covered');
    };

    let speedWidgetBoundContainer: HTMLElement | null = null;

    const bindSpeedWidgetContainer = (container: HTMLElement) => {
      if (speedWidgetBoundContainer === container) {
        return;
      }
      speedWidgetBoundContainer?.removeEventListener('mouseenter', showSpeedWidget);
      speedWidgetBoundContainer?.removeEventListener('mouseleave', hideSpeedWidget);
      speedWidgetBoundContainer = container;
      container.addEventListener('mouseenter', showSpeedWidget);
      container.addEventListener('mouseleave', hideSpeedWidget);
    };

    const updateSpeedWidget = () => {
      speedWidgetLabel.textContent = activeVideo
        ? formatWidgetSpeed(activeVideo.playbackRate)
        : '-';
    };

    // Same user-intent path as the popup stepper and keyboard shortcuts: mark
    // intent first so handleRateChange persists the change as a channel
    // override instead of reading it as player-init noise.
    const changeSpeedWithIntent = (delta: number) => {
      if (!activeVideo) {
        return;
      }
      const next = Math.min(
        SPEED_MAX,
        Math.max(SPEED_MIN, Math.round((activeVideo.playbackRate + delta) * 10) / 10),
      );
      if (Math.abs(next - activeVideo.playbackRate) < 0.001) {
        return;
      }
      lastUserIntentAt = Date.now();
      applyPlaybackRate(activeVideo, next);
    };

    const openOptionsPage = () => {
      // runtime.openOptionsPage is not exposed to content scripts; ask the
      // background script to open it instead.
      const root = globalThis as typeof globalThis & {
        browser?: { runtime?: { sendMessage?: (message: any) => Promise<any> } };
        chrome?: { runtime?: { sendMessage?: (message: any, callback?: () => void) => void } };
      };
      try {
        if (root.browser?.runtime?.sendMessage) {
          void root.browser.runtime
            .sendMessage({ type: 'speed-master:open-options' })
            .catch(() => {});
          return;
        }
        root.chrome?.runtime?.sendMessage?.({ type: 'speed-master:open-options' }, () => {
          // Read lastError to keep Chrome from logging an unchecked error when
          // the background worker is momentarily unreachable.
          void (root.chrome as any)?.runtime?.lastError;
        });
      } catch {
        // Options page is auxiliary; a failure here is not worth surfacing.
      }
    };

    speedWidgetGear.addEventListener('click', openOptionsPage);
    speedWidgetMinus.addEventListener('click', () => changeSpeedWithIntent(-0.1));
    speedWidgetPlus.addEventListener('click', () => changeSpeedWithIntent(0.1));

    const ensureSpeedWidget = () => {
      if (!isManagedVideoPage()) {
        return;
      }
      ensureWidgetStyles();
      const container = document.querySelector<HTMLElement>(PLAYER_CONTAINER_SELECTOR);
      if (!container) {
        return;
      }
      bindSpeedWidgetContainer(container);
      if (speedWidgetRoot.parentElement === container) {
        return;
      }
      container.appendChild(speedWidgetRoot);
      updateSpeedWidget();
    };

    const applyWidgetSettings = async () => {
      const config = await getConfig();
      speedWidgetRoot.classList.toggle('smw--off', !config.global.showVideoWidget);
      speedWidgetRoot.classList.toggle(
        'smw--left',
        config.global.videoWidgetPosition === 'topLeft',
      );
    };

    const handleVideoMetadata = () => {
      if (activeVideo) {
        void applySpeedForVideo(activeVideo);
        window.setTimeout(() => {
          void applyPreferredQuality();
        }, QUALITY_APPLY_DELAY_MS);
      }
    };

    let lastQualityApply: { videoId: string | null; quality: string } | null = null;

    // Bilibili marks quality menu entries with numeric data-value codes
    // (80=1080P, 116=1080P60, 64=720P, 32=480P, 16=360P); prefer the
    // non-premium entry for each level.
    const QUALITY_CODES: Record<string, string[]> = {
      '1080p': ['80', '116'],
      '720p': ['64'],
      '480p': ['32'],
      '360p': ['16'],
    };

    // Best-effort quality selection: click the matching menu entry once per
    // video. Guarded against loops by the active-state and dedupe checks.
    const applyPreferredQuality = async () => {
      if (!activeVideo || !isManagedVideoPage()) {
        return;
      }

      const config = await getConfig();
      const preferred = config.global.preferredQuality;
      if (!preferred || preferred === 'auto') {
        return;
      }

      const items = Array.from(
        document.querySelectorAll<HTMLElement>(
          '.bpx-player-ctrl-quality-menu-item, .bilibili-player-video-quality-menu .quality-it',
        ),
      );
      if (items.length === 0) {
        return;
      }

      const codes = QUALITY_CODES[preferred] ?? [];
      const target =
        codes
          .map((code) =>
            items.find((item) => (item.getAttribute('data-value') ?? '') === code),
          )
          .find((item) => item) ??
        items.find((item) => {
          const text = (item.textContent ?? '').toLowerCase().replace(/\s+/g, '');
          return text.startsWith(preferred) && !text.includes('大会员');
        });
      if (!target) {
        return;
      }
      if (
        target.classList.contains('bpx-state-active') ||
        target.classList.contains('active')
      ) {
        return;
      }

      const videoId = getVideoIdFromUrl(location.href);
      if (
        lastQualityApply &&
        lastQualityApply.videoId === videoId &&
        lastQualityApply.quality === preferred
      ) {
        return;
      }

      lastQualityApply = { videoId, quality: preferred };
      target.click();
    };

    const flushTimeSaved = async () => {
      if (timeSavedBuffer <= 0) {
        return;
      }
      const delta = timeSavedBuffer;
      timeSavedBuffer = 0;
      // D-1: stats persist to storage.local via the dedicated stats module,
      // no longer through the sync config blob.
      await updateSavedStats((current) => ({
        timeSavedSeconds: current.timeSavedSeconds + delta,
      }));
    };

    const scheduleTimeSaveFlush = () => {
      if (timeSaveTimer !== null) {
        return;
      }
      timeSaveTimer = window.setTimeout(async () => {
        timeSaveTimer = null;
        await flushTimeSaved();
      }, TIME_SAVE_FLUSH_MS);
    };

    const handleTimeUpdate = () => {
      if (!activeVideo) {
        return;
      }
      const currentTime = activeVideo.currentTime;
      // A negative lastPlaybackTime is the sentinel for "just attached or just
      // navigated": establish the baseline instead of counting a fake delta.
      const delta = lastPlaybackTime < 0 ? 0 : currentTime - lastPlaybackTime;
      lastPlaybackTime = currentTime;

      // Deltas larger than a couple of ticks are seeks or media transitions,
      // not playback progress; only rates above 1x actually save time.
      if (
        delta <= 0 ||
        delta > TIME_UPDATE_MAX_DELTA_S ||
        lastPlaybackRate <= 1
      ) {
        return;
      }

      const saved = computeTimeSaved(delta, lastPlaybackRate);
      timeSavedBuffer += saved;
      scheduleTimeSaveFlush();
    };

    const handleNavigationChange = () => {
      lastPlaybackTime = -1;
      syncManagedVideo();
      ensureSpeedWidget();
      if (activeVideo) {
        void applySpeedForVideo(activeVideo);
      }
      ensureChannelResolved();
      void recordChannelVisit();
    };

    const detachVideo = () => {
      if (!activeVideo) {
        return;
      }

      activeVideo.removeEventListener('ratechange', handleRateChange);
      activeVideo.removeEventListener('ratechange', notifyPorts);
      activeVideo.removeEventListener('ratechange', updateSpeedWidget);
      activeVideo.removeEventListener('loadedmetadata', handleVideoMetadata);
      activeVideo.removeEventListener('play', handleVideoMetadata);
      activeVideo.removeEventListener('emptied', handleVideoMetadata);
      activeVideo.removeEventListener('loadstart', markMediaLoadGuard);
      activeVideo.removeEventListener('timeupdate', handleTimeUpdate);
      activeVideo.removeEventListener('pause', flushTimeSaved);
      activeVideo = null;
      clearProgrammaticRate();
      lastPlaybackTime = -1;
      void flushTimeSaved();
      updateSpeedWidget();
      notifyPorts();
    };

    const syncManagedVideo = () => {
      const video = findVideo();
      if (video && isManagedVideoPage()) {
        attachVideo(video);
        return;
      }
      detachVideo();
    };

    const attachVideo = (video: HTMLVideoElement) => {
      if (activeVideo === video) {
        return;
      }

      if (activeVideo) {
        detachVideo();
      }

      activeVideo = video;
      lastPlaybackTime = -1;
      lastPlaybackRate = video.playbackRate;
      activeVideo.addEventListener('ratechange', handleRateChange);
      activeVideo.addEventListener('ratechange', notifyPorts);
      activeVideo.addEventListener('ratechange', updateSpeedWidget);
      activeVideo.addEventListener('loadedmetadata', handleVideoMetadata);
      activeVideo.addEventListener('play', handleVideoMetadata);
      activeVideo.addEventListener('emptied', handleVideoMetadata);
      activeVideo.addEventListener('loadstart', markMediaLoadGuard);
      activeVideo.addEventListener('timeupdate', handleTimeUpdate);
      activeVideo.addEventListener('pause', flushTimeSaved);
      void applySpeedForVideo(activeVideo);
      ensureChannelResolved();
      void recordChannelVisit();
      updateSpeedWidget();
      notifyPorts();
    };

    const observer = new MutationObserver(() => {
      syncManagedVideo();
    });

    const runtimeOnMessage = (() => {
      const root = globalThis as typeof globalThis & {
        browser?: { runtime?: { onMessage?: { addListener: Function } } };
        chrome?: { runtime?: { onMessage?: { addListener: Function } } };
      };
      return root.browser?.runtime?.onMessage ?? root.chrome?.runtime?.onMessage ?? null;
    })();

    if (runtimeOnMessage) {
      runtimeOnMessage.addListener((message: any, _sender: any, sendResponse: any) => {
        if (message?.type === 'speed-master:get-current-speed') {
          sendResponse({ speed: activeVideo?.playbackRate ?? null });
        }
        if (message?.type === 'speed-master:set-current-speed') {
          if (activeVideo && typeof message.speed === 'number') {
            lastUserIntentAt = Date.now();
            applyPlaybackRate(activeVideo, message.speed);
          }
          sendResponse({ ok: Boolean(activeVideo) });
        }
        if (message?.type === 'speed-master:get-current-channel') {
          // Resolve the authoritative channel for /video/ pages so the popup
          // never shows the previous video's channel during SPA lag.
          const videoId = getVideoIdFromUrl(location.href);
          void (videoId
            ? resolveChannel(videoId)
            : Promise.resolve(getCurrentChannel())
          ).then((channel) => {
            sendResponse({ channel: channel ?? null });
          });
          return true;
        }
      });
    }

    const connectedPorts = new Set<any>();

    const notifyPorts = () => {
      for (const port of connectedPorts) {
        port.postMessage({
          type: 'speed-master:current-speed',
          speed: activeVideo?.playbackRate ?? null,
        });
      }
    };

    const runtimeOnConnect = (() => {
      const root = globalThis as typeof globalThis & {
        browser?: { runtime?: { onConnect?: { addListener: Function } } };
        chrome?: { runtime?: { onConnect?: { addListener: Function } } };
      };
      return root.browser?.runtime?.onConnect ?? root.chrome?.runtime?.onConnect ?? null;
    })();

    if (runtimeOnConnect) {
      runtimeOnConnect.addListener((port: any) => {
        if (port?.name !== 'speed-master:popup') {
          return;
        }

        port.onMessage.addListener((message: any) => {
          if (message?.type === 'speed-master:request-current-speed') {
            notifyPorts();
          }
          if (message?.type === 'speed-master:set-current-speed') {
            if (activeVideo && typeof message.speed === 'number') {
              lastUserIntentAt = Date.now();
              applyPlaybackRate(activeVideo, message.speed);
            }
          }
        });

        connectedPorts.add(port);
        notifyPorts();

        port.onDisconnect.addListener(() => {
          connectedPorts.delete(port);
        });
      });
    }

    const isEditableTarget = (target: EventTarget | null) => {
      if (!(target instanceof HTMLElement)) {
        return false;
      }
      const tag = target.tagName.toLowerCase();
      return (
        tag === 'input' ||
        tag === 'textarea' ||
        tag === 'select' ||
        target.isContentEditable
      );
    };

    const consume = (event: KeyboardEvent) => {
      // The capture-phase listener runs before Bilibili's own player handlers;
      // stopping propagation keeps a handled key from also being acted on by
      // the player (a double play/pause toggle cancels itself out).
      event.preventDefault();
      event.stopImmediatePropagation();
    };

    const handleKeydown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.altKey || event.metaKey) {
        return;
      }
      // Keys pressed while a widget control has focus belong to the widget
      // (e.g. Space would otherwise both activate the button and toggle play).
      if (event.target instanceof Element && event.target.closest(`.${WIDGET_CLASS}`)) {
        return;
      }
      if (!activeVideo || !isManagedVideoPage() || isEditableTarget(event.target)) {
        return;
      }

      const key = event.key;
      const code = event.code;

      if (key === ' ' || key === 'k') {
        consume(event);
        togglePlay(activeVideo);
        return;
      }

      if (key === 'm') {
        consume(event);
        activeVideo.muted = !activeVideo.muted;
        return;
      }

      if (key === 'j') {
        consume(event);
        seekBy(activeVideo, -SEEK_STEP_LARGE);
        return;
      }

      if (key === 'l') {
        consume(event);
        seekBy(activeVideo, SEEK_STEP_LARGE);
        return;
      }

      if (key === 'ArrowLeft') {
        consume(event);
        seekBy(activeVideo, -SEEK_STEP_SMALL);
        return;
      }

      if (key === 'ArrowRight') {
        consume(event);
        seekBy(activeVideo, SEEK_STEP_SMALL);
        return;
      }

      if (key === 'ArrowUp') {
        consume(event);
        activeVideo.volume = Math.min(1, activeVideo.volume + VOLUME_STEP);
        return;
      }

      if (key === 'ArrowDown') {
        consume(event);
        activeVideo.volume = Math.max(0, activeVideo.volume - VOLUME_STEP);
        return;
      }

      if (key === 'Home') {
        consume(event);
        activeVideo.currentTime = 0;
        return;
      }

      if (key === 'End') {
        consume(event);
        if (Number.isFinite(activeVideo.duration)) {
          activeVideo.currentTime = activeVideo.duration;
        }
        return;
      }

      if (key === '.' && activeVideo.paused) {
        consume(event);
        seekBy(activeVideo, FRAME_STEP);
        return;
      }

      if (key === ',' && activeVideo.paused) {
        consume(event);
        seekBy(activeVideo, -FRAME_STEP);
        return;
      }

      if (key === '>' || key === '<') {
        consume(event);
        lastUserIntentAt = Date.now();
        const delta = key === '>' ? KEYBOARD_SPEED_STEP : -KEYBOARD_SPEED_STEP;
        applyPlaybackRate(activeVideo, activeVideo.playbackRate + delta);
        return;
      }

      if (key === 'f') {
        consume(event);
        toggleFullscreen(activeVideo);
        return;
      }

      if (key === 'c') {
        consume(event);
        toggleCaptions(activeVideo);
        return;
      }

      if (key === 'i') {
        consume(event);
        const clicked = clickPlayerButton([
          '.bpx-player-ctrl-pip',
          '.bilibili-player-video-btn-pip',
          '.bpx-player-ctrl-miniplayer',
          '.bilibili-player-video-btn-miniplayer',
        ]);
        if (!clicked && document.pictureInPictureElement !== activeVideo) {
          void activeVideo.requestPictureInPicture?.();
        }
        return;
      }

      if (event.shiftKey && key === 'N') {
        consume(event);
        clickPlayerButton(['.bpx-player-ctrl-next', '.bilibili-player-video-btn-next']);
        return;
      }

      if (event.shiftKey && key === 'P') {
        consume(event);
        clickPlayerButton(['.bpx-player-ctrl-prev', '.bilibili-player-video-btn-prev']);
        return;
      }

      if (key === '/') {
        consume(event);
        focusSearch();
        return;
      }

      if (key >= '0' && key <= '9') {
        consume(event);
        const number = Number(key);
        const percent = number === 0 ? 0 : number / 10;
        seekToPercent(activeVideo, percent);
        return;
      }

      if (code === 'MediaPlayPause') {
        togglePlay(activeVideo);
        return;
      }

      if (code === 'MediaStop') {
        activeVideo.pause();
        activeVideo.currentTime = 0;
        return;
      }

      if (code === 'MediaTrackNext') {
        clickPlayerButton(['.bpx-player-ctrl-next', '.bilibili-player-video-btn-next']);
      }
    };

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });

    syncManagedVideo();
    ensureSpeedWidget();
    void applyWidgetSettings();

    window.addEventListener('keydown', handleKeydown, true);

    document.addEventListener('pointerdown', (event) => {
      const target = event.target;
      if (target instanceof Element && target.closest(SPEED_CONTROL_SELECTOR)) {
        lastUserIntentAt = Date.now();
      }
    }, true);

    const storageOnChanged = (() => {
      const root = globalThis as typeof globalThis & {
        browser?: { storage?: { onChanged?: { addListener: Function } } };
        chrome?: { storage?: { onChanged?: { addListener: Function } } };
      };
      return root.browser?.storage?.onChanged ?? root.chrome?.storage?.onChanged ?? null;
    })();

    if (storageOnChanged) {
      storageOnChanged.addListener((changes: Record<string, any>, areaName: string) => {
        // Deliberately sync-only (D-1): local-area stats writes must never
        // re-trigger the applySpeedForVideo/applyPreferredQuality chain.
        // D-2: observe the two split keys; the legacy merged key is not
        // watched (nothing writes it anymore after the first split write).
        if (
          areaName !== 'sync' ||
          (!changes?.[GLOBAL_STORAGE_KEY] && !changes?.[CHANNELS_STORAGE_KEY])
        ) {
          return;
        }
        // No loop: our own writes fire this listener, applySpeedForVideo
        // re-applies the target rate, and the programmaticRate marker (set
        // before applyPlaybackRate) makes handleRateChange swallow the
        // resulting ratechange events instead of persisting them — same
        // absorption as before the key split.
        void applyWidgetSettings();
        if (activeVideo) {
          void applySpeedForVideo(activeVideo);
          void applyPreferredQuality();
        }
      });
    }

    const hookHistory = () => {
      const history = window.history as History & {
        _speedMasterPatched?: boolean;
      };
      if (history._speedMasterPatched) {
        return;
      }
      history._speedMasterPatched = true;

      const wrap = (method: 'pushState' | 'replaceState') => {
        const original = history[method];
        history[method] = function (...args: Parameters<History['pushState']>) {
          const result = original.apply(this, args);
          handleNavigationChange();
          return result;
        };
      };

      wrap('pushState');
      wrap('replaceState');
    };

    hookHistory();
    window.addEventListener('popstate', handleNavigationChange);

    urlPoller = window.setInterval(() => {
      if (location.href !== lastUrl) {
        lastUrl = location.href;
        handleNavigationChange();
      }
    }, URL_POLL_INTERVAL_MS);

    const flushBufferedStats = () => {
      // D-2: a pending debounced channel-override write flushes here alongside
      // the buffered stats, so it survives pagehide / visibilitychange hidden
      // / beforeunload.
      flushPendingRatePersist();
      void flushTimeSaved();
    };

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        flushBufferedStats();
      }
    });
    window.addEventListener('pagehide', flushBufferedStats);

    window.addEventListener('beforeunload', () => {
      window.removeEventListener('keydown', handleKeydown, true);
      window.removeEventListener('popstate', handleNavigationChange);
      if (urlPoller !== null) {
        window.clearInterval(urlPoller);
        urlPoller = null;
      }
      flushBufferedStats();
    });
  },
});
