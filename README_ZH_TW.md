<p align="center">
  <img src="public/icon/512.png" width="120" alt="Bilibili Speed Master Logo" />
</p>

<h1 align="center">嗶哩嗶哩倍速大師</h1>

<p align="center">
  讓 B 站影片倍速管理變得輕鬆。
</p>

<p align="center">
  <a href="README.md">简体中文</a> | <a href="README_EN.md">English</a> | <a href="README_ZH_TW.md">繁體中文</a> | <a href="README_JA.md">日本語</a> | <a href="README_KO.md">한국어</a> | <a href="README_ES.md">Español</a> | <a href="README_FR.md">Français</a> | <a href="README_DE.md">Deutsch</a> | <a href="README_RU.md">Русский</a> | <a href="README_PT_BR.md">Português (Brasil)</a> | <a href="README_IT.md">Italiano</a> | <a href="README_TR.md">Türkçe</a> | <a href="README_VI.md">Tiếng Việt</a> | <a href="README_TH.md">ไทย</a> | <a href="README_ID.md">Bahasa Indonesia</a> | <a href="README_AR.md">العربية</a> | <a href="README_HI.md">हिन्दी</a> | <a href="README_PL.md">Polski</a>
</p>

<p align="center">
  <a href="https://chrome.google.com/webstore/detail/..."><img src="https://img.shields.io/badge/Chrome-Install-brightgreen" alt="Chrome 安裝" /></a>
  <a href="https://addons.mozilla.org/firefox/addon/..."><img src="https://img.shields.io/badge/Firefox-Install-orange" alt="Firefox 安裝" /></a>
  <img src="https://img.shields.io/badge/License-MPL--2.0-blue" alt="License MPL-2.0" />
</p>

每次進入 B 站影片都要手動調倍速？不同頻道想要不同速度？
**Bilibili Speed Master** 會記住你的全域與頻道偏好，只需調一次，之後自動生效。
完全本機運行，無廣告、無上報，安心使用。

---

## 功能亮點

- **全域預設倍速**：未設定頻道偏好時，使用你選擇的全域倍速。
- **頻道級別覆寫**：在任意影片調速後，整個頻道都會記住該速度。
- **攔截所有操作**：播放器控制與快捷鍵會被捕獲，偏好自動同步。
- **切回全域也算偏好**：明確選擇不會被誤判為「未設定」。

> 適合誰使用？
> - 追番族
> - 技術 / 學習類內容愛好者
> - 想提升觀看效率的人

---

## 安全與隱私

- **完全本機運行**
- **無廣告 / 無推廣**
- **不引入帳號體系，不上傳觀看資料**
- **不修改 B 站推薦或播放策略**

---

## 安裝方式

- [Chrome 版安裝](#)
- [Firefox 版安裝](#)

---

## 開源與貢獻

Bilibili Speed Master 為開源專案，歡迎提交 issue 與 PR。

- **開放內容**：核心邏輯、DOM 適配、行為攔截、設定儲存
- **保留內容**：商店素材（Logo / Banner）、品牌名、官方發布管道
- **License**：MPL-2.0（Mozilla Public License 2.0：允許商業使用、修改與分發；修改過的檔案需開源）[詳細條款](https://www.mozilla.org/en-US/MPL/2.0/)

---

## 行為邏輯（點擊展開）

<details>
<summary>點擊展開詳細說明</summary>

- **全域預設倍速**
  當頻道沒有單獨設定時，使用全域倍速，避免重複調整。

- **頻道級別覆寫**
  在頻道任意影片調速後，該頻道所有影片皆以此速度播放。

- **攔截使用者操作**
  無論是播放器控制或快捷鍵，任何手動調整都會更新頻道偏好。

- **切回全域也算已設定**
  避免將明確選擇誤判為「沒有偏好」。

</details>

---

## 開發與建置

```bash
pnpm dev           # 開發模式（熱更新）
pnpm dev:firefox   # Firefox 開發模式
pnpm build         # 生產建置
pnpm build:firefox # Firefox 生產建置
pnpm zip           # 打包為商店 ZIP
pnpm compile       # 僅型別檢查（無產物）
```

更多產品與 UI 說明請參考： [docs/spec.md](docs/spec.md), [docs/popup.md](docs/popup.md), [docs/options.md](docs/options.md)
