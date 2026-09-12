# B-1 Fix core playback bugs found in retro review

## Objective
Fix the correctness bugs that were left unverified when the project was shelved: user speed changes not persisting (or being wrongly overwritten), keyboard shortcuts hijacking the whole site, inflated/lost time-saved stats, dead popup current-speed control, and never-applied preferred quality.

## Subtasks
- B-1.1 Replace the `applying` 150ms grace gate in `handleRateChange` with programmatic-rate matching (user changes during the storage round-trip were being dropped)
- B-1.2 Add media-load guard + `defaultPlaybackRate` so load resets (SPA next video) are not persisted as user intent and speed survives source reloads
- B-1.3 Gate speed management + keyboard shortcuts to watch pages (`/video/`, `/bangumi/play/`), capture-phase keydown, ignore Ctrl/Alt/Meta, stop propagation to avoid double-handling with the player
- B-1.4 Time-saved: reset baseline on navigation (sentinel), cap per-event delta (seeks not counted), flush on `visibilitychange`/`pagehide`/`pause` (async write in `beforeunload` does not complete)
- B-1.5 Popup Current Speed stepper: enabled, sends `speed-master:set-current-speed` over the port / sendMessage fallback
- B-1.6 Apply `preferredQuality` best-effort: data-value codes 80/116/64/32/16, non-premium priority, active-state + per-video dedupe loop guards
- B-1.7 Selector fixes from live-DOM audit: search input `input.nav-search-input`, miniplayer→`.bpx-player-ctrl-pip` with `requestPictureInPicture()` fallback

## Developer
ZCode (GLM)

## Estimated Complexity
M

## Acceptance Criteria
- Channel override set at 1.75x survives full page reload and SPA next-video transitions (no silent reset to 1.0x)
- Rapid user speed changes are always persisted; player-control, keyboard, and popup changes all persist as channel overrides
- Keyboard shortcuts only act on watch pages; Space/arrow/f/i behave once (no double action); Ctrl+F etc. pass through
- Popup Current Speed +/- adjusts the playing video
- Time saved does not count seeks/transitions and survives tab close
- Preferred quality clicks the correct (non-premium) menu entry once per video when available

## Test Cases
- Live-player QA checklist (pending, needs a real extension host — see QA Notes):
  1. Set default 1.5x in popup → open video → player shows 1.5x
  2. `Shift+.` → 1.75x → reload page → speed still 1.75x and channel table shows the override
  3. Autoplay/SPA to next video → speed reapplies, override not reset to 1.0x
  4. Space toggles play exactly once (twice returns to original state)
  5. Ctrl+F opens find, does not fullscreen; `/` focuses Bilibili search box
  6. Homepage: Space scrolls the page; no key hijack
  7. Popup +/− on current speed changes playing video speed
  8. Preferred quality 1080p selects "1080P 高清" (not 大会员 60帧) when logged in
- UI automation via chrome-shim harness (executed 2026-09-12): popup steppers enabled, message contract `{type:'speed-master:set-current-speed', speed}` observed, default-speed and quality changes persisted through the storage round-trip; options table sorted by lastVisit, channel speed update and delete persisted
- Live-DOM audit on `https://www.bilibili.com/video/BV1AsiEB1E7Q` (executed 2026-09-12): channel anchor first-match is the UP link (spm `upinfo.head.click`, mid 16110280 agrees with `__INITIAL_STATE__`), `.up-name` and `img.bili-avatar-img` resolve, quality menu data-values are 116/80/64/32/16/0 with `bpx-state-active` on the active item, PIP button `.bpx-player-ctrl-pip` exists, legacy miniplayer class does not exist
- `pnpm compile`, `pnpm build`, `pnpm build:firefox` all pass

## Related Documents/Designs
- `docs/spec.md`, `docs/player-detection.md`, `docs/shortcuts.md`, `docs/time-saved.md`, `docs/popup.md`

## Dependent Tasks
- A-3, A-4, A-5, A-7, A-10

## Notes / Issues / Resolutions
- `window.__INITIAL_STATE__` is invisible to isolated-world content scripts in Chrome; the documented "preferred" detection path is dead code. The DOM fallback was proven correct on a real watch page (first space link = UP link), so the path was kept as-is rather than adding a MAIN-world bridge. Revisit if DOM fallback ever proves unreliable.
- `chrome.storage.sync.get/set` function-length heuristic kept; works for both callback (chrome) and promise (Firefox) shapes.
- Chrome 152 removed `--load-extension` entirely; registry external installs land DISABLED and are locked ("cannot be modified by user"); HKCU policy keys are access-denied on this machine. Live extension QA therefore needs a manual `chrome://extensions` → Developer mode → Load unpacked on `.output/chrome-mv3`.
- Test-harness artifacts (temp profiles, CRX, registry keys, headless Chrome) were all removed after the session.

## Review Comments
- (pending maintainer review)

## QA Notes
- Executed 2026-09-12: UI harness pass, live-DOM selector audit pass, compile/build pass (chrome + firefox). Live-player behavioral checklist above still requires manual execution with the extension loaded; remaining acceptance depends on it.
