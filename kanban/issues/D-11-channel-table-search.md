# D-11 options 频道表格搜索/筛选

> Status: Backlog (P2) — 来源：2026-09-29 代码评审

## Objective

频道覆盖列表按 lastVisit 排序平铺（options/App.tsx `sortedChannels`），
D-4 设上限 200 条后，找不到目标频道会成为高频痛点。在表格上方加一个客户
端过滤输入框（按频道名/channelId 子串匹配，大小写不敏感），必要时加「仅
显示有覆盖」之类的最小筛选。

## Subtasks

- [ ] options：表格 header 下加搜索输入框（受控组件，防抖 ~150ms）
- [ ] 过滤逻辑：channelName 或 channelId 包含关键字；空关键字 = 全量
- [ ] 空结果状态文案复用/新增 i18n（17 语言）
- [ ] （可选）条数显示「n / total」

## Developer

cholf5 (AI-assisted)

## Estimated Complexity

S

## Acceptance Criteria

- 输入关键字即时过滤，清空恢复全量
- 过滤只影响展示，不影响删除/调速操作的正确性
- 搜索无结果时显示明确的空状态文案

## Test Cases

- TC1: 200 条注入数据下按名字片段过滤，结果正确
- TC2: 过滤状态下删除某条 → 列表与 storage 一致
- TC3: 中文频道名、大小写英文均可命中

## Related Documents / Designs

- `docs/options.md`

## Dependent Tasks

- 建议 D-4 完成后评估是否必要（数据少时价值有限）

## Notes

- 无虚拟滚动必要（上限 200 条），普通渲染即可
