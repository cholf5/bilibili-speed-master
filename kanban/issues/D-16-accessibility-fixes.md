# D-16 可访问性修正（空格键豁免 + widget aria-label i18n）

> Status: Backlog (P2) — 来源：2026-09-29 代码评审

## Objective

两个小的 a11y 问题：

1. 全局 keydown 只对 widget 内部的按键放行（`content.ts:1004-1008`）。焦
   点落在页面普通按钮/链接上按空格或回车时，`consume` 会 preventDefault
   + stopImmediatePropagation，导致按钮不被激活而播放器反而响应（如焦点
   在点赞按钮上按空格 → 播放/暂停而非点赞）。
2. widget 按钮的 aria-label 硬编码英文（`content.ts:581-595`「Open
   settings / Decrease speed / Increase speed」），未走共享 i18n，与 UI
   其余部分不一致。

## Subtasks

- [ ] `isEditableTarget` 语义扩展或新增判断：target 为 `button` / `a` /
      `select` / `[role="button"]` 等可激活元素时跳过快捷键处理（保留
      Escape 类全局键的余地，先做最小集合）
- [ ] widget aria-label 改用 `src/shared/i18n` 的 `t()`（复用现有 key 或
      新增 3 个 key，17 语言）
- [ ] 验证 Tab 键序：widget 四个按钮可聚焦可操作，焦点圈不因放行改动而
      泄漏到播放器

## Developer

cholf5 (AI-assisted)

## Estimated Complexity

S

## Acceptance Criteria

- 焦点在 B 站页面按钮/链接上按空格 → 激活该元素，播放器不响应
- 焦点不在可交互元素上时，现有快捷键行为全部不变（回归 docs/shortcuts.md）
- 屏幕阅读器（或 DevTools 无障碍树）中 widget 标签随浏览器语言变化

## Test Cases

- TC1: Tab 聚焦「点赞」按钮按空格 → 点赞，播放不暂停
- TC2: 焦点在 body 上按空格 → 播放/暂停（原行为）
- TC3: 浏览器语言 zh-CN → 无障碍树中 widget 按钮标签为中文
- TC4: docs/shortcuts.md 清单回归

## Related Documents / Designs

- `docs/shortcuts.md`、`src/shared/i18n.ts`
- `kanban/issues/C-1-video-corner-speed-widget.md`（widget TC6 相关）

## Dependent Tasks

- 无；若 D-14 已拆分则改动落在 `shortcuts.ts` / `widget.ts`

## Notes

- 放行判断要防误伤：B 站部分控件是 div + click，`role` 属性缺失时无法识
  别，属于已知局限，卡内记录即可，不做启发式猜测
