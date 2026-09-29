# D-6 content script 性能与健壮性清理

> Status: Backlog (P1) — 来源：2026-09-29 代码评审

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

- [ ] observer 回调用 rAF 或 ~100ms 节流合并；保持 detach/attach 语义不变
- [ ] 上述 `void promise` 补 `.catch(() => {})`（autoplay 被策略拒绝属正
      常路径）
- [ ] content 侧维护 config 内存缓存：首次 `getConfig` 后缓存，
      `storage.onChanged` 更新缓存；`applySpeedForVideo` / 
      `applyWidgetSettings` / `applyPreferredQuality` 改读缓存
- [ ] 验证 emptied 事件高频触发场景（切画质）无额外 storage 读放大

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
