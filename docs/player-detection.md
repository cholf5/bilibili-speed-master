# Player Detection and SPA Handling

This project relies on DOM inspection and SPA hooks to find the video player,
identify the channel, and re-apply speed rules on navigation.

## Video Player Location
- Primary selector: `document.querySelector('video')`
- Player container (for fullscreen controls):
  - `.bpx-player-container` (new player)
  - `.bilibili-player-video` (legacy player)

## Channel Identification
On SPA transitions Bilibili swaps the video element's source seconds before the
UP-panel DOM updates (measured ~6-10 s lag with an event-timing probe), so the
DOM alone cannot be trusted to identify the channel of the currently playing
video. Identification therefore has two tiers:

1. **Authoritative (video pages only)** — the URL's video id
   (`/video/<id>`, BV or legacy av form) updates together with the media, so
   the content script resolves the channel from
   `api.bilibili.com/x/web-interface/view?bvid=…` (or `aid=…`), caches the
   result per video id, and re-applies / persists speed rules when the
   resolve lands (see `reconcileAfterResolve` in `entrypoints/content.ts`).
   Speed persistence and visit recording wait for this resolve on video
   pages, so a lagging DOM can never write into the previous channel's
   record.
2. **DOM fallback** — used while the resolve is in flight (provisional speed
   apply, corrected on reconcile) and on pages without a video id
   (`/bangumi/play/`):
   - Prefer `a[href*="space.bilibili.com/"][href*="upinfo"]` (the UP-panel
     link, marked by its spm parameter), then the first
     `a[href*="space.bilibili.com/"]` for the channel ID
   - `.up-info .up-name` or `.up-info__name` for the channel name

## Rate-Change Classification (who changed the speed?)
`ratechange` events reach `handleRateChange` from four kinds of sources:
the extension's own applies (marked `programmaticRate`), extension user paths
(keyboard `>`/`<`, popup stepper — flagged `lastUserIntentAt`), the player's
speed control (flagged by a `pointerdown` listener on
`.bpx-player-ctrl-playbackrate` and legacy selectors), and Bilibili's
automatic behavior. The automatic case matters: Bilibili's player remembers
the last speed set through its own UI site-wide and re-applies it to new
videos seconds after they start (outside the 500ms media-load guard).

Handling:
- Unexplained rate changes (no recent user-intent flag) within 6s of
  `loadstart` are treated as player-init noise: reverted to the authoritative
  channel target and never persisted.
- Everything else persists as a channel override, as before.

Note: `window.__INITIAL_STATE__` is invisible to isolated-world content
scripts in Chrome, so the documented structured-data path from earlier
revisions is dead code and was removed from the flow (see B-1 notes).

## SPA Navigation and Video Refresh
Apply speed rules when any of these events occur:
- URL changes:
  - Intercept `history.pushState` and `history.replaceState`
  - Listen to `popstate`
  - Poll `location.href` as a safety net
- Video element changes:
  - `MutationObserver` watching for new `<video>` nodes
- Video reloads:
  - `loadedmetadata`, `play`, or `emptied` events on the `<video>` element
