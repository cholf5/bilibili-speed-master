# D-14 content.ts 拆分模块 + 共享常量收敛

> Status: Backlog (P3) — 来源：2026-09-29 代码评审

## Objective

`entrypoints/content.ts` 已达 1258 行单文件，混合了频道识别、速度调解、
widget、快捷键、统计、消息通路六块职责；同时 `SPEED_MIN/MAX/STEP`、
`clampSpeed`、`formatSpeed`、`normalizeAvatarUrl` 在 content / popup /
options 三处重复定义，已经开始漂移风险（popup 步进 0.1、键盘步进 0.25 的
不一致就藏在重复常量里）。拆分与收敛属于无行为变更的重构，为 D-9/D-15
铺路。

## Subtasks

- [ ] 常量与纯函数收敛进 `src/shared/`：速度范围/步进、clampSpeed、
      formatSpeed、normalizeAvatarUrl、formatWidgetSpeed
- [ ] content 拆为模块（建议 `src/content/`）：`channel-detect.ts`（含
      view API 解析）、`speed-core.ts`（programmaticRate/applied 调解）、
      `widget.ts`、`shortcuts.ts`、`stats.ts`、`messaging.ts`；
      `entrypoints/content.ts` 只留装配
- [ ] 全程纯重构：不改任何行为、不改消息协议、不改存储
- [ ] 模块边界处补必要的类型导出（ChannelInfo 等）

## Developer

cholf5 (AI-assisted)

## Estimated Complexity

M

## Acceptance Criteria

- `pnpm compile`、`pnpm build`、`pnpm build:firefox` 通过
- B-2/B-3/B-4 回归 + widget/快捷键冒烟全部通过（行为零变化）
- popup/options 不再自带重复常量定义，统一自 `src/shared/`
- 单文件不再超过 ~300 行（装配文件除外）

## Test Cases

- TC1: 回归 B-2/B-3/B-4 全部手工用例
- TC2: widget、快捷键、统计冒烟（对照各自原卡验收标准）
- TC3: 若 D-15 已先行，重构前后单测全绿

## Related Documents / Designs

- `kanban/issues/D-15-vitest-core-logic.md`、`D-9-configurable-shortcuts.md`

## Dependent Tasks

- 建议 D-15 先行（先有测试护栏再重构）；与 D-6 就近做可减少重复回归

## Notes

- 拆分顺序建议：先收敛 shared 常量（独立 PR 级小改），再动 content 结构
