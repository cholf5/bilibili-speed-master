// D-9: configurable keyboard shortcuts. Pure data + pure functions only (the
// Vitest suite runs in a plain node environment): no DOM, no extension APIs,
// no storage. content.ts keeps only glue (window keydown listener + action
// execution); options.tsx records and rewires bindings through the shared
// helpers below.
//
// Binding identity is `code`-first (KeyboardEvent.code, layout-independent:
// a binding recorded on a QWERTY keyboard still fires on AZERTY/Cyrillic
// layouts). `key` is secondary: it feeds the UI label and a fallback match
// for events whose code does not carry the binding (numpad digits, browsers
// or synthetic events without a usable code). ctrl/alt/meta must match
// exactly; shift must match exactly on the code path but is deliberately
// ignored on the key-fallback path — the pre-D-9 matcher compared
// `event.key` characters ('>' '<' 'k' …) with no shift requirement, so this
// keeps unshifted-'<' layouts (e.g. Nordic) working while the char test
// itself already separates 'k' from 'K'.

export type ShortcutBinding = {
  /** Primary: physical key (KeyboardEvent.code), layout-independent. */
  code: string;
  /** Secondary: KeyboardEvent.key, for display and fallback matching. */
  key?: string;
  ctrl?: boolean;
  alt?: boolean;
  shift?: boolean;
  meta?: boolean;
};

export type ShortcutActionId =
  | 'togglePlay'
  | 'togglePlaySpace'
  | 'toggleMute'
  | 'seekBackwardLarge'
  | 'seekForwardLarge'
  | 'seekBackwardSmall'
  | 'seekForwardSmall'
  | 'volumeUp'
  | 'volumeDown'
  | 'seekToStart'
  | 'seekToEnd'
  | 'stepForward'
  | 'stepBackward'
  | 'speedUp'
  | 'slowDown'
  | 'toggleFullscreen'
  | 'toggleCaptions'
  | 'toggleMiniPlayer'
  | 'nextVideo'
  | 'prevVideo'
  | 'focusSearch'
  | 'seekToPercent0'
  | 'seekToPercent1'
  | 'seekToPercent2'
  | 'seekToPercent3'
  | 'seekToPercent4'
  | 'seekToPercent5'
  | 'seekToPercent6'
  | 'seekToPercent7'
  | 'seekToPercent8'
  | 'seekToPercent9'
  | 'mediaPlayPause'
  | 'mediaStop'
  | 'mediaTrackNext';

export type ShortcutActionDef = {
  /**
   * Whether a matched event is swallowed (preventDefault +
   * stopPropagation). Media-key bindings are not: the browser media
   * pipeline keeps handling them (pre-D-9 behavior).
   */
  consumes: boolean;
  /** Fraction of the video duration for the seekToPercentN actions (0, 0.1 … 0.9). */
  seekFraction?: number;
  /**
   * Only meaningful while the video is paused (frame stepping); when
   * playing, the matched event falls through unconsumed — exactly the old
   * `key === '.' && video.paused` branch condition.
   */
  pausedOnly?: boolean;
  /** Out-of-the-box binding; null would mean disabled (none are today). */
  defaultBinding: ShortcutBinding | null;
};

