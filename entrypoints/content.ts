import { getConfig, setConfig, updateConfig, STORAGE_KEY } from '@/src/shared/config';

const URL_POLL_INTERVAL_MS = 800;
const KEYBOARD_SPEED_STEP = 0.25;
const SPEED_MIN = 0.1;
const SPEED_MAX = 4;
const SEEK_STEP_SMALL = 5;
const SEEK_STEP_LARGE = 10;
const VOLUME_STEP = 0.05;
const FRAME_STEP = 1 / 30;
const TIME_SAVE_FLUSH_MS = 3000;
const MEDIA_LOAD_GUARD_MS = 500;
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

const sanitizeChannelName = (name?: string | null): string => {
  if (!name) {
    return 'Unknown';
  }
  return name.replace(/\s+\d{4}-\d{2}-\d{2}$/, '').trim() || 'Unknown';
};

const getVideoIdFromUrl = (url: string): string | null => {
  try {
    const parsed = new URL(url);
    const match = parsed.pathname.match(/\/video\/([^/]+)/);
    return match?.[1] ?? null;
  } catch {
    return null;
  }
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

const updateConfigIfChanged = async (
  updater: (current: Awaited<ReturnType<typeof getConfig>>) => Awaited<ReturnType<typeof getConfig>>,
) => {
  const current = await getConfig();
  const next = updater(current);
  if (next === current) {
    return current;
  }
  await setConfig(next);
  return next;
};

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
      await updateConfigIfChanged((config) => {
        const existing = config.channels[channel.channelId];
        if (
          existing &&
          existing.speed === currentSpeed &&
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
              speed: currentSpeed,
              lastVisit: new Date().toISOString(),
            },
          },
        };
      });
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
      await updateConfig((current) => ({
        ...current,
        stats: {
          ...current.stats,
          timeSavedSeconds: current.stats.timeSavedSeconds + delta,
        },
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

      const saved = (delta * (lastPlaybackRate - 1)) / lastPlaybackRate;
      timeSavedBuffer += saved;
      scheduleTimeSaveFlush();
    };

    const handleNavigationChange = () => {
      lastPlaybackTime = -1;
      syncManagedVideo();
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
      activeVideo.addEventListener('loadedmetadata', handleVideoMetadata);
      activeVideo.addEventListener('play', handleVideoMetadata);
      activeVideo.addEventListener('emptied', handleVideoMetadata);
      activeVideo.addEventListener('loadstart', markMediaLoadGuard);
      activeVideo.addEventListener('timeupdate', handleTimeUpdate);
      activeVideo.addEventListener('pause', flushTimeSaved);
      void applySpeedForVideo(activeVideo);
      ensureChannelResolved();
      void recordChannelVisit();
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
        if (areaName !== 'sync' || !changes?.[STORAGE_KEY]) {
          return;
        }
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
