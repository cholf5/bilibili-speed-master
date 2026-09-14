# C-1: Video corner speed widget

> Status: Done — user-accepted 2026-09-14 after 3 QA feedback rounds (all fixed).

## Objective

把当前速度显示与调节控件放到视频播放器右上角（Speed Master 风格悬浮控件），替代
popup 作为主要的速度交互入口；popup 保持现状。

## Subtasks

- [x] 设计确认（hover 展开 + 自动淡出；Options 开关；popup 保留现状）
- [x] 设计文档：`docs/plans/2026-09-13-video-widget-design.md`
- [x] `src/shared/config.ts`：`global.showVideoWidget`（默认 true，向后兼容合并）
- [x] `entrypoints/content.ts`：widget DOM 挂载、展开/淡出交互、调速复用
      `lastUserIntentAt + applyPlaybackRate` 路径、ratechange 同步、storage 实时显隐
- [x] `entrypoints/options/App.tsx`：显示开关 UI + i18n 文案（19 语言）

## Developer

cholf5 (AI-assisted)

## Estimated Complexity

M

## Acceptance Criteria

1. 视频/番剧页播放器右上角出现半透明当前速度角标；悬停展开 `⚙ − 速度 +`；约 2 秒无
   交互后收起淡出。
2. `−`/`+` 每次调整 0.1，范围 0.1–4；调整后 popup 与角标显示一致，且速度被持久化为
   当前频道覆盖（或全局速度语义不变）。
3. 齿轮点击打开 Options 页。
4. Options 关闭开关后 widget 立即消失，无需刷新；重新打开立即恢复。
5. 全屏、网页全屏下 widget 仍可见可交互；不挡 B 站自带按钮的关键点击。
6. 经 widget 调速不会被 B 站自动速度恢复覆盖（走用户意图路径）。
7. 旧存储数据（无 `showVideoWidget` 字段）加载后 widget 默认显示。

## Test Cases

- TC1: 播放页悬停角标 → 展开四件套；移开鼠标 2s 后收起淡出。
- TC2: 连续 `+` 到 4.0x → 不超过上限；`−` 到 0.1x → 不低于下限。
- TC3: widget 调到 1.5x → 切到同 UP 主另一视频（SPA）→ 播放速度仍为 1.5x。
- TC4: Options 关闭开关 → 播放页 widget 立即隐藏；开启 → 立即恢复。
- TC5: 全屏模式下点击 `+` → 速度变化且角标数字更新。
- TC6: 聚焦 widget 按钮（Tab）按空格 → 不触发播放/暂停。

## Related Documents / Designs

- `docs/spec.md`（右上角控件描述）
- `docs/plans/2026-09-13-video-widget-design.md`

## Dependent Tasks

- B-3 / B-4（意图分类与持久化语义，已 Done）

## Issues & Notes

- QA 反馈第 3 轮（用户实测）：
  1. 齿轮打开的是 chrome://extensions 内嵌 Modal 而非独立标签页（P2）→ 根因：
     WXT 构建时把 `options_ui.open_in_tab: true` 从 manifest 丢弃，而
     `openOptionsPage()` 的行为正是跟随该字段。修复：background 改用
     `tabs.create(runtime.getURL('/options.html'))` 直接开独立标签页，与 popup
     「More Options」按钮行为一致，不再依赖 manifest 字段。
  2. （纯探讨，暂不改动）popup 当前频道卡片的步进器语义可能不够明确 → 已确认采用
     推荐方案并实现：频道名下加灰色小字副标题，标注速度来源——有覆盖时
     「Override · 1.5x」，无覆盖时「Following global · 1.0x」；popup 监听
     `storage.onChanged` 实时刷新（卡片上的 ± 走 content script 的 ratechange
     持久化路径，config 需随之重载）。新增 i18n key：`channelOverride`、
     `followingGlobal`（19 语言）。
- QA 反馈第 2 轮（用户实测，2 条，均已修复）：
  1. Widget 齿轮点击无反应（P1）→ 根因：`runtime.openOptionsPage` 不暴露给
     content script，调用是空操作。修复：content script 发
     `speed-master:open-options` 消息，background 监听并代为调用
     `openOptionsPage()`。
  2. Popup 里「当前速度」与「全局速度」并排易混淆（P2）→ 按用户三方案中的第三种
     重构：新增「当前频道」独立卡片（头像 + 频道名 + 可写速度步进器），只在检测到
     视频页时显示；移除原「当前速度」行，「全局速度」保持独立，语义不再混淆。
     频道信息经新增的 `speed-master:get-current-channel` 消息获取（/video/ 页走
     view API 权威解析，避免 SPA 滞后显示上一个视频的频道）。
- QA 反馈第 1 轮（用户实测，5 条，均已修复）：
  1. 右上角与 B 站「反馈问题」按钮冲突 → 默认改为左上角；新增
     `global.videoWidgetPosition`（topLeft/topRight），Options 里可配置。
  2. 显隐应与 B 站播放器控件一致 → 改为监听播放器容器的
     `mouseenter`/`mouseleave`，进区立即淡入、出区立即淡出（0.2s）。
  3. 看不清 → 底色加深为 `rgba(28,28,28,0.75)` 且整体不再整体半透明。
  4. 控件太小、按钮不可见 → 高度 28px、按钮 22px 方块底
     （`rgba(255,255,255,0.16)`），hover/active 有明显反馈。
  5. 自动收起多余（鼠标出区已隐藏）→ 删除 hover 展开/2s 收起逻辑，永远展开。
- 实现记录：
  - widget 逻辑全部在 content script 内（纯 DOM + 注入式 `<style>`，前缀
    `speed-master-widget`，无 React/Shadow DOM），挂载点
    `.bpx-player-container, .bilibili-player`，SPA 导航时幂等重挂载并重绑容器的
    mouseenter/mouseleave 监听。
  - `−`/`+` 走 `changeSpeedWithIntent`：先 `lastUserIntentAt = Date.now()` 再
    `applyPlaybackRate`，与 popup/快捷键同路径，规避 B-3/B-4 修过的误分类问题；
    目标速度与当前一致时直接 return，不产生幽灵覆盖。
  - 角标数字随 `ratechange` 更新（attachVideo/detachVideo 注册/注销监听）。
  - 显隐与位置由 `storage.onChanged` 实时驱动（`smw--off` / `smw--left` 类），
    鼠标显隐用 `smw--covered`（opacity 0 + pointer-events none，保留过渡动画）。
  - 全局快捷键处理忽略来自 widget 内部的键盘事件，避免聚焦按钮时空格双触发。
- 验证：`pnpm compile` 通过；`pnpm build`（chrome-mv3）通过。
- 待办（QA / 验收）：TC1–TC6 需在真实播放页用 `pnpm dev` 验证；新增验证点——
  左上/右上切换即时生效，与 B 站「反馈问题」按钮无重叠。
