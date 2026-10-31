// Copyright (c) 2026 cholf5
//
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at https://mozilla.org/MPL/2.0/.
// D-14 module split (logic verbatim from entrypoints/content.ts): the corner
// widget in the player's top-left/top-right — always expanded, its visibility
// mirrors the player's own controls (fades in on mouseenter of the player
// area, fades out on mouseleave). Lives inside the player container so
// fullscreen and web-fullscreen keep showing it.

import type { ContentContext } from '@/src/content/context';
import { isManagedVideoPage } from '@/src/content/channel-detect';
import { applyPlaybackRate } from '@/src/content/speed-core';
import { SPEED_MAX, SPEED_MIN, formatWidgetSpeed } from '@/src/shared/speed';
import { t } from '@/src/shared/i18n';

export const WIDGET_CLASS = 'speed-master-widget';

const PLAYER_CONTAINER_SELECTOR = '.bpx-player-container, .bilibili-player';

const GEAR_PATH_D =
  'M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.07-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.74,8.87C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.8,11.69,4.8,12s0.02,0.64,0.07,0.94l-2.03,1.58c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.44-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.47-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z';

// Built with createElementNS instead of parsing SVG markup: the web-ext
// linter treats innerHTML and createContextualFragment alike under
// UNSAFE_VAR_ASSIGNMENT, and store reviewers read those reports.
const createGearIcon = (): SVGSVGElement => {
  const SVG_NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  const path = document.createElementNS(SVG_NS, 'path');
  path.setAttribute('d', GEAR_PATH_D);
  svg.appendChild(path);
  return svg;
};

const ensureWidgetStyles = () => {
  if (document.getElementById('speed-master-widget-styles')) {
    return;
  }
  const style = document.createElement('style');
  style.id = 'speed-master-widget-styles';
  style.textContent = `
    .${WIDGET_CLASS} {
      position: absolute;
      top: 12px;
      right: 12px;
      z-index: 9999;
      display: flex;
      align-items: center;
      gap: 4px;
      height: 28px;
      padding: 0 6px;
      border-radius: 14px;
      background: rgba(28, 28, 28, 0.75);
      color: #fff;
      font-size: 13px;
      line-height: 28px;
      opacity: 1;
      transition: opacity 0.2s ease;
      cursor: default;
      pointer-events: auto;
      user-select: none;
    }
    .${WIDGET_CLASS}.smw--left {
      left: 12px;
      right: auto;
    }
    .${WIDGET_CLASS}.smw--covered {
      opacity: 0;
      pointer-events: none;
    }
    .${WIDGET_CLASS}.smw--off {
      display: none;
    }
    .${WIDGET_CLASS} .smw__btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 22px;
      height: 22px;
      border: 0;
      border-radius: 5px;
      background: rgba(255, 255, 255, 0.16);
      color: inherit;
      font: inherit;
      font-weight: 600;
      padding: 0;
      cursor: pointer;
      transition: background 0.15s ease;
    }
    .${WIDGET_CLASS} .smw__btn:hover {
      background: rgba(255, 255, 255, 0.34);
    }
    .${WIDGET_CLASS} .smw__btn:active {
      background: rgba(255, 255, 255, 0.5);
    }
    .${WIDGET_CLASS} .smw__label {
      min-width: 36px;
      text-align: center;
    }
    .${WIDGET_CLASS} .smw__gear svg {
      width: 14px;
      height: 14px;
      fill: currentColor;
      display: block;
    }
  `;
  document.head.appendChild(style);
};

