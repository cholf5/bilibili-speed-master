# Storage Schema and Config Access

This project stores user settings in `chrome.storage.sync` under a single key.

## Storage Key
- Key: `bilibiliSpeedMaster`
- Value: JSON object described below

## Schema (v1)
```ts
type SpeedMasterConfig = {
  version: 1;
  global: {
    defaultSpeed: number;
    preferredQuality: string; // example: "auto"
  };
  channels: Record<string, {
    channelId: string;
    channelName: string;
    speed: number;
    lastVisit: string; // ISO timestamp
    avatarUrl?: string;
  }>;
  stats: {
    timeSavedSeconds: number;
  };
};
```

## Access Helpers
Use the helpers in `src/shared/config.ts`:
- `getConfig()` returns a merged config with defaults.
- `setConfig(config)` writes the full config.
- `updateConfig(updater)` reads, updates, and persists in one call.

## Notes
- All schema changes should bump `version` and add migration logic.
- Prefer adding new fields with safe defaults to keep backward compatibility.
