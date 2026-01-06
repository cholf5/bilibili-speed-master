# A-5 Build popup UI and wiring

## Objective
Implement the popup UI per design and wire controls to the config state.

## Subtasks
- Build header, speed controls, quality selector, stats, and footer button
- Wire default speed and preferred quality to storage
- Link the options button to the options page

## Developer
Codex

## Estimated Complexity
M

## Acceptance Criteria
- Popup layout matches `docs/popup.md` structure
- Default speed and preferred quality update storage
- Options button opens the options page

## Test Cases
- Open popup and change default speed, verify persistence
- Click options and verify the options page opens

## Related Documents/Designs
- `docs/popup.md`
- `docs/popup-implementation.md`

## Dependent Tasks
- A-2 Define storage schema and config service
- A-10 Track and display time saved stats

## Notes / Issues / Resolutions
- Current speed display reflects the stored default speed; live player state is not exposed to the popup yet.

## Review Comments
- 

## QA Notes
- 
