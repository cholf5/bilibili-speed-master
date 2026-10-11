# D-9 快捷键可配置 + options 快捷键清单

> Status: Testing / QA (dev 完成 + 独立审查打回一次已修复 + PM 复提核验通过；待用户真机验收 TC1-TC4，重点含 MediaTrackNext) — 来源：2026-09-29 代码评审

## Objective

快捷键目前硬编码在 `entrypoints/content.ts` 的 `handleKeydown`（YouTube 风
格 j/k/l、方向键、f/m/c/i 等），既不可自定义，也没有在任何 UI 中露出（仅
`docs/shortcuts.md` 有文档）。两个问题：

1. 与 B 站自身习惯冲突的用户无从调整（如 `<`/`>` 调速、数字键跳转百分比）
2. 新用户发现不了这些快捷键

## Subtasks

- [x] `src/shared/config.ts`：schema 增加 `global.shortcuts`（action → key
      映射，默认值 = 现行为），mergeConfig 兼容缺省（向后兼容）
- [x] content：`handleKeydown` 改为查表匹配（含 modifier 组合），键位捕获
      器供 options 录制使用
- [x] options：快捷键清单区块 + 单条重映射（点击后录制下一个按键，Esc 取
      消，冲突时提示）
- [x] 提供「恢复默认」按钮；禁用某条快捷键的能力（映射为 null）
- [x] i18n：新增文案（18 语言同步）

## Developer

cholf5 (AI-assisted)

## Estimated Complexity

M

## Acceptance Criteria

- options 中可修改任一快捷键并在视频页立即生效（storage.onChanged 链路）
- 冲突检测：把某键映射到已被占用的 action 时给出提示，不允许保存或要求
  确认交换
- 旧用户无 `global.shortcuts` 字段 → 全部回落默认行为，无迁移感知
- 全部现有默认键位行为与改造前一致

## Test Cases

- TC1: 默认键位逐条回归（对照 docs/shortcuts.md 清单）
- TC2: 重映射 j → p：p 生效、j 不再触发、输入框聚焦时不触发
- TC3: 冲突用例、恢复默认用例
- TC4: 旧 schema 数据加载无报错

## Related Documents / Designs

- `docs/shortcuts.md`（清单来源与更新对象）
- `kanban/issues/A-7-implement-keyboard-shortcuts.md`

## Dependent Tasks

- 无硬依赖；建议在 D-14（content 拆分）之后做，keydown 查表逻辑落在独立
  模块更好测

## Notes

- 注意 IME 与 `event.code`/`event.key` 的取舍：建议记录 `code` 为主、
  `key` 为辅，避免非拉丁键盘布局失效

## 开发记录 (2026-10-11)

### action 清单与默认键位对照（改造前 → 改造后）

逐条对照旧 `handleKeydown` 分支；34 个 action，默认行为与改造前一致：

| Action id | 默认键位 | 旧实现分支 | 行为差异 |
| --- | --- | --- | --- |
| togglePlay | `K` | `key==='k'` → 播放/暂停（consume） | 无（CapsLock 除外，见下） |
| togglePlaySpace | `Space` | 同上 `key===' '`（拆成两个 action 以便分别重映射） | 无 |
| toggleMute | `M` | `key==='m'` | 无 |
| seekBackwardLarge / ForwardLarge | `J` / `L` | `key==='j'/'l'`（±10s） | 无 |
| seekBackwardSmall / ForwardSmall | `←` / `→` | ArrowLeft/Right（±5s） | 无 |
| volumeUp / volumeDown | `↑` / `↓` | ArrowUp/Down（±5%） | 无 |
| seekToStart / seekToEnd | `Home` / `End` | 同名分支 | 无 |
| stepForward / stepBackward | `.` / `,` | `key==='.'` && paused（±1/30s，暂停限定，播放中不消费） | 无（pausedOnly 旗标在 def 上，执行层判断） |
| speedUp / slowDown | `Shift+.`(`>`) / `Shift+,`(`<`) | `key==='>'/'<'`（±0.25，标记 lastUserIntentAt） | 无（modifier 精确匹配；见已知差异） |
| toggleFullscreen / toggleCaptions / toggleMiniPlayer | `F` / `C` / `I` | 同名分支（i 含 PiP 回退） | 无 |
| nextVideo / prevVideo | `Shift+N` / `Shift+P` | `shiftKey && key==='N'/'P'` | 无 |
| focusSearch | `/` | `key==='/'` | 无 |
| seekToPercent0..9 | `0`–`9` | `key>='0'&&key<='9'`（0→开头，n→n/10） | 无（小键盘数字经 key 回退仍命中） |
| mediaPlayPause / mediaStop | 媒体键 | `code==='MediaPlayPause'/'MediaStop'`，**不 consume** | 无（def.consumes=false 保持透传） |
| mediaTrackNext | 媒体键 | `code==='MediaTrackNext'` → 点击下一曲按钮，**不 consume** | **曾遗漏执行分支**：首版 executor 无此 case，媒体下一曲静默 no-op——独立审查抓出（P0），已修复（并列于 nextVideo 的 case，consumes:false 已保证不吞事件），并补守卫测试防再犯 |

