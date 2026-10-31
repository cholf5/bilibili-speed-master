// Copyright (c) 2026 cholf5
//
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at https://mozilla.org/MPL/2.0/.
import { describe, expect, it } from 'vitest';
import {
  KEYBOARD_SPEED_STEP,
  SPEED_MAX,
  SPEED_MIN,
  SPEED_STEP,
  clampSpeed,
  formatSpeed,
  formatWidgetSpeed,
} from '@/src/shared/speed';
import { normalizeAvatarUrl } from '@/src/shared/video';

// D-14: the constants and formatters moved here from content.ts / popup /
// options; these tests pin the exact consolidated values so the three
// entrypoints cannot drift apart again.

describe('speed range constants', () => {
  it('keeps the historical range 0.1–4x', () => {
    expect(SPEED_MIN).toBe(0.1);
    expect(SPEED_MAX).toBe(4);
  });

  it('keeps the UI stepper at 0.1 and the keyboard step at 0.25 (distinct semantics)', () => {
    expect(SPEED_STEP).toBe(0.1);
    expect(KEYBOARD_SPEED_STEP).toBe(0.25);
  });
});

describe('clampSpeed', () => {
  it('rounds to one decimal before clamping', () => {
    expect(clampSpeed(1.234)).toBe(1.2);
    expect(clampSpeed(1.26)).toBe(1.3);
  });

  it('clamps into [SPEED_MIN, SPEED_MAX]', () => {
    expect(clampSpeed(0.01)).toBe(SPEED_MIN);
    expect(clampSpeed(10)).toBe(SPEED_MAX);
    expect(clampSpeed(-1)).toBe(SPEED_MIN);
  });

  it('passes clean values through unchanged', () => {
    expect(clampSpeed(1)).toBe(1);
    expect(clampSpeed(2.5)).toBe(2.5);
  });
});

describe('formatSpeed', () => {
  it('drops trailing zeros (Number(toFixed(2)))', () => {
    expect(formatSpeed(1)).toBe('1');
    expect(formatSpeed(1.5)).toBe('1.5');
    expect(formatSpeed(1.25)).toBe('1.25');
  });

  it('rounds to two decimals', () => {
    expect(formatSpeed(1.005)).toBe('1');
    expect(formatSpeed(1.266)).toBe('1.27');
  });
});

describe('formatWidgetSpeed', () => {
  it('matches formatSpeed with a trailing "x"', () => {
    expect(formatWidgetSpeed(1)).toBe('1x');
    expect(formatWidgetSpeed(1.25)).toBe('1.25x');
    expect(formatWidgetSpeed(2.4)).toBe('2.4x');
  });
});

describe('normalizeAvatarUrl', () => {
  it('upgrades protocol-relative Bilibili avatar URLs to https', () => {
    expect(normalizeAvatarUrl('//i0.hdslb.com/bfs/face/a.jpg')).toBe(
      'https://i0.hdslb.com/bfs/face/a.jpg',
    );
  });

  it('passes absolute and data URLs through unchanged', () => {
    expect(normalizeAvatarUrl('https://i0.hdslb.com/bfs/face/a.jpg')).toBe(
      'https://i0.hdslb.com/bfs/face/a.jpg',
    );
    expect(normalizeAvatarUrl('data:image/png;base64,abc')).toBe('data:image/png;base64,abc');
  });

  it('maps missing URLs to undefined', () => {
    expect(normalizeAvatarUrl(undefined)).toBeUndefined();
    expect(normalizeAvatarUrl(null)).toBeUndefined();
    expect(normalizeAvatarUrl('')).toBeUndefined();
  });
});
