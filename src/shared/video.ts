// Copyright (c) 2026 cholf5
//
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at https://mozilla.org/MPL/2.0/.
// Pure helpers extracted verbatim from entrypoints/content.ts (D-15) so they
// can be unit tested; content.ts imports them instead of defining them inline.

/**
 * UP/channel identity as detected by the content script and echoed back by the
 * popup's get-current-channel message. D-14: one shared shape instead of the
 * content-side ChannelInfo and popup-side CurrentChannel drifting apart.
 */
export type ChannelInfo = {
  channelId: string;
  channelName: string;
  avatarUrl?: string;
};

// D-14: previously re-defined in content.ts, popup/App.tsx and
// options/App.tsx; Bilibili serves protocol-relative avatar URLs (//i0.hdslb.com/...).
export const normalizeAvatarUrl = (url?: string | null): string | undefined => {
  if (!url) {
    return undefined;
  }
  if (url.startsWith('//')) {
    return `https:${url}`;
  }
  return url;
};

export const sanitizeChannelName = (name?: string | null): string => {
  if (!name) {
    return 'Unknown';
  }
  return name.replace(/\s+\d{4}-\d{2}-\d{2}$/, '').trim() || 'Unknown';
};

export const getVideoIdFromUrl = (url: string): string | null => {
  try {
    const parsed = new URL(url);
    const match = parsed.pathname.match(/\/video\/([^/]+)/);
    return match?.[1] ?? null;
  } catch {
    return null;
  }
};

// Time saved by watching `delta` seconds of media at `rate`: the viewer skips
// (delta * (rate - 1)) / rate seconds of wall-clock time. Only meaningful for
// rate > 1 — handleTimeUpdate in content.ts filters non-positive deltas,
// deltas out of proportion with elapsed wall time (D-12), and rate <= 1 before
// calling this, so the function itself implements nothing but the formula.
export const computeTimeSaved = (delta: number, rate: number): number =>
  (delta * (rate - 1)) / rate;
