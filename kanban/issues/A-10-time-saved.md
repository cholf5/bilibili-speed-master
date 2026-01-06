# A-10 Track and display time saved stats

## Objective
Track cumulative time saved based on playback speed and display it in popup and options UI.

## Subtasks
- Define how time saved is calculated per playback session
- Persist cumulative time saved in storage
- Display time saved in popup and options summary

## Developer
Codex

## Estimated Complexity
M

## Acceptance Criteria
- Time saved is updated during playback sessions
- Cumulative total persists across browser restarts
- Popup and options display the saved total

## Test Cases
- Play a video at >1.0x and verify time saved increases
- Restart the browser and verify total persists

## Related Documents/Designs
- `docs/popup.md`
- `docs/options.md`
- `docs/time-saved.md`

## Dependent Tasks
- A-2 Define storage schema and config service
- A-3 Implement content script speed control

## Notes / Issues / Resolutions
- Time saved is calculated on `timeupdate` and flushed periodically to storage.

## Review Comments
- 

## QA Notes
- 
