// D-14 module split (logic verbatim from entrypoints/content.ts): the keyboard
// shortcut glue — D-16 target exemption, the D-9 action executor (a big switch,
// one case per action id), and the capture-phase keydown handler. Matching,
// defaults, and conflict rules live in src/shared/shortcuts.ts; the DOM action
// primitives the cases invoke live in video-actions.ts. This module is glue
// only.

import type { ContentContext } from '@/src/content/context';
import { isManagedVideoPage } from '@/src/content/channel-detect';
import { applyPlaybackRate } from '@/src/content/speed-core';
import { WIDGET_CLASS } from '@/src/content/widget';
import {
  clickPlayerButton,
  focusSearch,
  seekBy,
  seekToPercent,
  toggleCaptions,
  toggleFullscreen,
  togglePlay,
} from '@/src/content/video-actions';
import {
  DEFAULT_SHORTCUT_ACTIONS,
  matchShortcut,
  type ShortcutActionId,
} from '@/src/shared/shortcuts';
import { KEYBOARD_SPEED_STEP } from '@/src/shared/speed';
import {
  isActivatableTarget,
  isEditableTarget,
  type FocusTargetLike,
} from '@/src/shared/focus-target';

const SEEK_STEP_SMALL = 5;
const SEEK_STEP_LARGE = 10;
const VOLUME_STEP = 0.05;
const FRAME_STEP = 1 / 30;

// D-16: structural descriptor for the pure target classifiers in
// src/shared/focus-target.ts (the node test environment feeds them plain
// objects; here it is built from the live event target).
const getFocusTarget = (target: EventTarget | null): FocusTargetLike | null => {
  if (!(target instanceof HTMLElement)) {
    return null;
  }
  return {
    tagName: target.tagName,
    isContentEditable: target.isContentEditable,
    hasAttribute: (name) => target.hasAttribute(name),
    getAttribute: (name) => target.getAttribute(name),
  };
};

// D-16: focus sitting on a text-entry element OR an activatable control
// (button / a[href] / select / [role="button"]) means the key belongs to
// that element: shortcut matching is skipped entirely (no match, no
// consume) so native activation happens — Space on a focused 点赞 button
// activates it instead of toggling the player (TC1), while focus on
// body / <video> still reaches the shortcuts unchanged (TC2). B 站部分控件
// 是 div+click 且无 role，无法识别，按卡片 Notes 属已知局限。
const isExemptKeyTarget = (target: EventTarget | null): boolean => {
  const focusTarget = getFocusTarget(target);
  if (!focusTarget) {
    return false;
  }
  return isEditableTarget(focusTarget) || isActivatableTarget(focusTarget);
};

const consume = (event: KeyboardEvent) => {
  // The capture-phase listener runs before Bilibili's own player handlers;
  // stopping propagation keeps a handled key from also being acted on by
  // the player (a double play/pause toggle cancels itself out).
  event.preventDefault();
  event.stopImmediatePropagation();
};

