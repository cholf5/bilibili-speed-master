<p align="center">
  <img src="../../public/icon/512.png" width="120" alt="Bilibili Speed Master Logo" />
</p>

<h1 align="center">Bilibili Speed Master</h1>

<p align="center">
  Bilibili oynatma hızını zahmetsizce yönetin.
</p>

<p align="center">
  <a href="../../README.md">简体中文</a> | <a href="README_EN.md">English</a> | <a href="README_ZH_TW.md">繁體中文</a> | <a href="README_JA.md">日本語</a> | <a href="README_KO.md">한국어</a> | <a href="README_ES.md">Español</a> | <a href="README_FR.md">Français</a> | <a href="README_DE.md">Deutsch</a> | <a href="README_RU.md">Русский</a> | <a href="README_PT_BR.md">Português (Brasil)</a> | <a href="README_IT.md">Italiano</a> | <a href="README_TR.md">Türkçe</a> | <a href="README_VI.md">Tiếng Việt</a> | <a href="README_TH.md">ไทย</a> | <a href="README_ID.md">Bahasa Indonesia</a> | <a href="README_AR.md">العربية</a> | <a href="README_HI.md">हिन्दी</a> | <a href="README_PL.md">Polski</a>
</p>

<p align="center">
  <a href="https://chrome.google.com/webstore/detail/..."><img src="https://img.shields.io/badge/Chrome-Install-brightgreen" alt="Chrome için yükle" /></a>
  <a href="https://addons.mozilla.org/firefox/addon/..."><img src="https://img.shields.io/badge/Firefox-Install-orange" alt="Firefox için yükle" /></a>
  <img src="https://img.shields.io/badge/License-MPL--2.0-blue" alt="License MPL-2.0" />
</p>

Bilibili'de her videoda hız ayarlamaktan yoruldunuz mu? Kanal başına farklı hızlar mı istiyorsunuz?
**Bilibili Speed Master** küresel ve kanal tercihlerinizi hatırlar. Bir kez ayarlayın, otomatik çalışır.
Tamamen yerel çalışır, reklam ve takip yoktur.

---

## Öne çıkanlar

- **Küresel varsayılan hız**: Kanal tercih yoksa küresel hızı kullanır.
- **Kanal düzeyi geçersiz kılma**: Herhangi bir videoda hız ayarlayın, tüm kanal hatırlar.
- **Tüm kontrolleri yakalar**: Oynatıcı arayüzü ve kısayollar senkron kalır.
- **Küresele dönmek de sayılır**: Açık seçimler "ayarlanmamış" sayılmaz.

> Kimler için?
> - Anime maratonu yapanlar
> - Teknoloji / öğrenme içeriklerini sevenler
> - Daha verimli izlemek isteyenler

---

## Güvenlik ve gizlilik

- **Tamamen yerel**
- **Reklam yok / tanıtım yok**
- **Hesap yok, izleme verisi yükleme yok**
- **Bilibili önerilerini veya oynatma stratejisini değiştirmez**

---

## Kurulum

- [Chrome için yükle](#)
- [Firefox için yükle](#)

---

## Açık kaynak ve katkı

Bilibili Speed Master açık kaynaklıdır. Issue ve PR'lar hoş geldiniz.

- **Açık**: Çekirdek mantık, DOM uyarlama, davranış yakalama, ayar depolama
- **Ayrılmış**: Mağaza varlıkları (Logo / Banner), marka adı, resmi yayın kanalları
- **Fork'lar ve yeniden paketlemeler**: eklenti mağazalarında aynı isimle yayınlanmamalıdır; mağaza varlıkları ve marka adı MPL-2.0 kapsamında değildir
- **Lisans**: MPL-2.0 (Mozilla Public License 2.0: ticari kullanım, değişiklik ve dağıtım serbest; değiştirilmiş dosyalar açık kalmalıdır) [Tam metin](https://www.mozilla.org/en-US/MPL/2.0/)

---

## Davranış mantığı (genişletmek için tıklayın)

<details>
<summary>Detayları gör</summary>

- **Küresel varsayılan hız**
  Kanal için ayar yoksa tekrarlı ayarlamaları önlemek için küresel hız kullanılır.

- **Kanal düzeyi geçersiz kılma**
  Bir kanaldaki herhangi bir videoda hız ayarlarsanız tüm videolar o hızda oynar.

- **Kullanıcı eylemlerini yakalama**
  Oynatıcı kontrolleri veya kısayollar kanal tercihlerini günceller.

- **Küresele dönmek de sayılır**
  Açık seçimleri "tercih yok" olarak sınıflandırmaz.

</details>

---

## Geliştirme ve derleme

```bash
pnpm dev           # Hot reload ile dev modu
pnpm dev:firefox   # Firefox dev modu
pnpm build         # Üretim derlemesi
pnpm build:firefox # Firefox için üretim derlemesi
pnpm zip           # Mağaza ZIP paketi
pnpm compile       # Yalnızca tür kontrolü (çıktı yok)
```

Ürün ve UI özellikleri için bkz: [docs/spec.md](../spec.md), [docs/popup.md](../popup.md), [docs/options.md](../options.md)
