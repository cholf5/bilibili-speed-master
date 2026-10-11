# D-16 可访问性修正（空格键豁免 + widget aria-label i18n）

> Status: In Progress (dev done, awaiting review) (P2) — 来源：2026-09-29 代码评审

## Objective

两个小的 a11y 问题：

1. 全局 keydown 只对 widget 内部的按键放行。焦点落在页面普通按钮/链接上
   按空格或回车时，`consume` 会 preventDefault + stopImmediatePropagation，
   导致按钮不被激活而播放器反而响应（如焦点在点赞按钮上按空格 → 播放/暂停
   而非点赞）。
2. widget 按钮的 aria-label 硬编码英文（「Open settings / Decrease speed /
   Increase speed」），未走共享 i18n，与 UI 其余部分不一致。

## Subtasks

- [x] isEditableTarget 语义扩展或新增判断：target 为 `button` / `a` /
      `select` / `[role="button"]` 等可激活元素时跳过快捷键处理（保留
      Escape 类全局键的余地，先做最小集合）——落地为新增独立纯函数
      `isActivatableTarget`（取舍见开发记录）
- [x] widget aria-label 改用 `src/shared/i18n` 的 `t()`（新增 3 个 key；
      语言表实际为 18 个 locale，键一致性测试强制全量补齐，卡片原写 17）
- [x] 验证 Tab 键序：widget 四个按钮可聚焦可操作，焦点圈不因放行改动而
      泄漏到播放器——代码层面推演完成（实际 widget 为 3 个按钮 + 1 个
      非交互 label span，见开发记录），真机 TC 留验收

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

## 开发记录 (2026-10-11)

### 改动清单

- 新增 `src/shared/focus-target.ts`：纯判断模块（无 DOM / 无扩展 API，与
  其他 shared 模块同约束），导出 `FocusTargetLike` 结构描述符类型、
  `isEditableTarget`、`isActivatableTarget`、`shortcutTargetIsExempt`。
- 新增 `src/shared/focus-target.test.ts`：22 例单测（plain object 直传，
  node 环境可测）。
- `entrypoints/content.ts`：
  - 原 handleKeydown 内联的 `isEditableTarget` 闭包删除，改为
    `getFocusTarget`（把 EventTarget 归一成 `FocusTargetLike` 结构体，
    非 HTMLElement 返回 null，保持原「非元素不豁免」语义）+ 
    `isExemptKeyTarget`（组合 shared 两个判定）。
  - handleKeydown 豁免行由 `isEditableTarget(event.target)` 换成
    `isExemptKeyTarget(event.target)`，其余判定顺序不变：
    isComposing → widget closest() → !activeVideo / !isManagedVideoPage /
    豁免目标 → matchShortcut(peek())。
  - widget 三个按钮的 aria-label 硬编码英文改为 `t('widgetOpenSettings' /
    'widgetDecreaseSpeed' / 'widgetIncreaseSpeed')`，创建时求值一次。
- `src/shared/i18n.ts`：en + 17 个非 en locale 全部新增 3 个 key（插在各
  locale 的 `widgetPosition` 之后），i18n.test.ts 键一致性测试强制同步。
- `docs/shortcuts.md` Notes 第一条补充：焦点在 button/link/role="button"
  上时快捷键让位、原生激活生效。

### 豁免判定最终集合与理由

`shortcutTargetIsExempt = isEditableTarget || isActivatableTarget`：

- isEditableTarget（原语义原样下沉，行为不变）：tag ∈ {input, textarea,
  select} 或 `isContentEditable === true`。文本输入类拥有所有按键。
- isActivatableTarget（新增）：tag === `button`；tag === `a` 且有 `href`
  属性（无 href 的 anchor 不可聚焦/激活，不算）；tag === `select`（同时
  出现在两个判定中，使各自独立完整）；任意元素的 `role` 归一化后为
  `"button"`（trim + 小写，role 大小写不敏感且与标签无关）。
- 取舍说明：选择「并列新函数 + 组合」而非扩展原 isEditableTarget，因为两
  类语义不同（文本输入 = 拥有全部键；可激活元素 = 拥有 Space/Enter/方向
  键），分开便于后续按卡片 Notes 预留「Escape 类全局键只在豁免集中给
  isEditableTarget 放行」的余地——当前最小集合未引入全局键，两分类对外
  效果一致。
- widget 内部放行（`closest('.speed-master-widget')`）保留：widget 按钮
  本身是 `<button>`，已被 activatable 豁免覆盖，但 closest 守卫还能覆盖
  未来加入的非 button 可聚焦控件（如滑杆）；两条路径都「不 consume 直接
  返回」，语义相同、无冲突，仅多一层保险。
- TC2 不变量：`<video>` / `<body>` / 普通 div 的 tagName 不命中任何条
  件（无 role、非 contenteditable），不豁免，快捷键行为与改动前完全一致
  （单测锁定）。

