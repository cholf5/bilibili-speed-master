# Time Saved Tracking

The extension tracks cumulative "time saved" when playback speed exceeds 1.0x.

## Calculation
- We observe `video.currentTime` changes and the current playback rate.
- For each positive time delta, the saved time is:
  - `saved = delta * (rate - 1) / rate`
- Only rates greater than 1.0x contribute to savings.

## Persistence
- Time saved is accumulated in memory and flushed to `chrome.storage.local`
  under the key `bilibiliSpeedMasterStats` every 30 seconds (D-1).
- Additional flushes run when playback pauses, the tab becomes hidden, or the
  page is unloaded (pagehide / beforeunload), so the loss window stays
  bounded.
- The old total stored in the sync config's `stats.timeSavedSeconds` field is
  migrated into local on the first stats read or write with `max` semantics
  (see `docs/storage.md`); popup and options display the value via
  `getSavedStats()`.

## Counting Semantics and Background Behavior (统计口径与后台行为)

Added in D-12. A `timeupdate` interval counts toward time saved only when the
media-time advance is **proportional to the wall-clock time** that actually
elapsed (`shouldCountPlaybackDelta` in `src/shared/stats.ts`). This replaced
the old fixed 2s delta cutoff, under which muted background playback was at
risk of being discarded wholesale (see below).

### Rules

- Baseline (unchanged): the first tick after attach/navigation only
  establishes the baseline; `rate <= 1` never counts; `mediaDelta <= 0`
  (rewind, replay, pause ticks) never counts.
- Wall clock: each tick is paired with a monotonic `performance.now()`
  timestamp (never `Date.now()`), so system clock jumps cannot poison the
  proportion check.
- Proportion rule: with `wall` = wall seconds between ticks and `rate` the
  playback rate, the interval is discarded as a seek/anomaly when
  `mediaDelta > wall x rate x 1.5 + 0.5s`. The 50% relative headroom absorbs
  event-dispatch jitter and mid-interval rate changes (speed-up direction
  only: a rate DROP whose fast segment dominates the interval can still be
  discarded — a conservative undercount of one interval; the old fixed 2s
  cutoff discarded it too); the 0.5s absolute floor keeps short foreground
  ticks (~4 ticks/s) safe from noise. Both are deliberately loose: a false
  discard loses the whole (possibly minutes-long) interval, while tolerating
  a rare small anomaly costs only seconds.
- Media running BEHIND the expectation (buffering, stalls) still counts its
  actual media delta — the saved value is computed from the real delta, so a
  stall simply saves less and no time is ever invented.
- Absolute fallback: any single media delta above 600s
  (`MEDIA_DELTA_HARD_CAP_S`) is discarded regardless of proportion. It is a
  sanity ceiling only, sized far above what browser throttling can
  legitimately produce, so it never clips real background playback.
- Throttled-gap caveat: the non-playing wall-clock time inside a long gap
  produces no credit — nothing is retroactively credited for time during
  which nothing played. Media that DID advance during the gap (e.g. play 20s
  then stall 40s) is still counted at its actual value on the next tick,
  because media running behind the expectation is never discarded. This is
  the accepted semantics, not a bug.

### Background specifics (Chrome)

- Tabs playing audible media are exempt from timer throttling (Chrome treats
  pages that are playing audio as effectively visible), so the audible
  background case was already mostly fine even under the old fixed cutoff.
- Chrome's documented intensive throttling targets timers, and applies to
  muted background tabs (timer delivery can stretch to roughly once per
  minute). `timeupdate`, however, is an event derived from the media
  pipeline, not a timer — whether its dispatch frequency is reduced in that
  state has NOT been measured. IF it is, the old fixed 2s threshold discarded
  the resulting single ~`wall x rate` media delta as a seek and muted
  background playback went uncounted; the proportion rule removes that
  failure mode. Whether the old rule actually lost a measurable amount of
  time is settled by real-device TC1/TC2 (see below), not by this analysis.
- Known remaining edge: a seek performed *inside* a long throttled gap is
  absorbed into the (proportionally larger) interval and counted. In practice
  seeking requires interacting with the tab, so this is rare.

### Outstanding real-device QA items

The verification matrix {foreground/background} x {audible/muted} x {2x for
10 minutes} cannot be executed in the dev environment and is handed to
real-device QA (TC1/TC2 in `kanban/issues/D-12-background-stats-verification.md`):
10 minutes of media at 2x should land ~5 minutes of saved time (error < 10%),
and TC3 (three seeks during playback) must not pollute the stat (covered by
unit tests, but a real-device regression pass is still recommended).
