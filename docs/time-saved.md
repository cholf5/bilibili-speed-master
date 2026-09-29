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
