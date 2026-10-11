# D-17 核实 options_ui.open_in_tab 被 WXT 丢弃的行为

> Status: Backlog (P3) — 来源：2026-10-11 D-8 独立审查（范围外预存问题）

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

- [ ] 真机核实当前 options 打开行为
- [ ] 产品决策期望行为
- [ ] 如需修改：实现 + 双端构建产物验证

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