// Defaults mirror the pre-D-9 handleKeydown chain exactly (same keys, same
// semantics); DEFAULT_SHORTCUT_BINDINGS below is the config schema default.
export const DEFAULT_SHORTCUT_ACTIONS: Record<ShortcutActionId, ShortcutActionDef> = {
  togglePlay: { consumes: true, defaultBinding: { code: 'KeyK', key: 'k' } },
  // Space sits next to k in the old `key === ' ' || key === 'k'` branch;
  // separate ids so either can be remapped (docs/shortcuts.md lists both).
  togglePlaySpace: { consumes: true, defaultBinding: { code: 'Space', key: ' ' } },
  toggleMute: { consumes: true, defaultBinding: { code: 'KeyM', key: 'm' } },
  seekBackwardLarge: { consumes: true, defaultBinding: { code: 'KeyJ', key: 'j' } },
  seekForwardLarge: { consumes: true, defaultBinding: { code: 'KeyL', key: 'l' } },
  seekBackwardSmall: { consumes: true, defaultBinding: { code: 'ArrowLeft', key: 'ArrowLeft' } },
  seekForwardSmall: { consumes: true, defaultBinding: { code: 'ArrowRight', key: 'ArrowRight' } },
  volumeUp: { consumes: true, defaultBinding: { code: 'ArrowUp', key: 'ArrowUp' } },
  volumeDown: { consumes: true, defaultBinding: { code: 'ArrowDown', key: 'ArrowDown' } },
  seekToStart: { consumes: true, defaultBinding: { code: 'Home', key: 'Home' } },
  seekToEnd: { consumes: true, defaultBinding: { code: 'End', key: 'End' } },
  stepForward: { consumes: true, pausedOnly: true, defaultBinding: { code: 'Period', key: '.' } },
  stepBackward: { consumes: true, pausedOnly: true, defaultBinding: { code: 'Comma', key: ',' } },
  speedUp: { consumes: true, defaultBinding: { code: 'Period', key: '>', shift: true } },
  slowDown: { consumes: true, defaultBinding: { code: 'Comma', key: '<', shift: true } },
  toggleFullscreen: { consumes: true, defaultBinding: { code: 'KeyF', key: 'f' } },
  toggleCaptions: { consumes: true, defaultBinding: { code: 'KeyC', key: 'c' } },
  toggleMiniPlayer: { consumes: true, defaultBinding: { code: 'KeyI', key: 'i' } },
  nextVideo: { consumes: true, defaultBinding: { code: 'KeyN', key: 'N', shift: true } },
  prevVideo: { consumes: true, defaultBinding: { code: 'KeyP', key: 'P', shift: true } },
  focusSearch: { consumes: true, defaultBinding: { code: 'Slash', key: '/' } },
  seekToPercent0: { consumes: true, seekFraction: 0, defaultBinding: { code: 'Digit0', key: '0' } },
  seekToPercent1: {
    consumes: true,
    seekFraction: 0.1,
    defaultBinding: { code: 'Digit1', key: '1' },
  },
  seekToPercent2: {
    consumes: true,
    seekFraction: 0.2,
    defaultBinding: { code: 'Digit2', key: '2' },
  },
  seekToPercent3: {
    consumes: true,
    seekFraction: 0.3,
    defaultBinding: { code: 'Digit3', key: '3' },
  },
  seekToPercent4: {
    consumes: true,
    seekFraction: 0.4,
    defaultBinding: { code: 'Digit4', key: '4' },
  },
  seekToPercent5: {
    consumes: true,
    seekFraction: 0.5,
    defaultBinding: { code: 'Digit5', key: '5' },
  },
  seekToPercent6: {
    consumes: true,
    seekFraction: 0.6,
    defaultBinding: { code: 'Digit6', key: '6' },
  },
  seekToPercent7: {
    consumes: true,
    seekFraction: 0.7,
    defaultBinding: { code: 'Digit7', key: '7' },
  },
  seekToPercent8: {
    consumes: true,
    seekFraction: 0.8,
    defaultBinding: { code: 'Digit8', key: '8' },
  },
  seekToPercent9: {
    consumes: true,
    seekFraction: 0.9,
    defaultBinding: { code: 'Digit9', key: '9' },
  },
  mediaPlayPause: { consumes: false, defaultBinding: { code: 'MediaPlayPause' } },
  mediaStop: { consumes: false, defaultBinding: { code: 'MediaStop' } },
  mediaTrackNext: { consumes: false, defaultBinding: { code: 'MediaTrackNext' } },
};

// Match/display priority; the old handler's branch order (a tie-breaker only,
// since the conflict rules keep two enabled actions from sharing a binding).
export const SHORTCUT_ACTION_ORDER: readonly ShortcutActionId[] = [
  'togglePlay',
  'togglePlaySpace',
  'toggleMute',
  'seekBackwardLarge',
  'seekForwardLarge',
  'seekBackwardSmall',
  'seekForwardSmall',
  'volumeUp',
  'volumeDown',
  'seekToStart',
  'seekToEnd',
  'stepForward',
  'stepBackward',
  'speedUp',
  'slowDown',
  'toggleFullscreen',
  'toggleCaptions',
  'toggleMiniPlayer',
  'nextVideo',
  'prevVideo',
  'focusSearch',
  'seekToPercent0',
  'seekToPercent1',
  'seekToPercent2',
  'seekToPercent3',
  'seekToPercent4',
  'seekToPercent5',
  'seekToPercent6',
  'seekToPercent7',
  'seekToPercent8',
  'seekToPercent9',
  'mediaPlayPause',
  'mediaStop',
  'mediaTrackNext',
];

