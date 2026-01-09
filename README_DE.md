<p align="center">
  <img src="public/icon/512.png" width="120" alt="Bilibili Speed Master Logo" />
</p>

<h1 align="center">Bilibili Speed Master</h1>

<p align="center">
  Machen Sie die Wiedergabegeschwindigkeit auf Bilibili mühelos steuerbar.
</p>

<p align="center">
  <a href="README.md">简体中文</a> | <a href="README_EN.md">English</a> | <a href="README_ZH_TW.md">繁體中文</a> | <a href="README_JA.md">日本語</a> | <a href="README_KO.md">한국어</a> | <a href="README_ES.md">Español</a> | <a href="README_FR.md">Français</a> | <a href="README_DE.md">Deutsch</a> | <a href="README_RU.md">Русский</a> | <a href="README_PT_BR.md">Português (Brasil)</a> | <a href="README_IT.md">Italiano</a> | <a href="README_TR.md">Türkçe</a> | <a href="README_VI.md">Tiếng Việt</a> | <a href="README_TH.md">ไทย</a> | <a href="README_ID.md">Bahasa Indonesia</a> | <a href="README_AR.md">العربية</a> | <a href="README_HI.md">हिन्दी</a> | <a href="README_PL.md">Polski</a>
</p>

<p align="center">
  <a href="https://chrome.google.com/webstore/detail/..."><img src="https://img.shields.io/badge/Chrome-Install-brightgreen" alt="In Chrome installieren" /></a>
  <a href="https://addons.mozilla.org/firefox/addon/..."><img src="https://img.shields.io/badge/Firefox-Install-orange" alt="In Firefox installieren" /></a>
  <img src="https://img.shields.io/badge/License-MPL--2.0-blue" alt="License MPL-2.0" />
</p>

Genervt, jedes Mal die Geschwindigkeit in Bilibili-Videos anzupassen? Möchten Sie unterschiedliche Geschwindigkeiten pro Kanal?
**Bilibili Speed Master** merkt sich globale und kanalbezogene Präferenzen. Einmal einstellen, dann funktioniert es automatisch.
Läuft vollständig lokal, ohne Werbung und ohne Tracking.

---

## Highlights

- **Globale Standardgeschwindigkeit**: Verwendet Ihre globale Geschwindigkeit, wenn ein Kanal keine Präferenz hat.
- **Kanalweite Überschreibung**: Geschwindigkeit in einem Video anpassen und der ganze Kanal merkt sie sich.
- **Alle Bedienelemente abfangen**: Player-UI und Shortcuts bleiben synchron.
- **Zurück zu global zählt auch**: Explizite Auswahl wird nie als "nicht gesetzt" behandelt.

> Für wen ist es?
> - Anime-Binge-Watcher
> - Tech-/Lerninhalte-Fans
> - Alle, die effizienter schauen wollen

---

## Sicherheit und Datenschutz

- **Vollständig lokal**
- **Keine Werbung / keine Promotion**
- **Keine Konten, kein Upload von Viewing-Daten**
- **Ändert keine Bilibili-Empfehlungen oder Wiedergabestrategien**

---

## Installation

- [Für Chrome installieren](#)
- [Für Firefox installieren](#)

---

## Open Source und Beitrag

Bilibili Speed Master ist Open Source. Issues und PRs sind willkommen.

- **Offen**: Kernlogik, DOM-Anpassung, Verhaltens-Intercept, Einstellungs-Speicherung
- **Reserviert**: Store-Assets (Logo / Banner), Markenname, offizielle Release-Kanäle
- **Lizenz**: MPL-2.0 (Mozilla Public License 2.0: kommerzielle Nutzung, Änderung und Verteilung erlaubt; geänderte Dateien müssen offen bleiben) [Volltext](https://www.mozilla.org/en-US/MPL/2.0/)

---

## Verhaltenslogik (zum Ausklappen)

<details>
<summary>Details anzeigen</summary>

- **Globale Standardgeschwindigkeit**
  Wenn ein Kanal keine Einstellung hat, wird die globale Geschwindigkeit verwendet, um wiederholte Anpassungen zu vermeiden.

- **Kanalweite Überschreibung**
  Nach einer Anpassung in einem Kanal spielen alle Videos dieses Kanals mit dieser Geschwindigkeit.

- **Benutzeraktionen abfangen**
  Player-Steuerung oder Shortcuts aktualisieren die Kanalpräferenz.

- **Zurück zu global zählt auch**
  Vermeidet die Einstufung expliziter Auswahl als "keine Präferenz".

</details>

---

## Entwicklung und Build

```bash
pnpm dev           # Dev-Modus mit Hot Reload
pnpm dev:firefox   # Firefox Dev-Modus
pnpm build         # Produktions-Build
pnpm build:firefox # Produktions-Build für Firefox
pnpm zip           # Als Store-ZIP packen
pnpm compile       # Nur Typprüfung (kein Output)
```

Produkt- und UI-Spezifikationen: [docs/spec.md](docs/spec.md), [docs/popup.md](docs/popup.md), [docs/options.md](docs/options.md)
