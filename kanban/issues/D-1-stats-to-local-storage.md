# D-1 将统计数据迁移到 storage.local 并降低写入频率

> Status: Testing / QA (P0) — 来源：2026-09-29 代码评审

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

- [x] `src/shared/config.ts`：新增本地统计存取 API（新 key
      `bilibiliSpeedMasterStats`，走 `chrome.storage.local`）；
      `SpeedMasterConfig` 中的 `stats` 保留为可选兼容字段
      （实现于新模块 `src/shared/stats.ts`，不动 config.ts 的写收口）
- [x] 迁移：首次运行时读取 sync 中旧的 `stats.timeSavedSeconds`，合并进
      local 后不再回写 sync（或置 0），保证旧用户数据不丢
      （首次 `getSavedStats()` 触发，max 语义，幂等，sync 旧值原样保留）
- [x] `entrypoints/content.ts`：flush 改写 local key，并把定时 flush 间隔
      从 3s 拉长到 30–60s（pause / visibilitychange / pagehide /
      beforeunload 的兜底 flush 保留，丢失窗口有界）（取 30s）
- [x] `entrypoints/popup/App.tsx`、`entrypoints/options/App.tsx`：统计展示
      改读 local key，`storage.onChanged` 监听同步扩展到 local
- [x] A-9 导入导出适配：export 合并 sync 配置 + local 统计，import 拆开
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

## Implementation Notes (dev)

### 实现方式

- **新模块 `src/shared/stats.ts`**（未动 config.ts 的 setConfig 写收口）：
  key `bilibiliSpeedMasterStats`，走 `chrome.storage.local`，browser/chrome
  双兼容（callback/promise 双分支，与 config.ts 同款）。API：
  - `getSavedStats()`：返回 `{ timeSavedSeconds }`，非法值（非有限数/负数）
    兜底 0；每次调用先跑迁移检查。
  - `updateSavedStats(updater)`：local 上的读改写，返回持久化（清洗后）值。
  - **storage 句柄用惰性 getter 函数按次解析，不做模块级常量**（config.ts
    的模块级单例是已知反面教材：import 时冻结，事后注入的测试 mock 不可
    见）。测试通过 `vi.resetModules()` + 动态 import 在 beforeEach 内先装
    mock 再加载模块，config.ts 的模块级句柄也因此能命中 mock。
- **迁移**：**任一**统计入口（`getSavedStats` 或 `updateSavedStats`）首次
  访问时读 sync 配置的 `stats.timeSavedSeconds`（经 `getConfig`），
  `max(local, legacy)` 且仅当 legacy 更大时写回 local。幂等：local ≥
  legacy 后不再写，多标签页并发最坏情况是重复写同一个 max 值；sync 旧值
  不删不置零（迁移后无人再读）。**PM 评审修复**：迁移抽成模块级 memoized
  的 `ensureMigrated()`（缓存 promise 本体，并发调用共享同一次运行；失败
  不缓存、下次重试），`getSavedStats` 与 `updateSavedStats` 入口都先
  `await ensureMigrated()`——升级后第一次 30s flush 即完成迁移，新累计在
  legacy 之上安全叠加，不会被打开 popup 时的 max 合并整体吞掉；同时
  `getSavedStats` 也不再每次调用都多做一次 sync 读。
- **content.ts**：`flushTimeSaved` 改走 `updateSavedStats`，删除了原
  updateConfig 统计路径（`updateConfig` import 一并移除）；
  `TIME_SAVE_FLUSH_MS` 3000 → 30000；pause / visibilitychange / pagehide /
  beforeunload 兜底 flush 全部保留；`handleTimeUpdate` 的统计口径（delta
  过滤、computeTimeSaved）未动；`storageOnChanged` 维持只看 sync（local 统
  计写入绝不触发 applySpeedForVideo/applyPreferredQuality），仅补了注释。
- **popup / options**：`hoursSaved` 改从 `getSavedStats()` 取；各自新增
  local 区 `STATS_STORAGE_KEY` 的 onChanged 监听刷新统计显示（popup 原有
  sync 监听保留用于配置刷新；options 原先没有任何 onChanged 监听，本次补
  的是 local 统计监听）。
