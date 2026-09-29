# D-7 移除不需要的 tabs 权限

> Status: Backlog (P1) — 来源：2026-09-29 代码评审

## Objective

`wxt.config.ts:9` 声明了 `"tabs"` 权限，但代码只用了 `tabs.query({active:
true, currentWindow: true})`、`tabs.sendMessage`、`tabs.create`、
`tabs.connect`——这些都不需要 `"tabs"` 权限（只有读取 url/title/
favIconUrl 才需要；popup 恰好不读这些字段）。删除权限可以降低商店审核摩
擦、减少安装时的权限警告、提升用户信任。

## Subtasks

- [ ] `wxt.config.ts` manifest permissions 改为 `['storage']`
- [ ] 逐一验证 popup 用到的 tabs API 在无 `tabs` 权限下的行为（query 返回
      的 tab 对象 id 可用；url/title 为 undefined 但代码未使用）
- [ ] Chrome 与 Firefox 双端验证

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
