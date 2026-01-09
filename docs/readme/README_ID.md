<p align="center">
  <img src="public/icon/512.png" width="120" alt="Bilibili Speed Master Logo" />
</p>

<h1 align="center">Bilibili Speed Master</h1>

<p align="center">
  Mudahkan pengelolaan kecepatan pemutaran di Bilibili.
</p>

<p align="center">
  <a href="README.md">简体中文</a> | <a href="./docs/readme/README_EN.md">English</a> | <a href="./docs/readme/README_ZH_TW.md">繁體中文</a> | <a href="./docs/readme/README_JA.md">日本語</a> | <a href="./docs/readme/README_KO.md">한국어</a> | <a href="./docs/readme/README_ES.md">Español</a> | <a href="./docs/readme/README_FR.md">Français</a> | <a href="./docs/readme/README_DE.md">Deutsch</a> | <a href="./docs/readme/README_RU.md">Русский</a> | <a href="./docs/readme/README_PT_BR.md">Português (Brasil)</a> | <a href="./docs/readme/README_IT.md">Italiano</a> | <a href="./docs/readme/README_TR.md">Türkçe</a> | <a href="./docs/readme/README_VI.md">Tiếng Việt</a> | <a href="./docs/readme/README_TH.md">ไทย</a> | <a href="./docs/readme/README_ID.md">Bahasa Indonesia</a> | <a href="./docs/readme/README_AR.md">العربية</a> | <a href="./docs/readme/README_HI.md">हिन्दी</a> | <a href="./docs/readme/README_PL.md">Polski</a>
</p>

<p align="center">
  <a href="https://chrome.google.com/webstore/detail/..."><img src="https://img.shields.io/badge/Chrome-Install-brightgreen" alt="Pasang di Chrome" /></a>
  <a href="https://addons.mozilla.org/firefox/addon/..."><img src="https://img.shields.io/badge/Firefox-Install-orange" alt="Pasang di Firefox" /></a>
  <img src="https://img.shields.io/badge/License-MPL--2.0-blue" alt="License MPL-2.0" />
</p>

Bosan harus mengatur kecepatan setiap kali membuka video di Bilibili? Ingin kecepatan berbeda per kanal?
**Bilibili Speed Master** mengingat preferensi global dan per kanal. Atur sekali, langsung beres.
Berjalan sepenuhnya lokal tanpa iklan dan pelacakan.

---

## Sorotan

- **Kecepatan default global**: Gunakan kecepatan global saat kanal tidak memiliki preferensi.
- **Override per kanal**: Atur kecepatan di video mana pun dan seluruh kanal akan mengingatnya.
- **Mencegat semua kontrol**: UI pemutar dan pintasan tetap sinkron.
- **Kembali ke global juga dihitung**: Pilihan eksplisit tidak pernah dianggap "belum diatur".

> Untuk siapa?
> - Penggemar maraton anime
> - Penggemar konten teknologi / belajar
> - Siapa pun yang ingin menonton lebih efisien

---

## Keamanan dan privasi

- **Sepenuhnya lokal**
- **Tanpa iklan / tanpa promosi**
- **Tanpa akun, tanpa unggah data tontonan**
- **Tidak mengubah rekomendasi atau strategi pemutaran Bilibili**

---

## Instalasi

- [Instal untuk Chrome](#)
- [Instal untuk Firefox](#)

---

## Open source dan kontribusi

Bilibili Speed Master bersifat open source. Issue dan PR dipersilakan.

- **Terbuka**: Logika inti, adaptasi DOM, intersepsi perilaku, penyimpanan pengaturan
- **Disimpan**: Aset toko (Logo / Banner), nama merek, kanal rilis resmi
- **Lisensi**: MPL-2.0 (Mozilla Public License 2.0: penggunaan komersial, modifikasi, dan distribusi diizinkan; file yang dimodifikasi harus tetap open source) [Teks lengkap](https://www.mozilla.org/en-US/MPL/2.0/)

---

## Logika perilaku (klik untuk memperluas)

<details>
<summary>Lihat detail</summary>

- **Kecepatan default global**
  Saat kanal tidak memiliki pengaturan, kecepatan global digunakan agar tidak perlu menyesuaikan berulang.

- **Override per kanal**
  Setelah mengatur kecepatan di satu video kanal, semua video kanal akan diputar dengan kecepatan itu.

- **Mencegat aksi pengguna**
  Kontrol pemutar atau pintasan akan memperbarui preferensi kanal.

- **Kembali ke global juga dihitung**
  Mencegah pilihan eksplisit dianggap "tanpa preferensi".

</details>

---

## Pengembangan dan build

```bash
pnpm dev           # Mode dev dengan hot reload
pnpm dev:firefox   # Mode dev untuk Firefox
pnpm build         # Build produksi
pnpm build:firefox # Build produksi untuk Firefox
pnpm zip           # Kemas sebagai ZIP toko
pnpm compile       # Hanya cek tipe (tanpa output)
```

Untuk spesifikasi produk dan UI, lihat: [docs/spec.md](docs/spec.md), [docs/popup.md](docs/popup.md), [docs/options.md](docs/options.md)
