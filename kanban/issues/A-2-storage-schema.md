# A-2 Define storage schema and config service

## Objective
Define and implement the storage schema for global defaults, per-channel overrides, and user preferences using chrome.storage.sync.

## Subtasks
- Design a versioned config schema (global speed, per-channel speed, preferred quality, time saved)
- Implement read/write helpers with defaults and migration handling
- Document schema keys and expected types

## Developer
TBD

## Estimated Complexity
M

## Acceptance Criteria
- Storage helpers read and write config via chrome.storage.sync
- Default values are applied when storage is empty
- Schema is documented in code or docs

## Test Cases
- Set global speed, reload, and verify persistence
- Set a channel override, reload, and verify persistence

## Related Documents/Designs
- `docs/spec.md`
- `docs/options.md`
- `docs/popup.md`

## Dependent Tasks
- A-3 Implement content script speed control
- A-5 Build popup UI and wiring
- A-6 Build options UI and channel table
- A-9 Add import/export settings
- A-10 Track and display time saved stats

## Notes / Issues / Resolutions
- 

## Review Comments
- 

## QA Notes
- 
