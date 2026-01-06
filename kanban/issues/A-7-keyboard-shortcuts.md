# A-7 Implement keyboard shortcuts

## Objective
Add YouTube-style keyboard shortcuts for speed control on Bilibili videos.

## Subtasks
- Define the key bindings and actions for speed changes
- Listen for keyboard events in the content script
- Ensure shortcuts do not interfere with text inputs

## Developer
Codex

## Estimated Complexity
S

## Acceptance Criteria
- Keyboard shortcuts adjust speed in the player
- Shortcuts update channel overrides when used
- Shortcuts are ignored when focus is on inputs

## Test Cases
- Use shortcut keys on a video and verify speed updates
- Focus an input and verify shortcuts do not fire

## Related Documents/Designs
- `docs/spec.md`
- `docs/shortcuts.md`

## Dependent Tasks
- A-3 Implement content script speed control

## Notes / Issues / Resolutions
- Implemented the full YouTube-style shortcut list; non-speed actions use best-effort DOM controls.

## Review Comments
- 

## QA Notes
- 
