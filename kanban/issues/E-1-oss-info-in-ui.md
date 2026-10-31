# E-1 在 popup 与 options 中展示开源信息（仓库 / 反馈 / License / 版本号）

> Status: Testing / QA (P3) — 来源：2026-10-31 用户提议「都开源了，引点流」

## Objective

插件已按 MPL-2.0 开源（commit `1604c10`），但 UI 内没有任何开源入口，用户
无法从插件本身发现源码仓库、反馈问题或查看许可证。本次在两个 UI 入口补齐
开源身份展示：

- **options 页**：新增「Open Source」区块（导入/导出按钮下方），四列并排：
  源代码（GitHub 仓库）、反馈与问题（GitHub Issues）、许可证（MPL-2.0 全文）、
  版本号（读取打包 manifest，非扩展运行环境时隐藏）。
- **popup**：底部新增一行极简链接：源代码 · MPL-2.0（头部品牌区已有
  "Made by cholf5" → x.com/cholf5 的作者链接，不重复放置）。

链接与许可证常量收敛到 `src/shared/about.ts`（单一来源，UI 不漂移）；
文案走 i18n，18 个 locale 全部同步。

## Subtasks

- [x] 新增 `src/shared/about.ts`：SOURCE_REPO_URL / FEEDBACK_URL /
      LICENSE_NAME / LICENSE_URL / getAppVersion()（browser/chrome 双命名空间，
      异常与缺字段返回 null）
- [x] TDD：`src/shared/about.test.ts` 6 例先行（常量正确性 + 版本读取 4 场景）
- [x] i18n 新增 4 key × 18 locale（openSourceTitle / openSourceRepo /
      openSourceFeedback / openSourceLicense），key-parity 测试绿
- [x] options 页 oss 区块 + App.css 样式（沿用面板底色 #2b2d31、链接色 #3ea6ff）
- [x] popup 底部 oss-line + App.css 样式（次要灰 #9aa4b6，hover 变亮）

## Developer

cholf5 (AI-assisted)

## Estimated Complexity

S

## Acceptance Criteria

- options 页可见并排的源代码 / 反馈 / 许可证链接 + 版本号，全部可点击跳转
- popup 底部可见「源代码 · MPL-2.0」一行，链接可点击
- 所有链接在新标签页打开，且不受页面 CSP 影响（扩展页面内 `<a target=_blank>`）
- 18 个 locale 文案齐全，i18n key-parity 测试通过

## Test Cases

- TC1: `pnpm compile` + `pnpm test`（219 例）+ `pnpm build` / `pnpm build:firefox`
  全部通过（已完成 ✓）
- TC2: 真机打开 options 页，核对区块位置、链接目标（repo / issues / MPL 全文）、
  版本号与 manifest 一致
- TC3: 真机打开 popup，核对底部链接与 hover 状态，确认与现有元素无挤压
- TC4: 切换 2-3 种语言（如 en / zh-CN / ru）核对文案无溢出、无缺 key 回退

## Related Documents / Designs

- `src/shared/about.ts`、`src/shared/about.test.ts`、`src/shared/i18n.ts`
- `entrypoints/options/App.tsx` + `App.css`、`entrypoints/popup/App.tsx` + `App.css`
- LICENSE（MPL-2.0）、README「开源与贡献」段

## Issues & Notes

- 版本号来源选 manifest（`runtime.getManifest()`）而非硬编码，避免与
  package.json / 商店版本三处漂移；测试环境无 runtime 时返回 null 直接隐藏。
- X 账号复用现有 `madeBy` 头部链接，避免双入口维护两处 URL。
- 样式刻意低调（次要色、小字号）：引流的起点是可见，不是显眼；不给设置
  页添噪音。
