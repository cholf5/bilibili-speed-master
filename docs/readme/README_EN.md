<p align="center">
  <img src="../../public/icon/512.png" width="120" alt="Bilibili Speed Master Logo" />
</p>

<h1 align="center">Bilibili Speed Master</h1>

<p align="center">
  <a href="../../README.md">简体中文</a> | <a href="README_EN.md">English</a>
</p>

<p align="center">
  Set your playback speed once — every Bilibili channel remembers it forever.
</p>

<p align="center">
  <a href="https://github.com/cholf5/bilibili-speed-master/releases/latest"><img src="https://img.shields.io/badge/Download-GitHub%20Release-blue" alt="Download from GitHub Release" /></a>
  <img src="https://img.shields.io/badge/License-MPL--2.0-blue" alt="License MPL-2.0" /></p>

> **Status**: v0.1.0 · [GitHub Release published](https://github.com/cholf5/bilibili-speed-master/releases/latest).

Bilibili's built-in speed menu forgets your preference — you re-adjust it on every video, and it tops out at 2×. This extension gives it a memory: set a global default speed, override it for the channels you watch often, and every video afterwards starts at your preferred pace. 0.1× to 4× in 0.1 steps, with all settings stored locally.

<p align="center">
  <img src="../../store-assets/screenshots/final/1280x800-popup.png" alt="Popup: current channel overridden to 1.5×, global speed, preferred quality, and time-saved stats" width="720" />
</p>

## Features

- **Global default speed**: Channels without their own setting use the global speed.
- **Per-channel override**: Adjust the speed once on any video in a channel, and every future video there plays at that speed. Setting it back to the global value counts too — it's never misread as "unset".
- **Player badge**: A small control in the top-left corner of the video; click +/− to change speed, and manual changes are remembered as the channel's preference.
- **Keyboard control**: `>` speeds up, `<` slows down; seek and pause follow the familiar J/K/L scheme. Every shortcut can be rebound or disabled.
- **Time-saved stats**: Accumulates the time faster playback saves you, visible in the popup.

## Screenshots

<p align="center">
  <img src="../../store-assets/screenshots/final/1280x800-video.png" alt="Video page: a − 1.5x + badge in the player's top-left corner for direct speed control" width="720" />
</p>

<p align="center">
  <img src="../../store-assets/screenshots/final/1280x800-options.png" alt="Options page: time-saved stats, global speed, preferred quality, badge toggle, and the shortcuts list" width="720" />
</p>

<p align="center">
  <img src="../../store-assets/screenshots/final/1280x800-shortcuts.png" alt="Options page: each channel keeps its own speed, and every shortcut can be edited or disabled" width="720" />
</p>

## Installation

This extension is not published on the Chrome Web Store or AMO — listing requires a developer registration fee, which I've decided not to pay for now. To use it, install manually from the [GitHub Release](https://github.com/cholf5/bilibili-speed-master/releases/latest):

1. Download the zip for your browser (`chrome` or `firefox`) from the latest release and unzip it.
2. **Chrome**: open `chrome://extensions` → enable "Developer mode" (top right) → "Load unpacked" → select the unzipped folder.
3. **Firefox**: open `about:debugging` → "This Firefox" → "Load Temporary Add-on" → select the unzipped `manifest.json`.

> Temporary Firefox add-ons are removed when the browser restarts; you'll need to reload it after restarting.

## Security and Privacy

- Everything stays in your browser — no servers, no login.
- Only the `storage` permission is requested; no viewing data is ever uploaded.
- Bilibili's recommendations and playback behavior are left untouched.

## Open Source and Contribution

Bilibili Speed Master is open source. Issues and PRs are welcome.

- **Open**: Core logic, DOM adaptation, behavior interception, settings storage
- **Reserved**: Store assets (Logo / Banner), brand name, official release channels
- **Forks & repackaging**: must not be published in extension stores under the same name; store assets and brand name are not covered by the MPL-2.0 license
- **License**: MPL-2.0 — commercial use, modification, and distribution allowed; modified files must remain open source. [Full text](https://www.mozilla.org/en-US/MPL/2.0/)

## Development and Build

Requires Node.js and pnpm (the project is developed and built on Node 25).

```bash
pnpm install       # Install dependencies
pnpm dev           # Dev mode with hot reload
pnpm dev:firefox   # Firefox dev mode
pnpm build         # Production build
pnpm build:firefox # Production build for Firefox
pnpm zip           # Package as a release ZIP
pnpm test          # Run Vitest unit tests
pnpm compile       # Type-check only (no output)
```

For product and UI specs, see: [docs/spec.md](../spec.md), [docs/popup.md](../popup.md), [docs/options.md](../options.md)
