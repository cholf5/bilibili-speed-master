# B-2 Fix cross-channel speed contamination on SPA transitions

## Objective
Stop one channel's speed from leaking into other channels' videos. User report: adjusting speed while watching channel A made channels B/C/... play at that speed (and their option-page records got corrupted over time).

## Root Cause (verified live with an event-timing probe on real watch pages)
- Chrome isolated-world content scripts cannot read `window.__INITIAL_STATE__` (already noted in B-1), so `getChannelInfo()` always used the DOM fallback: the first `a[href*="space.bilibili.com/"]` on the page.
- On SPA transitions (related-video click, autoplay next), Bilibili swaps the media **seconds before** the UP-panel DOM updates. Measured: new video's `loadedmetadata`/`play` fired while the first space link still reported the previous channel; the link caught up ~6 s later (10+ s in one case).
- All speed apply points (pushState, media events, URL poll) fire inside that lag window, so `applySpeedForVideo` applied the **previous** channel's override to the new video, and nothing re-applied when the DOM finally updated. `handleRateChange` / `recordChannelVisit` could also write into the previous channel's record.
- Leak self-corrected only by accident (time-saved stats flush at >1x triggers `storage.onChanged` → re-apply with updated DOM), which made the bug look intermittent.
- Ruled out: Bilibili's own player does not persist externally-set `playbackRate` into `localStorage.bilibili_player_settings` (verified: stays absent after setting 2x via JS).

## Subtasks
- B-2.1 Authoritative channel resolution: `resolveChannel(videoId)` fetches `api.bilibili.com/x/web-interface/view` (`bvid=` or `aid=` for legacy `/video/avN` URLs), caches per video id in a Map, dedupes in-flight requests, no caching of failures (natural retry)
- B-2.2 `getCurrentChannel()` = authoritative-for-current-URL-video ?? DOM fallback (DOM fallback now prefers the `upinfo`-spm-marked UP link before the first space link)
- B-2.3 Reconciler `reconcileAfterResolve`: when the real channel lands for the current video, re-apply speed if the rate is untouched since our provisional apply; otherwise persist the current rate as user intent under the real channel; then record the channel visit
- B-2.4 Persistence gating: `handleRateChange` and `recordChannelVisit` return early on `/video/` pages until the authoritative channel is cached (bangumi pages keep DOM-fallback behavior)
- B-2.5 `applySpeedForVideo` records `appliedRate`/`appliedForVideoId` bookkeeping used by the reconciler

## Developer
ZCode (GLM)

## Estimated Complexity
M

## Acceptance Criteria
- SPA transition from channel A (2x) to channel B: B's video plays at B's own override (or global default) once the resolve lands (~100-500 ms after navigation); any rate set during the lag window is persisted to B, never to A
- Cross-channel SPA navigation never writes into the previous channel's record
- Full page loads and same-channel transitions behave exactly as before
- Bangumi pages unchanged (DOM fallback, no view-API authority)
- `pnpm compile`, `pnpm build`, `pnpm build:firefox` pass

## Test Cases
1. Load unpacked `.output/chrome-mv3`, set channel A override 2x, default 1x
2. Watch A's video (2x), click a related video of channel B → B starts at 1x (may briefly start at A's 2x for <0.5 s before the reconcile corrects it)
3. During the first second of B's video press `>` → options page shows the new speed on B's row, A's row unchanged
4. Autoplay next (same channel) → speed reapplies per that channel's override
5. Direct-open a video URL → override applies immediately as before
6. Bangumi page speed change still persists via DOM fallback

## Related Documents/Designs
- `docs/player-detection.md` (updated), `docs/spec.md`, B-1 (dead `__INITIAL_STATE__` path note)

## Dependent Tasks
- B-1

## Notes / Issues / Resolutions
- Live probe evidence (2026-09-13, real-click SPA transition A→B): `emptied`/`loadstart`/`loadedmetadata`/`play`/`playing` for the new video all fired while the first space link still resolved to the old channel mid; the DOM updated ~6 s later. URL (`location.pathname`) already carried the new video id at those events — that is why resolution is keyed by the URL video id, not the DOM.
- View API verified callable from page origin (MV3 content-script fetch shares page CORS semantics; Bilibili's own frontend calls the same endpoint): code=0 in ~74 ms, `owner.mid/name/face` all present; API result cross-checked equal to the page's DOM UP link.
- Chrome 152 cannot `--load-extension` (see B-1 QA notes): live checklist items 1-6 still need manual execution with the extension loaded via `chrome://extensions` → Developer mode.
- Known trade-off: if the view API request fails for a video, that video gets no channel-override application correction and no persistence until a later retry succeeds (degrades to pre-fix behavior for that video only).

## Review Comments
- (pending maintainer review)

## QA Notes
- (pending live-player verification)
