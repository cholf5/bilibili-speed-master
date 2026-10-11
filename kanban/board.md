# Kanban Board

## Backlog
- D-17 核实 options_ui.open_in_tab 被 WXT 丢弃的行为 [P3]
- D-10 popup 频道卡一键清除覆盖、跟随全局 [P2]
- D-11 options 频道表格搜索 [P2]
- D-13 直播页支持评估（产品决策）[P3]
- D-14 content.ts 拆分模块 + 共享常量收敛 [P3]
- D-16 可访问性修正（空格键豁免 + widget aria-label i18n）[P2]

## To Do
- 

## In Progress
- 

## In Review
- 

## Testing / QA
- D-9 快捷键可配置 + options 快捷键清单（34 action 查表 + options 录制/冲突交换/禁用/恢复默认；dev 完成 + 独立审查打回一次已修复（mediaTrackNext 执行分支遗漏 + 执行器源码守卫 + 恢复默认 confirm）+ PM 复提核验通过，167 例单测绿 + compile/build 通过；待用户真机验收 TC1-TC4）（P2）
- D-12 后台播放统计口径验证与修正（2s 固定阈值改墙钟比例口径 shouldCountPlaybackDelta；dev + 独立审查通过，P1 文档修订+P2 已落实，134 例单测绿；实测矩阵 TC1/TC2 待用户真机验收）（P2）
- D-6 Content script 性能与健壮性清理（observer 节流 / unhandled rejection / config 缓存；dev + 独立审查通过，P2 已落实，119 例单测绿；待用户真机验收 TC1-TC4）（P1）
- D-8 发布元数据修正（package.json 名称版本 / 占位链接 / Firefox gecko id；dev + 独立审查通过，含 pnpm-workspace.yaml 入库；待用户真机验收：TC2/TC3 与 AMO 校验）（P1）
- D-7 移除不需要的 tabs 权限（dev + PM 评审 + QA 完成；待用户真机验收）（P1）
- D-5 options lastVisit 显示本地时间（dev + PM 评审 + QA 完成；待用户真机验收）（P1）
- D-2 消除配置写入竞态（拆 key + 写队列 + debounce；dev + PM 评审打回一次已修复 + QA 完成；待用户真机验收）（P0）
- D-1 统计数据迁移 storage.local 并降低 sync 写入频率（dev + PM 评审打回一次已修复 + QA 完成；待用户真机验收）（P0）
- D-15 引入 vitest 覆盖核心纯逻辑（dev + PM 评审 + QA 完成；64/64 用例绿；真机回归随 D-1/D-2 联调）（P3）
- D-3 导入配置按 schema 校验（dev + PM 评审 + 程序化 QA 完成；待用户真机验收）（P0）
- D-4 channels LRU 上限与清理（dev + PM 评审 + 程序化 QA 完成；待用户真机验收）（P1）
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
