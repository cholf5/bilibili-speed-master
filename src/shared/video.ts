// Pure helpers extracted verbatim from entrypoints/content.ts (D-15) so they
// can be unit tested; content.ts imports them instead of defining them inline.

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
