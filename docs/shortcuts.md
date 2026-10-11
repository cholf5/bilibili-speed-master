# Keyboard Shortcuts

The extension implements YouTube-style shortcuts on Bilibili video pages. All
of them are **configurable**: open the options page and edit the
**Keyboard Shortcuts** section.

## Configuring shortcuts

- Each row shows an action and its current key. **Change** starts recording:
  press the new key (modifier combinations such as `Ctrl`+`J` or `Shift`+`N`
  are recorded as part of the binding), press **Esc** to cancel, or click
  anywhere outside the row to cancel. Bare modifier presses are ignored while
  recording.
- If the recorded key is already used by another enabled action, the row
  shows a conflict message and offers **Swap**: the other action takes over
  the previous binding of the action you were editing (so exactly one action
  ever owns a given key).
- **Disable** clears a binding (stored as `null`); the action then does
  nothing until you record a new key for it.
- **Restore Defaults** resets the whole list to the table below.

Bindings are stored per **physical key** (`event.code`, layout-independent),
so a binding recorded on one keyboard layout still fires on another (e.g.
Cyrillic). The recorded character (`event.key`) is kept as a display label and
as a fallback match for events without a usable code — numpad digits, for
example, still match the `0`–`9` bindings recorded on the top row.

## Full Default Shortcut List

| Keyboard shortcut | Function |
| --- | --- |
| Spacebar | Play / Pause. |
| `k` | Play / Pause in player. |
| `m` | Mute / unmute the video. |
| `j` | Seek backward 10 seconds in player. |
| `l` | Seek forward 10 seconds in player. |
| `←` / `→` | Seek backward/forward 5 seconds. |
| `↑` / `↓` | Increase/Decrease volume 5%. |
| Home / End | Seek to the beginning/end of the video. |
| `.` | While the video is paused, skip to the next frame. |
| `,` | While the video is paused, go back to the previous frame. |
| `Shift` + `.` (`>`) | Speed up the video playback rate. |
| `Shift` + `,` (`<`) | Slow down the video playback rate. |
| `f` | Toggle fullscreen (press again or Escape to exit). |
| `c` | Toggle captions/subtitles if available. |
| `i` | Open the Miniplayer (picture-in-picture fallback). |
| `Shift` + `N` | Move to the next video (playlist or suggested). |
| `Shift` + `P` | Move to the previous video (playlist only). |
| `/` | Go to search box. |
| Numbers `1` to `9` | Seek to 10% to 90% of the video. |
| Number `0` | Seek to the beginning of the video. |
| Play/Pause Media Key | Play / Pause. |
| Stop Media Key | Stop (pause and rewind to the start). |
| Next Track Media Key | Moves to the next track in a playlist. |

(Chapters via `Ctrl` + `←`/`→` are listed in YouTube's own docs but have never
been implemented by this extension; media keys are passed through to the page
instead of being consumed.)

## Notes

- Shortcuts are ignored while typing in inputs, textareas, selects, or
  editable fields, while an IME composition is in progress, while a focus is
  inside the extension's speed widget, and while a button, link, or
  `role="button"` control has focus — Space/Enter then activate that control
  natively instead of reaching the player.
- `Ctrl`/`Alt`/`Cmd` combinations are only active if you record them as part
  of a binding; by default no binding uses them, and they fall through to the
  page untouched.
- Speed changes trigger the same per-channel persistence as player controls.
- Customizations apply to already-open video pages immediately via
  `storage.onChanged` (no reload needed).
