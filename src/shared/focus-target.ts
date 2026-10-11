// D-16: pure classification of a keydown event target so shortcut handling can
// defer to elements that own the key. Text-entry targets own every key
// (isEditableTarget, pre-D-16 semantics); activatable controls (buttons,
// links, selects, role="button") own Space/Enter and often the arrow keys, so
// a focused button must be natively activated instead of toggling the player
// (kanban card D-16, TC1).
//
// The functions take a structural descriptor instead of a real Element: the
// Vitest suite runs in a plain node environment (no DOM), so tests pass plain
// objects; content.ts builds the descriptor from the live event target. No DOM
// or extension APIs are touched here, matching the other shared modules.

export type FocusTargetLike = {
  /** Uppercase tag name as reported by Element.tagName (e.g. 'INPUT'). */
  tagName: string;
  /** HTMLElement.isContentEditable of the event target (text entry). */
  isContentEditable?: boolean;
  hasAttribute: (name: string) => boolean;
  getAttribute: (name: string) => string | null;
};

const EDITABLE_TAGS = new Set(['input', 'textarea', 'select']);

/**
 * Targets that consume every key as text entry. Mirrors the pre-D-16
 * isEditableTarget in content.ts exactly: input / textarea / select tags plus
 * contenteditable hosts. `select` also appears in isActivatableTarget — a
 * focused select owns Space/Enter/arrows — so each predicate is independently
 * complete.
 */
export const isEditableTarget = (target: FocusTargetLike): boolean =>
  target.isContentEditable === true || EDITABLE_TAGS.has(target.tagName.toLowerCase());

/**
 * Targets with native activation that must keep their keys: `<button>`,
 * `<a href>` (an anchor without href is not focusable/activatable), `<select>`
 * and any element with role="button" (role matching is case-insensitive and
 * tag-independent, per ARIA in HTML). D-16 minimal set — no heuristics for
 * div+click controls without a role (documented limitation).
 *
 * Note: in content.ts the caller filters targets through
 * `instanceof HTMLElement` before reaching this predicate, so SVG elements
 * carrying role="button" never get exempted — same as pre-D-16 behavior.
 */
export const isActivatableTarget = (target: FocusTargetLike): boolean => {
  const tag = target.tagName.toLowerCase();
  if (tag === 'button') {
    return true;
  }
  if (tag === 'a' && target.hasAttribute('href')) {
    return true;
  }
  if (tag === 'select') {
    return true;
  }
  return (target.getAttribute('role') ?? '').trim().toLowerCase() === 'button';
};

/** True when a keydown on this target must skip shortcut matching entirely. */
export const shortcutTargetIsExempt = (target: FocusTargetLike): boolean =>
  isEditableTarget(target) || isActivatableTarget(target);
