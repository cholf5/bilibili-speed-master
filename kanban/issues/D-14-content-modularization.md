# D-14 content.ts 拆分模块 + 共享常量收敛

> Status: Testing / QA (dev + 独立审查打回一次已修复（GEAR_SVG 字节还原）+ PM 复验字节一致；待用户真机回归 B-2/B-3/B-4 与 widget/快捷键/统计冒烟) (P3) — 来源：2026-09-29 代码评审

## Objective

`entrypoints/content.ts` 已达 1258 行单文件，混合了频道识别、速度调解、
widget、快捷键、统计、消息通路六块职责；同时 `SPEED_MIN/MAX/STEP`、
`clampSpeed`、`formatSpeed`、`normalizeAvatarUrl` 在 content / popup /
options 三处重复定义，已经开始漂移风险（popup 步进 0.1、键盘步进 0.25 的
不一致就藏在重复常量里）。拆分与收敛属于无行为变更的重构，为 D-9/D-15
铺路。

## Subtasks

- [x] 常量与纯函数收敛进 `src/shared/`：速度范围/步进、clampSpeed、
      formatSpeed、normalizeAvatarUrl、formatWidgetSpeed
- [x] content 拆为模块（实际落点 `src/content/`）：`channel-detect.ts`（含
      view API 解析）、`speed-core.ts`（programmaticRate/applied 调解）、
      `widget.ts`、`shortcuts-glue.ts`、`stats.ts`、`messaging.ts`（另拆出
      `context.ts`/`config-writes.ts`/`video-actions.ts`/`video-lifecycle.ts`，
      见开发记录）；
      `entrypoints/content.ts` 只留装配
- [x] 全程纯重构：不改任何行为、不改消息协议、不改存储
- [x] 模块边界处补必要的类型导出（ChannelInfo 等）

## Developer

cholf5 (AI-assisted)

## Estimated Complexity

M

## Acceptance Criteria

- `pnpm compile`、`pnpm build`、`pnpm build:firefox` 通过
- B-2/B-3/B-4 回归 + widget/快捷键冒烟全部通过（行为零变化）
- popup/options 不再自带重复常量定义，统一自 `src/shared/`
- 单文件不再超过 ~300 行（装配文件除外）

## Test Cases

- TC1: 回归 B-2/B-3/B-4 全部手工用例
- TC2: widget、快捷键、统计冒烟（对照各自原卡验收标准）
- TC3: 若 D-15 已先行，重构前后单测全绿

## Related Documents / Designs

- `kanban/issues/D-15-vitest-core-logic.md`、`D-9-configurable-shortcuts.md`

## Dependent Tasks

- 建议 D-15 先行（先有测试护栏再重构）；与 D-6 就近做可减少重复回归

## Notes

- 拆分顺序建议：先收敛 shared 常量（独立 PR 级小改），再动 content 结构

## 开发记录 (2026-10-11)

### 一、共享常量/纯函数收敛清单（重复定义 → 收敛落点）

收敛落点为两个共享模块：`src/shared/speed.ts`（新建，纯常量+纯函数）、
`src/shared/video.ts`（追加 ChannelInfo 类型 + normalizeAvatarUrl）。

| 重复定义 | 原位置 | 收敛落点 |
| --- | --- | --- |
| `SPEED_MIN = 0.1` / `SPEED_MAX = 4` | content.ts:23-24、popup/App.tsx:15-16、options/App.tsx:26-27、config.ts:83-84（私有副本，sanitizeChannels 用） | `src/shared/speed.ts`（config.ts 改为 import，四份 → 一份） |
| `SPEED_STEP = 0.1`（UI 步进） | popup/App.tsx:14、options/App.tsx:25 | `src/shared/speed.ts` |
| `KEYBOARD_SPEED_STEP = 0.25`（键盘步进） | content.ts:22 | `src/shared/speed.ts`（**与 SPEED_STEP 保持两个常量名**，0.1/0.25 差异是语义不是漂移，只收敛定义位置） |
| `clampSpeed`（1 位小数舍入 + 夹取） | popup/App.tsx:18-19、options/App.tsx:42-43（逐字相同） | `src/shared/speed.ts` |
| `formatSpeed` | popup/App.tsx:21-24、options/App.tsx:45-48（逐字相同） | `src/shared/speed.ts` |
| `formatWidgetSpeed`（带 x 后缀） | content.ts:151-154（单份，随收敛入共享） | `src/shared/speed.ts` |
| `normalizeAvatarUrl` | content.ts:59-67、popup/App.tsx:32-37、options/App.tsx:50-58（语义相同） | `src/shared/video.ts` |
| 频道信息类型（ChannelInfo / CurrentChannel，字段一致） | content.ts:53-57、popup/App.tsx:26-30 | `src/shared/video.ts` 的 `ChannelInfo`，popup 删除本地 CurrentChannel 改 import |

