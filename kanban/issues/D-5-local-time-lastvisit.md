# D-5 options 中 lastVisit 显示本地时间

> Status: To Do (P1) — 来源：2026-09-29 代码评审

## Objective

`entrypoints/options/App.tsx` 的 `formatTimestamp`（36-45 行）用
`toISOString().replace('T', ' ').slice(0, 19)` 格式化 `lastVisit`，输出的
是 UTC 时间且不带时区标注。中国用户（UTC+8）看到的「上次访问」与实际墙
钟相差 8 小时，具有误导性。

## Subtasks

- [ ] `formatTimestamp` 改为本地时区格式化（`toLocaleString` 或手工拼
      `YYYY-MM-DD HH:mm:ss` 本地分量），非法时间戳仍显示 `-`
- [ ] 若采用手工拼接，注意 padStart 补零；输出格式与现版本一致，仅时区
      语义变化

## Developer

cholf5 (AI-assisted)

## Estimated Complexity

S

## Acceptance Criteria

- options 页显示的「上次访问」与系统时钟一致（UTC+8 环境验证）
- 非法/缺失 `lastVisit` 仍显示 `-`

## Test Cases

- TC1: 访问一个视频后立即打开 options → 显示时间与当前墙钟误差 < 1 分钟
- TC2: 手工构造 `lastVisit: "not-a-date"` → 显示 `-`
- TC3: `pnpm compile` 通过

## Related Documents / Designs

- `docs/options.md`

## Dependent Tasks

- 无

## Notes

- 无新增 i18n：保持纯数字时间戳格式，避免各语言日期习惯的额外复杂度
