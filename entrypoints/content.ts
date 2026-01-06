import { getConfig, updateConfig } from '@/src/shared/config';

const SPEED_APPLY_GRACE_MS = 150;
const URL_POLL_INTERVAL_MS = 800;
const KEYBOARD_SPEED_STEP = 0.25;
const SPEED_MIN = 0.1;
const SPEED_MAX = 4;
const SEEK_STEP_SMALL = 5;
const SEEK_STEP_LARGE = 10;
const VOLUME_STEP = 0.05;
const FRAME_STEP = 1 / 30;
const TIME_SAVE_FLUSH_MS = 3000;

type ChannelInfo = {
  channelId: string;
  channelName: string;
  avatarUrl?: string;
};

const getChannelInfo = (): ChannelInfo | null => {
  const link = document.querySelector<HTMLAnchorElement>(
    'a[href*="//space.bilibili.com/"], a[href^="https://space.bilibili.com/"], a[href^="http://space.bilibili.com/"]',
  );

  if (!link) {
    return null;
  }

  const href = link.getAttribute('href') ?? '';
  const match = href.match(/space\.bilibili\.com\/(\d+)/);
  if (!match) {
    return null;
  }

  const channelName = link.textContent?.trim() || 'Unknown';
  const avatar = link.querySelector('img')?.getAttribute('src') ?? undefined;

  return {
    channelId: match[1],
    channelName,
    avatarUrl: avatar,
  };
};