export type ShortcutBindings = Record<ShortcutActionId, ShortcutBinding | null>;

const mod = (value?: boolean): boolean => value === true;

const fromEntries = Object.fromEntries as (
  entries: Array<[ShortcutActionId, ShortcutBinding | null]>,
) => ShortcutBindings;

export const DEFAULT_SHORTCUT_BINDINGS: ShortcutBindings = fromEntries(
  SHORTCUT_ACTION_ORDER.map((id) => [id, DEFAULT_SHORTCUT_ACTIONS[id].defaultBinding]),
);

const cloneBinding = (binding: ShortcutBinding): ShortcutBinding => ({ ...binding });

/** Deep copy of the default table; callers may hand the result to storage. */
export const cloneDefaultShortcuts = (): ShortcutBindings => {
  const bindings = {} as ShortcutBindings;
  for (const id of SHORTCUT_ACTION_ORDER) {
    const binding = DEFAULT_SHORTCUT_BINDINGS[id];
    bindings[id] = binding ? cloneBinding(binding) : null;
  }
  return bindings;
};

/**
 * Schema-boundary sanitizer (mirrors sanitizeChannels): never throws, keeps
 * null (disabled) entries, repairs per-action holes with the default binding,
 * drops entries with an unknown action id or an unusable code, and coerces
 * modifiers to booleans. Old data without a shortcuts field lands here as
 * `undefined` and comes back as the full default table (no migration aware).
 */
export const sanitizeShortcuts = (raw: unknown): ShortcutBindings => {
  const bindings = cloneDefaultShortcuts();
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return bindings;
  }
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    // hasOwnProperty (not `in`): '__proto__' and friends must not pass.
    if (!Object.prototype.hasOwnProperty.call(DEFAULT_SHORTCUT_ACTIONS, key)) {
      continue;
    }
    const id = key as ShortcutActionId;
    if (value === null) {
      bindings[id] = null;
      continue;
    }
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      continue; // invalid entry → keep the default binding
    }
    const entry = value as Record<string, unknown>;
    if (typeof entry.code !== 'string' || entry.code.trim() === '') {
      continue;
    }
    const binding: ShortcutBinding = { code: entry.code };
    if (typeof entry.key === 'string' && entry.key !== '') {
      binding.key = entry.key;
    }
    for (const modifier of ['ctrl', 'alt', 'shift', 'meta'] as const) {
      if (entry[modifier] === true) {
        binding[modifier] = true;
      }
    }
    bindings[id] = binding;
  }
  return bindings;
};

export type ShortcutEventLike = {
  key: string;
  code: string;
  ctrlKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
  metaKey?: boolean;
};

/**
 * Returns the first action whose binding matches the event, or null. Match
 * rule per binding: ctrl/alt/meta exact, then (a) code equal + shift exact,
 * or (b) key equal (shift-insensitive, see module comment). Disabled
 * (null) bindings never match.
 */
export const matchShortcut = (
  event: ShortcutEventLike,
  bindings: ShortcutBindings,
): ShortcutActionId | null => {
  for (const id of SHORTCUT_ACTION_ORDER) {
    const binding = bindings[id];
    if (!binding) {
      continue;
    }
    if (
      mod(binding.ctrl) !== mod(event.ctrlKey) ||
      mod(binding.alt) !== mod(event.altKey) ||
      mod(binding.meta) !== mod(event.metaKey)
    ) {
      continue;
    }
    if (binding.code !== '' && event.code === binding.code && mod(binding.shift) === mod(event.shiftKey)) {
      return id;
    }
    if (binding.key !== undefined && event.key === binding.key) {
      return id;
    }
  }
  return null;
};

const MODIFIER_CODES = new Set([
  'ControlLeft',
  'ControlRight',
  'AltLeft',
  'AltRight',
  'ShiftLeft',
  'ShiftRight',
  'MetaLeft',
  'MetaRight',
]);

