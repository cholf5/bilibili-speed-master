# Storage Schema and Config Access

User settings live in `chrome.storage.sync`; saved-time statistics live in
`chrome.storage.local` under their own key (see "Stats in storage.local"
below).

## Storage Keys (D-2)

Since D-2 the sync config is split into two per-partition keys, so a stale
full-config write to one partition can no longer carry the other partition's
data under it (cross-context races between a popup global change and a
content-script channel write), and the tiny global item never fails the
per-item sync quota because of a large channels record.

| Key                          | Area | Value                                                        |
| ---------------------------- | ---- | ------------------------------------------------------------ |
| `bilibiliSpeedMasterGlobal`   | sync | `{ version: 1, global: {...} }`                              |
| `bilibiliSpeedMasterChannels` | sync | `{ version: 1, channels: {...} }`                            |
| `bilibiliSpeedMaster`         | sync | legacy pre-D-2 merged blob `{ version: 1, global, channels, stats }` — read-only fallback, retired by the stats migration (see Migration below) |
| `bilibiliSpeedMasterStats`    | local | `{ timeSavedSeconds: number }` (D-1)                        |

`STORAGE_KEY` (`bilibiliSpeedMaster`) is kept as an exported constant because
it names the legacy key; nothing writes it anymore.

## Schema (v1)

The in-memory / import-export format is unchanged — a single `SpeedMasterConfig`:

```ts
type SpeedMasterConfig = {
  version: 1;
  global: {
    defaultSpeed: number;
    preferredQuality: string; // example: "auto"
    showVideoWidget: boolean;
    videoWidgetPosition: "topLeft" | "topRight";
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

- `getConfig()` reads both split keys (plus the legacy key, see Migration) in
  one `storage.sync.get` and returns a merged config with defaults; `channels`
  entries are sanitized on read (see below).
- `setConfig(config)` writes BOTH split keys in one `storage.sync.set` (the
  in-memory `stats` field is not persisted; it lives in storage.local since
  D-1). It enforces the channels cap (see below), never touches the legacy
  key, and returns the config as persisted.
- `updateConfig(updater)` runs its read-modify-write as one unit inside the
  write queue (see below) and resolves with the config as persisted
  (post-sanitize, post-cap). When the updater returns the config it read
  unchanged, the storage write is skipped entirely.

## In-Context Write Queue (D-2)

All writes in a context (content script, popup, options) funnel through
`setConfig` / `updateConfig`, which are serialized on a module-level promise
chain. `updateConfig` performs its read inside the queued unit, so two
concurrent `updateConfig` calls in the same context cannot interleave their
read-modify-write cycles: the later writer always builds on the earlier
writer's persisted result. A failed unit never blocks the queue.

The queue covers one context only. Cross-context races (popup vs. content
script) are narrowed by the split keys: a popup global write can no longer
carry a stale channels snapshot over a concurrent content-script write, and
vice versa.

Content-script write frequency is bounded as well: the channel-override
persistence triggered by `ratechange` events is trailing-debounced (~300 ms),
so a slider drag coalesces into one storage write carrying the final rate. The
pending write is flushed immediately on `pagehide` / `visibilitychange`
(hidden) / `beforeunload`, so closing the tab right after changing the speed
does not lose the override.

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

`storage.sync` write and removal failures are reported via `console.warn`
(callback-style operations check `chrome.runtime.lastError`; promise-style
operations catch the rejection) instead of failing silently.

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

### Stats migration
Stats used to be stored inside the sync config's `stats` field. The first
stats access in a context — read or write, `getSavedStats()` or
`updateSavedStats()` — merges the legacy sync value into local with `max`
semantics (the larger value wins), so no data is lost on upgrade and new
accumulation after an extension update stacks on top of the legacy total.
The check is memoized per context (the migration promise is cached), so it
runs once and later calls, including every 30s flush, cost no extra sync
read. The migration is idempotent — repeated or concurrent (multi-tab) calls
are safe. The `SpeedMasterConfig.stats` field is kept for old-version import
compatibility only; runtime reads and writes no longer go through it.

`storage.local` has no write-operations quota, but failed writes still surface
via `console.warn` (`[speed-master]` prefix), matching the sync failure
reporting above.

## Config Key Migration (D-2)

- **Reads**: each partition (global, channels) prefers its split key and falls
  back to the legacy merged blob when the split key is absent. A user
  upgrading from a pre-D-2 version therefore sees their existing settings with
  no visible change (both split keys missing → everything is served from the
  legacy blob). Even a half-persisted state (one split write failed) still
  serves every partition from whichever source holds it.
- **Writes**: every write goes to the split keys only. Config writes NEVER
  remove the legacy key (PM review fix for the D-2 race): the blob still
  carries the pre-D-1 stats value that the stats migration consumes. Removal
  is owned by the stats migration path instead — see below.
- **Legacy-key retirement**: after a stats migration completes successfully
  (`migrateLegacyStats` in `src/shared/stats.ts`, including its "nothing to
  migrate" path), the migration calls `removeLegacyConfigKeyOnce()`, which
  deletes the legacy key once per context — but only when BOTH split keys are
  in place by then, because until the first config write the legacy blob is
  still the read fallback for global/channels and deleting it earlier would
  drop the user's settings. The ordering is therefore guaranteed:
  config writes never remove the key → the stats migration reads it before
  removing it → the migration's source can never be deleted out from under
  it. Removal is best-effort and never retried once performed; a failure just
  leaves dead data behind (reads prefer the split keys). Each context (tab /
  content script / popup) runs its own memoized migration and its own
  once-flag; removal is idempotent, so multi-tab needs no coordination — a
  tab whose migration runs after another tab removed the key reads
  legacy=0 while the value already lives in local. If the splits never land
  (the user never changes any setting), the legacy key simply stays as the
  read fallback it still is.
- **Import / export**: the file format is completely unchanged (single v1 JSON
  containing `global` / `channels` / `stats`), so backups and old-version
  files keep working. Imports sanitize via `mergeConfig` and persist through
  the split-key write path.
- **Downgrade boundary**: rolling back to a pre-D-2 version reads the legacy
  merged key. Before the first config write (and while the split keys are
  missing) it sees the full pre-upgrade snapshot. After the split keys are in
  place AND the stats migration retired the legacy key, it reads an empty
  config (defaults); if the retirement has not happened yet, it sees the
  pre-upgrade snapshot — changes made since the upgrade are not visible to
  it either way. Re-upgrading restores the split-key data. Import/export
  files are unaffected.

## Notes
- All schema changes should bump `version` and add migration logic.
- Prefer adding new fields with safe defaults to keep backward compatibility.
- Import/export features rely on `version === 1` and replace the full config object.
- The sync `storage.onChanged` listeners (content script, popup) observe the
  two split keys only; the legacy key is not watched.