- **导入导出（options）**：export = sync 配置 + `stats: await
  getSavedStats()`，文件仍为 v1 格式（旧版可导入）；import 在 mergeConfig
  清洗、配置本体照旧写 sync（stats 字段随 mergeConfig 保留，即 import 兼
  容路径）之后，把导入文件的 `stats.timeSavedSeconds` 以 max 语义合并写入
  local，防止旧备份回退统计。
- **schema**：`SpeedMasterConfig.stats` 与 mergeConfig 兜底保留不动，运行
  时统计读写全部不再经过它；sync 的 stats 字段除 import 兼容路径外只读。

### 测试与验证（2026-09-29）

- `src/shared/stats.test.ts` 新增 16 用例：迁移幂等、多标签页并发迁移、
  max 合并语义、非法值兜底 0（含 NaN 穿透 mergeConfig 的情况）、
  updateSavedStats 读改写/只写 stats key/不触 sync、callback lastError 与
  promise rejection 两种写失败均 console.warn 且不抛、无 storage API 优雅
  降级。`pnpm test`：80/80 绿（原 64 + 新 16）。
- `./node_modules/.bin/tsc --noEmit`：0 错误。`pnpm build`：成功。
- 频率验证（临时 vitest 脚本，跑完已删）：模拟 2x 播放 60s（250ms
  timeupdate 等价推进 + 30s 定时 flush + 边界 flush，走真实
  updateSavedStats + 计数 mock）→ local 写入 2 次（≤3），sync 写入 0 次，
  累计值 59.75s 正确（首个 timeupdate 建立基线不计，239 tick × 0.25s）。
- 验收对照：TC1（频率）已程序化验证；TC2（旧 schema 迁移）、TC3（hidden
  兜底不重复不丢失）、TC4（导出导入恢复）由单测覆盖核心逻辑，真机回归待
  QA（与 D-15 备注一致）。

### 偏差与已知事项

- 卡片第一子项写的是"在 config.ts 新增 API"，实际落在独立模块
  `src/shared/stats.ts`（PM 指示的可测试性优先：惰性句柄 + 不污染
  config.ts 的写收口），语义等价。
- `docs/import-export.md` 顺带补了两行导出/导入行为说明（A-9 适配改变了其
  描述的行为，避免文档失实），超出 PM 指示的两份文档范围，属最小增量。
- 遗留风险：跨标签页对同一个 local stats key 仍是"后写覆盖"（各自 RMW），
  极端并发下有界丢失，属 D-2 竞态治理范围；迁移失败（sync 读异常）时不缓
  存失败、下次统计访问重试，期间数值可能短暂未合并。sync 旧 stats 字段长
  期留存（不清理），体积影响可忽略，如需清理可挂到 D-2。

## Review Comments (PM, 2026-09-29)

- 首轮评审通过实现主体(独立 stats 模块、惰性 storage 句柄、幂等迁移、
  sync 监听保持只看 sync、导入导出双向适配),但打回一次:
- **打回项(已修复)**:迁移最初只挂在 getSavedStats(popup/options 打开
  时),flush 路径不触发 → "升级后持续播放、很久才打开 popup"场景下,新
  累计会被 legacy 旧值 max 覆盖丢失。修复:模块级 memoized `ensureMigrated`
  同时覆盖 get/update 两个入口,迁移失败不缓存失败(可重试,无 unhandled
  rejection)
- 修复后附带的收益:getSavedStats 不再每次调用都重跑迁移检查

## QA Notes

- PM 独立复跑 `pnpm test`:83/83 全绿(原 64 + stats 19)
- 开发端到端频率验证:2x 播放 60s 模拟 → sync 零写入、local ≤3 次写入;
  含 legacy 3600s 场景:迁移写 + flush 写精确叠加为 3659.75,证明打回项
  修复生效
- 待用户真机验收:升级安装(带旧 sync 数据)后确认统计无回退、popup 实时
  刷新
