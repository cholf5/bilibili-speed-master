# D-2 消除跨上下文配置写入竞态

> Status: Testing / QA (P0) — 来源：2026-09-29 代码评审

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

- [x] 选型（**PM 决策：采用 b**；方案 a 不采用，理由见 Implementation Notes）：
  - a. **收敛到 background 单写者**：content/popup/options 全部改为发消息
    请求写入，background 内用 promise 队列串行执行读改写
    （PM 决策：不采用，不实现）
  - b. 进程内互斥队列 + 细分 storage key（global / channels / stats 分
    key），缩小覆盖面（不能完全消除跨上下文竞态）
    （已实现：split keys + 模块级写队列；D-1 已把 stats 移出 sync，
    方案 b 以 M 级成本消除剩余现实竞态）
- [x] 写入失败路径统一处理：检查 `lastError` / 捕获拒绝，至少 console.warn
      （D-1 已在 setInStorage 覆盖；本次新增的 legacy key remove 走同样的
      lastError / rejection 处理）
- [x] ratechange 持久化加 trailing debounce（~300ms，取 300ms），debounce 只
      作用于 storage 写入，不得影响 player-init 窗口内的 re-assert 路径
      （仅频道覆盖持久化入 debounce；pagehide / visibilitychange hidden /
      beforeunload 兜底立即 flush；re-assert 与 programmaticRate 路径一行未动）
- [x] 验证 `storage.onChanged` 触发的 re-apply 链路在单写者模式下不产生
      回环（推理验证：自身写入 → applySpeedForVideo → programmaticRate 标记
      吸收 ratechange，与拆 key 前同构；见 Implementation Notes）

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

## Implementation Notes (dev)

### 选型（PM 决策）

- **方案 a（background 单写者）不采用**：为每个写操作设计声明式消息协议
  （闭包 updater 无法过消息通道）是 L 级重构，且直接触碰 B-2/B-3/B-4 打磨出
  的持久化语义，回归风险高；D-1 已把最高频写入源（统计 flush）移出 sync 后，
  方案 b 以 M 级成本即可消除剩余现实竞态。
- **方案 b 已实现** = 拆分 sync 存储 key（跨上下文竞态面）+ 上下文内写队列
  （同上下文 RMW 交错）+ ratechange 持久化 debounce（写入频率）。

### 实现方式

- **`src/shared/config.ts`（核心）**：
  - **拆 key**：`bilibiliSpeedMasterGlobal` = `{ version: 1, global }`、
    `bilibiliSpeedMasterChannels` = `{ version: 1, channels }`；
    `STORAGE_KEY`（`bilibiliSpeedMaster`）保留导出作为 legacy key。
  - **读路径（getConfig）**：一次 `storage.sync.get` 同时读两个 split key +
    legacy key，**按分区回退**——分区优先 split key、缺失才落到 legacy 对应
    字段。升级用户无感（两个 split key 都缺 → 全部来自 legacy blob）；半迁移
    状态（某一 split 写失败）也能各分区取到值。stats 只来自 legacy blob
    （D-1 语义不变，`config.stats` 仅兼容保留）。
  - **写路径（setConfig→persistConfig）**：单次 `storage.sync.set` 同时携带
    两个 split key（一次配额写操作，且两分区不会被观察到半写状态）；**不写
    legacy key，也绝不删 legacy key**（PM 评审修复：legacy blob 同时是 D-1
    统计迁移的源，配置写删除会与之竞态并孤儿化旧统计）。
  - **mergeConfig 重构为分区 merge**：抽出 `mergeGlobalRaw` /
    `mergeStatsRaw`（channels 复用 `sanitizeChannels`），对外签名与行为不变。
  - **legacy key 清理（PM 评审修复后）**：config.ts 导出
    `removeLegacyConfigKeyOnce()`，persistConfig 不再调用；由 stats.ts 的
    `migrateLegacyStats` 在**迁移成功完成后**（含 legacy 为 0/缺失的"无事可
    做"路径）调用。时序保证：配置写永不删 legacy → 删除只由统计迁移路径
    触发 → 迁移对 legacy 的读取必然先于删除（升级后首次配置写先于 30s
    flush 落地，也不会孤儿化旧统计）。删除前额外守卫：**两个 split key 都
    已存在才执行**——否则 legacy blob 仍是 global/channels 的读回退源，提前
    删会丢用户配置；守卫不满足时不消费 once-flag（后续迁移成功路径可再试）。
    once-flag 每上下文独立（各自 memoize 迁移 + 各自标志），remove 幂等，
    多标签页无需协调：后迁移的标签页读到 legacy=0 时，值已被先迁移的标签页
    写入 local。
  - **上下文内写队列**：模块级 `writeChain` promise 链 + `enqueueWrite`。
    `setConfig` 入队"仅写"单元；`updateConfig` 入队**完整 RMW 单元**（读在
    队列内，后写者必然基于前写者落盘结果）；单元失败不阻塞队列（链本身永不
    reject）。`updateConfig` 内置引用相等短路：updater 原样返回读到的 config
    时跳过写（承接原 content 侧 `updateConfigIfChanged` 语义，no-op 不触
    storage）。
