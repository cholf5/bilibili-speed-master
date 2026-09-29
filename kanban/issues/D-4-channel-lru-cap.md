# D-4 为 channels 增加 LRU 上限与清理

> Status: Testing / QA (P1) — 来源：2026-09-29 代码评审

## Objective

用户每看一个 UP 主并改过速度，就会在 `channels` 里留一条（含头像 URL，
单条数百字节）。`chrome.storage.sync` 总配额仅 102,400 字节 / 512 条，重
度用户迟早撞墙；撞墙后 `storage.set` 静默失败，所有配置写入（含全局速度）
都会丢失。需要硬上限 + 淘汰策略 + 写入失败兜底。

## Subtasks

- [x] 定义上限常量（建议 200 条，为未来字段增长留余量）
- [x] 淘汰规则：按 `lastVisit` 最旧优先淘汰；在所有写入路径出口执行（
      handleRateChange 持久化、recordChannelVisit、options 增改、import
      清洗）
- [x] `src/shared/config.ts`：写入失败检查 `lastError` / 捕获拒绝并
      console.warn，避免静默丢数据
- [ ] （可选）avatarUrl 体积评估：若 200 条仍逼近配额，考虑头像 URL 挪到
      `storage.local` 或存短键

## Developer

cholf5 (AI-assisted)

## Estimated Complexity

S

## Acceptance Criteria

- 注入 >200 条频道后继续使用：最旧的被淘汰，最新的保留，永不超上限
- 人为把 storage 写失败（如用 devtools 填满配额）→ console 有告警，不无
  声丢失
- 淘汰不影响 options 中正在展示的列表一致性（删除即最终，无幽灵行）

## Test Cases

- TC1: 脚本注入 250 条 → 收敛到 200 条，且 lastVisit 最新的 200 条在列
- TC2: 淘汰后访问一个旧 UP 主 → 其覆盖已不存在，视频回退全局速度（符合
  语义）
- TC3: 与 D-3 联动：导入 300 条合法文件 → 截断到 200 条

## Related Documents / Designs

- `docs/storage.md`
- `kanban/issues/D-3-import-sanitization.md`

## Dependent Tasks

- D-3（复用 sanitizeChannels 的出口做截断；先做 D-3 更顺，但可并行）

## Notes

- 淘汰只删「频道覆盖」，不涉及其他数据；需在 `docs/storage.md` 补充上限
  说明

## Implementation Notes (dev)

### 改动文件

- `src/shared/config.ts`：新增导出 `MAX_CHANNELS = 200` 与
  `capChannels(config, max = MAX_CHANNELS)`（按 lastVisit 升序保留最新
  max 条，缺/非法 lastVisit 视为最旧优先淘汰）；`setConfig` 在写入前统一
  执行 capChannels；`setInStorage` callback 风格检查
  `chrome.runtime.lastError`、promise 风格 catch 拒绝，统一
  `console.warn`（`[speed-master]` 前缀），不向上抛
- `docs/storage.md`：新增「Channels Cap (D-4)」小节及写入失败告警说明
- `kanban/board.md`：D-4 挪入 In Progress

### 关键决策

- 截断只挂在 `setConfig` 这一个写入口：content.ts 的
  handleRateChange/recordChannelVisit（经 updateConfigIfChanged→setConfig）、
  popup/options 的 updateConfig、import 全部收敛到该函数，无需改动
  content.ts 业务逻辑
- `capChannels` 在条数 ≤ 上限时原样返回同一对象（无拷贝），常规写入零开销；
  `setConfig`/`updateConfig` 返回截断后的配置，保证 options/popup 的 React
  状态与 storage 一致
- 「可选」avatarUrl 挪 local/短键未做：200 条 × 数百字节距 102,400 字节
  总配额仍有余量，保持未勾，留待实测逼近配额时再评估
- 淘汰语义确认（TC2）：被淘汰频道的覆盖删除后，`applySpeedForVideo` 读不到
  该 channel 即回退 `global.defaultSpeed`，无需额外代码

### 验证结果

- `./node_modules/.bin/tsc --noEmit` 通过（0 错误）；`pnpm build` 成功
- 功能自测：250 条（含 10 条缺 lastVisit）→ 恰好保留 200 条，且为 lastVisit
  最新的 200 条（缺 lastVisit 的 10 条全部被淘汰）；写入失败告警在 callback
  与 promise 两种 storage 形态下均触发 console.warn 且不向上抛
- TC1/TC3 的浏览器端注入验证与「用 devtools 填满配额」的人工复测留待 QA；
  TC3（导入 300 条合法文件 → 截断 200）已由自测中 mergeConfig+cap 链路覆盖

## Review Comments (PM, 2026-09-29)

- 通过。截断单点收口在 `setConfig` 是正确选择,所有写入路径天然覆盖;
  ≤上限时零拷贝直返保住了 `updateConfigIfChanged` 的引用相等短路语义
- console.warn 告警不向上抛符合"不破坏既有调用方"约束;配额实测(D-1 迁
  local 后写入压力大幅下降)可进一步降低触发概率

## QA Notes

- PM 独立 QA:205 条(195 有 lastVisit 递增 + 10 无 lastVisit)→ 恰好
  200,有 lastVisit 的 195 条全部保留,无 lastVisit 视为最旧先淘汰;与开
  发自测的 250→200 用例互补
- 待用户真机验收:TC1(浏览器注入 250 条)与配额填满复测
