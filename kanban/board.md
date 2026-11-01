# Kanban Board

## Backlog
- 

## To Do
- 

## In Progress
- 

## In Review
- F-3 上架素材与提审 SOP（四张商店截图：popup 品牌板合成 = 真实构建产物 + mock chrome API、options/视频页/快捷键卡 = 真实扩展 + CDP 播种存储 + 真实 B 站视频页（角标 1.5x 实拍，弹幕关/语言钉扎 zh-CN）；成品规格 icon-128 / promo-440x280 / 1280x800×4 / 640x400（imaging.py compose+overlay 压印文案）；listing 文案（CWS ≤132 字符 + AMO ≤250 字符 + 隐私单句途 + 审核备注）store-assets/listing/listing.md；零依赖提审脚本 submit-chrome.mjs（CWS REST，publish 默认 trustedTesters）+ submit-firefox.mjs（AMO JWT + 自动轮询校验 + 附源码包），均经缺凭证报错 / JWT 伪造 401 / AMO 直连 200 实测；SOP store-assets/SOP.md：账号注册、OAuth refresh token 获取步骤、提审自检清单、过审回填、风险预案；已实测 googleapis.com 需代理（SOP 已写 NODE_USE_ENV_PROXY 用法），AMO 直连可达；待用户提供双方账号凭证后按 SOP §3 执行提审）（P1）
- F-2 上架前合规整改（AMO data_collection_permissions + widget 图标 createElementNS 去 innerHTML + sources zip 排除 design/；web-ext lint 0 errors、本仓代码 UNSAFE 归零，204 例单测 + compile + 双端构建通过；待真机 TC4 齿轮图标视觉回归）（P1）
- F-1 UI 重设计：品牌色换 B 站粉 #fb7299 + token 化 shared-ui.css + popup 频道卡 hero 化（大号速率/状态 pill/评分降页脚）+ 快捷键 7 组分组与键帽 kbd + 字体本地打包（public/fonts 48KB）+ 全局 focus-visible/reduced-motion + RATE_URL 条件评分 + 频道删除确认 + 速度单位统一 x（i18n 8 key × 18 locale；compile + 219 例单测 + 双端构建 + mock 页截图验证；待真机 TC1-TC4）（P2）
- E-1 popup/options 展示开源信息（GitHub 仓库 / Issues 反馈 / MPL-2.0 / manifest 版本号；about 常量收敛 src/shared/about.ts × 6 例单测，18 locale 同步；compile + 219 例单测 + 双端构建通过；待真机验收 TC2-TC4）（P3）
- D-13 直播页支持评估（调研完成 + PM 抽查代码论断属实；决策文档 docs/live-support-evaluation.md，倾向正播不支持+回放页 /record/ 支持；**待维护者拍板**，拍板后另立实现卡）（P3）

## Testing / QA
- D-17 options open_in_tab 恢复（改用 entrypoint meta `<meta name="manifest.open_in_tab" content="true">` 声明并删除 wxt.config.ts 失效块；dev + 独立审查通过（WXT 源码逐行核实机制），PM 落实 background.ts 过时注释修正，213 例单测绿 + compile + build 双端通过；待用户真机验收 TC2「选项」打开方式）（P3）
- D-14 content.ts 拆分模块 + 共享常量收敛（常量收敛 src/shared/speed.ts + video.ts，content 拆 10 模块至 src/content/，entrypoints/content.ts 只留装配 166 行；dev + 独立审查打回一次已修复（GEAR_SVG 字节还原，PM 复验与 HEAD 字节一致），机械全量对照确认零行为变更，213 例单测绿 + compile + build/build:firefox 通过；待用户真机回归 B-2/B-3/B-4 与 widget/快捷键/统计冒烟）（P3）
- D-16 可访问性修正（空格键豁免 + widget aria-label i18n；新增 src/shared/focus-target.ts 纯判定 + 22 例单测，widget aria-label 走 t() ×18 语言；dev + 独立审查通过，P2 记录补全已落实，202 例单测绿 + compile/build 通过；待用户真机验收 TC1-TC4，关注「点击按钮后焦点驻留」体感变化与 B 站双响应）（P2）
- D-10 popup 频道卡「跟随全局」+ D-11 options 频道表格搜索（共享 removeChannelOverride + filterChannelsByQuery 纯函数；dev + 独立审查通过，P2 已由 PM 落实（ru 措辞 + aria-live），180 例单测绿 + compile/build 通过；待用户真机验收 TC1-TC3，含窄窗 ru/vi 长文案挤压检查）（P2）
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
