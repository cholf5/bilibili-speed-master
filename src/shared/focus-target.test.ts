import { describe, expect, it } from 'vitest';
import {
  isActivatableTarget,
  isEditableTarget,
  shortcutTargetIsExempt,
  type FocusTargetLike,
} from '@/src/shared/focus-target';

// Plain-object stand-ins for the structural FocusTargetLike descriptor: the
// node-environment suite has no DOM, and content.ts feeds the same shape built
// from a real HTMLElement (tagName / isContentEditable / hasAttribute /
// getAttribute).
const el = (
  tagName: string,
  attrs: Record<string, string> = {},
  isContentEditable = false,
): FocusTargetLike => ({
  tagName,
  isContentEditable,
  hasAttribute: (name) => Object.prototype.hasOwnProperty.call(attrs, name),
  getAttribute: (name) =>
    Object.prototype.hasOwnProperty.call(attrs, name) ? attrs[name] : null,
});

describe('isEditableTarget', () => {
  it.each(['INPUT', 'TEXTAREA', 'SELECT'])('treats <%s> as editable', (tag) => {
    expect(isEditableTarget(el(tag))).toBe(true);
  });

  it('treats lowercase tag names the same as uppercase', () => {
    expect(isEditableTarget(el('input'))).toBe(true);
  });

  it.each(['DIV', 'SPAN'])('treats contenteditable <%s> as editable', (tag) => {
    expect(isEditableTarget(el(tag, {}, true))).toBe(true);
  });

  it.each(['BUTTON', 'BODY', 'VIDEO', 'A', 'DIV'])(
    'does not treat <%s> as editable',
    (tag) => {
      expect(isEditableTarget(el(tag))).toBe(false);
    },
  );
});

describe('isActivatableTarget', () => {
  it('treats <button> as activatable', () => {
    expect(isActivatableTarget(el('BUTTON'))).toBe(true);
  });

  it('treats <a href> as activatable', () => {
    expect(isActivatableTarget(el('A', { href: '/video/BV1xx' }))).toBe(true);
  });

  it('does not treat an anchor without href as activatable', () => {
    expect(isActivatableTarget(el('A'))).toBe(false);
  });

  it('treats <select> as activatable (also editable)', () => {
    expect(isActivatableTarget(el('SELECT'))).toBe(true);
  });

  it('treats role="button" on a div as activatable', () => {
    expect(isActivatableTarget(el('DIV', { role: 'button' }))).toBe(true);
  });

  it('matches role="button" case-insensitively and tag-independently', () => {
    expect(isActivatableTarget(el('SPAN', { role: 'BUTTON' }))).toBe(true);
    expect(isActivatableTarget(el('SPAN', { role: ' Button ' }))).toBe(true);
  });

  it('ignores roles other than button', () => {
    expect(isActivatableTarget(el('DIV', { role: 'slider' }))).toBe(false);
    expect(isActivatableTarget(el('DIV', { role: 'tab' }))).toBe(false);
  });

  it('does not treat plain div/body/video as activatable', () => {
    expect(isActivatableTarget(el('DIV'))).toBe(false);
    expect(isActivatableTarget(el('BODY'))).toBe(false);
    expect(isActivatableTarget(el('VIDEO'))).toBe(false);
  });
});

describe('shortcutTargetIsExempt', () => {
  it('exempts editable targets (text entry owns every key)', () => {
    expect(shortcutTargetIsExempt(el('INPUT'))).toBe(true);
    expect(shortcutTargetIsExempt(el('DIV', {}, true))).toBe(true);
  });

  it('exempts activatable targets (native activation keeps the key)', () => {
    expect(shortcutTargetIsExempt(el('BUTTON'))).toBe(true);
    expect(shortcutTargetIsExempt(el('A', { href: '#x' }))).toBe(true);
    expect(shortcutTargetIsExempt(el('DIV', { role: 'button' }))).toBe(true);
  });

  it('does NOT exempt body, video, or plain divs (TC2: behavior unchanged)', () => {
    expect(shortcutTargetIsExempt(el('BODY'))).toBe(false);
    expect(shortcutTargetIsExempt(el('VIDEO'))).toBe(false);
    expect(shortcutTargetIsExempt(el('DIV'))).toBe(false);
  });
});
