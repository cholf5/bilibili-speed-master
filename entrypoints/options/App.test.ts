import { describe, expect, it } from 'vitest';
import { formatTimestamp } from '@/entrypoints/options/App';

// D-5: expectations are rebuilt from local Date components inside the test,
// so the assertions hold in any timezone (no hardcoded UTC offset).
const pad = (part: number, width = 2) => String(part).padStart(width, '0');
const localParts = (iso: string) => {
  const date = new Date(iso);
  return (
    `${pad(date.getFullYear(), 4)}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    ` ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
  );
};

describe('formatTimestamp', () => {
  it('renders a UTC ISO instant with the local-time components', () => {
    const iso = '2026-09-29T15:30:45.123Z';
    expect(formatTimestamp(iso)).toBe(localParts(iso));
  });

  it('keeps the fixed YYYY-MM-DD HH:mm:ss shape with zero padding', () => {
    const iso = '2026-01-05T03:07:09.045Z';
    expect(formatTimestamp(iso)).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
    expect(formatTimestamp(iso)).toBe(localParts(iso));
  });

  it('round-trips to the original instant when parsed back as local time', () => {
    const iso = '2026-06-01T08:09:10Z';
    const out = formatTimestamp(iso);
    expect(new Date(out.replace(' ', 'T')).getTime()).toBe(new Date(iso).getTime());
  });

  it('returns "-" for an invalid timestamp (TC2)', () => {
    expect(formatTimestamp('not-a-date')).toBe('-');
  });

  it('returns "-" for a missing timestamp', () => {
    expect(formatTimestamp(undefined)).toBe('-');
    expect(formatTimestamp('')).toBe('-');
  });
});
