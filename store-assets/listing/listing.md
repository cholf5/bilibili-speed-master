# Bilibili Speed Master — 商店 Listing 文案素材

> F-2 素材包。Chrome Web Store 与 Firefox Add-ons 共用；EN 文案用于
> CWS 主 listing（详述可中英双语，zh 在前）。

---

## 1. 名称

- **CWS**（≤45 字符，含中英文）：`哔哩哔哩倍速大师 Bilibili Speed Master`
- **AMO**（≤50 字符）：同上

## 2. 简短描述 / Summary

**CWS**（≤132 字符）：

```
记住你的 B 站倍速偏好：全局默认 + 频道覆盖，纯本地运行，不收集任何数据。Bilibili playback speed remembered, per channel.
```

（实计约 120 字符）

**AMO**（≤250 字符）：

```
记住你的 B 站倍速偏好：全局默认 + 频道覆盖，纯本地运行，不收集任何数据。Sets a global default playback speed for Bilibili with per-channel overrides. 100% local, no tracking.
```

## 3. 详细描述

```
每次打开 B 站视频都要手动调倍速？不同 UP 主想用不同速度？

哔哩哔哩倍速大师（Bilibili Speed Master）记住你的偏好，调一次就够：

🌐 全局默认倍速 —— 没有频道偏好时自动应用你选的速度
📺 频道级覆盖 —— 在某 UP 主任意视频调速，整个频道记住
⌨️ 播放器角标控件 —— 悬停即现，±步进直接点
🎛️ 快捷键全自定义 —— 快进快退、倍速增减、音量、逐帧，全部可改可禁用
💾 配置导入导出 —— 换设备一键迁移
⏱️ 省时统计 —— 看看倍速帮你省了多少小时

🔒 隐私
· 完全本地运行，无账号体系
· 不收集、不上报任何浏览或观看数据
· 无广告、无推广

开源（MPL-2.0）：https://github.com/cholf5/bilibili-speed-master
反馈与问题：https://github.com/cholf5/bilibili-speed-master/issues

——
Bilibili Speed Master remembers your preferred playback speed: a global default plus per-channel overrides, adjustable from a corner widget or fully remappable shortcuts. 100% local — no accounts, no analytics, no ads. Open source under MPL-2.0.
```

## 4. 分类与语言

- CWS 分类：`Productivity / Tools`（生产力工具）
- AMO 分类：`Appearance` 不合适 → 选 `Privacy & Security` 也不合适 → **`Other`** 或 `Feeds, News & Blogging` 都不贴切，AMO 建议选 **Other**
- 语言：zh-CN（主）、en、zh-TW

## 5. 单句途（CWS 隐私页 Privacy policy 的 purpose）

```
storage: 在本地保存你的倍速偏好（全局默认、频道覆盖、快捷键设置）与省时统计。
Host permissions (*://*.bilibili.com/*): 在 B 站视频页应用并记住你的倍速设置；读取当前视频所属频道（UP 主）以匹配频道偏好。
```

## 6. 审核备注（Why the permissions / 审核员注）

```
This extension runs only on bilibili.com and stores all settings locally
via chrome.storage. It does not collect, transmit, or sell any user data,
and has no remote code. The only outbound request is an unauthenticated
GET to api.bilibili.com/x/web-interface/view (credentials: 'omit') to
resolve the channel (uploader) of the current video for per-channel speed
overrides. The two innerHTML warnings in the React chunk come from React
DOM internals; extension code itself builds all DOM via createElement /
createElementNS.
```

## 7. 素材清单（store-assets/screenshots/final/）

| 文件 | 规格 | 用途 |
| --- | --- | --- |
| `icon-128.png` | 128×128 | CWS 商店图标 |
| `promo-440x280.png` | 440×280 | CWS 宣传图（可选但建议） |
| `1280x800-popup.png` | 1280×800 | 截图 1：弹窗（品牌板合成） |
| `1280x800-options.png` | 1280×800 | 截图 2：设置页（已压印文案） |
| `1280x800-video.png` | 1280×800 | 截图 3：真实视频页 + 角标控件（已压印） |
| `1280x800-shortcuts.png` | 1280×800 | 截图 4：快捷键卡（已压印） |
| `640x400-popup.png` | 640×400 | 备用规格（AMO 截图推荐尺寸） |

AMO 截图建议上传 640×400 一张 + 1280×800 两三张（AMO 接受多种尺寸）。

## 8. 上架后回填

- `src/shared/about.ts` → `RATE_URL`（CWS item URL；Firefox 用 AMO URL，
  可按 runtime id / UA 分流）
- `README.md` / `docs/readme/README_EN.md` 安装徽章链接
- git tag `v0.1.0`
