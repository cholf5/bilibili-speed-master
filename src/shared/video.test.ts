// Copyright (c) 2026 cholf5
//
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at https://mozilla.org/MPL/2.0/.
import { describe, expect, it } from 'vitest';
import { computeTimeSaved, getVideoIdFromUrl, sanitizeChannelName } from '@/src/shared/video';

describe('sanitizeChannelName', () => {
  it('maps missing, null, and empty names to "Unknown"', () => {
    expect(sanitizeChannelName(undefined)).toBe('Unknown');
    expect(sanitizeChannelName(null)).toBe('Unknown');
    expect(sanitizeChannelName('')).toBe('Unknown');
  });

  it('strips a trailing date suffix from UP names', () => {
    expect(sanitizeChannelName('张三 2024-01-02')).toBe('张三');
    expect(sanitizeChannelName('Some UP 2026-09-29')).toBe('Some UP');
  });

  it('trims surrounding whitespace from plain names', () => {
    expect(sanitizeChannelName('  张三  ')).toBe('张三');
    expect(sanitizeChannelName('张三')).toBe('张三');
  });

  it('maps a whitespace-only name or a bare date to "Unknown"', () => {
    expect(sanitizeChannelName('   ')).toBe('Unknown');
    expect(sanitizeChannelName(' 2024-01-02')).toBe('Unknown');
  });

  it('keeps dates that are not at the end of the name', () => {
    expect(sanitizeChannelName('2024-01-02 回顾')).toBe('2024-01-02 回顾');
  });
});

describe('getVideoIdFromUrl', () => {
  it('extracts a BV id from a /video/ URL', () => {
    expect(getVideoIdFromUrl('https://www.bilibili.com/video/BV1xx411c7mD/')).toBe(
      'BV1xx411c7mD',
    );
    expect(getVideoIdFromUrl('https://www.bilibili.com/video/BV1xx411c7mD')).toBe('BV1xx411c7mD');
  });

  it('extracts an av id from a /video/ URL', () => {
    expect(getVideoIdFromUrl('https://www.bilibili.com/video/av170001')).toBe('av170001');
  });

  it('ignores query strings and hashes after the id', () => {
    expect(
      getVideoIdFromUrl('https://www.bilibili.com/video/BV1xx411c7mD/?p=2&vd_source=abc#reply'),
    ).toBe('BV1xx411c7mD');
  });

  it('returns null for non-video paths', () => {
    expect(getVideoIdFromUrl('https://www.bilibili.com/')).toBeNull();
    expect(getVideoIdFromUrl('https://space.bilibili.com/123')).toBeNull();
    expect(getVideoIdFromUrl('https://www.bilibili.com/video/')).toBeNull();
  });

  it('returns null for unparseable URLs', () => {
    expect(getVideoIdFromUrl('not a url')).toBeNull();
    expect(getVideoIdFromUrl('')).toBeNull();
  });
});

describe('computeTimeSaved', () => {
  // Pure formula only: (delta * (rate - 1)) / rate. handleTimeUpdate in
  // content.ts filters delta <= 0, delta > 2s (seeks/transitions), and
  // rate <= 1 before calling; these cases pin the formula itself.
  it('returns delta / 2 at 1.5x (6s watched saves 2s of wall time)', () => {
    expect(computeTimeSaved(6, 1.5)).toBeCloseTo(2, 10);
  });

  it('returns delta / 2 at 2x (10s watched saves 5s)', () => {
    expect(computeTimeSaved(10, 2)).toBe(5);
  });

  it('returns 3/4 of delta at 4x (8s watched saves 6s)', () => {
    expect(computeTimeSaved(8, 4)).toBe(6);
  });

  it('yields 0 at rate 1 by the formula; the caller filters rate <= 1 first', () => {
    expect(computeTimeSaved(10, 1)).toBe(0);
  });

  it('yields 0 for a zero delta; the caller filters delta <= 0 first', () => {
    expect(computeTimeSaved(0, 2)).toBe(0);
  });

  it('yields a negative raw value for a negative delta; the caller filters that', () => {
    expect(computeTimeSaved(-2, 2)).toBe(-1);
  });

  it('computes the formula regardless of delta size; the caller rejects >2s deltas', () => {
    expect(computeTimeSaved(60, 2)).toBe(30);
  });
});
