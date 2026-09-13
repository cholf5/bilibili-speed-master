# B-3 Stop Bilibili's global speed restore from being persisted as a channel override

## Objective
User report after B-2: with global default 1.5x and a 1x override on channel A, opening channel B's video played 1.5x correctly, then minutes/seconds later flipped to 1x by itself — and channel B appeared in the options list with a 1x override.

## Root Cause
Bilibili's player remembers the last speed set through **its own UI** globally (site-wide) and re-applies it to new videos. That restore lands **after** the extension's apply points and outside the 500ms media-load guard, so `handleRateChange` saw a non-programmatic rate change with the authoritative channel already resolved and persisted it — writing Bilibili's global memory into channel B's record and clobbering the applied target.

Key distinctions from earlier findings:
- B-2 ruled out that externally-set `playbackRate` gets **saved** by Bilibili (verified: JS-set rate never entered their storage). This bug is the **reverse direction**: Bilibili restoring a speed its own UI saved earlier.
- Verified live: the modern player keeps its profile in `localStorage.bpx_player_profile` (the old `bilibili_player_settings` key no longer exists); the speed-menu popover lives inside `.bpx-player-ctrl-playbackrate` (unlogin state shows a "登录可享" lock, so restore timing could not be reproduced in the logged-out test profile — the field name for the remembered speed is unverified; the fix is deliberately storage-agnostic).

## Subtasks
- B-3.1 User-intent flag `lastUserIntentAt`, set by: extension keyboard `>`/`<`, popup/current-speed messages (both port and sendMessage paths), and `pointerdown` on the player's speed control container (`.bpx-player-ctrl-playbackrate` + legacy selectors — covers menu items and the slider)
- B-3.2 Player-init window `playerInitUntil` (loadstart + 6s, armed together with the media-load guard so quality switches re-arm it)
- B-3.3 Classifier in `handleRateChange`: unexplained rate change (no recent user intent) inside the player-init window is reverted to the authoritative channel target via `applySpeedForVideo` and never persisted; outside the window or with a recent intent flag it persists as today

## Developer
ZCode (GLM)

## Estimated Complexity
M

## Acceptance Criteria
- With Bilibili's own speed memory set to 1x (set via the player menu on any video), opening any channel without an override plays at the global default and **stays** there; the player's restore is reverted and nothing is written to the options list
- Speed changes made through Bilibili's speed menu still persist as channel overrides (inside and outside the init window)
- Extension keyboard `>`/`<` and popup steppers still persist immediately
- Long-press 3x acceleration is temporarily suppressed only during the 6s init window (known trade-off, accepted)

## Test Cases
1. Via Bilibili's speed menu set 1.0x on some video (this writes the player's global memory). Reload a video of a channel without an override → starts at global default 1.5x and does not flip to 1x; options list gains no entry
2. Same setup, click Bilibili's speed menu to 1.5x within the first seconds → persists as that channel's override (menu interaction flagged as user intent)
3. `Shift+,` twice right after a video starts → override persisted immediately
4. B-2 regression: SPA from channel A (2x) to channel B → B plays at its own override/default; no writes to A
5. `pnpm compile`, `pnpm build`, `pnpm build:firefox` pass

## Related Documents/Designs
- `docs/player-detection.md`, `kanban/issues/B-2-fix-cross-channel-speed-leak.md`

## Dependent Tasks
- B-2

## Notes / Issues / Resolutions
- The revert (re-assert) path reuses `applySpeedForVideo`, so it always lands on the authoritative channel target once B-2's resolve has cached it; if the resolve is still pending, the ratechange returns early at the authority gate and the reconciler re-classifies on landing (branch 2 → `handleRateChange` → classifier), so the two fixes compose.
- Classification is storage-agnostic on purpose: Bilibili's remembered-speed field in `bpx_player_profile` is unverified (injected `media.speed` was wiped by the player on `play`), and relying on it would break when Bilibili renames it.

## Review Comments
- (pending maintainer review)

## QA Notes
- (pending live-player verification; needs a logged-in profile for the Bilibili-menu paths)
