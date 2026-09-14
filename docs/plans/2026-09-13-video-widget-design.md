# 设计：视频右上角悬浮速度控件（C-1）

日期：2026-09-13
状态：已确认

## 背景

Popup 里的「当前速度」只在弹窗打开的瞬间可见，全屏下无法使用。参考 YouTube Speed
Master 的做法，把速度显示和调节控件直接放到视频右上角。`docs/spec.md` 已描述了这组
控件（齿轮 / 减号 / 当前速度 / 加号），本设计补齐实现细节。

## 已确认的决策

1. 形态：默认收起为半透明速度角标（如 `1.5x`），悬停展开四件套，停止交互约 2 秒后
   收起并淡出。
2. Options 提供「显示视频内控件」开关，默认开启。
3. Popup 保留现状，不删「当前速度」。

## Widget 本体

- 挂载点：`.bpx-player-container` 内部，绝对定位右上角。B 站全屏/网页全屏复用同一
  DOM 容器，因此控件在所有播放形态下可见。每次导航时确保已挂载（SPA 换视频容器不变，
  但以防万一做幂等挂载）。
- 展开：`⚙ − 1.5x +`。`−`/`+` 步长 0.1，范围 0.1–4，与 spec 一致；齿轮调用
  `runtime.openOptionsPage()`。
- 调速路径：与 popup / 快捷键相同——先设置 `lastUserIntentAt`，再调用
  `applyPlaybackRate`。这样意图分类能正确识别为用户操作，不会被 B 站速度恢复逻辑
  覆盖（B-3/B-4 的教训）。
- 速度同步：监听当前视频的 `ratechange` 更新角标数字；换视频后跟随新视频。
- 键盘隔离：全局快捷键处理忽略来自 widget 内部的事件，避免聚焦按钮时空格既触发
  播放/暂停又点击按钮。

## 配置与开关

- `SpeedMasterConfig.global` 新增 `showVideoWidget: boolean`，默认 `true`；
  `mergeConfig` 对旧数据向后兼容（缺失时取默认值）。
- content script 监听 `storage.onChanged` 实时显隐 widget，无需刷新。
- i18n：所有语言补充 `showVideoWidget` 文案（开发期以英文为主，其余语言提供翻译）。

## 不做的事（YAGNI）

- 不做拖动换位、不做位置记忆。
- 不在 widget 里做频道覆盖管理（仍走 popup / Options）。
- Popup 不改动。

## 修订 1（2026-09-13，QA 反馈后）

- 位置：默认改左上角（右上角与 B 站「反馈问题」按钮冲突），新增
  `global.videoWidgetPosition: 'topLeft' | 'topRight'` 配置，Options 可切换。
- 显隐：跟随 B 站播放器控件语义——鼠标进入播放器区域立即淡入、移出立即淡出
  （0.2s），不再有 hover 展开/自动收起状态机，控件永远展开。
- 外观：底色加深（rgba(28,28,28,0.75)），按钮加大（22px 方块底）并带
  hover/active 反馈。
