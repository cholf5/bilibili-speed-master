// D-14 module split (logic verbatim from entrypoints/content.ts): the
// timeupdate counting path and the buffered time-saved statistics flush
// (storage.local via the shared stats module, D-1/D-12).

import type { ContentContext } from '@/src/content/context';
import { shouldCountPlaybackDelta, updateSavedStats } from '@/src/shared/stats';
import { computeTimeSaved } from '@/src/shared/video';

// Stats live in storage.local (D-1) with no write-ops quota, but the flush is
// still throttled to 30s to keep storage traffic low; pause / visibilitychange
// / pagehide / beforeunload flushes bound the loss window.
const TIME_SAVE_FLUSH_MS = 30000;

export const setupStats = (ctx: ContentContext): void => {
  let timeSavedBuffer = 0;
  let timeSaveTimer: number | null = null;

  const flushTimeSaved = async () => {
    if (timeSavedBuffer <= 0) {
      return;
    }
    const delta = timeSavedBuffer;
    timeSavedBuffer = 0;
    // D-1: stats persist to storage.local via the dedicated stats module,
    // no longer through the sync config blob. The module's internal read
    // can reject (e.g. invalidated extension context); this flush also runs
    // as a raw pause event listener, so the rejection is swallowed here to
    // keep the console clean — best-effort, the next flush may succeed.
    await updateSavedStats((current) => ({
      timeSavedSeconds: current.timeSavedSeconds + delta,
    })).catch(() => {});
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
    if (!ctx.activeVideo) {
      return;
    }
    // D-12: pair the media timestamp with a monotonic wall timestamp so the
    // counting rule can tell playback progress from seeks by proportion
    // (media ≈ wall x rate) instead of a fixed cutoff.
    const nowMs = performance.now();
    const currentTime = ctx.activeVideo.currentTime;
    // A negative lastPlaybackTime is the sentinel for "just attached or just
    // navigated": establish the baseline instead of counting a fake delta.
    const mediaDelta = ctx.lastPlaybackTime < 0 ? 0 : currentTime - ctx.lastPlaybackTime;
    const wallDeltaMs = ctx.lastPlaybackWallMs < 0 ? 0 : nowMs - ctx.lastPlaybackWallMs;
    ctx.lastPlaybackTime = currentTime;
    ctx.lastPlaybackWallMs = nowMs;

    // D-12: count a tick only when the media delta is proportional to the
    // wall-clock time that actually elapsed. The old fixed 2s cutoff
    // discarded legitimate throttled background intervals (muted background
    // tabs get event delivery stretched to ~1/minute, so one tick can
    // carry ~wall x rate of media time). See shouldCountPlaybackDelta in
    // src/shared/stats.ts for the tolerance and fallback rules.
    if (
      !shouldCountPlaybackDelta({
        mediaDeltaS: mediaDelta,
        wallDeltaMs,
        rate: ctx.lastPlaybackRate,
      })
    ) {
      return;
    }

    const saved = computeTimeSaved(mediaDelta, ctx.lastPlaybackRate);
    timeSavedBuffer += saved;
    scheduleTimeSaveFlush();
  };

  ctx.handleTimeUpdate = handleTimeUpdate;
  ctx.flushTimeSaved = flushTimeSaved;
};