已知有意差异（code 主匹配的代价，均已记录在 shortcuts.ts 模块注释）：
非拉丁布局下按物理键位可触发（旧行为按字符匹配、布局切换即失效——这正是
PM 选 code 主的动机）；CapsLock 开启时字母键会命中（旧行为不命中）；
Nordic 布局未加 Shift 的 `<`/`>` 经 key 回退仍命中（保留旧行为）。

### schema 形态与兼容策略

- `ShortcutBinding = { code: string; key?: string; ctrl?/alt?/shift?/meta?: boolean }`
  ——PM 决策 `{code, key?}` 基础上加了可选 modifier 布尔位（需求同时要求
  支持 ctrl/alt/shift/meta 组合）；`global.shortcuts: Record<ActionId,
  ShortcutBinding | null>`，null = 该 action 已禁用。
- `sanitizeShortcuts`（shortcuts.ts，config.ts 的 mergeGlobalRaw 接线）：
  缺字段/非对象 → 全默认表；action 缺失 → 该条回默认；条目非法（非对象、
  code 非字符串或空）→ 回默认；`null` 保留（禁用合法）；未知 action id
  丢弃（不扩 schema）；modifier 仅收布尔 true；`__proto__` 原型注入防护。
  旧数据（无 shortcuts 字段）零迁移感知。

### content 同步快照方案

keydown 是同步路径，不能 await `configCache.read()`。改用 D-6 预留的
`configCache.peek()` 同步快照口：首读完成前是 DEFAULT 键位表；之后
storage.onChanged 的同步补丁（走 mergeGlobalRaw）保证 options 改键即时到
达视频页。peek() 的 doc 注释已同步更新（原本标注 "production reads through
read only"）。旧的顶层 `ctrl/alt/meta` 早退被「绑定 modifier 精确匹配」
取代——默认绑定不带这些 modifier，净行为不变。新增 `isComposing` IME 防护
（旧行为没有，按卡片 Notes 要求补上）。content 里只留胶水（大 switch 执行
器），匹配/默认表/冲突规则全部在 src/shared/shortcuts.ts，为 D-14 铺路。

### 冲突交互最终形态及理由

采用 PM 决策的「交换」而非「阻止」：录制命中已占用键时，行内红字提示
「与『{action}』冲突」，提供 [交换]（互换两条绑定——被占 action 拿到编辑
目标的旧绑定，原禁用则变为禁用）与 [取消]。理由：交换保证任意时刻一个键
至多属于一个启用 action（查表无歧义、无需优先级仲裁），且用户不需要先手
动腾键；阻止方案需要用户自行找空闲键，体验更差。无冲突时直接写入（与旧
绑定相同则跳过写 storage）。Esc 取消、点击行外取消、裸 modifier 忽略。
「恢复默认」为批量销毁性操作，采纳审查意见加 `window.confirm` 确认对话框
（对齐 import 交互，i18n 键 shortcutsRestoreConfirm，18 语言同步）。

### 改动清单

- 新增 `src/shared/shortcuts.ts`（类型、34-action 默认表、matchShortcut /
  captureShortcut / findBindingConflict / bindingEquals /
  formatShortcutBinding / sanitizeShortcuts / cloneDefaultShortcuts）
- `src/shared/config.ts`（global.shortcuts 字段 + mergeGlobalRaw 接线 + 类型再导出）
- `src/shared/config-cache.ts`（仅 peek() 注释更新，语义未动）
- `entrypoints/content.ts`（handleKeydown 查表化 + runShortcutAction 执行器；
  34 个 action 全部显式 case + switch 后 `never` 编译期穷尽守卫——加
  `default:` 会破坏窄化，勿加）
- `entrypoints/options/App.tsx` + `App.css`（快捷键区块：34 行清单、录制、
  冲突交换、禁用、恢复默认（带 confirm）；样式沿用 table/card 模式）
- `src/shared/i18n.ts`（34 个新键 × 18 语言，含 shortcutsRestoreConfirm）
- `docs/shortcuts.md`（可配置说明、录制交互、禁用语义、code 主/key 辅口径、
  默认键位表与实现对齐、移除从未实现的 Ctrl+←/→ 章节行）

