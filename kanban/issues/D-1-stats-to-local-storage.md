# D-1 将统计数据迁移到 storage.local 并降低写入频率

> Status: To Do (P0) — 来源：2026-09-29 代码评审

## Objective

`stats.timeSavedSeconds` 目前随主配置存放在 `chrome.storage.sync`（同一个
`bilibiliSpeedMaster` key），且倍速 >1x 播放时每 ~3 秒 flush 一次
（`entrypoints/content.ts` 的 `flushTimeSaved` / `scheduleTimeSaveFlush`，
约 3s:774-797）。这带来两个问题：

1. **写入配额压力**：Chrome `storage.sync` 限制 MAX_WRITE_OPERATIONS_PER_HOUR
   = 1800。仅统计 flush 就占约 1200 次/小时，再叠加 ratechange 持久化、
   频道访问记录、popup/options 操作，重度使用会超限；超限后写入静默失败，
   统计丢失（`setInStorage` 回调未检查 `lastError`，promise 路径的拒绝也
   只被上层 `void` 吞掉）。
2. **语义问题**：节省时间本来就是设备相关数据，没有跨设备同步的价值，
   放在 sync 里白白消耗同步配额和带宽。

## Subtasks

- [ ] `src/shared/config.ts`：新增本地统计存取 API（新 key
      `bilibiliSpeedMasterStats`，走 `chrome.storage.local`）；
      `SpeedMasterConfig` 中的 `stats` 保留为可选兼容字段
- [ ] 迁移：首次运行时读取 sync 中旧的 `stats.timeSavedSeconds`，合并进
      local 后不再回写 sync（或置 0），保证旧用户数据不丢
- [ ] `entrypoints/content.ts`：flush 改写 local key，并把定时 flush 间隔
      从 3s 拉长到 30–60s（pause / visibilitychange / pagehide /
      beforeunload 的兜底 flush 保留，丢失窗口有界）
- [ ] `entrypoints/popup/App.tsx`、`entrypoints/options/App.tsx`：统计展示
      改读 local key，`storage.onChanged` 监听同步扩展到 local
- [ ] A-9 导入导出适配：export 合并 sync 配置 + local 统计，import 拆开
      写回，格式保持向后兼容（导出文件里仍含 `stats` 字段）

## Developer

cholf5 (AI-assisted)

## Estimated Complexity

M

## Acceptance Criteria

- 倍速 >1x 连续播放 10 分钟，`chrome.storage.sync` 不再出现 3s 级高频写入
  （可通过 instrumentation 日志或 storage 面板验证），统计数值仍正常累加
- 旧版本升级场景：sync 中已有的 `stats.timeSavedSeconds` 迁移到 local，
  popup/options 显示值不变
- 导出文件仍包含统计；导入旧格式文件后统计可恢复
- `pnpm compile`、`pnpm build` 通过

## Test Cases

- TC1: 2x 播放 10 分钟 → 统计增长 ≈ 5 分钟；期间 sync 写入次数 ≤ 个位数
- TC2: 预置旧 schema 数据（sync 含 stats）→ 加载后 local 接管，显示值与
  迁移前一致
- TC3: 切后台 5 分钟再回前台（hidden 兜底 flush）→ 统计不重复计、不丢失
- TC4: 导出 → 清空数据 → 导入 → 统计恢复

## Related Documents / Designs

- `docs/storage.md`、`docs/time-saved.md`、`docs/import-export.md`
- `kanban/issues/A-10-time-saved.md`、`kanban/issues/A-9-import-export.md`

## Dependent Tasks

- 无（建议在 D-2 之前完成：统计移出共享 blob 后，D-2 的竞态面显著缩小）

## Notes

- `setInStorage` 目前不检查 `chrome.runtime.lastError`；本卡至少要在新写
  入路径上处理失败（console.warn），sync 失败兜底放到 D-2 一并考虑
