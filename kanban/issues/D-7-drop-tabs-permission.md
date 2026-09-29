# D-7 移除不需要的 tabs 权限

> Status: Testing / QA (P1) — 来源：2026-09-29 代码评审

## Objective

`wxt.config.ts:9` 声明了 `"tabs"` 权限，但代码只用了 `tabs.query({active:
true, currentWindow: true})`、`tabs.sendMessage`、`tabs.create`、
`tabs.connect`——这些都不需要 `"tabs"` 权限（只有读取 url/title/
favIconUrl 才需要；popup 恰好不读这些字段）。删除权限可以降低商店审核摩
擦、减少安装时的权限警告、提升用户信任。

## Subtasks

- [x] `wxt.config.ts` manifest permissions 改为 `['storage']`
- [x] 逐一验证 popup 用到的 tabs API 在无 `tabs` 权限下的行为（query 返回
      的 tab 对象 id 可用；url/title 为 undefined 但代码未使用）
- [x] Chrome 与 Firefox 双端验证

## Developer

cholf5 (AI-assisted)

## Estimated Complexity

S

## Acceptance Criteria

- 构建产物 manifest 不再包含 `tabs` 权限
- popup 在三类场景下工作正常：视频页（读速/调速/频道卡）、非 B 站页面
  （优雅降级）、扩展安装前已打开的标签页（优雅降级）
- widget 齿轮开 options（background 的 `tabs.create`）仍正常

## Test Cases

- TC1: `pnpm build` 后检查 manifest.json 权限列表
- TC2: 三类场景手工过一遍 popup 全功能
- TC3: Firefox：`pnpm build:firefox` + `pnpm dev:firefox` 冒烟

## Related Documents / Designs

- `wxt.config.ts`、`docs/spec.md`（权限说明章节，若有需同步更新）

## Dependent Tasks

- 无

## Notes

- 若未来需要「只对当前标签页生效」的精细化功能，再评估 `activeTab`，
  仍不需要 `tabs`

## Implementation Notes (dev)

- `wxt.config.ts:9` permissions 改为 `['storage']`，仅此一行代码改动。
- tabs API 使用点逐一审计（`grep -rn "tabs" entrypoints/`），均不需要
  `tabs` 权限（只有读 url/title/favIconUrl 才需要）：
  - `popup/App.tsx` `fetchCurrentChannel` / `sendCurrentSpeed` /
    `fetchCurrentSpeed` / connect effect：`tabs.query({active,
    currentWindow})` 只取 `tabs[0].id`（id 始终可见，无需权限）；
    `tabs.sendMessage` / `tabs.connect` 按收发消息，均无需权限。
  - `popup/App.tsx` `openOptions`：`tabs.create({url})` 无需权限。
  - `background.ts`：`tabs.create({url: runtime.getURL(...)})` 无需权限。
  - `entrypoints/options/`：不使用 tabs API。
  - 结论：未发现任何读取 url/title/favIconUrl 的用法，无需上报 PM。
- `docs/` 全目录 grep "tabs"/"permission"/"权限"：无任何权限说明章节，
  无文档需同步。
- 验证结果：
  - `pnpm build` → `.output/chrome-mv3/manifest.json` permissions 为
    `["storage"]`，host_permissions 保留 `*://*.bilibili.com/*`。
  - `pnpm build:firefox` → `.output/firefox-mv2/manifest.json` permissions
    为 `["storage", "*://*.bilibili.com/*"]`（MV2 把 host_permissions 折叠
    进 permissions 是标准行为；同样不含 `tabs`）。
  - `pnpm test`：5 个测试文件 100/100 通过，无回归。
  - `./node_modules/.bin/tsc --noEmit`：0 错误。
  - `git diff`：仅 `wxt.config.ts`、`kanban/board.md`、本卡片，无超范围改动。
- 遗留（真机验证项）：TC2 三类场景（视频页 / 非 B 站页 / 扩展安装前
  已打开的标签页）与 TC3 `pnpm dev:firefox` 冒烟只能在真机确认；代码
  路径上无任何分支依赖被移除的权限（未改任何 JS 逻辑），风险为纯权限
  声明层面的理论风险。

## Review Comments (PM, 2026-09-30)

- 通过。改动为 manifest 一行;开发对 entrypoints/ 全量 grep 审计确认无任何
  url/title/favIconUrl 读取,popup 的 query 只取 tab.id(无需权限),
  sendMessage/connect/create 均免权限,理论回归风险为零

## QA Notes

- PM 独立核验两个构建产物 manifest:chrome-mv3 `["storage"]`,firefox-mv2
  `["storage", host_permission]`(MV2 折叠为标准行为),均无 "tabs"
- PM 独立复跑 `pnpm test`:100/100 全绿
- 待用户真机验收:TC2 三类场景(popup 在视频页/非 B 站页/预装标签页)、
  TC3 Firefox 冒烟;widget 齿轮开 options(background tabs.create)重点过
  一遍