- **`entrypoints/content.ts`**：
  - `updateConfigIfChanged` 改为 `updateConfig` 的薄包装（保持函数名与调用
    点），引用相等短路移入队列内的 `updateConfig`——短路语义保留在 debounce
    落盘调用里。
  - **handleRateChange 的频道覆盖持久化改为 trailing debounce（300ms）**：
    滑杆连拖每次 ratechange 只重置定时器并覆盖待写值，落盘只发生一次、携带
    最后一次通过全部门控的 channel/speed。**未动**：programmaticRate 标记、
    media-load guard、player-init 的 applySpeedForVideo re-assert、权威频道
    解析门槛——除尾段持久化外一行未改；handleRateChange 早退路径全部保持
    每事件执行。
  - **tab 关闭兜底**：pending 的 debounce 在 `flushBufferedStats` 挂载点
    （visibilitychange hidden / pagehide / beforeunload）立即 flush，复用
    既有挂载点，改完速度立刻关标签页不丢持久化。
  - `recordChannelVisit` 不 debounce（自身有 lastChannelId/lastVideoId 去重），
    照常走队列化 updateConfigIfChanged。
  - `storage.onChanged` 监听改为观察两个 split key（legacy key 不监听）。
- **`entrypoints/popup/App.tsx`**：sync 监听同步改为两个 split key
  （options 原本就没有 sync 配置监听，无需改动）。
- **导入导出格式完全不变**（单 JSON 含 global/channels/stats）：import 经
  `mergeConfig` 清洗后走 split 写路径（options 的 `updateConfig(() => merged)`
  不需要改）。

### 回环推理（storage.onChanged → re-apply，子任务 4）

自身写入触发 sync onChanged（split key 命中）→ `applySpeedForVideo` 重放目标
速度：`programmaticRate = targetSpeed` 在 `applyPlaybackRate` **之前**设置 →
赋值产生的 ratechange 事件里 `playbackRate === programmaticRate` →
handleRateChange 早退，不持久化、不再写 storage。与拆 key 前结构同构（原逻辑
对 merged key 的自身写入同样被吸收），仅监听的 key 集合变化，无新回环面。
popup 全局速度变更 → content onChanged → applySpeedForVideo 应用新默认速度 →
同一 programmaticRate 标记吸收，亦无回环。

### 测试与验证（2026-09-29）

- `src/shared/config.test.ts` 新增 11 用例（复用 stats.test.ts 的
  `vi.resetModules()` + 动态 import + mock 注入手法，另加可控 get 门闩以
  人为制造 RMW 交错窗口）：
  - 读回退 ×3：只有 legacy key 读到旧数据；split 优先于 legacy（stats 仍出
    legacy）；单分区缺失按分区回退。
  - 拆 key 写入 ×4：写后仅 split keys 落盘、legacy key 无新写入且**保持原
    位**（PM 评审修复语义）；`removeLegacyConfigKeyOnce` 在 split 就位后
    删除恰好一次；split 缺失时为 no-op 且不消费 once-flag（后续可再试）；
    setConfig 往返契约（200 截断 + 完整 config 返回 + 读回一致）。
  - 写队列 ×4：两个并发 updateConfig（门闩制造 read/write 交错窗口）→ 后写
    者读到前写者结果、无交错；**并发演示**：popup 式 global 写与 content 式
    channels 写并发 → 两者都落盘且 set 载荷永不携带 legacy key；同 key 连续
    RMW（相对 updater）经队列 1→1.5→2 无丢失；updater 原样返回时跳过写且
    队列继续可用。
- `src/shared/stats.test.ts`：mock 补 remove 支持；迁移用例更新（split 未就
  位时迁移后 legacy key 保留）+ 新增 1 用例（split 就位时迁移读 legacy 后
  删除，local 落值证明读先于删）+ 迁移失败不触发删除 + lastError 用例时序
  修正。
