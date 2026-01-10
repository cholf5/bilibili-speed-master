<p align="center">
  <img src="../../public/icon/512.png" width="120" alt="Bilibili Speed Master Logo" />
</p>

<h1 align="center">Bilibili Speed Master</h1>

<p align="center">
  Make playback speed management on Bilibili effortless.
</p>

<p align="center">
  <a href="../../README.md">简体中文</a> | <a href="README_EN.md">English</a> | <a href="README_ZH_TW.md">繁體中文</a> | <a href="README_JA.md">日本語</a> | <a href="README_KO.md">한국어</a> | <a href="README_ES.md">Español</a> | <a href="README_FR.md">Français</a> | <a href="README_DE.md">Deutsch</a> | <a href="README_RU.md">Русский</a> | <a href="README_PT_BR.md">Português (Brasil)</a> | <a href="README_IT.md">Italiano</a> | <a href="README_TR.md">Türkçe</a> | <a href="README_VI.md">Tiếng Việt</a> | <a href="README_TH.md">ไทย</a> | <a href="README_ID.md">Bahasa Indonesia</a> | <a href="README_AR.md">العربية</a> | <a href="README_HI.md">हिन्दी</a> | <a href="README_PL.md">Polski</a>
</p>

<p align="center">
  <a href="https://chrome.google.com/webstore/detail/..."><img src="https://img.shields.io/badge/Chrome-Install-brightgreen" alt="Install on Chrome" /></a>
  <a href="https://addons.mozilla.org/firefox/addon/..."><img src="https://img.shields.io/badge/Firefox-Install-orange" alt="Install on Firefox" /></a>
  <img src="https://img.shields.io/badge/License-MPL--2.0-blue" alt="License MPL-2.0" />
</p>

Tired of adjusting speed every time you open a Bilibili video? Want different speeds per channel?
**Bilibili Speed Master** remembers your global and per-channel preferences. Set it once and it just works.
Runs completely locally with no ads and no tracking.

---

## Highlights

- **Global default speed**: Use your chosen global speed when a channel has no preference.
- **Channel-level override**: Adjust speed on any video and the whole channel is remembered.
- **Intercept all controls**: Player UI and shortcuts are captured so preferences stay in sync.
- **Switching back to global still counts**: Your explicit choice is never treated as "unset".

> Who is it for?
> - Anime binge watchers
> - Tech / learning content fans
> - Anyone who wants to watch more efficiently

---

## Security and Privacy

- **Fully local**  
- **No ads / no promotion**  
- **No accounts, no viewing data upload**  
- **Does not alter Bilibili recommendations or playback strategy**

---

## Installation

- [Install for Chrome](#)  
- [Install for Firefox](#)  

---

## Open Source and Contribution

Bilibili Speed Master is open source. Issues and PRs are welcome.

- **Open**: Core logic, DOM adaptation, behavior interception, settings storage  
- **Reserved**: Store assets (Logo / Banner), brand name, official release channels  
- **License**: MPL-2.0 (Mozilla Public License 2.0: commercial use, modification, and distribution allowed; modified files must remain open source) [Full text](https://www.mozilla.org/en-US/MPL/2.0/)

---

## Behavior Logic (click to expand)

<details>
<summary>Click to view details</summary>

- **Global default speed**  
  When a channel has no custom setting, the global speed is used to avoid repetitive adjustments.

- **Channel-level override**  
  After adjusting any video in a channel, all videos in that channel play at that speed.

- **Intercept user actions**  
  Whether from player controls or shortcuts, any manual change updates the channel preference.

- **Switching back to global still counts**  
  Avoids misclassifying explicit choices as "no preference".

</details>

---

## Development and Build

```bash
pnpm dev           # Dev mode with hot reload
pnpm dev:firefox   # Firefox dev mode
pnpm build         # Production build
pnpm build:firefox # Production build for Firefox
pnpm zip           # Package as a store ZIP
pnpm compile       # Type-check only (no output)
```

For product and UI specs, see: [docs/spec.md](../spec.md), [docs/popup.md](../popup.md), [docs/options.md](../options.md)
