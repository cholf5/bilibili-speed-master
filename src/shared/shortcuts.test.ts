// Copyright (c) 2026 cholf5
//
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at https://mozilla.org/MPL/2.0/.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SHORTCUT_ACTIONS,
  DEFAULT_SHORTCUT_BINDINGS,
  SHORTCUT_ACTION_ORDER,
  bindingEquals,
  captureShortcut,
  cloneDefaultShortcuts,
  findBindingConflict,
  formatShortcutBinding,
  isModifierOnlyKey,
  matchShortcut,
  sanitizeShortcuts,
  type ShortcutActionId,
  type ShortcutBinding,
  type ShortcutBindings,
  type ShortcutEventLike,
} from '@/src/shared/shortcuts';

const makeEvent = (overrides: Partial<ShortcutEventLike> = {}): ShortcutEventLike => ({
  key: '',
  code: '',
  ctrlKey: false,
  altKey: false,
  shiftKey: false,
  metaKey: false,
  ...overrides,
});

// Canonical keydown a binding stands for: the recorded code plus the
// recorded key (falling back to the code) and the recorded modifiers.
const eventFor = (binding: ShortcutBinding): ShortcutEventLike =>
  makeEvent({
    key: binding.key ?? binding.code,
    code: binding.code,
    ctrlKey: binding.ctrl,
    altKey: binding.alt,
    shiftKey: binding.shift,
    metaKey: binding.meta,
  });

const withBinding = (
  id: ShortcutActionId,
  binding: ShortcutBinding | null,
): ShortcutBindings => ({ ...DEFAULT_SHORTCUT_BINDINGS, [id]: binding });