- content 端 `applyPlaybackRate` 的夹取（不舍入）与 widget `changeSpeedWithIntent`
  的舍入夹取是两段不同语义，均保留原表达式逐字不动，仅 SPEED_MIN/MAX 改用共享常量。
- 新增 `src/shared/speed.test.ts`（11 例）钉住收敛后的常量值/格式化行为，
  防止三端再次漂移。popup 无既有测试文件；options/App.test.ts 只测
  filterChannelsByQuery/formatTimestamp，不受影响（实测确认）。

### 二、最终模块结构（行数为实测量）

```
entrypoints/content.ts        166  装配：defineContentScript + main()（context 创建、
                                   模块 setup、init 序列、storage.onChanged/hookHistory/
                                   urlPoller/flush 监听）+ SPEED_CONTROL_SELECTOR
src/content/
  context.ts                  112  ContentContext 类型 + createContentContext：跨模块共享
                                   状态单例（configCache/activeVideo/lastUserIntentAt/
                                   lastPlaybackTime/lastPlaybackWallMs/lastPlaybackRate/
                                   appliedRate/appliedForVideoId）+ 23 个函数槽声明
  config-writes.ts             14  updateConfigIfChanged（D-2 写队列注释锚点，speed-core
                                   与 channel-detect 共用）
  channel-detect.ts           224  isManagedVideoPage、getChannelInfo（DOM/__INITIAL_STATE__
                                   兜底）、view API 解析（VIEW_API_URL/resolveChannel）、
                                   authoritative 缓存、ensureChannelResolved、
                                   reconcileAfterResolve、recordChannelVisit
  speed-core.ts               272  applyPlaybackRate、programmaticRate 标记（含 1s 定时器）、
                                   appliedRate 记账、mediaLoadGuard/playerInit/lastUserIntent
                                   门控（B-2/B-3/B-4）、handleRateChange、rate persist debounce
                                   （D-2）、applyPreferredQuality（清晰度偏好）、
                                   handleVideoMetadata
  widget.ts                   220  WIDGET_CLASS、样式注入、widget DOM/按钮、
                                   changeSpeedWithIntent（用户意图标记）、openOptionsPage、
                                   ensureSpeedWidget、applyWidgetSettings
  shortcuts-glue.ts           244  D-16 豁免判定描述器、consume、runShortcutAction
                                   （35 个 case + never 穷尽守卫）、handleKeydown、
                                   SEEK/VOLUME/FRAME 步进常量
  video-actions.ts             75  纯 DOM 动作原语：seekBy/seekToPercent/togglePlay/
                                   toggleFullscreen/toggleCaptions/focusSearch/
                                   clickPlayerButton（被执行器独占使用）
  stats.ts                     83  handleTimeUpdate（D-12 墙钟比例口径）、timeSavedBuffer、
                                   30s flush（D-1）
  messaging.ts                 92  runtime.onMessage 应答 + 'speed-master:popup' port 通道 +
                                   notifyPorts 广播
  video-lifecycle.ts          127  attachVideo/detachVideo（9 个监听的注册/卸载顺序原样）、
                                   syncManagedVideo、handleNavigationChange、
                                   startVideoObserver（D-6 帧节流 MutationObserver）
```

单文件最大 272 行（speed-core.ts），全部 ≤ ~300（装配文件 166 行）。
对卡面建议结构的微调：新增 `context.ts`（共享状态内核）、`config-writes.ts`
（两个模块共用的写 helper）、`video-actions.ts`（从 shortcuts-glue 分出的
DOM 原语，使其 ≤300 行）、`video-lifecycle.ts`（attach/detach/导航，卡面
未提及但必须有归属）；shortcuts.ts 命名定为 shortcuts-glue.ts 以免与
src/shared/shortcuts.ts 混淆。

### 三、状态归属说明（单一实例语义）

- **ContentContext 单例（main() 创建一次，传引用）**：configCache、
  activeVideo、lastUserIntentAt（widget/shortcuts/messaging/装配 pointerdown
  写，speed-core 读）、lastPlaybackTime/lastPlaybackWallMs（stats 与
  video-lifecycle 共写）、lastPlaybackRate（speed-core/video-lifecycle 写，
  stats 读）、appliedRate/appliedForVideoId（speed-core 写，channel-detect
  的 reconciler 读）。23 个函数槽由各模块 setup 恰好赋值一次，调用点全部
  走 `ctx.<slot>` 运行时查找，赋值顺序不可能影响行为。
- **模块闭包私有**（仅本模块触碰，天然单实例）：authoritativeChannels/
  pendingResolves/lastChannelId/lastVideoId（channel-detect）；
  programmaticRate/programmaticRateTimer/mediaLoadGuardUntil/playerInitUntil/
  ratePersistTimer/runPendingRatePersist/lastQualityApply（speed-core）；
  widget DOM 元素与 speedWidgetBoundContainer（widget）；timeSavedBuffer/
  timeSaveTimer（stats）；connectedPorts（messaging）；lastUrl/urlPoller
  （装配 main 局部，与原实现一致）。
