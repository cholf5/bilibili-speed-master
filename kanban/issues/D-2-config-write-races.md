# D-2 消除跨上下文配置写入竞态

> Status: To Do (P0) — 来源：2026-09-29 代码评审

## Objective

`updateConfig`（`src/shared/config.ts:127`）是「读整个对象 → updater 改 →
写整个对象」，content、popup、options 三个上下文并发执行时没有串行化保
障，后写者会整体覆盖前写者。现实场景：

- content 每 3s 一次的统计 flush 与用户在 popup 改全局速度并发：
  flush 在读和写之间如果插入了用户的写入，flush 会用旧快照把用户的修改
  **静默回滚**（窗口毫秒级，但长时间使用必然发生）
- 两个标签页同时导航，频道访问记录/频道覆盖互相覆盖导致丢更新
- 播放器自带速度滑杆连拖触发一串 ratechange，每次都走一遍读改写

## Subtasks

- [ ] 选型（推荐 a，b 为轻量替代）：
  - a. **收敛到 background 单写者**：content/popup/options 全部改为发消息
    请求写入，background 内用 promise 队列串行执行读改写
  - b. 进程内互斥队列 + 细分 storage key（global / channels / stats 分
    key），缩小覆盖面（不能完全消除跨上下文竞态）
- [ ] 写入失败路径统一处理：检查 `lastError` / 捕获拒绝，至少 console.warn
- [ ] ratechange 持久化加 trailing debounce（~300ms），debounce 只作用于
    storage 写入，不得影响 player-init 窗口内的 re-assert 路径
- [ ] 验证 `storage.onChanged` 触发的 re-apply 链路在单写者模式下不产生
    回环

## Developer

cholf5 (AI-assisted)

## Estimated Complexity

M

## Acceptance Criteria

- 构造并发：popup 连点全局速度 + 的同时持续播放触发统计 flush，最终
  storage 中速度值与最后一次用户操作一致，无回滚
- 双标签页分别导航/调速，两边写入均不丢失
- B-2 / B-3 / B-4 的回归场景全部通过（SPA 频道切换、B 站自动恢复、幻影
  覆盖）
- 滑杆一次拖动产生的 storage 写入 ≤ 2 次

## Test Cases

- TC1: TC 见 Acceptance Criteria 的并发构造；可用 `setInterval` 模拟
  flush 与手工点击交错
- TC2: 回归 `kanban/issues/B-2`、`B-3`、`B-4` 卡片中的全部手工用例
- TC3: `pnpm compile`、`pnpm build`、`pnpm build:firefox` 通过

## Related Documents / Designs

- `docs/storage.md`
- `kanban/issues/D-1-stats-to-local-storage.md`（统计移出后竞态面缩小）

## Dependent Tasks

- D-1（先做，缩小竞态面并确定 stats 的新写入路径）

## Notes

- 若选方案 a，`speed-master:open-options` 已有 content→background 消息通
  路，可复用同一通道扩展消息类型