describe('shortcut action table integrity', () => {
  it('lists every action exactly once, in a stable match/display order', () => {
    const ids = Object.keys(DEFAULT_SHORTCUT_ACTIONS) as ShortcutActionId[];
    expect(SHORTCUT_ACTION_ORDER).toEqual(ids);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('gives every action a default binding (none disabled out of the box)', () => {
    for (const id of SHORTCUT_ACTION_ORDER) {
      const binding = DEFAULT_SHORTCUT_BINDINGS[id];
      expect(binding, id).not.toBeNull();
      expect(binding?.code.length, id).toBeGreaterThan(0);
      expect(binding?.code, id).toBe(DEFAULT_SHORTCUT_ACTIONS[id].defaultBinding?.code);
    }
  });

  it('keeps the mirror of the pre-D-9 handleKeydown keymap', () => {
    expect(DEFAULT_SHORTCUT_BINDINGS.togglePlay).toEqual({ code: 'KeyK', key: 'k' });
    expect(DEFAULT_SHORTCUT_BINDINGS.togglePlaySpace).toEqual({ code: 'Space', key: ' ' });
    expect(DEFAULT_SHORTCUT_BINDINGS.toggleMute).toEqual({ code: 'KeyM', key: 'm' });
    expect(DEFAULT_SHORTCUT_BINDINGS.seekBackwardLarge).toEqual({ code: 'KeyJ', key: 'j' });
    expect(DEFAULT_SHORTCUT_BINDINGS.seekForwardLarge).toEqual({ code: 'KeyL', key: 'l' });
    expect(DEFAULT_SHORTCUT_BINDINGS.seekBackwardSmall).toEqual({
      code: 'ArrowLeft',
      key: 'ArrowLeft',
    });
    expect(DEFAULT_SHORTCUT_BINDINGS.seekForwardSmall).toEqual({
      code: 'ArrowRight',
      key: 'ArrowRight',
    });
    expect(DEFAULT_SHORTCUT_BINDINGS.volumeUp).toEqual({ code: 'ArrowUp', key: 'ArrowUp' });
    expect(DEFAULT_SHORTCUT_BINDINGS.volumeDown).toEqual({ code: 'ArrowDown', key: 'ArrowDown' });
    expect(DEFAULT_SHORTCUT_BINDINGS.seekToStart).toEqual({ code: 'Home', key: 'Home' });
    expect(DEFAULT_SHORTCUT_BINDINGS.seekToEnd).toEqual({ code: 'End', key: 'End' });
    expect(DEFAULT_SHORTCUT_BINDINGS.stepForward).toEqual({ code: 'Period', key: '.' });
    expect(DEFAULT_SHORTCUT_BINDINGS.stepBackward).toEqual({ code: 'Comma', key: ',' });
    expect(DEFAULT_SHORTCUT_BINDINGS.speedUp).toEqual({ code: 'Period', key: '>', shift: true });
    expect(DEFAULT_SHORTCUT_BINDINGS.slowDown).toEqual({ code: 'Comma', key: '<', shift: true });
    expect(DEFAULT_SHORTCUT_BINDINGS.toggleFullscreen).toEqual({ code: 'KeyF', key: 'f' });
    expect(DEFAULT_SHORTCUT_BINDINGS.toggleCaptions).toEqual({ code: 'KeyC', key: 'c' });
    expect(DEFAULT_SHORTCUT_BINDINGS.toggleMiniPlayer).toEqual({ code: 'KeyI', key: 'i' });
    expect(DEFAULT_SHORTCUT_BINDINGS.nextVideo).toEqual({ code: 'KeyN', key: 'N', shift: true });
    expect(DEFAULT_SHORTCUT_BINDINGS.prevVideo).toEqual({ code: 'KeyP', key: 'P', shift: true });
    expect(DEFAULT_SHORTCUT_BINDINGS.focusSearch).toEqual({ code: 'Slash', key: '/' });
    expect(DEFAULT_SHORTCUT_BINDINGS.seekToPercent0).toEqual({ code: 'Digit0', key: '0' });
    expect(DEFAULT_SHORTCUT_BINDINGS.seekToPercent9).toEqual({ code: 'Digit9', key: '9' });
    expect(DEFAULT_SHORTCUT_BINDINGS.mediaPlayPause).toEqual({ code: 'MediaPlayPause' });
    expect(DEFAULT_SHORTCUT_BINDINGS.mediaStop).toEqual({ code: 'MediaStop' });
    expect(DEFAULT_SHORTCUT_BINDINGS.mediaTrackNext).toEqual({ code: 'MediaTrackNext' });
    // Behavior flags carried by the def, not the binding: media keys are not
    // swallowed; frame stepping is paused-only; digits carry their fraction.
    expect(DEFAULT_SHORTCUT_ACTIONS.mediaPlayPause.consumes).toBe(false);
    expect(DEFAULT_SHORTCUT_ACTIONS.mediaStop.consumes).toBe(false);
    expect(DEFAULT_SHORTCUT_ACTIONS.mediaTrackNext.consumes).toBe(false);
    for (const id of SHORTCUT_ACTION_ORDER) {
      if (id !== 'mediaPlayPause' && id !== 'mediaStop' && id !== 'mediaTrackNext') {
        expect(DEFAULT_SHORTCUT_ACTIONS[id].consumes, id).toBe(true);
      }
    }
    expect(DEFAULT_SHORTCUT_ACTIONS.stepForward.pausedOnly).toBe(true);
    expect(DEFAULT_SHORTCUT_ACTIONS.stepBackward.pausedOnly).toBe(true);
    expect(DEFAULT_SHORTCUT_ACTIONS.seekToPercent5.seekFraction).toBe(0.5);
    expect(DEFAULT_SHORTCUT_ACTIONS.seekToPercent0.seekFraction).toBe(0);
  });
});

describe('matchShortcut', () => {
  it('matches every default binding via its canonical event', () => {
    for (const id of SHORTCUT_ACTION_ORDER) {
      const binding = DEFAULT_SHORTCUT_BINDINGS[id];
      expect(binding, id).not.toBeNull();
      expect(matchShortcut(eventFor(binding as ShortcutBinding), DEFAULT_SHORTCUT_BINDINGS), id).toBe(
        id,
      );
    }
  });

  it('reproduces the pre-D-9 keydown chain for the default keys', () => {
    const table = DEFAULT_SHORTCUT_BINDINGS;
    expect(matchShortcut(makeEvent({ key: 'k', code: 'KeyK' }), table)).toBe('togglePlay');
    expect(matchShortcut(makeEvent({ key: ' ', code: 'Space' }), table)).toBe('togglePlaySpace');
    expect(matchShortcut(makeEvent({ key: 'm', code: 'KeyM' }), table)).toBe('toggleMute');
    expect(matchShortcut(makeEvent({ key: 'j', code: 'KeyJ' }), table)).toBe('seekBackwardLarge');
    expect(matchShortcut(makeEvent({ key: 'l', code: 'KeyL' }), table)).toBe('seekForwardLarge');
    expect(matchShortcut(makeEvent({ key: 'ArrowLeft', code: 'ArrowLeft' }), table)).toBe(
      'seekBackwardSmall',
    );
    expect(matchShortcut(makeEvent({ key: 'ArrowRight', code: 'ArrowRight' }), table)).toBe(
      'seekForwardSmall',
    );
    expect(matchShortcut(makeEvent({ key: 'ArrowUp', code: 'ArrowUp' }), table)).toBe('volumeUp');
    expect(matchShortcut(makeEvent({ key: 'ArrowDown', code: 'ArrowDown' }), table)).toBe(
      'volumeDown',
    );
    expect(matchShortcut(makeEvent({ key: 'Home', code: 'Home' }), table)).toBe('seekToStart');
    expect(matchShortcut(makeEvent({ key: 'End', code: 'End' }), table)).toBe('seekToEnd');
    expect(matchShortcut(makeEvent({ key: '.', code: 'Period' }), table)).toBe('stepForward');
    expect(matchShortcut(makeEvent({ key: ',', code: 'Comma' }), table)).toBe('stepBackward');
    expect(matchShortcut(makeEvent({ key: '>', code: 'Period', shiftKey: true }), table)).toBe(
      'speedUp',
    );
    expect(matchShortcut(makeEvent({ key: '<', code: 'Comma', shiftKey: true }), table)).toBe(
      'slowDown',
    );
    expect(matchShortcut(makeEvent({ key: 'f', code: 'KeyF' }), table)).toBe('toggleFullscreen');
    expect(matchShortcut(makeEvent({ key: 'c', code: 'KeyC' }), table)).toBe('toggleCaptions');
    expect(matchShortcut(makeEvent({ key: 'i', code: 'KeyI' }), table)).toBe('toggleMiniPlayer');
    expect(matchShortcut(makeEvent({ key: 'N', code: 'KeyN', shiftKey: true }), table)).toBe(
      'nextVideo',
    );
    expect(matchShortcut(makeEvent({ key: 'P', code: 'KeyP', shiftKey: true }), table)).toBe(
      'prevVideo',
    );
    expect(matchShortcut(makeEvent({ key: '/', code: 'Slash' }), table)).toBe('focusSearch');
    for (let digit = 0; digit <= 9; digit += 1) {
      expect(
        matchShortcut(makeEvent({ key: String(digit), code: `Digit${digit}` }), table),
        `Digit${digit}`,
      ).toBe(`seekToPercent${digit}`);
    }
    expect(matchShortcut(makeEvent({ key: 'MediaPlayPause', code: 'MediaPlayPause' }), table)).toBe(
      'mediaPlayPause',
    );
    expect(matchShortcut(makeEvent({ key: 'MediaStop', code: 'MediaStop' }), table)).toBe(
      'mediaStop',
    );
    expect(matchShortcut(makeEvent({ key: 'MediaTrackNext', code: 'MediaTrackNext' }), table)).toBe(
      'mediaTrackNext',
    );
  });

  it('keeps non-matching variants of the default keys unconsumed (null)', () => {
    const table = DEFAULT_SHORTCUT_BINDINGS;
    // Shifted letters are different characters, exactly like the old
    // `key === 'k'` / `key === 'N'` comparisons.
    expect(matchShortcut(makeEvent({ key: 'K', code: 'KeyK', shiftKey: true }), table)).toBeNull();
    expect(matchShortcut(makeEvent({ key: 'n', code: 'KeyN' }), table)).toBeNull();
    expect(matchShortcut(makeEvent({ key: 'p', code: 'KeyP' }), table)).toBeNull();
    // Shifted digits produce punctuation on most layouts.
    expect(matchShortcut(makeEvent({ key: '!', code: 'Digit1', shiftKey: true }), table)).toBeNull();
    // ctrl/alt/meta combinations match nothing (old top-level early return).
    expect(matchShortcut(makeEvent({ key: 'k', code: 'KeyK', ctrlKey: true }), table)).toBeNull();
    expect(matchShortcut(makeEvent({ key: 'k', code: 'KeyK', altKey: true }), table)).toBeNull();
    expect(matchShortcut(makeEvent({ key: 'k', code: 'KeyK', metaKey: true }), table)).toBeNull();
    // Unrelated keys.
    expect(matchShortcut(makeEvent({ key: 'x', code: 'KeyX' }), table)).toBeNull();
    expect(matchShortcut(makeEvent({ key: 'Escape', code: 'Escape' }), table)).toBeNull();
  });

  it('matches by code first, independent of the keyboard layout', () => {
    // Cyrillic layout: the physical J/K/L keys produce different characters.
    expect(matchShortcut(makeEvent({ key: 'Й', code: 'KeyK' }), DEFAULT_SHORTCUT_BINDINGS)).toBe(
      'togglePlay',
    );
    expect(matchShortcut(makeEvent({ key: 'О', code: 'KeyJ' }), DEFAULT_SHORTCUT_BINDINGS)).toBe(
      'seekBackwardLarge',
    );
    expect(
      matchShortcut(
        makeEvent({ key: 'Т', code: 'KeyN', shiftKey: true }),
        DEFAULT_SHORTCUT_BINDINGS,
      ),
    ).toBe('nextVideo');
  });

  it('falls back to the recorded key when the code does not match', () => {
    const table = DEFAULT_SHORTCUT_BINDINGS;
    // Numpad digits share the key but not the code of the top-row digits
    // (the old `key >= '0' && key <= '9'` branch matched them too).
    expect(matchShortcut(makeEvent({ key: '5', code: 'Numpad5' }), table)).toBe('seekToPercent5');
    expect(matchShortcut(makeEvent({ key: '0', code: 'Numpad0' }), table)).toBe('seekToPercent0');
    // Synthetic / legacy events may carry no code at all.
    expect(matchShortcut(makeEvent({ key: 'k' }), table)).toBe('togglePlay');
    expect(matchShortcut(makeEvent({ key: 'N', shiftKey: true }), table)).toBe('nextVideo');
  });

  it('respects modifier combinations recorded in bindings', () => {
    const ctrlJ: ShortcutBinding = { code: 'KeyJ', key: 'j', ctrl: true };
    const table = withBinding('seekBackwardLarge', ctrlJ);
    expect(matchShortcut(makeEvent({ key: 'j', code: 'KeyJ', ctrlKey: true }), table)).toBe(
      'seekBackwardLarge',
    );
    // Without the modifier, or with an extra one, the binding no longer fits.
    expect(matchShortcut(makeEvent({ key: 'j', code: 'KeyJ' }), table)).toBeNull();
    expect(
      matchShortcut(makeEvent({ key: 'j', code: 'KeyJ', ctrlKey: true, altKey: true }), table),
    ).toBeNull();
    // Shift is deliberately ignored on the key-fallback path (module comment:
    // pre-D-9 char comparisons had no shift requirement), so Ctrl+Shift+J
    // still matches the Ctrl+J binding through its key.
    expect(
      matchShortcut(makeEvent({ key: 'j', code: 'KeyJ', ctrlKey: true, shiftKey: true }), table),
    ).toBe('seekBackwardLarge');
    // The code path stays shift-exact: Ctrl+Shift+J's shifted character (or
    // the physical J with Ctrl+Shift held) never matches the Ctrl+J binding
    // through its code — only through the identical key char above.
    expect(
      matchShortcut(makeEvent({ key: 'J', code: 'KeyJ', ctrlKey: true, shiftKey: true }), table),
    ).toBeNull();

    const ctrlAltShiftK: ShortcutBinding = { code: 'KeyK', key: 'k', ctrl: true, alt: true, shift: true };
    const ctrlTable = withBinding('togglePlay', ctrlAltShiftK);
    expect(
      matchShortcut(
        makeEvent({ key: 'K', code: 'KeyK', ctrlKey: true, altKey: true, shiftKey: true }),
        ctrlTable,
      ),
    ).toBe('togglePlay');
    expect(matchShortcut(makeEvent({ key: 'k', code: 'KeyK', ctrlKey: true }), ctrlTable)).toBeNull();

    const metaP: ShortcutBinding = { code: 'KeyP', key: 'p', meta: true };
    const metaTable = withBinding('prevVideo', metaP);
    expect(matchShortcut(makeEvent({ key: 'p', code: 'KeyP', metaKey: true }), metaTable)).toBe(
      'prevVideo',
    );
  });

  it('treats a null (disabled) binding as never matching', () => {
    const table = withBinding('togglePlay', null);
    expect(matchShortcut(makeEvent({ key: 'k', code: 'KeyK' }), table)).toBeNull();
    // Other actions keep working.
    expect(matchShortcut(makeEvent({ key: 'j', code: 'KeyJ' }), table)).toBe('seekBackwardLarge');
  });

  it('never matches an empty event', () => {
    expect(matchShortcut(makeEvent(), DEFAULT_SHORTCUT_BINDINGS)).toBeNull();
  });
});

describe('captureShortcut', () => {
  it('records code plus key and only the held modifiers', () => {
    expect(captureShortcut(makeEvent({ key: 'k', code: 'KeyK' }))).toEqual({
      code: 'KeyK',
      key: 'k',
    });
    expect(captureShortcut(makeEvent({ key: '>', code: 'Period', shiftKey: true }))).toEqual({
      code: 'Period',
      key: '>',
      shift: true,
    });
    expect(
      captureShortcut(makeEvent({ key: 'j', code: 'KeyJ', ctrlKey: true, altKey: true })),
    ).toEqual({ code: 'KeyJ', key: 'j', ctrl: true, alt: true });
    expect(captureShortcut(makeEvent({ key: 'p', code: 'KeyP', metaKey: true }))).toEqual({
      code: 'KeyP',
      key: 'p',
      meta: true,
    });
    expect(
      captureShortcut(makeEvent({ key: 'MediaPlayPause', code: 'MediaPlayPause' })),
    ).toEqual({ code: 'MediaPlayPause', key: 'MediaPlayPause' });
  });

  it('returns null for bare modifier presses and code-less events', () => {
    for (const code of ['ShiftLeft', 'ShiftRight', 'ControlLeft', 'AltRight', 'MetaLeft']) {
      expect(isModifierOnlyKey(code)).toBe(true);
      expect(captureShortcut(makeEvent({ key: 'Shift', code, shiftKey: true }))).toBeNull();
    }
    expect(isModifierOnlyKey('KeyK')).toBe(false);
    expect(captureShortcut(makeEvent({ key: 'k' }))).toBeNull();
  });

  it('round-trips: a captured binding matches the same event again', () => {
    const event = makeEvent({ key: '>', code: 'Period', shiftKey: true });
    const binding = captureShortcut(event);
    expect(binding).not.toBeNull();
    expect(matchShortcut(event, withBinding('speedUp', binding as ShortcutBinding))).toBe('speedUp');
    // ...and does not hijack the plain (unshifted) key.
    expect(matchShortcut(makeEvent({ key: '.', code: 'Period' }), withBinding('speedUp', binding as ShortcutBinding))).toBe(
      'stepForward',
    );
  });
});

describe('findBindingConflict', () => {
  it('finds the enabled action holding the same physical binding', () => {
    const candidate: ShortcutBinding = { code: 'KeyJ', key: 'j' };
    expect(
      findBindingConflict(DEFAULT_SHORTCUT_BINDINGS, 'togglePlay', candidate),
    ).toBe('seekBackwardLarge');
  });

  it('ignores the key string: code + modifiers are the physical identity', () => {
    // Same code, different key label → still the same physical key.
    expect(
      findBindingConflict(DEFAULT_SHORTCUT_BINDINGS, 'togglePlay', { code: 'KeyJ', key: 'x' }),
    ).toBe('seekBackwardLarge');
    // Same key label, different code → no conflict (different physical keys).
    expect(
      findBindingConflict(DEFAULT_SHORTCUT_BINDINGS, 'togglePlay', { code: 'Numpad5', key: '5' }),
    ).toBeNull();
  });

  it('distinguishes bindings by their modifiers', () => {
    // An unshifted Period does not collide with Shift+Period (speedUp); it
    // collides with the unshifted frame-step binding instead.
    expect(
      findBindingConflict(DEFAULT_SHORTCUT_BINDINGS, 'togglePlay', { code: 'Period', key: '>' }),
    ).toBe('stepForward');
    expect(
      findBindingConflict(
        DEFAULT_SHORTCUT_BINDINGS,
        'togglePlay',
        { code: 'Period', key: '.', shift: true },
      ),
    ).toBe('speedUp');
    // Adding a modifier frees the physical chord entirely.
    expect(
      findBindingConflict(
        DEFAULT_SHORTCUT_BINDINGS,
        'togglePlay',
        { code: 'Period', key: '.', shift: true, ctrl: true },
      ),
    ).toBeNull();
  });

  it('excludes the target action itself and disabled actions', () => {
    expect(
      findBindingConflict(DEFAULT_SHORTCUT_BINDINGS, 'togglePlay', { code: 'KeyK', key: 'k' }),
    ).toBeNull();
    const table = withBinding('seekBackwardLarge', null);
    expect(findBindingConflict(table, 'togglePlay', { code: 'KeyJ', key: 'j' })).toBeNull();
  });
});

describe('sanitizeShortcuts', () => {
  it('returns the full default table for absent or garbage input (old data)', () => {
    expect(sanitizeShortcuts(undefined)).toEqual(DEFAULT_SHORTCUT_BINDINGS);
    expect(sanitizeShortcuts(null)).toEqual(DEFAULT_SHORTCUT_BINDINGS);
    expect(sanitizeShortcuts('shortcuts')).toEqual(DEFAULT_SHORTCUT_BINDINGS);
    expect(sanitizeShortcuts(42)).toEqual(DEFAULT_SHORTCUT_BINDINGS);
    expect(sanitizeShortcuts([])).toEqual(DEFAULT_SHORTCUT_BINDINGS);
  });

  it('fills per-action holes with the default binding', () => {
    const merged = sanitizeShortcuts({ togglePlay: { code: 'KeyP', key: 'p' } });
    expect(merged.togglePlay).toEqual({ code: 'KeyP', key: 'p' });
    expect(merged.toggleMute).toEqual(DEFAULT_SHORTCUT_BINDINGS.toggleMute);
    expect(merged.seekToPercent9).toEqual(DEFAULT_SHORTCUT_BINDINGS.seekToPercent9);
    expect(Object.keys(merged).sort()).toEqual(
      Object.keys(DEFAULT_SHORTCUT_BINDINGS).sort(),
    );
  });

  it('keeps null entries (disabled) and valid custom bindings', () => {
    const merged = sanitizeShortcuts({
      togglePlay: null,
      toggleMute: { code: 'KeyQ', key: 'q', shift: true },
      seekToPercent3: { code: 'Digit3', key: '3' },
    });
    expect(merged.togglePlay).toBeNull();
    expect(merged.toggleMute).toEqual({ code: 'KeyQ', key: 'q', shift: true });
    expect(merged.seekToPercent3).toEqual({ code: 'Digit3', key: '3' });
  });

  it('repairs invalid entries with the default binding', () => {
    const merged = sanitizeShortcuts({
      togglePlay: null,
      toggleMute: { code: '' },
      seekBackwardLarge: 'j',
      seekForwardLarge: 42,
      volumeUp: [],
      volumeDown: {},
      seekToStart: { key: 'Home' },
      seekToEnd: { code: 7 },
      nextVideo: { code: 'KeyN', key: 'N', shift: 'yes' },
    });
    expect(merged.togglePlay).toBeNull(); // valid explicit disable survives
    expect(merged.toggleMute).toEqual(DEFAULT_SHORTCUT_BINDINGS.toggleMute);
    expect(merged.seekBackwardLarge).toEqual(DEFAULT_SHORTCUT_BINDINGS.seekBackwardLarge);
    expect(merged.seekForwardLarge).toEqual(DEFAULT_SHORTCUT_BINDINGS.seekForwardLarge);
    expect(merged.volumeUp).toEqual(DEFAULT_SHORTCUT_BINDINGS.volumeUp);
    // {} has no code → default.
    expect(merged.volumeDown).toEqual(DEFAULT_SHORTCUT_BINDINGS.volumeDown);
    // Missing/invalid code falls back to the default, not to a key-only binding.
    expect(merged.seekToStart).toEqual(DEFAULT_SHORTCUT_BINDINGS.seekToStart);
    expect(merged.seekToEnd).toEqual(DEFAULT_SHORTCUT_BINDINGS.seekToEnd);
    // Non-boolean modifier is dropped, the rest of the entry stays.
    expect(merged.nextVideo).toEqual({ code: 'KeyN', key: 'N' });
  });

  it('drops unknown action ids instead of widening the schema', () => {
    const merged = sanitizeShortcuts({
      togglePlay: { code: 'KeyP', key: 'p' },
      turboMode: { code: 'KeyT', key: 't' },
    });
    expect(merged.togglePlay).toEqual({ code: 'KeyP', key: 'p' });
    expect('turboMode' in merged).toBe(false);
    expect(Object.keys(merged).sort()).toEqual(
      Object.keys(DEFAULT_SHORTCUT_BINDINGS).sort(),
    );
  });

  it('is prototype-safe (no __proto__ injection from stored data)', () => {
    const merged = sanitizeShortcuts(
      JSON.parse('{"__proto__": {"code": "KeyX"}, "togglePlay": null}'),
    );
    expect(merged.togglePlay).toBeNull();
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });

  it('never mutates the shared default table', () => {
    const merged = sanitizeShortcuts({ togglePlay: null });
    expect(merged.togglePlay).toBeNull();
    expect(DEFAULT_SHORTCUT_BINDINGS.togglePlay).toEqual({ code: 'KeyK', key: 'k' });
  });
});

describe('cloneDefaultShortcuts', () => {
  it('deep-copies so later edits never leak into the shared defaults', () => {
    const clone = cloneDefaultShortcuts();
    expect(clone).toEqual(DEFAULT_SHORTCUT_BINDINGS);
    expect(clone.togglePlay).not.toBe(DEFAULT_SHORTCUT_BINDINGS.togglePlay);
    clone.togglePlay = null;
    expect(DEFAULT_SHORTCUT_BINDINGS.togglePlay).toEqual({ code: 'KeyK', key: 'k' });
  });
});

describe('bindingEquals', () => {
  it('compares code and modifiers, ignoring the display key', () => {
    expect(bindingEquals({ code: 'KeyK', key: 'k' }, { code: 'KeyK', key: 'K' })).toBe(true);
    expect(bindingEquals({ code: 'KeyK' }, { code: 'KeyK', ctrl: true })).toBe(false);
    expect(bindingEquals({ code: 'KeyK' }, { code: 'KeyK', shift: true })).toBe(false);
    expect(bindingEquals(null, null)).toBe(true);
    expect(bindingEquals(null, { code: 'KeyK' })).toBe(false);
    expect(bindingEquals({ code: 'KeyK' }, null)).toBe(false);
  });
});

describe('formatShortcutBinding', () => {
  it('renders modifiers, printable keys, and code-derived labels', () => {
    expect(formatShortcutBinding({ code: 'KeyK', key: 'k' })).toBe('K');
    expect(formatShortcutBinding({ code: 'KeyN', key: 'N', shift: true })).toBe('Shift+N');
    expect(formatShortcutBinding({ code: 'Period', key: '>', shift: true })).toBe('Shift+>');
    expect(formatShortcutBinding({ code: 'Period', key: '.' })).toBe('.');
    expect(formatShortcutBinding({ code: 'Space', key: ' ' })).toBe('Space');
    expect(formatShortcutBinding({ code: 'ArrowLeft', key: 'ArrowLeft' })).toBe('←');
    expect(formatShortcutBinding({ code: 'Digit5', key: '5' })).toBe('5');
    expect(formatShortcutBinding({ code: 'Slash', key: '/' })).toBe('/');
    expect(formatShortcutBinding({ code: 'MediaPlayPause', key: 'MediaPlayPause' })).toBe(
      'Media Play/Pause',
    );
    expect(formatShortcutBinding({ code: 'KeyJ', key: 'j', ctrl: true })).toBe('Ctrl+J');
    expect(formatShortcutBinding({ code: 'KeyP', key: 'p', meta: true })).toBe('Meta+P');
    expect(formatShortcutBinding({ code: 'SomeWeirdCode' })).toBe('SomeWeirdCode');
    expect(formatShortcutBinding(null)).toBe('');
  });
});

// D-9 review fix: the shortcut executor is hand-maintained glue — the first
// revision forgot `case 'mediaTrackNext':` and the media key silently stopped
// working, with the whole suite green. This source-text guard fails the suite
// whenever an action id from the shared table has no `case '<id>':` label in
// the executor, so a future action can no longer ship without an executor
// branch. The executor is not importable in the node test environment (it
// needs DOM/extension globals), hence reading the source instead. D-14: the
// executor moved from entrypoints/content.ts to src/content/shortcuts-glue.ts
// (WXT treats every entrypoints/*.ts file as an entrypoint, so the split
// modules live under src/content/); this guard follows it.
const executorSource = readFileSync(
  new URL('../../src/content/shortcuts-glue.ts', import.meta.url),
  'utf8',
);

describe('shortcut executor guard', () => {
  it('handles every action id with an explicit case label', () => {
    for (const id of SHORTCUT_ACTION_ORDER) {
      // The trailing colon keeps `case 'togglePlay':` from matching inside
      // `case 'togglePlaySpace':`.
      expect(executorSource).toContain(`case '${id}':`);
    }
  });

  it('keeps the compile-time exhaustiveness guard in place', () => {
    // The `never` check after the switch is what makes `pnpm compile` fail on
    // a missing case; a `default:` branch would defeat it.
    expect(executorSource).toContain('const exhaustive: never = actionId;');
  });
});
