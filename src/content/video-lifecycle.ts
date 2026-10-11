// D-14 module split (logic verbatim from entrypoints/content.ts): video
// element lifecycle — attach/detach with the exact listener registration
// order, managed-page sync, SPA navigation handling, and the D-6 frame-
// throttled MutationObserver that watches for video mounts.

import type { ContentContext } from '@/src/content/context';
import { isManagedVideoPage } from '@/src/content/channel-detect';
import { createFrameThrottle } from '@/src/shared/throttle';

const findVideo = (): HTMLVideoElement | null => {
  const video = document.querySelector('video');
  return video instanceof HTMLVideoElement ? video : null;
};

export const setupVideoLifecycle = (ctx: ContentContext): void => {
  const detachVideo = () => {
    if (!ctx.activeVideo) {
      return;
    }

    ctx.activeVideo.removeEventListener('ratechange', ctx.handleRateChange);
    ctx.activeVideo.removeEventListener('ratechange', ctx.notifyPorts);
    ctx.activeVideo.removeEventListener('ratechange', ctx.updateSpeedWidget);
    ctx.activeVideo.removeEventListener('loadedmetadata', ctx.handleVideoMetadata);
    ctx.activeVideo.removeEventListener('play', ctx.handleVideoMetadata);
    ctx.activeVideo.removeEventListener('emptied', ctx.handleVideoMetadata);
    ctx.activeVideo.removeEventListener('loadstart', ctx.markMediaLoadGuard);
    ctx.activeVideo.removeEventListener('timeupdate', ctx.handleTimeUpdate);
    ctx.activeVideo.removeEventListener('pause', ctx.flushTimeSaved);
    ctx.activeVideo = null;
    ctx.clearProgrammaticRate();
    ctx.lastPlaybackTime = -1;
    ctx.lastPlaybackWallMs = -1;
    void ctx.flushTimeSaved();
    ctx.updateSpeedWidget();
    ctx.notifyPorts();
  };

  const syncManagedVideo = () => {
    const video = findVideo();
    if (video && isManagedVideoPage()) {
      ctx.attachVideo(video);
      return;
    }
    ctx.detachVideo();
  };

  const attachVideo = (video: HTMLVideoElement) => {
    if (ctx.activeVideo === video) {
      return;
    }

    if (ctx.activeVideo) {
      ctx.detachVideo();
    }

    ctx.activeVideo = video;
    ctx.lastPlaybackTime = -1;
    ctx.lastPlaybackWallMs = -1;
    ctx.lastPlaybackRate = video.playbackRate;
    // Listener registration order is load-bearing: handleRateChange must see
    // the ratechange before notifyPorts broadcasts it and before the widget
    // label re-renders (pre-split behavior, kept verbatim).
    ctx.activeVideo.addEventListener('ratechange', ctx.handleRateChange);
    ctx.activeVideo.addEventListener('ratechange', ctx.notifyPorts);
    ctx.activeVideo.addEventListener('ratechange', ctx.updateSpeedWidget);
    ctx.activeVideo.addEventListener('loadedmetadata', ctx.handleVideoMetadata);
    ctx.activeVideo.addEventListener('play', ctx.handleVideoMetadata);
    ctx.activeVideo.addEventListener('emptied', ctx.handleVideoMetadata);
    ctx.activeVideo.addEventListener('loadstart', ctx.markMediaLoadGuard);
    ctx.activeVideo.addEventListener('timeupdate', ctx.handleTimeUpdate);
    ctx.activeVideo.addEventListener('pause', ctx.flushTimeSaved);
    void ctx.applySpeedForVideo(ctx.activeVideo);
    ctx.ensureChannelResolved();
    void ctx.recordChannelVisit();
    ctx.updateSpeedWidget();
    ctx.notifyPorts();
  };

  const handleNavigationChange = () => {
    ctx.lastPlaybackTime = -1;
    ctx.lastPlaybackWallMs = -1;
    syncManagedVideo();
    ctx.ensureSpeedWidget();
    if (ctx.activeVideo) {
      void ctx.applySpeedForVideo(ctx.activeVideo);
    }
    ctx.ensureChannelResolved();
    void ctx.recordChannelVisit();
  };

  ctx.attachVideo = attachVideo;
  ctx.detachVideo = detachVideo;
  ctx.syncManagedVideo = syncManagedVideo;
  ctx.handleNavigationChange = handleNavigationChange;
};

// D-6: the observer watches the whole documentElement, so danmaku/comment
// churn would run syncManagedVideo (querySelector included) many times per
// second. Coalesce into at most one run per animation frame (foreground:
// ≤1 frame); the 100ms timer fallback covers stalled/background rAF and
// is best-effort there — Chrome intensive throttling can stretch it to
// roughly one run per minute, so background tabs converge eventually
// rather than in real time. Video attach/detach semantics are unchanged —
// only the call frequency is.
//
// Called from the assembly at the exact position where the original main()
// body started observing (after module setup, before the first
// syncManagedVideo call).
export const startVideoObserver = (ctx: ContentContext): void => {
  const scheduleObserverSync = createFrameThrottle({
    run: () => ctx.syncManagedVideo(),
    requestFrame: (callback) => window.requestAnimationFrame(callback),
    cancelFrame: (handle) => window.cancelAnimationFrame(handle),
    setFallbackTimer: (callback, ms) => window.setTimeout(callback, ms),
    clearFallbackTimer: (handle) => window.clearTimeout(handle),
  });

  const observer = new MutationObserver(() => {
    scheduleObserverSync.schedule();
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
};
