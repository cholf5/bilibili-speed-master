// D-14 module split (logic verbatim from entrypoints/content.ts): channel
// identity for /video/ pages — DOM / __INITIAL_STATE__ fallback detection plus
// the authoritative view-API resolution and its gating (an SPA transition must
// never persist the previous video's channel while detection lags).

import { updateConfigIfChanged } from '@/src/content/config-writes';
import type { ContentContext } from '@/src/content/context';
import {
  getVideoIdFromUrl,
  normalizeAvatarUrl,
  sanitizeChannelName,
  type ChannelInfo,
} from '@/src/shared/video';

// SPA transitions swap the media seconds before the DOM's UP link updates, so
// channel identity for /video/ pages is resolved authoritatively from the view
// API (keyed by the URL's video id, which updates together with the media).
const VIEW_API_URL = 'https://api.bilibili.com/x/web-interface/view';

export const isManagedVideoPage = (): boolean => {
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

export const setupChannelDetect = (ctx: ContentContext): void => {
  const authoritativeChannels = new Map<string, ChannelInfo>();
  const pendingResolves = new Map<string, Promise<ChannelInfo | null>>();
  let lastChannelId: string | null = null;
  let lastVideoId: string | null = null;

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
    if (!ctx.activeVideo || getVideoIdFromUrl(location.href) !== videoId) {
      return;
    }
    if (ctx.appliedForVideoId === videoId) {
      const rateIsOurs =
        ctx.appliedRate !== null &&
        Math.abs(ctx.activeVideo.playbackRate - ctx.appliedRate) < 0.001;
      if (rateIsOurs) {
        void ctx.applySpeedForVideo(ctx.activeVideo);
      } else {
        void ctx.handleRateChange();
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

    // The queued write's internal read can reject (e.g. invalidated
    // extension context); the visit is best-effort. Markers still advance
    // so a dead context does not retry this write on every later event.
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
    }).catch(() => {});

    lastChannelId = channel.channelId;
    lastVideoId = currentVideoId;
  };

  ctx.getAuthoritativeChannel = getAuthoritativeChannel;
  ctx.getCurrentChannel = getCurrentChannel;
  ctx.resolveChannel = resolveChannel;
  ctx.ensureChannelResolved = ensureChannelResolved;
  ctx.recordChannelVisit = recordChannelVisit;
};
