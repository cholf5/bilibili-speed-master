// Copyright (c) 2026 cholf5
//
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at https://mozilla.org/MPL/2.0/.
// D-14 module split (logic verbatim from entrypoints/content.ts): speed
// mediation — the programmaticRate marker (absorbs the double ratechange our
// own apply fires), the appliedRate/appliedForVideoId bookkeeping read by the
// resolve reconciler, the media-load / player-init gating, the debounced
// channel-override persistence, and the preferred-quality applier.

import type { ContentContext } from '@/src/content/context';
import { updateConfigIfChanged } from '@/src/content/config-writes';
import { isManagedVideoPage } from '@/src/content/channel-detect';
import { SPEED_MAX, SPEED_MIN } from '@/src/shared/speed';
import { getVideoIdFromUrl, type ChannelInfo } from '@/src/shared/video';

const MEDIA_LOAD_GUARD_MS = 500;
// Bilibili's player can re-apply its own globally remembered speed seconds
// after a video starts (outside the 500ms media-load guard); unexplained rate
// changes in this window are treated as player init, not user intent.
const PLAYER_INIT_GRACE_MS = 6000;
const USER_INTENT_WINDOW_MS = 2000;
const QUALITY_APPLY_DELAY_MS = 1200;
// D-2: persisting the channel override is trailing-debounced so a slider
// drag (one ratechange per frame) coalesces into a single storage write
// carrying the final rate. Only THIS persistence is debounced: the gating
// above, the programmaticRate marking, and the player-init re-assert path
// still run on every event. The channel/speed captured here were already
// validated by that gating, so the flush persists exactly the last
// validated decision.
const RATE_PERSIST_DEBOUNCE_MS = 300;

export const applyPlaybackRate = (video: HTMLVideoElement, speed: number): void => {
  if (Number.isNaN(speed) || speed <= 0) {
    return;
  }

  const clamped = Math.min(SPEED_MAX, Math.max(SPEED_MIN, speed));
  // defaultPlaybackRate makes the browser land on our target speed whenever it
  // resets playbackRate during a media load (e.g. autoplaying the next video).
  video.defaultPlaybackRate = clamped;
  video.playbackRate = clamped;
};

// Bilibili marks quality menu entries with numeric data-value codes
// (80=1080P, 116=1080P60, 64=720P, 32=480P, 16=360P); prefer the
// non-premium entry for each level.
const QUALITY_CODES: Record<string, string[]> = {
  '1080p': ['80', '116'],
  '720p': ['64'],
  '480p': ['32'],
  '360p': ['16'],
};

export const setupSpeedCore = (ctx: ContentContext): void => {
  let programmaticRate: number | null = null;
  let programmaticRateTimer: number | null = null;
  let mediaLoadGuardUntil = 0;
  let playerInitUntil = 0;
  let ratePersistTimer: number | null = null;
  let runPendingRatePersist: (() => void) | null = null;
  let lastQualityApply: { videoId: string | null; quality: string } | null = null;

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

  // Tab-close safety net: a pending debounced write must not die with the
  // page — changing the speed and closing the tab right away would lose the
  // override. Mounted alongside the stats flush on visibilitychange hidden
  // / pagehide / beforeunload (see flushBufferedStats in the assembly).
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
      // The queued write's internal read can reject (e.g. invalidated
      // extension context after an update); persistence is best-effort and
      // config.ts already warns on actual write failures, so swallow here.
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
      }).catch(() => {});
    };
    if (ratePersistTimer !== null) {
      window.clearTimeout(ratePersistTimer);
    }
    ratePersistTimer = window.setTimeout(flushPendingRatePersist, RATE_PERSIST_DEBOUNCE_MS);
  };

  const handleRateChange = async () => {
    if (!ctx.activeVideo) {
      return;
    }

    ctx.lastPlaybackRate = ctx.activeVideo.playbackRate;

    if (
      programmaticRate !== null &&
      Math.abs(ctx.activeVideo.playbackRate - programmaticRate) < 0.001
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
    if (getVideoIdFromUrl(location.href) && !ctx.getAuthoritativeChannel()) {
      return;
    }

    const channel = ctx.getCurrentChannel();
    if (!channel) {
      return;
    }

    // Inside the player-init window an unexplained rate change is Bilibili's
    // own doing (e.g. restoring its globally remembered speed), not user
    // intent: it must neither overwrite the channel override nor be
    // persisted as one, so re-assert the target speed instead. Changes
    // through the player's speed control set lastUserIntentAt and pass.
    const userIntentRecent = Date.now() - ctx.lastUserIntentAt < USER_INTENT_WINDOW_MS;
    if (!userIntentRecent && Date.now() < playerInitUntil) {
      void ctx.applySpeedForVideo(ctx.activeVideo);
      return;
    }

    const currentSpeed = ctx.activeVideo.playbackRate;
    scheduleRatePersist(channel, currentSpeed);
  };

  const applySpeedForVideo = async (video: HTMLVideoElement) => {
    // D-6: read through the memory cache. loadedmetadata / play / emptied
    // fire this on every media swap, so it must not re-read storage.sync.
    const config = await ctx.configCache.read();
    const channel = ctx.getCurrentChannel();
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
    ctx.appliedRate = targetSpeed;
    ctx.appliedForVideoId = getVideoIdFromUrl(location.href);
  };

  const applyPreferredQuality = async () => {
    if (!ctx.activeVideo || !isManagedVideoPage()) {
      return;
    }

    const config = await ctx.configCache.read();
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

  const handleVideoMetadata = () => {
    if (ctx.activeVideo) {
      void applySpeedForVideo(ctx.activeVideo);
      window.setTimeout(() => {
        void applyPreferredQuality();
      }, QUALITY_APPLY_DELAY_MS);
    }
  };

  ctx.markMediaLoadGuard = markMediaLoadGuard;
  ctx.clearProgrammaticRate = clearProgrammaticRate;
  ctx.flushPendingRatePersist = flushPendingRatePersist;
  ctx.applySpeedForVideo = applySpeedForVideo;
  ctx.handleRateChange = handleRateChange;
  ctx.applyPreferredQuality = applyPreferredQuality;
  ctx.handleVideoMetadata = handleVideoMetadata;
};