### i18n 接入方式

- 跟随现有模式：popup/options 直接调用共享 `t()`，locale 由
  `getBrowserLocale()`（`navigator.language`）决定；content script 尚无
  t() 先例，本次按现有 API 最小接入——直接 `import { t }` 调用，不加新
  机制。content 与 popup 共享同一 navigator.language 判定，无语境差异。
- 新增 key（18 locale × 3）：`widgetOpenSettings`（Open settings / 打开
  设置…）、`widgetDecreaseSpeed`（Decrease speed / 降低倍速…）、
  `widgetIncreaseSpeed`（Increase speed / 提高倍速…）。en 取值与原硬编码
  英文完全一致（行为对英文用户零变化）。
- aria-label 在 widget 元素创建时求值一次；浏览器语言变更需重启生效，与
  popup 的 t() 行为一致。

### Tab 键序推演（代码层面）

- widget 当前实际是 **3 个按钮**（gear / minus / plus）+ 1 个非交互
  label span（卡片写的「四个按钮」以现码为准记录：span 无 tabindex，不可
  聚焦）。
- 三按钮均为原生 `<button type="button">`，天然在 Tab 序内；Tab 键在默认
  绑定表中无匹配，handleKeydown 不拦截；焦点在 widget 内时 widget
  closest() 守卫先行放行（本次改动前后一致），Tab 从 gear → minus → plus
  → 离开 widget 正常走完，不会「泄漏」触发播放器快捷键。
- 边界：若用户把 Tab 自定义为快捷键（D-9 允许录制任意非修饰键），焦点在
  body/video 上时仍会被 consume——这是 D-9 查表制既有语义，非本次引入；
  焦点在 widget 内或可激活元素上时 Tab 放行。

### 已知局限

- B 站部分控件是 div + click 且无 `role`，无法识别为可激活元素，快捷键
  仍会拦截（按卡片 Notes 不做启发式猜测，保持记录）。
- role 匹配仅认 `button`，不覆盖 `switch` / `menuitem` / `tab` 等其他激
  活型 role（最小集合，卡片预留后续扩展）。
- 焦点在可激活元素上时媒体键（MediaPlayPause 等）同样被豁免——按「跳过
  全部快捷键处理」的字面语义执行。

### 验证结果

- `pnpm test`：202 例全绿（基线 180 + focus-target 22；i18n 键一致性测试
  覆盖 18 locale × 3 新 key）。
- `pnpm compile`：通过。
- `pnpm build`：通过；产物 content.js 中三个新 key 各出现 19 次（18
  locale 词条 + 1 处调用），en 词条 "Open settings" 保留。
- 遵守约束：未 commit/push；未触碰写入路径、D-6/D-9/D-12 核心逻辑、
  popup/options UI、B 系列行为；2 空格缩进。

### 遗留风险

- 若 B 站把播放器控件改为真 `<button>`（部分新版控件已是），空格会原生激
  活该控件而不再播放/暂停——这正是本卡意图（原生激活优先），但用户对个别
  按键的体感可能变化，真机 TC4 回归时留意。
- aria-label 语言只随 navigator.language（浏览器 UI 语言），不随页面语言
  （与 popup 现状一致，B 站用户浏览器语言通常即期望语言）。
- TC1–TC4 全部待真机验收（本记录仅为代码层面自查）。


## 独立审查记录 (2026-10-11)

独立审查（subagent）结论：**通过**，无 P0/P1。isEditableTarget 下沉与原内联版逐条等价；判定顺序与改动前同构；行为推演全部成立（body/video 快捷键不变、点赞按钮 Space 原生激活、widget gear 放行、媒体键 consumptions:false 故事件流零差异）；i18n 与 popup/options 同源（全仓唯一 locale 决策点 getBrowserLocale，无 config 覆盖机制）；en 取值与原硬编码逐字一致；202/202 测试绿 + compile/build 通过。

审查补充记录（P2，PM 已落实）：
1. 已知局限补两条：(a) SVG 元素上的 role="button" 因 content.ts getFocusTarget 的 `instanceof HTMLElement` 前置过滤不被识别（与改动前行为一致，非回归），focus-target.ts 注释已补充说明；(b) **鼠标点击按钮后焦点驻留** → blur 前该按钮获得按键，Space/J/L/数字键等扩展快捷键全部失效——这是「原生优先」的正确结果（与 YouTube 一致），但与旧体感差异大，真机验收需知晓。
2. 媒体键豁免口径：审查确认无需产品决策（consumes:false 本就不拦截事件流，OS 级媒体键不受页面焦点影响），维持现口径；若真机发现异常，修法是收窄豁免为「非媒体键 action」，改动点仅 handleKeydown 一处。

真机验收关注：TC1「Tab 聚焦点赞按 Space」时留意 B 站自身全局 keydown 是否造成双响应（取决于 B 站的 target 过滤，代码侧无法验证）。
