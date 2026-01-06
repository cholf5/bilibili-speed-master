# Options Implementation Notes

This document summarizes how the options page UI maps to config data.

## Structure Mapping
- Top navigation, summary cards, and channel table are implemented in `entrypoints/options/App.tsx`.
- Layout and styling live in `entrypoints/options/App.css` and `entrypoints/options/style.css`.

## Data Wiring
- Default speed and preferred quality update `chrome.storage.sync` using `getConfig()` and `updateConfig()` from `src/shared/config.ts`.
- Channel overrides are read from `config.channels` and sorted by `lastVisit` (most recent first).
- Per-channel stepper edits update the channel speed; delete removes the channel entry.

## Display Rules
- `Last Visit` is rendered as `YYYY-MM-DD HH:MM:SS` from ISO timestamps.
- When there are no overrides, a placeholder row is shown.

## Page Behavior
- Options open in a dedicated tab via `options_ui.open_in_tab` in `wxt.config.ts`.
