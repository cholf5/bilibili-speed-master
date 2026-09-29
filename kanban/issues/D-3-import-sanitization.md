# D-3 导入配置时按 schema 校验（含 channels 条目）

> Status: To Do (P0) — 来源：2026-09-29 代码评审

## Objective

`entrypoints/options/App.tsx` 的 `importConfig`（135-144 行）只检查
`raw.version === 1` 就 `updateConfig(() => raw as SpeedMasterConfig)` 原样
入库。而 `mergeConfig`（`src/shared/config.ts`）只在**读取**时校正
`global` / `stats`，对 `channels` 的每个条目完全不做校验——导入一个
`speed` 缺失/为字符串/为 1e9 的文件后，垃圾数据直接进 storage，options
频道表格显示 `NaN`，行为不可预期。

## Subtasks

- [ ] `src/shared/config.ts`：新增 `sanitizeChannels(raw): Record<string,
      ChannelOverride>`，逐条校验：channelId/channelName 为字符串、speed
      为数值并 clamp 到 0.1–4、lastVisit 为合法 ISO 字符串（否则丢弃该字
      段）、avatarUrl 可选字符串；非法条目整条丢弃
- [ ] `mergeConfig` 改为对 `raw.channels` 调用 sanitizeChannels（读取路径
      同样受益，防御手工改坏的数据）
- [ ] `importConfig` 把导入文件先过完整 sanitize 再写库；channel 数量超
      上限时按 D-4 的规则截断
- [ ] 导入失败的错误信息区分「JSON 解析失败 / schema 不合法 / 超配额」
      （可选，当前统一 alert 也可接受）

## Developer

cholf5 (AI-assisted)

## Estimated Complexity

S

## Acceptance Criteria

- 导入含非法 channels 条目的文件（缺 speed、speed 为字符串、channels 为
  数组等）→ 不再出现 NaN，数据被清洗或明确报错
- 导入合法文件 → 结果与手工配置完全一致（round-trip）
- 旧版本导出的合法文件导入行为不变

## Test Cases

- TC1: 构造畸形样本导入 → options 表格无 NaN，storage 中数据经
  `getConfig()` 读出为合法结构
- TC2: 正常导出 → 导入 round-trip 一致
- TC3: sanitizeChannels 纳入 D-15 的单元测试

## Related Documents / Designs

- `docs/import-export.md`、`docs/storage.md`
- `kanban/issues/A-9-import-export.md`、`kanban/issues/D-4-channel-lru-cap.md`

## Dependent Tasks

- 无（与 D-4 共享 sanitizer，建议同批实现）

## Notes

- sanitizeChannels 就位后，D-4 的 LRU 截断可以直接挂在其出口处
