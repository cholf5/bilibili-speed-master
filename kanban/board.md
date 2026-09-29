# Kanban Board

## Backlog
- D-6 Content script 性能与健壮性清理（observer 节流 / unhandled rejection / config 缓存）[P1]
- D-7 移除不需要的 tabs 权限 [P1]
- D-8 发布元数据修正（package.json 名称版本 / 占位链接 / Firefox gecko id）[P1]
- D-9 快捷键可配置 + options 快捷键清单 [P2]
- D-10 popup 频道卡一键清除覆盖、跟随全局 [P2]
- D-11 options 频道表格搜索 [P2]
- D-12 后台播放统计口径验证与修正 [P2]
- D-13 直播页支持评估（产品决策）[P3]
- D-14 content.ts 拆分模块 + 共享常量收敛 [P3]
- D-15 引入 vitest 覆盖核心纯逻辑 [P3]
- D-16 可访问性修正（空格键豁免 + widget aria-label i18n）[P2]

## To Do
- D-1 统计数据迁移 storage.local 并降低 sync 写入频率（P0）
- D-2 消除跨上下文配置写入竞态（P0）
- D-3 导入配置按 schema 校验（含 channels 条目）（P0）
- D-4 channels LRU 上限与清理（P1）
- D-5 options lastVisit 显示本地时间（P1）
- 

## In Progress
- 

## In Review
- 

## Testing / QA
- B-1 Fix core playback bugs found in retro review (dev + UI QA done; live-player checklist in card pending)
- 

## Blocked
- 

## Done
- A-1 Initialize kanban board
- A-2 Define storage schema and config service
- A-3 Implement content script speed control
- A-4 Handle SPA navigation and autoplay reapply
- A-5 Build popup UI and wiring
- A-6 Build options UI and channel table
- A-7 Implement keyboard shortcuts
- A-8 Add i18n scaffolding and strings
- A-9 Add import/export settings
- A-10 Track and display time saved stats
- B-2 Fix cross-channel speed contamination on SPA transitions (user-accepted 2026-09-13)
- B-3 Stop Bilibili's global speed restore from being persisted as a channel override (user-accepted 2026-09-13)
- B-4 Fix phantom channel override from default-speed stepper and honest popup current-speed display (user-accepted 2026-09-13)
- C-1 Video corner speed widget (user-accepted 2026-09-14)
