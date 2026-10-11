# D-6 content script 性能与健壮性清理

> Status: Testing / QA (dev + 独立审查通过，P2 建议已落实；待用户真机验收 TC1-TC4) — 来源：2026-09-29 代码评审

## Objective

content script 存在一批非正确性但影响体验/资源占用的问题，打包成一个清
理卡：

1. MutationObserver 监听整个 `documentElement` subtree（`content.ts:894`），
   B 站弹幕/评论高频变动时每次回调都跑 `syncManagedVideo`（内含
   `querySelector`），无任何节流
2. 多处 `void promise` 未捕获拒绝：`video.play()`（自动播放策略会
   reject，`content.ts:171`）、`requestPictureInPicture`（`content.ts:1119`）、
   `requestFullscreen`（`content.ts:185`）→ 控制台 unhandled rejection
3. `applySpeedForVideo` 每次 loadedmetadata / play / emptied / 导航都重新
   `getConfig()`；已有 `storage.onChanged` 监听，可维护内存缓存省掉高频
   读
4. 滑杆连拖的高频持久化写入（写入侧 debounce 已并入 D-2，本卡只做缓存）

## Subtasks

- [x] observer 回调用 rAF 或 ~100ms 节流合并；保持 detach/attach 语义不变
- [x] 上述 `void promise` 补 `.catch(() => {})`（autoplay 被策略拒绝属正
      常路径）
- [x] content 侧维护 config 内存缓存：首次 `getConfig` 后缓存，
      `storage.onChanged` 更新缓存；`applySpeedForVideo` / 
      `applyWidgetSettings` / `applyPreferredQuality` 改读缓存
- [x] 验证 emptied 事件高频触发场景（切画质）无额外 storage 读放大

## Developer

cholf5 (AI-assisted)

## Estimated Complexity

M

## Acceptance Criteria

- Performance 录制：弹幕滚动页面上 observer 回调频率显著下降（合并为每帧
  至多一次）
- 自动播放被浏览器拒绝的场景控制台无 unhandled rejection
- 加速路径（导航/loadedmetadata）不再产生 `storage.sync.get` 读放大
- B-2 / B-3 / B-4 回归场景全部通过

## Test Cases

- TC1: DevTools Performance 录制对比改造前后 observer 开销
- TC2: 阻止自动播放（浏览器设置）后打开视频页 → console 干净
- TC3: 双开标签页改配置 → 另一标签页 widget 显隐/速度即时跟随（缓存失效
  路径）
- TC4: 回归 B-2/B-3/B-4 手工用例

## Related Documents / Designs

- `kanban/issues/B-2-fix-cross-channel-speed-leak.md`、
  `B-3-stop-player-restore-persistence.md`、
  `B-4-phantom-override-and-popup-current-speed.md`
- `kanban/issues/D-2-config-write-races.md`

## Dependent Tasks

- 无硬依赖；建议在 D-2 之后做，避免缓存与单写者改造冲突

## Notes

- 内存缓存必须以 `storage.onChanged` 为唯一失效源，否则会引入新的陈读取
  bug

## 开发记录 (2026-10-11)

### 改动清单

- `src/shared/throttle.ts`（新增）：rAF + 定时器兜底的合并调度器
  `createFrameThrottle`
- `src/shared/throttle.test.ts`（新增）：8 例单测
- `src/shared/config-cache.ts`（新增）：content 侧 config 内存缓存
  `createConfigCache`
- `src/shared/config-cache.test.ts`（新增）：9 例单测
- `src/shared/config.ts`：仅把读侧合并助手 `mergeGlobalRaw` 从模块私有改为
  导出（供缓存同步 patch 复用与全新读取完全相同的合并语义）；写路径零改动
- `entrypoints/content.ts`：observer 节流接入、promise 拒绝处理、缓存接入
- `kanban/board.md`：D-6 状态标注同步
- 未触碰 popup / options / background；B-2（authoritative channel gating）、
  B-3（mediaLoadGuard / playerInitUntil 不落盘）、B-4（programmaticRate /
  lastUserIntentAt 标记）的判定逻辑全部原样保留，仅 applySpeedForVideo 的
  配置来源从即时读换成缓存读（值恒等）

### 1. Observer 节流（方案选择与理由）

