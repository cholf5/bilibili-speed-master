# D-8 发布元数据修正（package.json / 占位链接 / Firefox id）

> Status: Backlog (P1) — 来源：2026-09-29 代码评审

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

- [ ] package.json：name 改 `bilibili-speed-master`，description 补齐，
      version 定首个发布版本号
- [ ] 与维护者确认真实的 Donate 链接与主页链接后替换（popup + options +
      i18n 文案如有涉及）
- [ ] （可选）Firefox 上架：wxt.config.ts 增加
      `browser_specific_settings.gecko.id` 与 strict_min_version
- [ ] （可选）manifest 名称/描述走 `_locales` 本地化，配合 17 语言 UI

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