export const setupShortcuts = (ctx: ContentContext): void => {
  // D-9: executes a matched action. All the behavior lives in the big
  // switch below (glue only — matching, defaults, and conflict rules are
  // in src/shared/shortcuts.ts); each case reproduces the pre-D-9
  // handleKeydown branch it replaces.
  const runShortcutAction = (actionId: ShortcutActionId, event: KeyboardEvent): void => {
    const video = ctx.activeVideo;
    if (!video) {
      return;
    }
    const def = DEFAULT_SHORTCUT_ACTIONS[actionId];
    // Frame stepping is only defined while paused; when playing, the key
    // falls through unconsumed exactly as the old '.'/',' branches did.
    if (def.pausedOnly && !video.paused) {
      return;
    }
    if (def.consumes) {
      consume(event);
    }

    switch (actionId) {
      case 'togglePlay':
      case 'togglePlaySpace':
      case 'mediaPlayPause':
        togglePlay(video);
        return;
      case 'mediaStop':
        video.pause();
        video.currentTime = 0;
        return;
      case 'toggleMute':
        video.muted = !video.muted;
        return;
      case 'seekBackwardLarge':
        seekBy(video, -SEEK_STEP_LARGE);
        return;
      case 'seekForwardLarge':
        seekBy(video, SEEK_STEP_LARGE);
        return;
      case 'seekBackwardSmall':
        seekBy(video, -SEEK_STEP_SMALL);
        return;
      case 'seekForwardSmall':
        seekBy(video, SEEK_STEP_SMALL);
        return;
      case 'volumeUp':
        video.volume = Math.min(1, video.volume + VOLUME_STEP);
        return;
      case 'volumeDown':
        video.volume = Math.max(0, video.volume - VOLUME_STEP);
        return;
      case 'seekToStart':
        video.currentTime = 0;
        return;
      case 'seekToEnd':
        if (Number.isFinite(video.duration)) {
          video.currentTime = video.duration;
        }
        return;
      case 'stepForward':
        seekBy(video, FRAME_STEP);
        return;
      case 'stepBackward':
        seekBy(video, -FRAME_STEP);
        return;
      case 'speedUp':
      case 'slowDown':
        ctx.lastUserIntentAt = Date.now();
        applyPlaybackRate(
          video,
          video.playbackRate +
            (actionId === 'speedUp' ? KEYBOARD_SPEED_STEP : -KEYBOARD_SPEED_STEP),
        );
        return;
      case 'toggleFullscreen':
        toggleFullscreen(video);
        return;
      case 'toggleCaptions':
        toggleCaptions(video);
        return;
      case 'toggleMiniPlayer': {
        const clicked = clickPlayerButton([
          '.bpx-player-ctrl-pip',
          '.bilibili-player-video-btn-pip',
          '.bpx-player-ctrl-miniplayer',
          '.bilibili-player-video-btn-miniplayer',
        ]);
        if (!clicked && document.pictureInPictureElement !== video) {
          // Rejects when PiP is disabled for the element or another element
          // is already presenting; best-effort like the rest of the shortcuts.
          void video.requestPictureInPicture?.().catch(() => {});
        }
        return;
      }
      case 'nextVideo':
      // Review fix (D-9): the first executor revision dropped this case and
      // silently no-op'ed the MediaTrackNext media key (pre-D-9: clicked the
      // next-track button, unconsumed). Same handler as Shift+N — the
      // consumes flag already differs via the def (media keys pass through).
      case 'mediaTrackNext':
        clickPlayerButton(['.bpx-player-ctrl-next', '.bilibili-player-video-btn-next']);
        return;
      case 'prevVideo':
        clickPlayerButton(['.bpx-player-ctrl-prev', '.bilibili-player-video-btn-prev']);
        return;
      case 'focusSearch':
        focusSearch();
        return;
      case 'seekToPercent0':
      case 'seekToPercent1':
      case 'seekToPercent2':
      case 'seekToPercent3':
      case 'seekToPercent4':
      case 'seekToPercent5':
      case 'seekToPercent6':
      case 'seekToPercent7':
      case 'seekToPercent8':
      case 'seekToPercent9':
        // Digits carry their duration fraction in the def (0 → 0, 1 → 0.1 …).
        seekToPercent(video, def.seekFraction ?? 0);
        return;
    }

    // Compile-time exhaustiveness guard (D-9 review): adding an action to
    // the shared table without a case above fails `pnpm compile` right here
    // (a `default:` branch would defeat the narrowing — don't add one). The
    // runtime counterpart is the source guard in
    // src/shared/shortcuts.test.ts, which fails the suite when any action
    // id has no `case '<id>':` label.
    const exhaustive: never = actionId;
    return exhaustive;
  };

  const handleKeydown = (event: KeyboardEvent) => {
    // IME safety: keys pressed while a composition is in progress belong to
    // the IME, not to the player.
    if (event.isComposing) {
      return;
    }
    // Keys pressed while a widget control has focus belong to the widget
    // (e.g. Space would otherwise both activate the button and toggle play).
    // D-16: widget buttons are native <button>s and are also covered by the
    // activatable-element exemption below; this closest() guard stays as a
    // first-line check for any other (current or future) focusable widget
    // internals. Both paths return unconsumed, so the semantics are
    // identical, not conflicting.
    if (event.target instanceof Element && event.target.closest(`.${WIDGET_CLASS}`)) {
      return;
    }
    if (!ctx.activeVideo || !isManagedVideoPage() || isExemptKeyTarget(event.target)) {
      return;
    }

    // D-9: keydown is a synchronous path — it must not await the async
    // config cache read — so the shortcut table comes from peek(): the
    // DEFAULT bindings until the first read lands, then patched by every
    // storage.onChanged (options remaps reach video pages without reload).
    // Modifier combinations are part of each binding; the old top-level
    // ctrl/alt/meta early return is subsumed by exact modifier matching
    // (default bindings never carry ctrl/alt/meta, so those events still
    // match nothing and fall through unconsumed — same net behavior).
    const actionId = matchShortcut(event, ctx.configCache.peek().global.shortcuts);
    if (actionId) {
      runShortcutAction(actionId, event);
    }
  };

  ctx.handleKeydown = handleKeydown;
};
