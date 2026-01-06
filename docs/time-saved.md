# Time Saved Tracking

The extension tracks cumulative "time saved" when playback speed exceeds 1.0x.

## Calculation
- We observe `video.currentTime` changes and the current playback rate.
- For each positive time delta, the saved time is:
  - `saved = delta * (rate - 1) / rate`
- Only rates greater than 1.0x contribute to savings.

## Persistence
- Time saved is accumulated in memory and flushed to storage every few seconds.
- The total is stored in `stats.timeSavedSeconds` under the shared config object.
