<p align="center">
  <img src="public/icon/512.png" width="120" alt="Bilibili Speed Master Logo" />
</p>

<h1 align="center">哔哩哔哩倍速大师</h1>

<p align="center">
  <a href="README.md">简体中文</a> | <a href="docs/readme/README_EN.md">English</a> | <a href="docs/readme/README_ZH_TW.md">繁體中文</a> | <a href="docs/readme/README_JA.md">日本語</a> | <a href="docs/readme/README_KO.md">한국어</a> | <a href="docs/readme/README_ES.md">Español</a> | <a href="docs/readme/README_FR.md">Français</a> | <a href="docs/readme/README_DE.md">Deutsch</a> | <a href="docs/readme/README_RU.md">Русский</a> | <a href="docs/readme/README_PT_BR.md">Português (Brasil)</a> | <a href="docs/readme/README_IT.md">Italiano</a> | <a href="docs/readme/README_TR.md">Türkçe</a> | <a href="docs/readme/README_VI.md">Tiếng Việt</a> | <a href="docs/readme/README_TH.md">ไทย</a> | <a href="docs/readme/README_ID.md">Bahasa Indonesia</a> | <a href="docs/readme/README_AR.md">العربية</a> | <a href="docs/readme/README_HI.md">हिन्दी</a> | <a href="docs/readme/README_PL.md">Polski</a>
</p>

<p align="center">
  💨 让 B 站视频倍速管理从此轻松无烦恼！
</p>

<p align="center">
  <a href="https://chrome.google.com/webstore/detail/..."><img src="https://img.shields.io/badge/Chrome-Install-brightgreen" alt="Chrome 安装" /></a>
  <a href="https://addons.mozilla.org/firefox/addon/..."><img src="https://img.shields.io/badge/Firefox-Install-orange" alt="Firefox 安装" /></a>
  <img src="https://img.shields.io/badge/License-MPL--2.0-blue" alt="License MPL-2.0" />
</p>

每次进入 B 站视频都要手动调倍速？不同频道想要不同速度？  
**Bilibili Speed Master** 记住你的全局和频道偏好，只需调一次，之后自动生效。  
完全本地运行，无广告、无上报，安心使用。

---

## 功能亮点

- 🌐 **全局默认倍速**：未设置频道偏好时，使用你选择的全局倍速，再也不用每次手动调。  
- 📺 **频道级别覆盖**：在某个频道任意视频调整速度，即刻记住整个频道偏好。  
- ⌨️ **拦截所有操作**：播放器控件或快捷键都被捕获，确保偏好自动更新。  
- 🔄 **调回全局值也算偏好**：你的明确意图永远不会被误判为“未设置”。

> 适合谁使用？  
> - 追番狂魔  
> - 技术 / 学习类视频爱好者  
> - 想提高观看效率的人  

---

## 安全与隐私

- 🔒 **完全本地运行**  
- 🚫 **无广告 / 无推广**  
- 🛡️ **不引入账号体系，不上报任何观看数据**  
- ⚙️ **不改变 B 站推荐或播放策略**

---

## 安装方式

- [Chrome 版安装](#)  
- [Firefox 版安装](#)  

---

## 开源与贡献

Bilibili Speed Master 是开源项目，欢迎提交 issue 或 PR。

- **开源内容**：核心逻辑、DOM 适配、行为拦截、配置存储  
- **保留内容**：商店素材（Logo / Banner）、品牌名、官方发布渠道  
- **Fork 与二次打包**：不得以相同名称在插件商店上架；商店素材与品牌名不受 MPL-2.0 约束
- **License**：MPL-2.0（Mozilla Public License 2.0，允许商业使用、修改和分发，但修改过的文件需开源） [详细条款](https://www.mozilla.org/en-US/MPL/2.0/)


---

## 行为逻辑（点开看）

<details>
<summary>点击展开详细说明</summary>

- **全局默认倍速**  
  当频道没有单独设置时，使用全局倍速，避免重复调整。

- **频道级别覆盖**  
  在某个频道任意视频调整速度后，该频道所有视频按此速度播放。

- **拦截用户操作**  
  不管是播放器控件还是快捷键，只要你手动调整过速度，就会自动更新频道偏好。

- **调整回全局值也算已设置**  
  避免误判为“没有偏好”，最大限度尊重用户显式操作。

</details>

---

## 开发与构建

```bash
pnpm dev           # 开发模式（热更新）
pnpm dev:firefox   # Firefox 开发模式
pnpm build         # 生产构建
pnpm build:firefox # Firefox 生产构建
pnpm zip           # 打包为商店 ZIP
pnpm compile       # 仅类型检查（无产物）
```

更多产品与 UI 说明请参考：[docs/spec.md](docs/spec.md)、[docs/popup.md](docs/popup.md)、[docs/options.md](docs/options.md)
