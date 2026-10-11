# D-8 发布元数据修正（package.json / 占位链接 / Firefox id）

> Status: Testing / QA (dev + 独立审查通过；待用户真机验收) — 来源：2026-09-29 代码评审 — 来源：2026-09-29 代码评审

## Objective

仓库仍残留模板与占位内容，上架前必须清理：

1. `package.json` name 为 `wxt-react-starter`、description 为
   `manifest.json description`、version 为 `0.0.0` —— **WXT 的 manifest
   version 直接取自 package.json version**，不修则商店包版本号为 0.0.0
2. popup 的「作者」链接与 Donate 按钮、options 的同名元素全部指向
   `https://x.com/cholf5`（popup/App.tsx:271,281；options/App.tsx:241,258），
   Donate 明显是占位
3. 若要上 Firefox Add-ons (AMO)，manifest 缺
   `browser_specific_settings.gecko.id`

## Subtasks

- [x] package.json：name 改 `bilibili-speed-master`，description 补齐，
      version 定首个发布版本号（取 `0.1.0`）
- [x] 与维护者确认真实的 Donate 链接与主页链接后替换（popup + options +
      i18n 文案如有涉及）—— PM 决策（2026-10-11）：维护者未提供真实捐赠
      链接，直接移除 Donate 按钮及配套代码（i18n 键 + CSS 样式）；
      作者链接（x.com/cholf5）保留不动
- [x] （可选）Firefox 上架：wxt.config.ts 增加
      `browser_specific_settings.gecko.id` 与 strict_min_version（109.0；
      `build:firefox`/`zip:firefox` 加 `--mv3` 使 Firefox 产物走 MV3）
- [ ] （可选）manifest 名称/描述走 `_locales` 本地化，配合 17 语言 UI
      —— 本次未做，原因与后续建议见文末开发记录

## Developer

cholf5 (AI-assisted)

## Estimated Complexity

S

## Acceptance Criteria

- 构建产物 manifest 的 name/description/version 正确
- popup 与 options 中不再有占位链接
- （若做 Firefox 项）`pnpm build:firefox` 产物可被 AMO 校验通过

## Test Cases

- TC1: `pnpm build` / `pnpm build:firefox` 后人工检查 manifest.json
- TC2: 点击 popup/options 的作者与 Donate 链接，跳转正确
- TC3: `pnpm zip` 产物可正常加载为未打包扩展

## Related Documents / Designs

- `package.json`、`wxt.config.ts`、`entrypoints/popup/App.tsx`、
  `entrypoints/options/App.tsx`

## Dependent Tasks

- 无；Donate 链接项**依赖维护者提供真实 URL**（阻塞子任务，其余可先行）

## Notes

- 版本号策略建议：首版 1.0.0 或 0.1.0，后续与 kanban 里程碑对齐

## 开发记录 (2026-10-11)

### 实际改动清单

- `package.json`
  - name: `wxt-react-starter` → `bilibili-speed-master`
  - description: `manifest.json description` →
    `Set a global default speed for Bilibili videos with per-channel overrides.`
    （与 wxt.config.ts 的 manifest description 同义）
  - version: `0.0.0` → `0.1.0`（WXT manifest version 取自 package.json）
  - `build:firefox` / `zip:firefox` 追加 `--mv3`：WXT 对 firefox 目标默认
    产出 MV2（`.output/firefox-mv2`），与本次 Firefox MV3 上架目标不符；
    且在用户 manifest 里手写 `manifest_version: 3` 会被 WXT 过滤（实测无效），
    必须用 CLI 标志。`zip:firefox` 同步修改以保证打包产物与验证产物一致。
- `wxt.config.ts`
  - manifest 改为函数形式 `({ browser }) => ({...})`，仅
    `browser === 'firefox'` 时展开 `browser_specific_settings.gecko`，
    Chrome 产物不带 Firefox 专属字段。
  - gecko.id：`{B079DA6F-03A0-4B61-82D3-89260E308CB6}`（uuidgen 生成，
    GUID 形式，不使用域名邮箱）
  - gecko.strict_min_version：`109.0`（Firefox MV3 正式支持的起点）
- `entrypoints/popup/App.tsx`、`entrypoints/options/App.tsx`：移除 Donate
  `<a>` 按钮及 `t('donate')` 调用；作者链接（`brand__subtitle`，
  x.com/cholf5）保留不动。
- `src/shared/i18n.ts`：18 个语言（en + 17）全部移除 `donate` 键。
- `entrypoints/popup/App.css`、`entrypoints/options/App.css`：移除
  `.donate-button` 样式块。
