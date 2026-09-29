# Storage Schema and Config Access

User settings live in `chrome.storage.sync` under a single key; saved-time
statistics live in `chrome.storage.local` under their own key (see
"Stats in storage.local" below).

## Storage Key
- Key: `bilibiliSpeedMaster`
- Value: JSON object described below

## Schema (v1)
```ts
type SpeedMasterConfig = {
  version: 1;
  global: {
    defaultSpeed: number;
    preferredQuality: string; // example: "auto"
  };
  channels: Record<string, {
    channelId: string;
    channelName: string;
    speed: number;
    lastVisit: string; // ISO timestamp
    avatarUrl?: string;
  }>;
  stats: {
    timeSavedSeconds: number;
  };
};
```

## Access Helpers
Use the helpers in `src/shared/config.ts`:
- `getConfig()` returns a merged config with defaults; `channels` entries are
  sanitized on read (see below).
- `setConfig(config)` writes the full config. It enforces the channels cap
  (see below) and returns the config as persisted.
- `updateConfig(updater)` reads, updates, and persists in one call; it
  resolves with the config as persisted (post-sanitize, post-cap).

## Channels Sanitization (D-3)
`sanitizeChannels(raw)` validates every channel entry whenever a channels
record is read from storage or imported (via `mergeConfig`):

- `channelId`: required non-empty string; it wins over the record key when
  the two disagree (the entry is re-keyed by `channelId`).
- `channelName`: required non-empty string.
- `speed`: required finite number, clamped into 0.1–4.
- `lastVisit`: optional; kept only when parseable by `new Date()`, otherwise
  the field is dropped but the entry survives.
- `avatarUrl`: optional string.

Entries failing a required field (`channelId`, `channelName`, `speed`) are
dropped entirely; sanitization never throws. Garbage input therefore degrades
to "fewer channels", never to `NaN` in the options table.

## Channels Cap (D-4)
`MAX_CHANNELS = 200` bounds the `channels` record because
`chrome.storage.sync` has a hard total quota and over-quota writes fail
silently. `capChannels(config)` is applied in `setConfig` — the single write
entry point shared by content-script rate changes, channel-visit records,
popup/options updates, and imports — so the limit holds on every write path.
Eviction is LRU by `lastVisit` (oldest evicted first; entries without a
parseable `lastVisit` count as oldest).

`storage.sync` write failures are reported via `console.warn` (callback-style
writes check `chrome.runtime.lastError`; promise-style writes catch the
rejection) instead of failing silently.

## Stats in storage.local (D-1)
`stats.timeSavedSeconds` is device-local data with no cross-device sync value,
so it no longer rides the sync config blob (whose
MAX_WRITE_OPERATIONS_PER_HOUR quota the old ~3s flush used to exhaust).

- Key: `bilibiliSpeedMasterStats`
- Area: `chrome.storage.local`
- Value: `{ timeSavedSeconds: number }`
- Helpers: `getSavedStats()` and `updateSavedStats(updater)` in
  `src/shared/stats.ts` (read-modify-write; values that are not finite
  non-negative numbers degrade to 0).

### Migration
Stats used to be stored inside the sync config's `stats` field. The first
stats access in a context — read or write, `getSavedStats()` or
`updateSavedStats()` — merges the legacy sync value into local with `max`
semantics (the larger value wins), so no data is lost on upgrade and new
accumulation after an extension update stacks on top of the legacy total.
The check is memoized per context (the migration promise is cached), so it
runs once and later calls, including every 30s flush, cost no extra sync
read. The migration is idempotent — repeated or concurrent (multi-tab) calls
are safe. The legacy sync value is left untouched (nothing reads it
afterwards, so no destructive write is needed), and the
`SpeedMasterConfig.stats` field is kept for old-version import compatibility
only; runtime reads and writes no longer go through it.

`storage.local` has no write-operations quota, but failed writes still surface
via `console.warn` (`[speed-master]` prefix), matching the sync failure
reporting in the Channels Cap section above.

## Notes
- All schema changes should bump `version` and add migration logic.
- Prefer adding new fields with safe defaults to keep backward compatibility.
- Import/export features rely on `version === 1` and replace the full config object.
