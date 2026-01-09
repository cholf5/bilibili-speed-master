<p align="center">
  <img src="public/icon/512.png" width="120" alt="Bilibili Speed Master Logo" />
</p>

<h1 align="center">Bilibili Speed Master</h1>

<p align="center">
  Zarządzaj prędkością odtwarzania w Bilibili bez wysiłku.
</p>

<p align="center">
  <a href="README.md">简体中文</a> | <a href="README_EN.md">English</a> | <a href="README_ZH_TW.md">繁體中文</a> | <a href="README_JA.md">日本語</a> | <a href="README_KO.md">한국어</a> | <a href="README_ES.md">Español</a> | <a href="README_FR.md">Français</a> | <a href="README_DE.md">Deutsch</a> | <a href="README_RU.md">Русский</a> | <a href="README_PT_BR.md">Português (Brasil)</a> | <a href="README_IT.md">Italiano</a> | <a href="README_TR.md">Türkçe</a> | <a href="README_VI.md">Tiếng Việt</a> | <a href="README_TH.md">ไทย</a> | <a href="README_ID.md">Bahasa Indonesia</a> | <a href="README_AR.md">العربية</a> | <a href="README_HI.md">हिन्दी</a> | <a href="README_PL.md">Polski</a>
</p>

<p align="center">
  <a href="https://chrome.google.com/webstore/detail/..."><img src="https://img.shields.io/badge/Chrome-Install-brightgreen" alt="Zainstaluj w Chrome" /></a>
  <a href="https://addons.mozilla.org/firefox/addon/..."><img src="https://img.shields.io/badge/Firefox-Install-orange" alt="Zainstaluj w Firefox" /></a>
  <img src="https://img.shields.io/badge/License-MPL--2.0-blue" alt="License MPL-2.0" />
</p>

Masz dość zmiany prędkości przy każdym filmie na Bilibili? Chcesz różne prędkości dla kanałów?
**Bilibili Speed Master** zapamiętuje globalne i kanałowe preferencje. Ustaw raz i gotowe.
Działa całkowicie lokalnie, bez reklam i śledzenia.

---

## Najważniejsze

- **Globalna prędkość domyślna**: Używa prędkości globalnej, gdy kanał nie ma preferencji.
- **Nadpisanie na poziomie kanału**: Zmień prędkość na dowolnym filmie, a cały kanał ją zapamięta.
- **Przechwytywanie wszystkich kontroli**: UI odtwarzacza i skróty pozostają zsynchronizowane.
- **Powrót do globalnej też się liczy**: Wyraźny wybór nie jest traktowany jako "brak ustawienia".

> Dla kogo?
> - Fani maratonów anime
> - Miłośnicy treści tech / edukacyjnych
> - Każdy, kto chce oglądać wydajniej

---

## Bezpieczeństwo i prywatność

- **W pełni lokalnie**
- **Brak reklam / brak promocji**
- **Bez kont, bez wysyłania danych oglądania**
- **Nie zmienia rekomendacji ani strategii odtwarzania Bilibili**

---

## Instalacja

- [Zainstaluj dla Chrome](#)
- [Zainstaluj dla Firefox](#)

---

## Open source i wkład

Bilibili Speed Master jest open source. Issues i PR są mile widziane.

- **Otwarte**: Logika rdzeniowa, adaptacja DOM, przechwytywanie zachowań, przechowywanie ustawień
- **Zastrzeżone**: Materiały sklepu (Logo / Banner), nazwa marki, oficjalne kanały wydań
- **Licencja**: MPL-2.0 (Mozilla Public License 2.0: dozwolone użycie komercyjne, modyfikacja i dystrybucja; zmodyfikowane pliki muszą pozostać open source) [Pełny tekst](https://www.mozilla.org/en-US/MPL/2.0/)

---

## Logika działania (kliknij, aby rozwinąć)

<details>
<summary>Zobacz szczegóły</summary>

- **Globalna prędkość domyślna**
  Gdy kanał nie ma ustawień, używana jest prędkość globalna, aby uniknąć powtarzających się zmian.

- **Nadpisanie na poziomie kanału**
  Po zmianie prędkości na dowolnym filmie w kanale, wszystkie filmy z tego kanału grają w tej prędkości.

- **Przechwytywanie działań użytkownika**
  Kontrolki odtwarzacza lub skróty aktualizują preferencję kanału.

- **Powrót do globalnej też się liczy**
  Zapobiega klasyfikowaniu wyraźnego wyboru jako "brak preferencji".

</details>

---

## Rozwój i build

```bash
pnpm dev           # Tryb dev z hot reload
pnpm dev:firefox   # Tryb dev dla Firefox
pnpm build         # Build produkcyjny
pnpm build:firefox # Build produkcyjny dla Firefox
pnpm zip           # Spakuj jako ZIP do sklepu
pnpm compile       # Tylko sprawdzanie typów (bez wyjścia)
```

Specyfikacje produktu i UI: [docs/spec.md](docs/spec.md), [docs/popup.md](docs/popup.md), [docs/options.md](docs/options.md)
