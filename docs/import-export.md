# Import and Export Settings

Settings are stored as a single JSON object in `chrome.storage.sync`. The options page provides tools to export and import that JSON.

## Export
- Action: downloads `bilibili-speed-master-config.json`.
- Content: current config object, formatted with indentation.

## Import
- Accepts a `.json` file.
- Validates `version === 1`.
- Overwrites the entire config on success.

## Error Handling
- Invalid or malformed files show an error message.
- Users must confirm before overwriting existing settings.
