import { getConfig, updateConfig } from '@/src/shared/config';

const SPEED_APPLY_GRACE_MS = 150;
const URL_POLL_INTERVAL_MS = 800;

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

  video.playbackRate = speed;
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
      }

      activeVideo = video;
      activeVideo.addEventListener('ratechange', handleRateChange);
      activeVideo.addEventListener('loadedmetadata', handleVideoMetadata);
      activeVideo.addEventListener('play', handleVideoMetadata);
      void applySpeedForVideo(activeVideo);
    };

    const observer = new MutationObserver(() => {
      const video = findVideo();
      if (video) {
        attachVideo(video);
      }
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });

    const initialVideo = findVideo();
    if (initialVideo) {
      attachVideo(initialVideo);
    }

    urlPoller = window.setInterval(() => {
      if (location.href !== lastUrl) {
        lastUrl = location.href;
        handleNavigationChange();
      }
    }, URL_POLL_INTERVAL_MS);

    window.addEventListener('beforeunload', () => {
      if (urlPoller !== null) {
        window.clearInterval(urlPoller);
        urlPoller = null;
      }
    });
  },
});