/** True when the keydown is a bare modifier press (nothing to record). */
export const isModifierOnlyKey = (code: string): boolean => MODIFIER_CODES.has(code);

/**
 * Normalizes a keydown into a recordable binding. Returns null for bare
 * modifier presses (the recorder keeps waiting) and for events without a
 * usable code. ESC is NOT handled here — cancel-on-Escape is recorder UI
 * policy and must be checked before calling this.
 */
export const captureShortcut = (event: ShortcutEventLike): ShortcutBinding | null => {
  const code = event.code ?? '';
  if (code === '' || isModifierOnlyKey(code)) {
    return null;
  }
  const binding: ShortcutBinding = { code };
  if (typeof event.key === 'string' && event.key !== '') {
    binding.key = event.key;
  }
  if (event.ctrlKey) {
    binding.ctrl = true;
  }
  if (event.altKey) {
    binding.alt = true;
  }
  if (event.shiftKey) {
    binding.shift = true;
  }
  if (event.metaKey) {
    binding.meta = true;
  }
  return binding;
};

/**
 * Physical identity of two bindings: code + all four modifiers. `key` is
 * ignored (display-only), so the same physical key can never be claimed by
 * two enabled actions even when their key strings disagree.
 */
export const bindingEquals = (
  a: ShortcutBinding | null,
  b: ShortcutBinding | null,
): boolean => {
  if (a === b) {
    return true;
  }
  if (!a || !b) {
    return false;
  }
  return (
    a.code === b.code &&
    mod(a.ctrl) === mod(b.ctrl) &&
    mod(a.alt) === mod(b.alt) &&
    mod(a.shift) === mod(b.shift) &&
    mod(a.meta) === mod(b.meta)
  );
};

/**
 * Returns the enabled action (other than `targetId`) already holding
 * `candidate`, or null. Used by the options recorder to offer a swap
 * instead of silently shadowing a shortcut.
 */
export const findBindingConflict = (
  bindings: ShortcutBindings,
  targetId: ShortcutActionId,
  candidate: ShortcutBinding,
): ShortcutActionId | null => {
  for (const id of SHORTCUT_ACTION_ORDER) {
    if (id === targetId) {
      continue;
    }
    const binding = bindings[id];
    if (binding && bindingEquals(binding, candidate)) {
      return id;
    }
  }
  return null;
};

const KEY_LABELS: Record<string, string> = {
  Space: 'Space',
  ArrowLeft: '←',
  ArrowRight: '→',
  ArrowUp: '↑',
  ArrowDown: '↓',
  Period: '.',
  Comma: ',',
  Slash: '/',
  Semicolon: ';',
  Quote: "'",
  Backslash: '\\',
  Minus: '-',
  Equal: '=',
  Backquote: '`',
  BracketLeft: '[',
  BracketRight: ']',
  Home: 'Home',
  End: 'End',
  PageUp: 'PageUp',
  PageDown: 'PageDown',
  Insert: 'Insert',
  Delete: 'Delete',
  Escape: 'Esc',
  Enter: 'Enter',
  Tab: 'Tab',
  Backspace: 'Backspace',
  MediaPlayPause: 'Media Play/Pause',
  MediaStop: 'Media Stop',
  MediaTrackNext: 'Media Next',
  MediaTrackPrevious: 'Media Prev',
};

/** Human-readable binding label, e.g. "Shift+N", ".", "Media Play/Pause". */
export const formatShortcutBinding = (binding: ShortcutBinding | null): string => {
  if (!binding) {
    return '';
  }
  const parts: string[] = [];
  if (binding.ctrl) {
    parts.push('Ctrl');
  }
  if (binding.alt) {
    parts.push('Alt');
  }
  if (binding.shift) {
    parts.push('Shift');
  }
  if (binding.meta) {
    parts.push('Meta');
  }
  const key = binding.key;
  if (typeof key === 'string' && key.length === 1 && key.charCodeAt(0) > 0x20) {
    parts.push(/[a-z]/i.test(key) ? key.toUpperCase() : key);
  } else {
    parts.push(KEY_LABELS[binding.code] ?? binding.code.replace(/^(Key|Digit)/, ''));
  }
  return parts.join('+');
};