- `docs/popup.md`、`docs/options.md`、`docs/popup-implementation.md`：删除
  对已移除 Donate 按钮的 UI 规格描述（D-8 验收要求全仓库无 donate 残留
  引用；纯文档同步，非逻辑改动，超出原列文件范围的一处说明）。

### 产品决策记录

- Donate：维护者未提供真实捐赠链接，PM 决策直接移除（按钮 + i18n 键 +
  CSS 样式），不做占位替换。
- 版本号：取 `0.1.0`。卡片 Notes 建议 1.0.0 或 0.1.0；项目尚未上架、
  功能仍在迭代（kanban 另有多张进行中卡片），0.x 语义化版本更符合
  「行为仍在演进」的现状。
- GUID：`{B079DA6F-03A0-4B61-82D3-89260E308CB6}`，uuidgen 随机生成一次后
  固化；上架后不可再改，否则 AMO 视为不同扩展。

### 未做项：_locales 本地化（子任务 4）

原因：D-8 定位是「上架前元数据清理」；_locales 本地化牵涉
`default_locale` 选择、17+ 语言 messages.json 铺设与构建期校验，是独立
特性任务而非元数据修正。本次只保证 manifest 静态 name/description 正确。
后续建议：单开一张卡片（P2），复用 `src/shared/i18n.ts` 的键位生成
`_locales/<locale>/messages.json`，并以 `src/shared/i18n.test.ts` 的键
一致性测试为模板增加校验。

### 验证结果 (2026-10-11)

- `pnpm test`：5 个测试文件 100 用例全部通过（含 `src/shared/i18n.test.ts`
  19 项键一致性检查）。
- `pnpm compile`：`tsc --noEmit` 通过，无错误。
- `pnpm build`（chrome-mv3）：`.output/chrome-mv3/manifest.json` 检查通过
  —— `"version":"0.1.0"`，无 `browser_specific_settings` 字段。
- `pnpm build:firefox`（firefox-mv3）：`.output/firefox-mv3/manifest.json`
  检查通过 —— 含 `"browser_specific_settings":{"gecko":{"id":
  "{B079DA6F-03A0-4B61-82D3-89260E308CB6}","strict_min_version":"109.0"}}`；
  WXT 已自动将 Chrome 的 service_worker 转为 Firefox MV3 的
  `background.scripts` 事件页。
- 全局 grep（排除 node_modules/.output/.git/kanban）：无 donate 残留；
  chrome-mv3 / firefox-mv3 构建产物内亦无。

### 遗留风险

- `dev:firefox` 仍为 WXT 默认（MV2），开发态与发布产物 manifest 版本
  不一致；如需一致可同样加 `--mv3`，本次未动（不影响发布）。
- `strict_min_version: 109.0` 使 AMO 自动排除 Firefox < 109 用户
  （ESR 102 无 MV3 支持，属预期取舍）。
- 本地未跟踪文件 `pnpm-workspace.yaml` 原为占位内容
  （`esbuild: set this to true or false`），导致 pnpm 12 报
  `ERR_PNPM_IGNORED_BUILDS`、测试无法启动；已改为
  `esbuild: true / spawn-sync: true`。该文件未入库，若 CI 复现需在
  仓库配置中固化 `onlyBuiltDependencies`/`allowBuilds`。
- AMO 实际上传校验（add-on-linter）未执行，需 AMO 账号后实测
  （对应 Test Cases TC1 的 AMO 部分）。

## 独立审查记录 (2026-10-11)

审查员（独立 subagent）结论：**通过**，无 P0 问题；全部验证命令亲自复现
通过（test 100 用例 / compile / 双端构建 / manifest 逐字段核对 / 全局
grep 零 donate 残留）。`--mv3` 标志经 WXT 0.20.13 源码证实必要（firefox
目标默认 MV2，手写 manifest_version 被过滤）。

审查发现问题及处置：

- [P1] `pnpm-workspace.yaml` 未入库，pnpm 11/12 环境 fresh clone 会因
  `ERR_PNPM_IGNORED_BUILDS` 无法安装依赖 → **已采纳**：随本卡一并提交。
- [P2] package.json 与 wxt.config.ts description 大小写不一致 →
  **已采纳**：统一为 "Bilibili"（wxt.config.ts 已改，manifest 以其为
  准）。
- [P2] 范围外预存问题：`wxt.config.ts` 的 `options_ui.open_in_tab: true`
  在构建产物中被 WXT 丢弃（WXT 从 options entrypoint 自行生成
  options_ui）→ 另开 **D-17** 跟进核实，不在本卡处理。
- [P2] TC2/TC3（作者链接跳转、zip 加载）属真机人工项，随本卡进入
  Testing/QA 待用户验收；AMO 校验待账号。
