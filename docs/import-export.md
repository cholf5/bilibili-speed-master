# Import and Export Settings

Settings are stored as a single JSON object in `chrome.storage.sync` (with
saved-time statistics in `chrome.storage.local` since D-1). The options page
provides tools to export and import that JSON.

## Export
- Action: downloads `bilibili-speed-master-config.json`.
- Content: current config object plus the `stats` section (which since D-1
  comes from `chrome.storage.local`), formatted with indentation. The file
  format is unchanged and stays backward compatible.

## Import
- Accepts a `.json` file.
- Validates `version === 1`.
- Overwrites the entire config on success.
- The imported `stats.timeSavedSeconds` is merged into `chrome.storage.local`
  with `max` semantics, so restoring an older backup cannot roll the saved
  counter backwards.

## Error Handling
- Invalid or malformed files show an error message.
- Users must confirm before overwriting existing settings.
