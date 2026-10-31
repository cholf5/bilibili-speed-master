// Copyright (c) 2026 cholf5
//
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at https://mozilla.org/MPL/2.0/.
// D-14: assembly only. Channel detection, speed mediation, widget, shortcuts,
// stats, and messaging live in src/content/* (WXT treats every .ts under
// entrypoints/ as an entrypoint, so modules must not live here — D-9 lesson).
// This file creates the single shared ContentContext, runs the module setups,
// and keeps the original main() init sequence (observer start → first video
// sync → widget → event listeners → history hook → url poller → flush hooks)
// in its original order; behavior is unchanged from the pre-split file.

import { getConfig } from '@/src/shared/config';
import { createConfigCache } from '@/src/shared/config-cache';
import { createContentContext } from '@/src/content/context';
import { setupChannelDetect } from '@/src/content/channel-detect';
import { setupSpeedCore } from '@/src/content/speed-core';
import { setupWidget } from '@/src/content/widget';
import { setupStats } from '@/src/content/stats';
import { setupShortcuts } from '@/src/content/shortcuts-glue';
import { setupMessaging } from '@/src/content/messaging';
import { setupVideoLifecycle, startVideoObserver } from '@/src/content/video-lifecycle';

const URL_POLL_INTERVAL_MS = 800;

// The player's own speed control (menu items and the slider live inside this
// container); touching it counts as user intent even though the resulting
// ratechange itself is indistinguishable from Bilibili's automatic restores.
const SPEED_CONTROL_SELECTOR =
  '.bpx-player-ctrl-playbackrate, .bilibili-player-video-btn-speed, .squirtle-speed-select';

export default defineContentScript({
  matches: ['*://*.bilibili.com/*'],
  main() {
    // D-6: content-side config cache. The first read fills it; afterwards
    // applySpeedForVideo / applyWidgetSettings / applyPreferredQuality are
    // served from memory, and storage.onChanged is the ONLY invalidation
    // source (see src/shared/config-cache.ts): sync-area config-key changes
    // patch the cache and trigger a reconciliation reload, while local-area
    // stats traffic is ignored. Writes issued here (channel override, visit
    // records) get no local predictive update — chrome.storage fires
    // onChanged in the writing context too, so every write converges through
    // the same event without write/read races.
    const configCache = createConfigCache(getConfig);
    // Single instance of every cross-module state field and function slot
    // (see src/content/context.ts); module-private state stays in each
    // module's setup closure.
    const ctx = createContentContext(configCache);

    // Module setup: assigns every function slot on the context and registers
    // the module-internal listeners (widget buttons, runtime messaging).
    // Nothing can fire during this synchronous block, so the original
    // definition/side-effect order inside main() is observably preserved.
    setupChannelDetect(ctx);
    setupSpeedCore(ctx);
    setupWidget(ctx);
    setupStats(ctx);
    setupShortcuts(ctx);
    setupMessaging(ctx);
    setupVideoLifecycle(ctx);

    // ---- init sequence: the original main() tail, same order ----
    startVideoObserver(ctx);

    ctx.syncManagedVideo();
    ctx.ensureSpeedWidget();
    void ctx.applyWidgetSettings();

    window.addEventListener('keydown', ctx.handleKeydown, true);

    document.addEventListener('pointerdown', (event) => {
      const target = event.target;
      if (target instanceof Element && target.closest(SPEED_CONTROL_SELECTOR)) {
        ctx.lastUserIntentAt = Date.now();
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
        // D-6: the config cache filters events itself — sync-area config-key
        // changes patch the cache and start its reconciliation reload, while
        // local-area stats writes (D-1) and unrelated sync keys return false
        // and never reach the apply chain. Writes issued from this context
        // also come back through this event (chrome.storage fires onChanged
        // in the writing context too), so the cache converges on every
        // writer without a local predictive update.
        if (!configCache.handleStorageChanged(changes, areaName)) {
          return;
        }
        // No loop: our own writes fire this listener, applySpeedForVideo
        // re-applies the target rate, and the programmaticRate marker (set
        // before applyPlaybackRate) makes handleRateChange swallow the
        // resulting ratechange events instead of persisting them — same
        // absorption as before the key split.
        void ctx.applyWidgetSettings();
        if (ctx.activeVideo) {
          void ctx.applySpeedForVideo(ctx.activeVideo);
          void ctx.applyPreferredQuality();
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
          ctx.handleNavigationChange();
          return result;
        };
      };

      wrap('pushState');
      wrap('replaceState');
    };

    hookHistory();
    window.addEventListener('popstate', ctx.handleNavigationChange);

    let lastUrl = location.href;
    let urlPoller: number | null = null;
    urlPoller = window.setInterval(() => {
      if (location.href !== lastUrl) {
        lastUrl = location.href;
        ctx.handleNavigationChange();
      }
    }, URL_POLL_INTERVAL_MS);

    const flushBufferedStats = () => {
      // D-2: a pending debounced channel-override write flushes here alongside
      // the buffered stats, so it survives pagehide / visibilitychange hidden
      // / beforeunload.
      ctx.flushPendingRatePersist();
      void ctx.flushTimeSaved();
    };

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        flushBufferedStats();
      }
    });
    window.addEventListener('pagehide', flushBufferedStats);

    window.addEventListener('beforeunload', () => {
      window.removeEventListener('keydown', ctx.handleKeydown, true);
      window.removeEventListener('popstate', ctx.handleNavigationChange);
      if (urlPoller !== null) {
        window.clearInterval(urlPoller);
        urlPoller = null;
      }
      flushBufferedStats();
    });
  },
});
