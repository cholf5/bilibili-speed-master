# Popup Implementation Notes

This document summarizes how the popup UI is wired to configuration state.

## Structure Mapping
- Header/branding, controls, stats, rating, and options button are implemented in `entrypoints/popup/App.tsx`.
- Styles and layout tokens are in `entrypoints/popup/App.css` and `entrypoints/popup/style.css`.

## Data Wiring
- Default speed and preferred quality read/write `chrome.storage.sync` via `getConfig()` and `updateConfig()` from `src/shared/config.ts`.
- Current speed is shown as the stored default speed for now (no per-tab player state in popup yet).
- Total time saved uses `stats.timeSavedSeconds` and formats to hours with three decimals.

## Navigation
- The "More Options" button calls `runtime.openOptionsPage()` to open the options UI.