- `pnpm test`：**95/95 绿**（视频 17 + i18n 19 + stats 20 + config 39）。
- `./node_modules/.bin/tsc --noEmit`：0 错误。`pnpm build`：成功。

### 偏差与已知事项

- `updateConfig` 新增"updater 原样返回 → 跳过写"短路（原 `updateConfigIfChanged`
  的私有语义收编进队列），副作用是 options 的 `updateChannel`（频道不存在时
  返回 current）从"空写一次"变为"不写"——storage 终态相同，纯省配额。
- `docs/storage.md` 全面重写布局章节（拆 key 表格、读回退、写队列、debounce、
  迁移与降级边界），超出原"补两行"的最小增量，因行为变化面较大。
- **遗留风险（降级读取边界）**：降级到旧版本后，旧版本读 legacy merged
  key。split 未就位或统计迁移尚未清理时，旧版本看到完整的升级前快照（配置
  回退源保留，比"首次写即删"的原方案更安全）；split 就位且统计迁移完成删
  除后，旧版本读到空配置。升级期间的修改对旧版本不可见，再升级即恢复。导
  出文件不受影响。
- **遗留风险（debounce 兜底）**：pagehide 时 flush 依赖 storage 写 API 在页
  面冻结前发出（best-effort，与 stats flush 同一约束）；极端情况下（写入
  IPC 未及发出）仍可能丢最后一次调速，下次调速会自动补写覆盖值。
- 跨上下文（不同进程）的写队列不可见，跨上下文竞态由拆 key 消除覆盖面；
  同上下文由队列保证顺序——两者组合后，卡片 Acceptance 的"popup 连点 +
  flush 并发不回滚"与"双标签页写入不丢失"在拆 key 层成立（真机回归待 QA）。

## Review Comments (PM, 2026-09-29)

- 首轮评审通过实现主体（拆 key、按分区回退、写队列、debounce 尾沿取最新、
  pagehide 兜底），并接受两处偏差：updateConfig 引用相等短路收编进队列单元
  （终态一致且省写入）、按分区回退为字面语义的超集。
- **打回项（已修复）**：`removeLegacyKeyOnce` 挂在 persistConfig（首次配置
  写）与 D-1 统计迁移竞态且几乎必然输——legacy blob 仍带旧
  `stats.timeSavedSeconds`，回访用户升级时序为 recordChannelVisit 触碰
  lastVisit → 首次配置写 → 删 legacy（迁移未跑）→ 30s 后首次统计 flush 才
  ensureMigrated → 读不到 legacy，旧统计累计永久清零。
- **修复**：删除权移交统计迁移路径——config.ts 导出
  `removeLegacyConfigKeyOnce()`（保留 once 标志与失败告警），persistConfig
  不再调用；stats.ts 的 `migrateLegacyStats` 成功完成后（含"无事可做"路径）
  调用，保证迁移读 legacy 严格先于删除。dev 附加守卫：两个 split key 都在
  位才真正删除（否则 legacy 仍是 global/channels 读回退源，提前删会丢配
  置），守卫不满足不消费 once-flag；once-flag/迁移 memoize 每上下文独立，
  remove 幂等，多标签页无需协调。

## QA Notes

- 待 QA：真机回归 B-2/B-3/B-4 场景（SPA 频道切换、B 站自动恢复、幻影覆盖）、
  滑杆拖动写入次数（≤2 次）、升级安装（带旧 merged key）无感迁移。

## QA Notes (PM, 2026-09-30)

- PM 独立复跑 `pnpm test`:95/95 全绿;复核 removeLegacyConfigKeyOnce 守卫
  与 stats 调用点:删除仅出现在迁移成功路径、受 split-key-就位守卫保护、
  依赖方向 stats → config 单向无环
- 评审打回记录:首轮实现在 persistConfig 中删 legacy key,与 D-1 统计迁移
  竞态(回访用户首次配置写会先于 30s 统计 flush 删掉迁移源,旧统计清零)
  → 打回后修复:删除移入迁移成功路径 + split 就位守卫(开发补充的正确强
  化),新增/改写 5 个测试用例覆盖两种时序
- 待用户真机验收:升级安装(带旧数据)→ 统计不清零、频道覆盖/全局速度不
  丢;B-2/B-3/B-4 回归;滑杆连拖一次落盘
