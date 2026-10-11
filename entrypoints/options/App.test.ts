import { describe, expect, it } from 'vitest';
import { filterChannelsByQuery, formatTimestamp } from '@/entrypoints/options/App';
import type { ChannelOverride } from '@/src/shared/config';

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

// D-11: client-side filter behind the options channel-table search box.
describe('filterChannelsByQuery (D-11)', () => {
  const channels: ChannelOverride[] = [
    { channelId: '9', channelName: '老番茄', speed: 1.25, lastVisit: '2026-03-01T00:00:00.000Z' },
    { channelId: '42', channelName: 'Linus Tech Tips', speed: 1.5, lastVisit: '2026-03-02T00:00:00.000Z' },
    { channelId: '7', channelName: '影视飓风', speed: 2, lastVisit: '2026-03-03T00:00:00.000Z' },
  ];

  it('keeps every channel for an empty or whitespace-only keyword', () => {
    expect(filterChannelsByQuery(channels, '')).toBe(channels);
    expect(filterChannelsByQuery(channels, '   ')).toBe(channels);
    expect(filterChannelsByQuery(channels, '')).toHaveLength(3);
  });

  it('matches channel names case-insensitively (TC3)', () => {
    const result = filterChannelsByQuery(channels, 'linus');
    expect(result).toHaveLength(1);
    expect(result[0].channelId).toBe('42');
    expect(filterChannelsByQuery(channels, 'TECH TIPS')).toHaveLength(1);
    expect(filterChannelsByQuery(channels, 'Tech')).toHaveLength(1);
  });

  it('matches Chinese channel names (TC3)', () => {
    expect(filterChannelsByQuery(channels, '番茄').map((c) => c.channelId)).toEqual(['9']);
    expect(filterChannelsByQuery(channels, '影视').map((c) => c.channelId)).toEqual(['7']);
  });

  it('matches channelId substrings too', () => {
    const result = filterChannelsByQuery(channels, '42');
    expect(result).toHaveLength(1);
    expect(result[0].channelId).toBe('42');
    expect(filterChannelsByQuery(channels, '9').map((c) => c.channelId)).toEqual(['9']);
  });

  it('matches against name or channelId, not other fields', () => {
    // '1.5' lives in the speed field; nothing matches on it.
    expect(filterChannelsByQuery(channels, '1.5')).toEqual([]);
    expect(filterChannelsByQuery(channels, '2026')).toEqual([]);
  });

  it('returns an empty array when nothing matches', () => {
    const result = filterChannelsByQuery(channels, 'nope');
    expect(result).toEqual([]);
    expect(result).not.toBe(channels);
  });

  it('TC2: filtered rows keep their original identity, so deleting a rendered row removes the right record', () => {
    // The options flow renders filtered rows and deletes by the row's
    // channelId (shared removeChannelOverride semantic), never by the
    // filtered index — the filter must hand back the original entries.
    const record: Record<string, ChannelOverride> = {
      '9': channels[0],
      '42': channels[1],
      '7': channels[2],
    };

    const filtered = filterChannelsByQuery(Object.values(record), 'linus');
    expect(filtered).toHaveLength(1);
    expect(filtered[0]).toBe(record['42']); // same object, not a copy

    const rowId = filtered[0].channelId; // what deleteChannel receives
    delete record[rowId];

    expect(record['42']).toBeUndefined();
    expect(record['9']).toBeDefined();
    expect(record['7']).toBeDefined();
    // Storage-level view converges: the same keyword now matches nothing and
    // the unfiltered list is one row shorter.
    expect(filterChannelsByQuery(Object.values(record), 'linus')).toEqual([]);
    expect(filterChannelsByQuery(Object.values(record), '')).toHaveLength(2);
  });
});
