# Player Detection and SPA Handling

This project relies on DOM inspection and SPA hooks to find the video player,
identify the channel, and re-apply speed rules on navigation.

## Video Player Location
- Primary selector: `document.querySelector('video')`
- Player container (for fullscreen controls):
  - `.bpx-player-container` (new player)
  - `.bilibili-player-video` (legacy player)

## Channel Identification
Preferred order:
1. Read structured data from `window.__INITIAL_STATE__`:
   - `videoData.owner.mid` for channel ID
   - `videoData.owner.name` for channel name
   - `videoData.owner.face` for avatar
2. Fallback to DOM:
   - `a[href*="space.bilibili.com/"]` for channel ID
   - `.up-info .up-name` or `.up-info__name` for channel name

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