const applyPlaybackRate = (video: HTMLVideoElement, speed: number): void => {
  if (Number.isNaN(speed) || speed <= 0) {
    return;
  }

  const clamped = Math.min(SPEED_MAX, Math.max(SPEED_MIN, speed));
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
    'input[type="search"], input[placeholder*="search" i], input[name*="search" i], input[name="keyword"]',
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
    let applying = false;
    let applyTimer: number | null = null;
    let lastUrl = location.href;
    let urlPoller: number | null = null;
    let lastPlaybackTime = 0;
    let lastPlaybackRate = 1;
    let timeSavedBuffer = 0;
    let timeSaveTimer: number | null = null;

    const clearApplyTimer = () => {
      if (applyTimer !== null) {
        window.clearTimeout(applyTimer);
        applyTimer = null;
      }
    };

    const markApplying = () => {
      applying = true;
      clearApplyTimer();
      applyTimer = window.setTimeout(() => {
        applying = false;
        applyTimer = null;
      }, SPEED_APPLY_GRACE_MS);
    };

    const handleRateChange = async () => {
      if (!activeVideo || applying) {
        return;
      }

      lastPlaybackRate = activeVideo.playbackRate;

      const channel = getChannelInfo();
      if (!channel) {
        return;
      }

      const currentSpeed = activeVideo.playbackRate;
      await updateConfig((config) => ({
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
      }));
    };

    const applySpeedForVideo = async (video: HTMLVideoElement) => {
      const config = await getConfig();
      const channel = getChannelInfo();
      const channelOverride =
        channel?.channelId ? config.channels[channel.channelId] : undefined;
      const targetSpeed = channelOverride?.speed ?? config.global.defaultSpeed;

      markApplying();
      applyPlaybackRate(video, targetSpeed);

      if (channelOverride && channel?.channelId) {
        await updateConfig((current) => ({
          ...current,
          channels: {
            ...current.channels,
            [channel.channelId]: {
              ...current.channels[channel.channelId],
              channelName: channel.channelName,
              avatarUrl: channel.avatarUrl,
              lastVisit: new Date().toISOString(),
            },
          },
        }));
      }
    };

    const handleVideoMetadata = () => {
      if (activeVideo) {
        void applySpeedForVideo(activeVideo);
      }
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
      const delta = currentTime - lastPlaybackTime;
      lastPlaybackTime = currentTime;

      if (delta <= 0 || lastPlaybackRate <= 1) {
        return;
      }

      const saved = (delta * (lastPlaybackRate - 1)) / lastPlaybackRate;
      timeSavedBuffer += saved;
      scheduleTimeSaveFlush();
    };

    const handleNavigationChange = () => {
      if (activeVideo) {
        void applySpeedForVideo(activeVideo);
      }
    };

    const attachVideo = (video: HTMLVideoElement) => {
      if (activeVideo === video) {
        return;
      }

      if (activeVideo) {
        activeVideo.removeEventListener('ratechange', handleRateChange);
        activeVideo.removeEventListener('loadedmetadata', handleVideoMetadata);
        activeVideo.removeEventListener('play', handleVideoMetadata);
        activeVideo.removeEventListener('timeupdate', handleTimeUpdate);
        void flushTimeSaved();
      }

      activeVideo = video;
      lastPlaybackTime = activeVideo.currentTime;
      lastPlaybackRate = activeVideo.playbackRate;
      activeVideo.addEventListener('ratechange', handleRateChange);
      activeVideo.addEventListener('loadedmetadata', handleVideoMetadata);
      activeVideo.addEventListener('play', handleVideoMetadata);
      activeVideo.addEventListener('timeupdate', handleTimeUpdate);
      void applySpeedForVideo(activeVideo);
    };

    const observer = new MutationObserver(() => {
      const video = findVideo();
      if (video) {
        attachVideo(video);
      }
    });

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

    const handleKeydown = (event: KeyboardEvent) => {
      if (!activeVideo || isEditableTarget(event.target)) {
        return;
      }

      const key = event.key;
      const code = event.code;

      if (key === ' ' || key === 'k') {
        event.preventDefault();
        togglePlay(activeVideo);
        return;
      }

      if (key === 'm') {
        event.preventDefault();
        activeVideo.muted = !activeVideo.muted;
        return;
      }

      if (key === 'j') {
        event.preventDefault();
        seekBy(activeVideo, -SEEK_STEP_LARGE);
        return;
      }

      if (key === 'l') {
        event.preventDefault();
        seekBy(activeVideo, SEEK_STEP_LARGE);
        return;
      }

      if (key === 'ArrowLeft') {
        event.preventDefault();
        seekBy(activeVideo, -SEEK_STEP_SMALL);
        return;
      }

      if (key === 'ArrowRight') {
        event.preventDefault();
        seekBy(activeVideo, SEEK_STEP_SMALL);
        return;
      }

      if (key === 'ArrowUp') {
        event.preventDefault();
        activeVideo.volume = Math.min(1, activeVideo.volume + VOLUME_STEP);
        return;
      }

      if (key === 'ArrowDown') {
        event.preventDefault();
        activeVideo.volume = Math.max(0, activeVideo.volume - VOLUME_STEP);
        return;
      }

      if (key === 'Home') {
        event.preventDefault();
        activeVideo.currentTime = 0;
        return;
      }

      if (key === 'End') {
        event.preventDefault();
        if (Number.isFinite(activeVideo.duration)) {
          activeVideo.currentTime = activeVideo.duration;
        }
        return;
      }

      if (key === '.' && activeVideo.paused) {
        event.preventDefault();
        seekBy(activeVideo, FRAME_STEP);
        return;
      }

      if (key === ',' && activeVideo.paused) {
        event.preventDefault();
        seekBy(activeVideo, -FRAME_STEP);
        return;
      }

      if (key === '>' || key === '<') {
        event.preventDefault();
        const delta = key === '>' ? KEYBOARD_SPEED_STEP : -KEYBOARD_SPEED_STEP;
        applyPlaybackRate(activeVideo, activeVideo.playbackRate + delta);
        return;
      }

      if (key === 'f') {
        event.preventDefault();
        toggleFullscreen(activeVideo);
        return;
      }

      if (key === 'c') {
        event.preventDefault();
        toggleCaptions(activeVideo);
        return;
      }

      if (key === 'i') {
        event.preventDefault();
        clickPlayerButton(['.bpx-player-ctrl-miniplayer', '.bilibili-player-video-btn-miniplayer']);
        return;
      }

      if (event.shiftKey && key === 'N') {
        event.preventDefault();
        clickPlayerButton(['.bpx-player-ctrl-next', '.bilibili-player-video-btn-next']);
        return;
      }

      if (event.shiftKey && key === 'P') {
        event.preventDefault();
        clickPlayerButton(['.bpx-player-ctrl-prev', '.bilibili-player-video-btn-prev']);
        return;
      }

      if (key === '/') {
        event.preventDefault();
        focusSearch();
        return;
      }

      if (key >= '0' && key <= '9') {
        event.preventDefault();
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

    const initialVideo = findVideo();
    if (initialVideo) {
      attachVideo(initialVideo);
    }

    window.addEventListener('keydown', handleKeydown);

    urlPoller = window.setInterval(() => {
      if (location.href !== lastUrl) {
        lastUrl = location.href;
        handleNavigationChange();
      }
    }, URL_POLL_INTERVAL_MS);

    window.addEventListener('beforeunload', () => {
      window.removeEventListener('keydown', handleKeydown);
      if (urlPoller !== null) {
        window.clearInterval(urlPoller);
        urlPoller = null;
      }
      void flushTimeSaved();
    });
  },
});