- 采用 **rAF + 100ms 定时器兜底**：`schedule()` 同时挂一个 rAF 和一个
  100ms 一次性定时器，先到者执行并取消另一个。前台标签页 ≤1 帧，弹幕风暴
  合并为每帧至多一次 `syncManagedVideo`；后台标签页 rAF 停摆，定时器路径
  为尽力而为——受 Chrome intensive throttling 影响可被推迟到约 1 次/分钟，
  仅保证后台页最终一致而非实时（同时 cancel 掉挂起的帧回调，回前台后不会
  双重执行）。选 rAF+兜底而非纯 100ms 节流：前台对齐帧边界最省主线程。
- 细节：定时器先于 rAF 挂载（兼容同步回调型 rAF polyfill）；`runOnce` 带
  exactly-once 守卫；rAF/timer 四个入口全部参数注入（content.ts 绑定
  window），node 环境可测。
- 观察器仍一次性 `observe(documentElement)`、从不 disconnect；视频
  attach/detach 语义不变。SPA 导航路径（pushState/replaceState/popstate/
  URL 轮询）仍直接调用 `syncManagedVideo`，不经过节流。

### 2. Promise 拒绝处理（grep `void` 逐个判断）

已补 `.catch(() => {})`：

- `video.play()`（togglePlay；autoplay 策略拒绝 / 导航中断 AbortError 属
  正常路径）
- `document.exitFullscreen()`、`container.requestFullscreen?.()`
  （toggleFullscreen；焦点丢失 / 缺少用户激活等正常可发生路径）
- `activeVideo.requestPictureInPicture?.()`（键盘 i）
- 防抖 flush 的 `updateConfigIfChanged`（runPendingRatePersist）
- `recordChannelVisit` 内部 await 的 `updateConfigIfChanged`：在唯一拒绝源
  处捕获，覆盖 3 个 `void recordChannelVisit()` 调用点；失败时
  lastChannelId/lastVideoId 标记仍推进，避免死上下文（扩展更新后）对每次
  事件重试写入
- `flushTimeSaved` 内部 await 的 `updateSavedStats`：该函数同时被裸用作
  pause 事件监听器（监听器路径的 reject 无人接），必须在函数体内捕获

判定为无需处理的其余 `void` 点：

- `resolveChannel` 返回的 promise：async IIFE 全程 try/catch 从不 reject，
  其 `.then` 回调均为同步安全代码（共 4 处）
- `void applySpeedForVideo / applyWidgetSettings / applyPreferredQuality /
  handleRateChange`：缓存 `read()` 从不 reject（见下），函数体仅 DOM 读
  写无 throw 路径；handleRateChange 无 await
- `openOptionsPage` 的 sendMessage 原本已有 catch / lastError 处理

### 3. Config 内存缓存（结构与失效链路）

- `createConfigCache(readConfig)` → `{ read, peek, handleStorageChanged }`。
  内存持有一份完整 `SpeedMasterConfig`；`read()` 首次 await 初始加载，此后
  纯内存返回（保留 async 形状，三个调用点零结构改动）。
- **onChanged 为唯一失效源**，具体链路：
  - `handleStorageChanged` 只认 `areaName === 'sync'` 且含
    `bilibiliSpeedMasterGlobal` / `bilibiliSpeedMasterChannels` 的事件；local
    区 stats 高频写入（D-1）与无关 key 返回 false——原 listener 的过滤语义
    等价迁移进缓存模块，local 流量既不刷缓存也不触发 apply 链。
  - 命中时两步走：① 用事件 payload **同步 patch**（复用 config.ts 的
    `mergeGlobalRaw` / `sanitizeChannels`，与全新读取同语义，读方当拍可
    见，TC3 即时跟随）；② generation+1 并后台 re-read 对账一次，覆盖同步
    patch 覆盖不到的形态（split key 被外部删除回退 legacy blob 等）。
  - **初始化竞态**：每次 re-read 捕获启动时 generation，结束时若 generation
    已变则丢弃该快照并循环重读——「onChanged 先到、初始 getConfig 后到」
    时陈读被丢弃而非覆盖新值；onChanged 与初始读并行时共享同一次加载。
  - **写后一致性**：content 自身写入（频道覆盖 / 访问记录）不做本地预测式
    更新；chrome.storage 的 onChanged 会回到写入方自身上下文，缓存经同一
    事件收敛；reference-equality 短路（D-2 no-op 不写）时无事件、缓存也本
    就无需变化。
  - **读失败**：保留最后已知值并 `console.warn`，不自动重试（防死扩展上下
    文把每个媒体事件变成失败读）；恢复完全依赖下一次 config onChanged。
