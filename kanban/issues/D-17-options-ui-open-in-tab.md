# D-17 核实 options_ui.open_in_tab 被 WXT 丢弃的行为

> Status: In Progress (dev done, awaiting review) (P3) — 来源：2026-10-11 D-8 独立审查（范围外预存问题）

## Objective

`wxt.config.ts` 中配置了 `options_ui.open_in_tab: true`（options 页以独立
标签页打开），但 D-8 审查发现该字段在 chrome-mv3 / firefox-mv3 构建产物
manifest 中均被丢弃——WXT 从 options entrypoint 自行生成 `options_ui`
（见 WXT dist `manifest.mjs` 生成逻辑，默认内嵌打开）。

需要核实并决策：

1. 实际行为：Chrome/Firefox 中右键扩展图标 →「选项」时，options 页当前
   到底以内嵌弹窗还是独立标签页打开。
2. 产品决策：期望行为是什么（独立标签页与内嵌各有优劣——本扩展 options
   含频道表格，独立标签页体验通常更好）。
3. 若需强制 `open_in_tab: true`：找到 WXT 下正确的实现方式（如
   entrypoint 级配置 `entrypoints/options/index.html` 的 define
   `options.openInTab`，或自定义 manifest 钩子），实现并在双端构建产物
   中验证。

## Subtasks

- [ ] 真机核实 options 打开行为（留验收：真机 TC2，随验收一并确认）
- [x] 产品决策期望行为（PM 拍板 2026-10-11：独立标签页，恢复原 `open_in_tab: true` 意图）
- [x] 如需修改：实现 + 双端构建产物验证（meta 声明 + chrome-mv3 / firefox-mv3 manifest 均验证通过）

## Developer

cholf5 (AI-assisted)

## Estimated Complexity

S

## Acceptance Criteria

- 构建产物 manifest 的 `options_ui.open_in_tab` 与产品决策一致
- 真机「选项」入口行为与决策一致

## Test Cases

- TC1: 检查 `pnpm build` / `pnpm build:firefox` 产物 manifest 的 options_ui
- TC2: 真机右键扩展图标 → 选项，确认打开方式

## Related Documents / Designs

- `wxt.config.ts`、`entrypoints/options/`、WXT options entrypoint 文档

## Dependent Tasks

- 无（D-8 审查时发现的预存问题，独立处理）

## Notes

- D-8 审查原文："`options_ui.open_in_tab: true` 在两个构建产物中均被丢弃
  （WXT 从 options entrypoint 自行生成 options_ui），即 options 页实际以
  内嵌方式打开。与『发布 manifest 正确性』主题相关。"

## 开发记录 (2026-10-11)

### WXT 机制确认过程

1. **本地源码实读（决定性证据）**：
   - `node_modules/wxt/dist/core/utils/building/find-entrypoints.mjs:162-175`
     （`importHtmlEntrypoint`）：WXT 解析 entrypoint HTML 中所有 `<meta>`，
     仅处理 `name` 以 `manifest.` 开头的项，键名做 camelCase、内容经
     JSON5 解析——即 `<meta name="manifest.open_in_tab" content="true">`
     被读为 `openInTab: true`（布尔值）。
   - `find-entrypoints.mjs:243-256`（`getOptionsEntrypoint`）：将该
     `openInTab` 传入 options entrypoint 的 options。
   - `node_modules/wxt/dist/core/utils/manifest.mjs:222-229`：WXT 在有
     options entrypoint 时**无条件重写** `manifest.options_ui = {
     open_in_tab: options.options.openInTab, ..., page }`——这正是
     `wxt.config.ts` 手写 `options_ui` 被丢弃的原因（先合入 config，后被
     entrypoint 生成逻辑覆盖）。
   - 类型声明佐证：`node_modules/wxt/dist/types.d.ts:622-623`
     `OptionsEntrypointOptions.openInTab?: PerBrowserOption<boolean>`。
2. **官方文档确认**：https://wxt.dev/entrypoints/options.html
   （WXT options entrypoint 文档）明确给出
   `<meta name="manifest.open_in_tab" content="true|false" />` 声明方式；
   https://wxt.dev/guide/entrypoints.html 的通用 meta 规则与本地源码的
   `manifest.*` 解析逻辑一致。

### 改动清单

- `entrypoints/options/index.html`：新增
  `<meta name="manifest.open_in_tab" content="true" />`（附 D-17 注释）。
- `wxt.config.ts`：删除被 WXT 静默丢弃的 `options_ui` 配置块，改为注释
  说明 options 打开方式由 entrypoint meta 控制。
- `docs/options-implementation.md`：Page Behavior 段同步为新机制说明。

### 双端 manifest 验证结果

- `pnpm build` → `.output/chrome-mv3/manifest.json`：
  `"options_ui": { "open_in_tab": true, "page": "options.html" }`
- `pnpm build:firefox` → `.output/firefox-mv3/manifest.json`：
  `"options_ui": { "open_in_tab": true, "page": "options.html" }`
- `pnpm test`：10 文件 213 例全部通过；`pnpm compile`：exit 0。

### 遗留风险

- 真机行为（右键扩展图标 →「选项」以独立标签页打开）未实测，留验收
  TC2 确认（Chrome / Firefox 双端）。
- WXT 升级若改变 meta 解析规则（`manifest.*` 前缀约定），此处会静默回退
  为内嵌打开；建议 D-8 类发布检查中保留 TC1（构建产物 manifest 检查）
  作为回归防线。


## 独立审查记录 (2026-10-11)

独立审查（subagent）结论：**通过**。WXT 0.20.13 本地源码逐行实读确认 meta 机制（find-entrypoints.mjs meta 解析 → manifest.mjs 无条件重写 options_ui 且静默丢弃手写配置，与根因描述完全吻合）；双端产物逐字验证 `options_ui.open_in_tab: true`；wxt.config.ts 剩余字段全部真实生效、无其他被忽略配置；docs 同步无遗漏；213/213 测试绿 + compile 通过。

处置：
- [P2 已由 PM 落实] entrypoints/background.ts 中「WXT drops open_in_tab from the manifest」的过时注释随本卡修正（D-17 使其失实）。
- [仅记录] 开发记录中两处 WXT 源码行号轻微漂移（实际 235-252 / 221-230），内容引用正确，不影响结论。

真机验收：TC2（Chrome/Firefox 右键扩展图标 →「选项」应为独立标签页）；TC1（构建产物 manifest 检查）建议保留为发布回归防线。