### 执行器守卫测试（独立审查打回项，方案选择与理由）

首版 executor 漏写 `case 'mediaTrackNext':`（媒体下一曲静默 no-op）而全套
单测绿——根因是执行器 switch 零自动化覆盖。审查给了两个方案，选 **a) 源码
文本守卫**（+免费的编译期守卫）：

- `src/shared/shortcuts.test.ts` 追加「content.ts shortcut executor guard」：
  用 `node:fs` 读 `entrypoints/content.ts` 源码，断言 action 表中每个
  actionId 都存在 `case '<id>':` 标签（尾冒号防 `togglePlay`/
  `togglePlaySpace` 前缀误配），另断言 `const exhaustive: never = actionId`
  守卫仍在。已做阴性自检：临时删掉 mediaTrackNext case → 测试必挂。
- 选 a) 的理由：它直接守卫最终产物（漏 case ⇒ 测试必挂，CI 即拦）；b) 的
  导出常量只能证明 shortcuts.ts 内部一致（已有测试覆盖），content 侧
  dev-only 断言不在 CI 运行路径上、对漏 case 无强制力，还要往 content 里
  塞非胶水代码。a) 的弱点是文本匹配对重构敏感，可接受。
- 辅以 content.ts switch 末尾的 `never` 穷尽断言：漏 case 时 `pnpm compile`
  即失败（前提是不写 `default:`，文件内有注释说明）。vite/esbuild 不做类型
  检查，所以 vitest 文本守卫仍是运行时主闸，两者互补。
- 守卫测试文件不能放 `entrypoints/`：WXT 把 `entrypoints/*.ts` 一律视为
  entrypoint，`content.test.ts` 会触发 "Multiple entrypoints with the same
  name" 构建错误——故放在 `src/shared/shortcuts.test.ts`（colocate 原则的
  已记录例外）。

### 单测清单（新增 33 例，全套 167 例绿）

- shortcuts.test.ts：action 表完整性（顺序/去重/与类型一致）、默认表逐条
  快照、matchShortcut 全矩阵（默认键位逐条、shift/ctrl/alt/meta 组合、
  code 主 + key 回退、小键盘数字、非拉丁布局、null 禁用、空事件）、
  captureShortcut（录制规范化、裸 modifier、code 缺失、录制-匹配往返）、
  findBindingConflict（同物理键、key 忽略、modifier 区分、自排除、禁用豁免）、
  sanitizeShortcuts（缺省/旧数据/非法条目/null/未知 id/原型安全/不改默认表）、
  cloneDefaultShortcuts 深拷贝、bindingEquals、formatShortcutBinding、
  **content.ts 执行器源码守卫 ×2**（每个 actionId 有 case 标签 + never
  穷尽守卫存在，阴性自检通过）
- config.test.ts：mergeConfig 的 shortcuts 缺省回落（TC4 对应）、自定义+
  禁用 round-trip、非法条目修复；既有 'keeps valid global values' 期望补
  shortcuts 字段（schema 变更的合法更新）
- config-cache.test.ts：makeConfig 补字段、mergeGlobalRaw 填充默认表断言

### 验证结果

`pnpm test` 167/167 绿（8 文件）；`pnpm compile` 无错；`pnpm build` 成功
（chrome-mv3）。独立审查打回一轮（P0 mediaTrackNext 执行分支遗漏 + 守卫
缺失 + 恢复默认无确认）已全部修复并复验。

### 遗留风险（真机验收项）

- TC1 默认键位逐条回归（重点：`.`/`,` 仅暂停时生效且不吞事件、媒体键不
  consume（含 **MediaTrackNext 键点击下一曲**——审查修复项）、Shift+`.`/`,`
  调速）
- TC2 重映射 j→p 后 p 生效、j 失效、输入框聚焦不触发、视频页免刷新生效
- TC3 冲突交换与恢复默认（含新加的 confirm 对话框）
- TC4 旧 schema（无 shortcuts 字段）加载无报错
- 已知行为差异（上文三条）如 QA 判定为回归，可回退为「key 严格 + code 兜底」
  的另一套匹配，改动集中在 matchShortcut 一处
- （记录不改，审查采纳）options 所有 updateGlobal 控件在 storage 写失败时
  乐观更新不回滚——updateGlobal 共享行为、非本卡范围，建议后续单开卡统一
  处理（写失败已有 console.warn，UI 无感知）
- （记录不改，审查采纳）录制态会吞 Tab 与可被浏览器保留的组合键（如
  Ctrl+W 无法 preventDefault，录制拿不到）；脏数据导致的冲突提示只解析
  首个命中 action——均低频边缘场景，待真机验收评估是否需要跟进
