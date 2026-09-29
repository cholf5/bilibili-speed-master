# D-4 为 channels 增加 LRU 上限与清理

> Status: To Do (P1) — 来源：2026-09-29 代码评审

## Objective

用户每看一个 UP 主并改过速度，就会在 `channels` 里留一条（含头像 URL，
单条数百字节）。`chrome.storage.sync` 总配额仅 102,400 字节 / 512 条，重
度用户迟早撞墙；撞墙后 `storage.set` 静默失败，所有配置写入（含全局速度）
都会丢失。需要硬上限 + 淘汰策略 + 写入失败兜底。

## Subtasks

- [ ] 定义上限常量（建议 200 条，为未来字段增长留余量）
- [ ] 淘汰规则：按 `lastVisit` 最旧优先淘汰；在所有写入路径出口执行（
      handleRateChange 持久化、recordChannelVisit、options 增改、import
      清洗）
- [ ] `src/shared/config.ts`：写入失败检查 `lastError` / 捕获拒绝并
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
