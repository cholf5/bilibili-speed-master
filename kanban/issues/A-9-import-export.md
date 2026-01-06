# A-9 Add import/export settings

## Objective
Provide import and export for user settings to support backup and migration.

## Subtasks
- Add export action to download config as JSON
- Add import action with validation and overwrite confirmation
- Handle schema versioning on import

## Developer
TBD

## Estimated Complexity
M

## Acceptance Criteria
- Users can export current settings to a JSON file
- Users can import a JSON file and update settings
- Invalid files show a user-facing error

## Test Cases
- Export settings and verify file contents
- Import a valid file and verify settings update
- Import an invalid file and verify error handling

## Related Documents/Designs
- `docs/spec.md`

## Dependent Tasks
- A-2 Define storage schema and config service
- A-6 Build options UI and channel table

## Notes / Issues / Resolutions
- 

## Review Comments
- 

## QA Notes
- 
