<p align="center">
  <img src="../../public/icon/512.png" width="120" alt="Bilibili Speed Master Logo" />
</p>

<h1 align="center">Bilibili Speed Master</h1>

<p align="center">
  Gérez la vitesse de lecture sur Bilibili en toute simplicité.
</p>

<p align="center">
  <a href="../../README.md">简体中文</a> | <a href="README_EN.md">English</a> | <a href="README_ZH_TW.md">繁體中文</a> | <a href="README_JA.md">日本語</a> | <a href="README_KO.md">한국어</a> | <a href="README_ES.md">Español</a> | <a href="README_FR.md">Français</a> | <a href="README_DE.md">Deutsch</a> | <a href="README_RU.md">Русский</a> | <a href="README_PT_BR.md">Português (Brasil)</a> | <a href="README_IT.md">Italiano</a> | <a href="README_TR.md">Türkçe</a> | <a href="README_VI.md">Tiếng Việt</a> | <a href="README_TH.md">ไทย</a> | <a href="README_ID.md">Bahasa Indonesia</a> | <a href="README_AR.md">العربية</a> | <a href="README_HI.md">हिन्दी</a> | <a href="README_PL.md">Polski</a>
</p>

<p align="center">
  <a href="https://chrome.google.com/webstore/detail/..."><img src="https://img.shields.io/badge/Chrome-Install-brightgreen" alt="Installer sur Chrome" /></a>
  <a href="https://addons.mozilla.org/firefox/addon/..."><img src="https://img.shields.io/badge/Firefox-Install-orange" alt="Installer sur Firefox" /></a>
  <img src="https://img.shields.io/badge/License-MPL--2.0-blue" alt="License MPL-2.0" />
</p>

Marre d'ajuster la vitesse à chaque vidéo sur Bilibili ? Vous voulez des vitesses différentes par chaîne ?
**Bilibili Speed Master** mémorise vos préférences globales et par chaîne. Réglez une fois, et c'est tout.
Fonctionne entièrement en local, sans publicité ni suivi.

---

## Points forts

- **Vitesse globale par défaut** : Utilise votre vitesse globale lorsqu'une chaîne n'a pas de préférence.
- **Override par chaîne** : Ajustez la vitesse sur une vidéo et toute la chaîne s'en souvient.
- **Interception de tous les contrôles** : Interface du lecteur et raccourcis restent synchronisés.
- **Revenir au global compte aussi** : Votre choix explicite n'est jamais traité comme « non défini ».

> Pour qui ?
> - Fans de marathons d'anime
> - Passionnés de tech / apprentissage
> - Ceux qui veulent regarder plus efficacement

---

## Sécurité et confidentialité

- **Entièrement local**
- **Pas de pub / pas de promotion**
- **Pas de compte, pas d'envoi de données de visionnage**
- **Ne modifie pas les recommandations ni la stratégie de lecture de Bilibili**

---

## Installation

- [Installer pour Chrome](#)
- [Installer pour Firefox](#)

---

## Open source et contribution

Bilibili Speed Master est open source. Issues et PR sont les bienvenus.

- **Ouvert** : Logique principale, adaptation DOM, interception du comportement, stockage des réglages
- **Réservé** : Assets du store (Logo / Banner), nom de marque, canaux officiels
- **Forks et redistributions** : interdiction de publier sous le même nom sur les stores d'extensions ; les assets du store et le nom de marque ne sont pas couverts par la MPL-2.0
- **Licence** : MPL-2.0 (Mozilla Public License 2.0 : usage commercial, modification et distribution autorisés ; les fichiers modifiés doivent rester open source) [Texte complet](https://www.mozilla.org/en-US/MPL/2.0/)

---

## Logique de comportement (cliquer pour déplier)

<details>
<summary>Voir les détails</summary>

- **Vitesse globale par défaut**
  Si une chaîne n'a pas de réglage, la vitesse globale est utilisée pour éviter les ajustements répétés.

- **Override par chaîne**
  Après ajustement sur une vidéo d'une chaîne, toutes les vidéos de cette chaîne utilisent cette vitesse.

- **Interception des actions utilisateur**
  Les contrôles du lecteur ou les raccourcis mettent à jour la préférence de la chaîne.

- **Revenir au global compte aussi**
  Évite de classer une sélection explicite comme « aucune préférence ».

</details>

---

## Développement et build

```bash
pnpm dev           # Mode dev avec rechargement à chaud
pnpm dev:firefox   # Mode dev pour Firefox
pnpm build         # Build de production
pnpm build:firefox # Build de production pour Firefox
pnpm zip           # Packager en ZIP store
pnpm compile       # Vérification des types uniquement (sans sortie)
```

Pour les specs produit et UI, voir : [docs/spec.md](../spec.md), [docs/popup.md](../popup.md), [docs/options.md](../options.md)
