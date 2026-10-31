// Copyright (c) 2026 cholf5
//
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at https://mozilla.org/MPL/2.0/.
import { describe, expect, it } from 'vitest';
import { createFrameThrottle, FRAME_THROTTLE_FALLBACK_MS } from '@/src/shared/throttle';

// Injected fakes standing in for requestAnimationFrame and setTimeout. Both
// registries are driven by hand, so the tests pin scheduling semantics without
// a real event loop. fireRegistered() can invoke a callback even after it was
// cleared, simulating the polyfill race where both paths end up firing.
const createFakeFrameEnv = () => {
  let nextHandle = 1;
  const pendingFrames = new Map<number, () => void>();
  const pendingTimers = new Map<number, { callback: () => void; ms: number }>();
  const registered = new Map<number, () => void>();
  const cancelledFrames = new Set<number>();

  return {
    requestFrame: (callback: () => void) => {
      const handle = nextHandle++;
      pendingFrames.set(handle, callback);
      registered.set(handle, callback);
      return handle;
    },
    cancelFrame: (handle: number) => {
      pendingFrames.delete(handle);
      cancelledFrames.add(handle);
    },
    setFallbackTimer: (callback: () => void, ms: number) => {
      const handle = nextHandle++;
      pendingTimers.set(handle, { callback, ms });
      registered.set(handle, callback);
      return handle;
    },
    clearFallbackTimer: (handle: number) => {
      pendingTimers.delete(handle);
    },
    fireFrame: (handle: number) => {
      const callback = pendingFrames.get(handle);
      pendingFrames.delete(handle);
      callback?.();
    },
    fireTimer: (handle: number) => {
      const entry = pendingTimers.get(handle);
      pendingTimers.delete(handle);
      entry?.callback();
    },
    fireRegistered: (handle: number) => {
      registered.get(handle)?.();
    },
    pendingFrameHandles: () => Array.from(pendingFrames.keys()),
    pendingTimerHandles: () => Array.from(pendingTimers.keys()),
    timerRequestLog: () => Array.from(pendingTimers.values()).map((entry) => entry.ms),
    cancelledFrames,
  };
};

describe('createFrameThrottle', () => {
  it('coalesces a burst of schedule calls into a single run per frame', () => {
    const env = createFakeFrameEnv();
    let runs = 0;
    const throttle = createFrameThrottle({ run: () => runs++, ...env });

    throttle.schedule();
    throttle.schedule();
    throttle.schedule();
    expect(runs).toBe(0); // nothing runs synchronously
    expect(env.pendingFrameHandles()).toHaveLength(1); // one cycle, not three

    env.fireFrame(env.pendingFrameHandles()[0]);
    expect(runs).toBe(1);
  });

  it('clears the fallback timer when the frame fires first (foreground tab)', () => {
    const env = createFakeFrameEnv();
    let runs = 0;
    const throttle = createFrameThrottle({ run: () => runs++, ...env });

    throttle.schedule();
    const frame = env.pendingFrameHandles()[0];
    const timer = env.pendingTimerHandles()[0];
    env.fireFrame(frame);
    expect(runs).toBe(1);
    expect(env.pendingTimerHandles()).toHaveLength(0); // fallback disarmed

    // A late/stale firing of the already-cleared timer must not re-run.
    env.fireRegistered(timer);
    expect(runs).toBe(1);
  });

  it('falls back to the timer when rAF never fires (background tab)', () => {
    const env = createFakeFrameEnv();
    let runs = 0;
    const throttle = createFrameThrottle({ run: () => runs++, ...env });

    throttle.schedule();
    const [timer] = env.pendingTimerHandles();
    const [frame] = env.pendingFrameHandles();
    env.fireTimer(timer);
    expect(runs).toBe(1);
    expect(env.cancelledFrames.has(frame)).toBe(true); // stalled frame cancelled

    // When the tab returns to the foreground the cancelled frame must not run.
    expect(env.pendingFrameHandles()).toHaveLength(0);
    env.fireRegistered(frame);
    expect(runs).toBe(1);
  });

  it('arms the fallback timer with the configured timeout', () => {
    const env = createFakeFrameEnv();
    const throttle = createFrameThrottle({ run: () => undefined, timeoutMs: 250, ...env });

    throttle.schedule();
    expect(env.timerRequestLog()).toEqual([250]);
  });

  it('defaults the fallback timeout to the shared constant', () => {
    const env = createFakeFrameEnv();
    const throttle = createFrameThrottle({ run: () => undefined, ...env });

    throttle.schedule();
    expect(env.timerRequestLog()).toEqual([FRAME_THROTTLE_FALLBACK_MS]);
  });

  it('starts a fresh cycle after a completed run (trailing work is not lost)', () => {
    const env = createFakeFrameEnv();
    let runs = 0;
    const throttle = createFrameThrottle({ run: () => runs++, ...env });

    throttle.schedule();
    env.fireFrame(env.pendingFrameHandles()[0]);
    throttle.schedule();
    expect(env.pendingFrameHandles()).toHaveLength(1); // new frame scheduled
    env.fireFrame(env.pendingFrameHandles()[0]);
    expect(runs).toBe(2);
  });

  it('cancel() drops the pending cycle from both paths', () => {
    const env = createFakeFrameEnv();
    let runs = 0;
    const throttle = createFrameThrottle({ run: () => runs++, ...env });

    throttle.schedule();
    const [frame, timer] = [env.pendingFrameHandles()[0], env.pendingTimerHandles()[0]];
    throttle.cancel();
    expect(env.pendingFrameHandles()).toHaveLength(0);
    expect(env.pendingTimerHandles()).toHaveLength(0);

    // Even a stray fire of a handle captured before cancel must not run.
    env.fireRegistered(frame);
    env.fireRegistered(timer);
    expect(runs).toBe(0);
  });

  it('schedule() after cancel() starts a working cycle', () => {
    const env = createFakeFrameEnv();
    let runs = 0;
    const throttle = createFrameThrottle({ run: () => runs++, ...env });

    throttle.cancel(); // cancel with nothing pending is harmless
    throttle.schedule();
    env.fireFrame(env.pendingFrameHandles()[0]);
    expect(runs).toBe(1);
  });
});
