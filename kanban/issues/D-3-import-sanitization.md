# D-3 导入配置时按 schema 校验（含 channels 条目）

> Status: Testing / QA (P0) — 来源：2026-09-29 代码评审

## Objective

`entrypoints/options/App.tsx` 的 `importConfig`（135-144 行）只检查
`raw.version === 1` 就 `updateConfig(() => raw as SpeedMasterConfig)` 原样
入库。而 `mergeConfig`（`src/shared/config.ts`）只在**读取**时校正
`global` / `stats`，对 `channels` 的每个条目完全不做校验——导入一个
`speed` 缺失/为字符串/为 1e9 的文件后，垃圾数据直接进 storage，options
频道表格显示 `NaN`，行为不可预期。

## Subtasks

- [x] `src/shared/config.ts`：新增 `sanitizeChannels(raw): Record<string,
      ChannelOverride>`，逐条校验：channelId/channelName 为字符串、speed
      为数值并 clamp 到 0.1–4、lastVisit 为合法 ISO 字符串（否则丢弃该字
      段）、avatarUrl 可选字符串；非法条目整条丢弃
- [x] `mergeConfig` 改为对 `raw.channels` 调用 sanitizeChannels（读取路径
      同样受益，防御手工改坏的数据）
- [x] `importConfig` 把导入文件先过完整 sanitize 再写库；channel 数量超
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

## Implementation Notes (dev)

### 改动文件

- `src/shared/config.ts`：新增导出 `sanitizeChannels(raw: unknown)`；`mergeConfig`
  的 channels 分支改走 sanitize（读取路径同步防御）；新增导出 `mergeConfig`
  供 options 导入复用
- `entrypoints/options/App.tsx`：`importConfig` 在 JSON 解析 + `version === 1`
  检查后改为 `updateConfig(() => mergeConfig(raw))`，替换原 `raw as SpeedMasterConfig`
  直通；截断由 setConfig 统一执行（见 D-4）
- `docs/storage.md`：新增「Channels Sanitization (D-3)」小节
- `kanban/board.md`：D-3 挪入 In Progress

### 关键决策

- channelId 校验从严：非空字符串缺失即整条丢弃（不回退用记录 key 兜底）；
  channelId 与 key 不一致时以 channelId 为准重新作为 key
- speed 仅 clamp 到 0.1–4，不做四舍五入，避免改动既有合法数据（如导入文件里的
  1.25）；speed 缺失/字符串/NaN/Infinity → 整条丢弃
- lastVisit 非法仅丢字段保留条目；此时条目类型上仍标记为 ChannelOverride，
  读取方（options 排序/时间格式化、LRU 淘汰）均已容忍 lastVisit 缺失
  （缺 lastVisit 在 LRU 中视为最旧）
- `setConfig` 返回实际写入（截断后）的配置，`updateConfig` 透传该返回值，
  使导入 300 条后 options 界面立即显示截断后的 200 条，UI 与 storage 一致

### 验证结果

- `./node_modules/.bin/tsc --noEmit` 通过（0 错误）
- `pnpm build` 成功
- 功能自测脚本（Node v25 直接跑 TS）覆盖：缺 speed、speed 为字符串/1e9/NaN、
  channels 为数组、缺失 lastVisit、合法数据 round-trip 不变，全部符合预期
  （详见 D-4 卡片同节与开发报告）；TC3（sanitizeChannels 单元测试）待 D-15

## Review Comments (PM, 2026-09-29)

- 通过。diff 逐行评审:`sanitizeChannels` 校验完备(类型/非空/clamp/字段级
  容错),`mergeConfig` 收口正确,导入路径不再直通 cast
- 偏差接受:`updateConfig` 返回截断后配置属合理扩展,调用方兼容(既有调用
  点要么忽略返回值要么正需要截断后状态)
- 注意点(不阻塞):被清洗条目的 `lastVisit` 为可选,与 `ChannelOverride`
  类型的字段声明存在轻微类型不忠实,已用内部类型 + 单点 cast 承载并文档
  化;后续若引入严格运行时 schema 可一并收口

## QA Notes

- PM 独立 QA(与开发自测用例分离,Node v25 直跑 TS):20/20 通过,含非法
  输入不抛、坏条目丢弃、clamp 边界(1e9→4 / 0.01→0.1)、key 重写、非法
  lastVisit 丢字段保条目、合法配置 round-trip 逐字节一致、导入垃圾数据
  出合法结构、旧格式数据兼容
- 首轮 1 项 FAIL 为 QA 脚本自身用例构造错误(key 冲突),修正后通过,与
  实现无关
- 待用户真机验收:在 options 实际导入一个畸形 JSON 文件确认无 NaN
