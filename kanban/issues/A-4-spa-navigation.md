# A-4 Handle SPA navigation and autoplay reapply

## Objective
Detect Bilibili SPA URL changes and autoplay transitions so speed rules reapply on new videos.

## Subtasks
- Monitor history or URL changes in the content script
- Re-detect the video element after navigation
- Reapply speed rules on each new video

## Developer
TBD

## Estimated Complexity
M

## Acceptance Criteria
- Speed rules reapply when URL changes without a full page reload
- Autoplay to next video triggers a reapply of speed

## Test Cases
- Navigate to a new video via in-page links and verify speed reapply
- Let autoplay advance and verify speed reapply

## Related Documents/Designs
- `docs/spec.md`

## Dependent Tasks
- A-3 Implement content script speed control

## Notes / Issues / Resolutions
- 

## Review Comments
- 

## QA Notes
- 