- 无任何状态被复制；configCache 仍由 main() 的 `createConfigCache(getConfig)`
  创建（D-6 语义不变）。

### 四、时序保持说明

- main() 同步体内所有副作用顺序逐一保留：widget DOM+按钮监听 → runtime
  onMessage/onConnect 注册 → observer.observe → syncManagedVideo() →
  ensureSpeedWidget() → applyWidgetSettings() → keydown(capture) →
  pointerdown(capture) → storage.onChanged → hookHistory() → popstate →
  urlPoller → visibilitychange/pagehide/beforeunload。唯一例外是
  MutationObserver 对象的创建点（原本先创建后 observe，现创建并入
  startVideoObserver）——创建本身无可观察副作用，observe() 位置原样。
- attachVideo/detachVideo 的 9 个监听注册/卸载顺序逐字保留（ratechange 上
  handleRateChange → notifyPorts → updateSpeedWidget 的先后是承载语义的）。
- handleRateChange 的门控链、applySpeedForVideo 的 programmaticRate→apply→
  appliedRate 记账顺序、handleNavigationChange 的调用顺序全部原样。
- 模块间递归（reconcileAfterResolve ↔ applySpeedForVideo/handleRateChange、
  attach ↔ detach）全部经 ctx 槽晚绑定，消除 import 环。
- 消息协议（7 个 speed-master:* 类型）、存储 key、B-2/B-3/B-4 门控、D-6
  节流与缓存、D-12 统计口径、D-16 豁免判定逐字搬运；脚本化审计了新旧源码的
  消息类型/选择器/数值常量/case 标签数量，全部一致。

### 五、验证结果

- `pnpm compile` 通过（strict 模式）。
- `pnpm test` 213/213 绿（原 202 + 新增 speed.test.ts 11）；守卫测试读取路径
  已更新为 src/content/shortcuts-glue.ts，并做过阴性自检：临时删除
  `case 'mediaTrackNext':` → 守卫必挂（1 failed），还原后全绿。
- `pnpm build` 与 `pnpm build:firefox` 均通过（content.js 77.77 kB）。
- TC1-TC3 手工回归（B-2/B-3/B-4、widget/快捷键/统计冒烟）待 reviewer/QA
  在真机执行——本卡为纯重构，回归应与 D-16/D-10/D-11 真机验收合并做。

### 六、遗留风险

- 行为零变更基于逐字搬运 + 静态审计 + 单测，真机冒烟仍建议覆盖：SPA 连续
  切视频（authoritative gating）、播放器自带倍速恢复（player-init 窗口）、
  widget ± 与齿轮、快捷键全表、后台标签统计口径。
- `runShortcutAction` 的 never 穷尽守卫与源码守卫分居两个文件（编译期在
  shortcuts-glue.ts，运行期守卫测试在 src/shared/shortcuts.test.ts），后续
  新增 action 时两处守卫仍同时生效，但注释中的文件指向已更新，需留意。
- src/content/ 下新增了卡面未列出的 4 个小模块（context/config-writes/
  video-actions/video-lifecycle），属结构微调而非行为引入；review 时按
  「逐字搬运」对照原 content.ts 即可。


## 独立审查记录 (2026-10-11)

独立审查（subagent）结论：**打回一次后通过**。审查方法为机械化全量对照（新 11 文件归一化行多重集 vs HEAD + 新旧构建产物字面量多重集 diff），非抽查：

- 函数体逐字等价（重点 15 个函数全查）；初始化/监听时序逐项一致；23 个 ctx 函数槽恰好赋值一次、setup 期间无 undefined 调用窗口；8 个状态字段单例语义成立；17 个数值常量、22 个选择器、7 个消息类型完全一致；共享收敛安全（normalizeAvatarUrl 三处原实现行为等价、0.1/0.25 步进语义分离保留）；守卫测试阴性自检复核通过；213/213 测试绿 + compile + 双端构建通过。

审查发现与处置：
- [P1 已修复] GEAR_SVG 路径数据在搬运中被改动一处（`c0.5,0.38,1.03,0.7,1.62,0.94` → `c0.5-0.38,…`，贝塞尔 y 增量翻负，齿轮右下齿几何改变）——PM 已按 HEAD 原文逐字节还原，脚本确认 SVG 与 HEAD 字节一致。
- [P2 接受] 注入 widget CSS 的前导缩进 8→4（CSS 空白不敏感，白名单比对内容等价、渲染零差异），保留新缩进并在此记录。
- 「行为零变更」最终结论：修复 P1 后成立（源码级 + 产物级双重验证）；真机回归（B-2/B-3/B-4、SPA 连续切视频、player-init 窗口、widget/快捷键/后台统计）仍需用户执行，静态审查不可替代。
