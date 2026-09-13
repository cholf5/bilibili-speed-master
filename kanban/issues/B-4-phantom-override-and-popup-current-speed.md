# B-4 Fix phantom channel override from default-speed stepper and honest popup current-speed display

## Objective
Two user reports after B-2/B-3:
1. Fresh install (default 1x), open a video, click popup's Default Speed "+" five times: the popup's Current Speed jumps to 1.1x on the first click, then never follows again; the channel ends up with a phantom 1.1x override in the options list.
2. Open a Bilibili video BEFORE installing the extension and set 1.5x via the player menu; install the extension; the popup shows Default/Current both 1.0x while the video really plays 1.5x; after F5 the video resets to the 1.0x default.

## Root Cause
### Bug 1 — double `ratechange` from `applyPlaybackRate`
`applyPlaybackRate` assigns both `defaultPlaybackRate` and `playbackRate`. **Verified live (Chrome): assigning both fires two `ratechange` events; assigning only `defaultPlaybackRate` fires one.** Both events are queued after the synchronous assignments, so both handlers see the final rate.

Trace of the report: storage change from the first "+" click → `applySpeedForVideo` applies 1.1x, arming `programmaticRate = 1.1` → ratechange #1 matches and **immediately clears the marker** → ratechange #2 (from the `defaultPlaybackRate` assignment) finds no marker, is outside the media-load guard and the player-init window, and gets **persisted as a 1.1x channel override**. Every later "+" click then computes `channels[C]?.speed ?? default` = the phantom 1.1x, so the video never follows the rising default. Pre-B-1 this was masked by the old 150ms "applying" grace gate; B-1.1's precise matching reintroduced the hole.

### Bug 2 — popup lies when it cannot read the real speed
Content scripts are not injected into tabs that were open before installation, so the port/sendMessage probe fails and `currentSpeed` stays null; the popup then rendered `currentSpeed ?? defaultSpeed`, i.e. it presented the **default speed as the current speed**. (The F5 reset itself is the product working as designed: with no channel override the global default applies once the content script is active.)

## Subtasks
- B-4.1 `handleRateChange`: keep the `programmaticRate` marker until its 1s timer expires instead of clearing it on the first matching event, so both ratechange firings are swallowed (user changes to a different rate still never match and pass through)
- B-4.2 Popup: show "–" while the current speed is unknown (`currentSpeed === null`) instead of the default speed; drop the `displayedCurrentSpeed` fallback

## Developer
ZCode (GLM)

## Estimated Complexity
S

## Acceptance Criteria
- Five "+" clicks on Default Speed: the playing video follows 1.1 → 1.5x and the options list gains no phantom entry
- Popup on a tab opened before installation (or on a non-video page) shows "–" for Current Speed
- F5 after installation applies the global default to the video (as designed; documented)

## Test Cases
1. Fresh profile: default 1x → open video → popup "+" x5 on default → video plays 1.5x; options list empty
2. Install with a bilibili tab already open and playing at 1.5x → popup Current Speed shows "–"; after F5 the video plays at the global default
3. Regression: B-2/B-3 scenarios (SPA channel switch, Bilibili restore revert, keyboard/popup persistence) still pass
4. `pnpm compile`, `pnpm build`, `pnpm build:firefox` pass

## Related Documents/Designs
- `kanban/issues/B-2-fix-cross-channel-speed-leak.md`, `kanban/issues/B-3-stop-player-restore-persistence.md`, `docs/popup.md`

## Dependent Tasks
- B-1, B-2, B-3

## Notes / Issues / Resolutions
- ratechange firing for `defaultPlaybackRate` assignments verified empirically: both-changed → 2 events, default-only → 1 event (Chrome 15x, 2026-09-13).
- The popup's "+" still starts from the default speed when the real rate is unknown and optimistically updates local state; if no content script exists in the tab the send silently fails. Accepted for now.

## Review Comments
- (pending maintainer review)

## QA Notes
- (pending live verification)