- 接入点：`applySpeedForVideo` / `applyWidgetSettings` / `applyPreferredQuality`
  改读 `configCache.read()`；storage.onChanged listener 过滤委托给缓存。
- 未动写路径：`updateConfig` 队列内部的 getConfig 仍为即时读（触发频率 =
  防抖后的速率持久化 + 每次导航的访问记录，低频）。

### 4. emptied 高频场景无 storage 读放大（静态验证）

emptied / play / loadedmetadata → `handleVideoMetadata` →
`applySpeedForVideo`（缓存）+ 1200ms 后 `applyPreferredQuality`（缓存）；
loadstart → `markMediaLoadGuard`（无 storage）。改造后 `storage.sync.get`
只发生在：① 启动首次加载（1 次）② 每次命中过滤的 config onChanged 对账
（配置变化本身低频）。emptied 刷屏（切画质）路径 0 次。

### 新增测试

- `throttle.test.ts`（8 例）：burst 合并为单次执行、rAF 先到清除兜底定时
  器、后台兜底路径 cancel 帧回调、timeoutMs 注入与默认常量、run 后开启新
  周期、cancel 双路径失效、exactly-once 守卫。
- `config-cache.test.ts`（9 例）：首读缓存不再重复读、并发首读共享加载、
  local/无关 key 事件过滤（stats 写不触缓存）、命中事件的同步 patch + 对账
  收敛、**onChanged 先于初始读的启动竞态（陈读被丢弃并重读）**、split key
  删除交由 re-read 处理、patch 复用 merge/sanitize 语义、读失败不 reject 不
  重试且经 onChanged 恢复、对账失败保最后已知值。
- content.ts 内的 DOM / 扩展 API 接线（window rAF 绑定、listener 注册）无
  法在 node 环境单测，以 `pnpm compile` 类型检查 + 真机用例覆盖。

### 验证结果

- `pnpm test`：7 个测试文件 119 例全部通过（原 100 例无回归，新增 19 例）
- `pnpm compile`：无错误

### 遗留风险 / 待真机验收

- TC1（Performance 录制对比 observer 开销）、TC2（阻止自动播放后 console
  干净）、TC3（双开标签页配置联动）需用户真机验收；TC4（B-2/B-3/B-4 回
  归）判定逻辑未动，仍建议按原用例过一遍。
- 节流取舍：前台视频元素出现后 ≤1 帧才 attach；后台标签页定时器兜底受
  Chrome intensive throttling 影响为尽力而为（可达 ~1 次/分钟），attach 相
  应延迟。窗口内 loadedmetadata/play 不被监听；attach 本身会补偿执行
  applySpeedForVideo，风险可忽略但列为已知行为变化。
- 死上下文 + 首读失败的行为差异：旧代码 `getConfig()` reject 会使
  applySpeedForVideo 中止（视频保持当前速度）；新代码缓存 `read()` 从不
  reject，会以默认配置主动应用速度（1x）。自限于死上下文会话（扩展更新后
  的旧实例），评审确认维持现状。
- 缓存首次加载失败（如扩展更新瞬间的 invalidated context）时，该上下文以
  默认配置运行直至下一次 config onChanged，不自动重试（换取无读放大）。
- onChanged 命中后的后台对账读（每事件 1 次 storage.sync.get）是新增读，
  但远小于被移除的媒体事件路径读放大，且设计上不可能并发堆积（单飞 +
  generation 丢弃）。

### 独立审查 (2026-10-11)

- 结论：0 P0 / 0 P1；5 条 P2 建议已全部落实：
  1. 节流措辞修正（前台 ≤1 帧；后台定时器为尽力而为，Chrome intensive
     throttling 下可达 ~1 次/分钟）——`throttle.ts` / `content.ts` 注释与本
     记录第 1、遗留风险节
  2. `config-cache.ts` 头注释补全 legacy key 三条不变式（persistConfig 单次
     set 恒同写两个 split key；legacy key 唯一移除点的前置是 split key 均
     在；读侧 split key 优先），并写明绕过 persistConfig 直写会静默陈读
  3. `config-cache.test.ts` 补 2 例：仅 channels 更新不波及 global 分区；
     混合事件「一分区更新 + 另一分区删除」的 patch/reload 分工
  4. `peek()` / `cancel()` 标注为测试/未来诊断用途（生产零调用，保留）
  5. 遗留风险补死上下文 + 首读失败的行为差异条目（旧行为 apply 中止、新
     行为应用默认 1x，维持现状）
