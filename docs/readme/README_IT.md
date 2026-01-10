<p align="center">
  <img src="../../public/icon/512.png" width="120" alt="Bilibili Speed Master Logo" />
</p>

<h1 align="center">Bilibili Speed Master</h1>

<p align="center">
  Rendi semplice la gestione della velocità su Bilibili.
</p>

<p align="center">
  <a href="../../README.md">简体中文</a> | <a href="README_EN.md">English</a> | <a href="README_ZH_TW.md">繁體中文</a> | <a href="README_JA.md">日本語</a> | <a href="README_KO.md">한국어</a> | <a href="README_ES.md">Español</a> | <a href="README_FR.md">Français</a> | <a href="README_DE.md">Deutsch</a> | <a href="README_RU.md">Русский</a> | <a href="README_PT_BR.md">Português (Brasil)</a> | <a href="README_IT.md">Italiano</a> | <a href="README_TR.md">Türkçe</a> | <a href="README_VI.md">Tiếng Việt</a> | <a href="README_TH.md">ไทย</a> | <a href="README_ID.md">Bahasa Indonesia</a> | <a href="README_AR.md">العربية</a> | <a href="README_HI.md">हिन्दी</a> | <a href="README_PL.md">Polski</a>
</p>

<p align="center">
  <a href="https://chrome.google.com/webstore/detail/..."><img src="https://img.shields.io/badge/Chrome-Install-brightgreen" alt="Installa su Chrome" /></a>
  <a href="https://addons.mozilla.org/firefox/addon/..."><img src="https://img.shields.io/badge/Firefox-Install-orange" alt="Installa su Firefox" /></a>
  <img src="https://img.shields.io/badge/License-MPL--2.0-blue" alt="License MPL-2.0" />
</p>

Stanco di regolare la velocità ogni volta su Bilibili? Vuoi velocità diverse per canale?
**Bilibili Speed Master** ricorda le preferenze globali e per canale. Imposta una volta e funziona.
Funziona totalmente in locale, senza pubblicità né tracciamento.

---

## Punti salienti

- **Velocità globale predefinita**: Usa la velocità globale quando un canale non ha preferenze.
- **Override per canale**: Regola un video e l'intero canale verrà ricordato.
- **Intercetta tutti i controlli**: UI del player e scorciatoie restano sincronizzate.
- **Tornare al globale conta**: La scelta esplicita non è mai "non impostata".

> Per chi è?
> - Chi guarda anime in maratona
> - Appassionati di contenuti tech / learning
> - Chi vuole guardare in modo più efficiente

---

## Sicurezza e privacy

- **Completamente locale**
- **Nessuna pubblicità / nessuna promozione**
- **Nessun account, nessun upload di dati di visione**
- **Non modifica raccomandazioni o strategia di riproduzione di Bilibili**

---

## Installazione

- [Installa per Chrome](#)
- [Installa per Firefox](#)

---

## Open source e contributi

Bilibili Speed Master è open source. Issue e PR sono benvenuti.

- **Aperto**: Logica core, adattamento DOM, intercettazione del comportamento, salvataggio impostazioni
- **Riservato**: Asset dello store (Logo / Banner), nome del brand, canali ufficiali di rilascio
- **Licenza**: MPL-2.0 (Mozilla Public License 2.0: uso commerciale, modifica e distribuzione consentiti; i file modificati devono restare open source) [Testo completo](https://www.mozilla.org/en-US/MPL/2.0/)

---

## Logica di comportamento (clicca per espandere)

<details>
<summary>Vedi dettagli</summary>

- **Velocità globale predefinita**
  Quando un canale non ha impostazioni, viene usata la velocità globale per evitare regolazioni ripetute.

- **Override per canale**
  Dopo aver regolato un video in un canale, tutti i video del canale usano quella velocità.

- **Intercetta azioni utente**
  Controlli del player o scorciatoie aggiornano la preferenza del canale.

- **Tornare al globale conta**
  Evita di classificare scelte esplicite come "nessuna preferenza".

</details>

---

## Sviluppo e build

```bash
pnpm dev           # Modalità dev con hot reload
pnpm dev:firefox   # Modalità dev per Firefox
pnpm build         # Build di produzione
pnpm build:firefox # Build di produzione per Firefox
pnpm zip           # Pacchetto ZIP per lo store
pnpm compile       # Solo controllo tipi (nessun output)
```

Per specifiche prodotto e UI: [docs/spec.md](../spec.md), [docs/popup.md](../popup.md), [docs/options.md](../options.md)
