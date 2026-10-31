// Copyright (c) 2026 cholf5
//
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at https://mozilla.org/MPL/2.0/.
// D-6: coalescing scheduler for high-frequency browser callbacks. The
// MutationObserver on Bilibili's documentElement fires for every danmaku /
// comment DOM mutation; this collapses each burst into at most one run per
// animation frame, with a timer fallback for when rAF does not fire.
// Latency profile: at most 1 frame in a foreground tab. In a background tab
// rAF is suspended and the fallback timer is best-effort under Chrome's
// intensive throttling (it can be stretched to roughly one run per minute),
// so a background page converges eventually rather than in real time.

// Wall-clock bound for the fallback path: in a foreground tab rAF normally
// fires within one frame, so the timer only wins when no frames are coming
// (background tab, subject to Chrome intensive throttling) or the main thread
// stalls past this budget.
export const FRAME_THROTTLE_FALLBACK_MS = 100;

export type FrameThrottleOptions = {
  run: () => void;
  // All four timer entry points are injected (not read from globals) so the
  // scheduler stays a pure function of its inputs and is testable in a plain
  // node environment; content.ts binds them to window.
  requestFrame: (callback: () => void) => number;
  cancelFrame: (handle: number) => void;
  setFallbackTimer: (callback: () => void, ms: number) => number;
  clearFallbackTimer: (handle: number) => void;
  timeoutMs?: number;
};

export type FrameThrottle = {
  /** Coalesce into the current or next cycle; a no-op while one is pending. */
  schedule: () => void;
  /**
   * Drop a pending cycle without running. Test / future-diagnostics hook:
   * production code has no caller today (kept intentionally, e.g. for a
   * future observer teardown on beforeunload).
   */
  cancel: () => void;
};

export const createFrameThrottle = (options: FrameThrottleOptions): FrameThrottle => {
  const timeoutMs = options.timeoutMs ?? FRAME_THROTTLE_FALLBACK_MS;
  let scheduled = false;
  let frameHandle: number | null = null;
  let timerHandle: number | null = null;

  const clearHandles = () => {
    if (frameHandle !== null) {
      options.cancelFrame(frameHandle);
      frameHandle = null;
    }
    if (timerHandle !== null) {
      options.clearFallbackTimer(timerHandle);
      timerHandle = null;
    }
  };

  // Exactly-once guard: whichever path fires first cancels the other, but the
  // two can still both run in the same tick with exotic rAF polyfills.
  const runOnce = () => {
    if (!scheduled) {
      return;
    }
    scheduled = false;
    clearHandles();
    options.run();
  };

  return {
    schedule: () => {
      if (scheduled) {
        return;
      }
      scheduled = true;
      // The timer is armed BEFORE the frame: if requestFrame ever invokes its
      // callback synchronously, runOnce finds and clears the already-armed
      // timer instead of leaving it dangling.
      timerHandle = options.setFallbackTimer(runOnce, timeoutMs);
      frameHandle = options.requestFrame(runOnce);
    },
    cancel: () => {
      scheduled = false;
      clearHandles();
    },
  };
};
