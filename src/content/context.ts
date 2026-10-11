// D-14: the content script's shared kernel. `entrypoints/content.ts` (WXT
// forbids extra .ts files under entrypoints/ — see the D-9 lesson) used to hold
// every mutable state variable in one main() closure; after the module split
// the state that is genuinely cross-module lives in ONE ContentContext object
// created once by main() and passed by reference to every module setup
// function, so the single-instance semantics are preserved exactly: there is
// still exactly one activeVideo, one lastUserIntentAt, one configCache, etc.
// per content-script invocation. State owned and touched by a single module
// stays as a closure variable inside that module (documented at each site).
//
// The function slots below are assigned exactly once by the setupXxx(ctx)
// functions; they are late-bound through ctx at every call site, so slot
// assignment order can never matter (all cross-module recursion goes through
// the context, never through import-time bindings).

import type { ConfigCache } from '@/src/shared/config-cache';
import type { ChannelInfo } from '@/src/shared/video';

export type ContentContext = {
  // ---- shared mutable state (single instance owned by this object) ----

  /** D-6 content-side config cache; created once in main(), read by apply paths. */
  configCache: ConfigCache;
  /** The currently attached media element; null on non-video pages / before attach. */
  activeVideo: HTMLVideoElement | null;
  /**
   * Timestamp of the last speed change that came from a known user path
   * (extension shortcuts, popup stepper, widget buttons, or the player's own
   * speed control); lets handleRateChange tell user intent apart from
   * player-init noise. Written from widget / shortcuts / messaging / the
   * assembly's pointerdown listener, read by speed-core.
   */
  lastUserIntentAt: number;
  /**
   * D-12: media timestamp paired with the monotonic wall timestamp below
   * (performance.now(), NOT Date.now() — system clock jumps must not poison
   * the seek proportion check). -1 shares the "just attached" sentinel.
   * Written by stats (timeupdate) and video-lifecycle (attach/detach resets).
   */
  lastPlaybackTime: number;
  /** Monotonic wall timestamp paired with lastPlaybackTime; same -1 sentinel. */
  lastPlaybackWallMs: number;
  /** Rate observed at the last ratechange/attach; feeds the stats rule. */
  lastPlaybackRate: number;
  /**
   * Speed we last applied programmatically and the video id it was for; lets
   * the resolve reconciler (channel-detect) tell "rate untouched since our
   * provisional apply" apart from "user changed the rate while detection
   * lagged". Written by speed-core, read by channel-detect.
   */
  appliedRate: number | null;
  appliedForVideoId: string | null;

  // ---- function slots (each assigned once by a module setup function) ----

  // channel-detect.ts
  getAuthoritativeChannel: () => ChannelInfo | null;
  getCurrentChannel: () => ChannelInfo | null;
  resolveChannel: (videoId: string) => Promise<ChannelInfo | null>;
  ensureChannelResolved: () => void;
  recordChannelVisit: () => Promise<void>;

  // speed-core.ts
  markMediaLoadGuard: () => void;
  clearProgrammaticRate: () => void;
  applySpeedForVideo: (video: HTMLVideoElement) => Promise<void>;
  handleRateChange: () => Promise<void>;
  flushPendingRatePersist: () => void;
  applyPreferredQuality: () => Promise<void>;
  handleVideoMetadata: () => void;

  // widget.ts
  updateSpeedWidget: () => void;
  ensureSpeedWidget: () => void;
  applyWidgetSettings: () => Promise<void>;

  // stats.ts
  handleTimeUpdate: () => void;
  flushTimeSaved: () => Promise<void>;

  // messaging.ts
  notifyPorts: () => void;

  // shortcuts-glue.ts
  handleKeydown: (event: KeyboardEvent) => void;

  // video-lifecycle.ts
  attachVideo: (video: HTMLVideoElement) => void;
  detachVideo: () => void;
  syncManagedVideo: () => void;
  handleNavigationChange: () => void;
};

export const createContentContext = (configCache: ConfigCache): ContentContext => {
  // The function slots are assigned synchronously right after this call by the
  // setupXxx(ctx) functions imported into entrypoints/content.ts: every slot
  // is in place before main()'s init sequence (observer start, first video
  // sync, listener registration) can reach one, and no browser event can fire
  // inside that synchronous window. The single cast at creation keeps every
  // call site a plain ctx.slot lookup (no optional chaining, which would
  // silently swallow a wiring bug).
  return {
    configCache,
    activeVideo: null,
    lastUserIntentAt: 0,
    lastPlaybackTime: -1,
    lastPlaybackWallMs: -1,
    lastPlaybackRate: 1,
    appliedRate: null,
    appliedForVideoId: null,
  } as ContentContext;
};
