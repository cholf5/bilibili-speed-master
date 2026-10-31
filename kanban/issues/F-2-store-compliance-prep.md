# F-2 上架前合规整改（AMO data_collection_permissions / widget 图标去 innerHTML / sources 排除 design）

> Status: In Review — 来源：2026-11-01 商店上架差距评估

## Objective

对照 Chrome Web Store 与 Firefox Add-ons (AMO) 的上架要求做差距评估后，
代码侧有三处需在上传前修正（账号 / 截图 / 隐私声明等仓库外项另列）：

1. `web-ext lint`（AMO 官方校验器）报
   `MISSING_DATA_COLLECTION_PERMISSIONS`：Firefox 新数据收集政策要求
   manifest 显式声明收集范围，本扩展不收集任何数据。
2. 内容脚本 `src/content/widget.ts` 用 `innerHTML` 注入齿轮 SVG 常量，
   触发 `UNSAFE_VAR_ASSIGNMENT`（见 D-14 已有记录），人工审核需逐条解释。
3. 本地 `design/` 目录（图标设计稿归档，约 5MB，36caf25 入库）会被 WXT
   的 sources zip 全量打包，不适合作为 AMO 源码审核提交物。

## Subtasks

- [x] `wxt.config.ts` gecko 块新增
      `data_collection_permissions: { required: ['none'] }`
- [x] `src/content/widget.ts` 齿轮图标改为 `createElementNS` 构建
      （`GEAR_SVG` 字符串拆为 `GEAR_PATH_D` + `createGearIcon()`；
      中间方案 `createContextualFragment` 实测同样触发 UNSAFE 系警告，已弃用）
- [x] `wxt.config.ts` 增加 `zip.excludeSources: ['design/**']`
      （注：`'design'` 精确名匹配不到子文件，WXT 内部用 minimatch
      逐文件过滤，必须用 glob）

## Developer

cholf5 (AI-assisted)

## Estimated Complexity

S

## Acceptance Criteria

- `web-ext lint` 0 errors；本仓库代码产生的 UNSAFE 警告为 0
- Firefox manifest 含 `data_collection_permissions`，Chrome 产物不泄漏该字段
- sources zip 不含 `design/`，仍包含 src/entrypoints/docs/LICENSE/lockfile

## Test Cases

- TC1: `pnpm test` / `pnpm compile` 全绿（204 用例通过）
- TC2: `web-ext lint .output/firefox-mv3` 结果核对
- TC3: 双端构建产物 manifest 字段核对 + sources zip 内容清单核对
- TC4: 真机加载 firefox-mv3，视频角标 widget 齿轮图标正常渲染、
  点击打开选项页（DOM 构建方式变更，需视觉回归）

## Related Documents / Designs

- `wxt.config.ts`、`src/content/widget.ts`
- `kanban/issues/D-8-release-metadata.md`（发布元数据前作）
- `kanban/issues/D-14-content-modularization.md`（GEAR_SVG 来源与字节级还原背景）

## Dependent Tasks

- 无阻塞依赖；与 F-1（UI 重设计）真机验收可合并执行

## Notes

- `KEY_FIREFOX_UNSUPPORTED_BY_MIN_VERSION`（×2，桌面 + Android）为预期内
  信息项：`data_collection_permissions` 自 Firefox 140 / Android 142 起支持，
  旧版本忽略未知键，不影响 109+ 运行；保持 `strict_min_version: 109.0`
  不变（AMO 政策文档要求声明该键）。
- 剩余 2 条 `UNSAFE_VAR_ASSIGNMENT`（`chunks/video-CoisZU_c.js`）来自
  React 内部实现，无法在应用代码层消除，商店审核备注中说明即可。
- Chrome Web Store 侧待办（仓库外，不做代码卡）：
  ① 开发者账号（$5 一次性）；② 128×128 商店图标（512.png 裁切）、
  1–5 张 1280×800/640×400 截图、440×280 宣传图；③ listing 文案与分类；
  ④ 隐私标签页（单一句途 + storage/host permission 逐条理由 +
  「不收集用户数据」声明）；⑤ 审核备注（view API 请求 `credentials: 'omit'`、
  React 内部 innerHTML 说明）。
- AMO 侧待办（仓库外）：① AMO 账号；② 上传 firefox zip 时一并提交
  sources zip，版本备注写明构建命令（`pnpm install` → `pnpm build:firefox`，
  产物 `.output/firefox-mv3`）；③ listing（summary ≤250 字符、
  支持 URL = GitHub Issues、许可证 MPL-2.0、截图复用 CWS 素材）。
- 上架通过后：回填 `src/shared/about.ts` 的 `RATE_URL`（现为 null 兜底）、
  README 安装徽章链接、打 `v0.1.0` tag。

## 开发记录 (2026-11-01)

### 实际改动清单

- `wxt.config.ts`
  - gecko 块新增 `data_collection_permissions: { required: ['none'] }`
  - 新增 `zip.excludeSources: ['design/**']`
- `src/content/widget.ts`
  - `GEAR_SVG` 字符串 → `GEAR_PATH_D` 常量 + `createGearIcon()`
    （`createElementNS` 创建 svg/viewBox/aria-hidden/path@d）
  - 装配处 `speedWidgetGear.innerHTML = GEAR_SVG` →
    `speedWidgetGear.append(createGearIcon())`
  - 首版实现用 `createRange().createContextualFragment`，实测 lint 仍报
    `Unsafe call to n.createContextualFragment`（同一 UNSAFE 规则族），
    改为 createElementNS 后归零；旧版 `GEAR_SVG` 字符串删除

### 验证结果 (2026-11-01)

- `pnpm test`：11 文件 204 用例全部通过；`pnpm compile` 无错误
- `web-ext lint .output/firefox-mv3`：0 errors / 4 warnings，
  其中 2 条为 data_collection_permissions 与 min_version 的组合信息项
  （预期内，见 Notes），2 条为 React chunk 内部 innerHTML（不可修）；
  本仓库代码的 UNSAFE 警告为 0
- `.output/firefox-mv3/content-scripts/content.js`：innerHTML 与
  createContextualFragment 出现次数 0，createElementNS 出现次数 1，
  齿轮 path 数据 `M19.14,12.94` 完整保留
- Chrome 产物 manifest：无 `browser_specific_settings` 泄漏
- sources zip：408KB（此前 6.5MB），`design/` 零条目；
  src/entrypoints/docs/kanban/LICENSE/lockfile 齐全
- 双端 zip 正常产出：chrome 231KB / firefox 231KB

### 过程中发现并顺带核实

- 评估期间 `design/` 目录与图标重绘（`public/icon/*.png`）由并行会话
  提交（467337a、36caf25），导致本轮 firefox zip 体积从 ~304KB 变为
  ~231KB（新图标更小）——已逐文件 diff 确认为图标替换，非构建缺失。

## 开发记录（2026-11-01，release 流程执行）

- `store-assets/`（截图原始图 + 生成脚本，约 4.6MB）作为上架素材入库，
  参照 `design/` 先例；`wxt.config.ts` `zip.excludeSources` 追加
  `'store-assets/**'`（minimatch 逐文件过滤，glob 同 F-2 主项经验），
  确保 AMO sources zip 不含截图素材。