export const setupWidget = (ctx: ContentContext): void => {
  const speedWidgetRoot = document.createElement('div');
  speedWidgetRoot.className = `${WIDGET_CLASS} smw--covered`;
  const speedWidgetGear = document.createElement('button');
  speedWidgetGear.type = 'button';
  speedWidgetGear.className = 'smw__btn smw__gear';
  speedWidgetGear.setAttribute('aria-label', t('widgetOpenSettings'));
  speedWidgetGear.append(createGearIcon());
  const speedWidgetMinus = document.createElement('button');
  speedWidgetMinus.type = 'button';
  speedWidgetMinus.className = 'smw__btn smw__minus';
  speedWidgetMinus.textContent = '−';
  speedWidgetMinus.setAttribute('aria-label', t('widgetDecreaseSpeed'));
  const speedWidgetLabel = document.createElement('span');
  speedWidgetLabel.className = 'smw__label';
  speedWidgetLabel.textContent = '-';
  const speedWidgetPlus = document.createElement('button');
  speedWidgetPlus.type = 'button';
  speedWidgetPlus.className = 'smw__btn smw__plus';
  speedWidgetPlus.textContent = '+';
  speedWidgetPlus.setAttribute('aria-label', t('widgetIncreaseSpeed'));
  speedWidgetRoot.append(speedWidgetGear, speedWidgetMinus, speedWidgetLabel, speedWidgetPlus);

  const showSpeedWidget = () => {
    speedWidgetRoot.classList.remove('smw--covered');
  };

  const hideSpeedWidget = () => {
    speedWidgetRoot.classList.add('smw--covered');
  };

  let speedWidgetBoundContainer: HTMLElement | null = null;

  const bindSpeedWidgetContainer = (container: HTMLElement) => {
    if (speedWidgetBoundContainer === container) {
      return;
    }
    speedWidgetBoundContainer?.removeEventListener('mouseenter', showSpeedWidget);
    speedWidgetBoundContainer?.removeEventListener('mouseleave', hideSpeedWidget);
    speedWidgetBoundContainer = container;
    container.addEventListener('mouseenter', showSpeedWidget);
    container.addEventListener('mouseleave', hideSpeedWidget);
  };

  const updateSpeedWidget = () => {
    speedWidgetLabel.textContent = ctx.activeVideo
      ? formatWidgetSpeed(ctx.activeVideo.playbackRate)
      : '-';
  };

  // Same user-intent path as the popup stepper and keyboard shortcuts: mark
  // intent first so handleRateChange persists the change as a channel
  // override instead of reading it as player-init noise.
  const changeSpeedWithIntent = (delta: number) => {
    if (!ctx.activeVideo) {
      return;
    }
    const next = Math.min(
      SPEED_MAX,
      Math.max(SPEED_MIN, Math.round((ctx.activeVideo.playbackRate + delta) * 10) / 10),
    );
    if (Math.abs(next - ctx.activeVideo.playbackRate) < 0.001) {
      return;
    }
    ctx.lastUserIntentAt = Date.now();
    applyPlaybackRate(ctx.activeVideo, next);
  };

  const openOptionsPage = () => {
    // runtime.openOptionsPage is not exposed to content scripts; ask the
    // background script to open it instead.
    const root = globalThis as typeof globalThis & {
      browser?: { runtime?: { sendMessage?: (message: any) => Promise<any> } };
      chrome?: { runtime?: { sendMessage?: (message: any, callback?: () => void) => void } };
    };
    try {
      if (root.browser?.runtime?.sendMessage) {
        void root.browser.runtime
          .sendMessage({ type: 'speed-master:open-options' })
          .catch(() => {});
        return;
      }
      root.chrome?.runtime?.sendMessage?.({ type: 'speed-master:open-options' }, () => {
        // Read lastError to keep Chrome from logging an unchecked error when
        // the background worker is momentarily unreachable.
        void (root.chrome as any)?.runtime?.lastError;
      });
    } catch {
      // Options page is auxiliary; a failure here is not worth surfacing.
    }
  };

  speedWidgetGear.addEventListener('click', openOptionsPage);
  speedWidgetMinus.addEventListener('click', () => changeSpeedWithIntent(-0.1));
  speedWidgetPlus.addEventListener('click', () => changeSpeedWithIntent(0.1));

  const ensureSpeedWidget = () => {
    if (!isManagedVideoPage()) {
      return;
    }
    ensureWidgetStyles();
    const container = document.querySelector<HTMLElement>(PLAYER_CONTAINER_SELECTOR);
    if (!container) {
      return;
    }
    bindSpeedWidgetContainer(container);
    if (speedWidgetRoot.parentElement === container) {
      return;
    }
    container.appendChild(speedWidgetRoot);
    updateSpeedWidget();
  };

  const applyWidgetSettings = async () => {
    const config = await ctx.configCache.read();
    speedWidgetRoot.classList.toggle('smw--off', !config.global.showVideoWidget);
    speedWidgetRoot.classList.toggle(
      'smw--left',
      config.global.videoWidgetPosition === 'topLeft',
    );
  };

  ctx.updateSpeedWidget = updateSpeedWidget;
  ctx.ensureSpeedWidget = ensureSpeedWidget;
  ctx.applyWidgetSettings = applyWidgetSettings;
};
