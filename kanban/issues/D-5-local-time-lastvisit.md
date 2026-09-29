# D-5 options 中 lastVisit 显示本地时间

> Status: Testing / QA (P1) — 来源：2026-09-29 代码评审

## Objective

`entrypoints/options/App.tsx` 的 `formatTimestamp`（36-45 行）用
`toISOString().replace('T', ' ').slice(0, 19)` 格式化 `lastVisit`，输出的
是 UTC 时间且不带时区标注。中国用户（UTC+8）看到的「上次访问」与实际墙
钟相差 8 小时，具有误导性。

## Subtasks

- [x] `formatTimestamp` 改为本地时区格式化（`toLocaleString` 或手工拼
      `YYYY-MM-DD HH:mm:ss` 本地分量），非法时间戳仍显示 `-`
- [x] 若采用手工拼接，注意 padStart 补零；输出格式与现版本一致，仅时区
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

## Implementation Notes (dev)

- `formatTimestamp`（`entrypoints/options/App.tsx`）改为手工拼本地时区分量
  （`getFullYear` / `getMonth+1` / `getDate` / `getHours` / `getMinutes` /
  `getSeconds`，`padStart` 补零，年份补到 4 位），输出仍是定宽
  `YYYY-MM-DD HH:mm:ss`，仅时区语义从 UTC 变为本地。未用 `toLocaleString`
  （避免语言环境相关的格式差异），非法/缺失时间戳仍返回 `-`。
- 函数加了 `export` 以便测试：新增 `entrypoints/options/App.test.ts` 直接
  从组件文件 import（shared 模块对 browser API 均为惰性访问，vitest 默认
  stub CSS，node 环境导入组件文件安全），组件文件其余代码未动。
- 新增 5 个用例：本地分量正确性（期望值在用例内用 `new Date(...)` 的本地
  分量拼出，不硬编码时区）、定宽 `YYYY-MM-DD HH:mm:ss` 格式、输出按本地
  时间回读等于原时刻（round-trip）、非法串 `-`（TC2）、undefined/空串 `-`。
  套件 95 → 100 全绿。
- UTC+8 本机行为对比（同一时刻）：旧输出 `2026-09-29 23:23:01`（UTC），
  新输出 `2026-09-30 07:23:01`，与系统墙钟一致 —— 卡片描述的 8 小时偏差
  已消除。
- 验证：`pnpm test` 100/100 绿；`./node_modules/.bin/tsc --noEmit` 0 错误
  （与 `pnpm compile` 等价，绕过包装脚本）；`pnpm build` 成功。
- TC1（浏览器内显示误差 < 1 分钟）需真机加载扩展，待 QA 真机验收；函数级
  等价验证已由单测覆盖。

## Review Comments (PM, 2026-09-30)

- 通过。最小 diff:本地分量手工拼接 + padStart 补零,输出形状不变,非法/
  缺失仍 '-'。选择"组件文件内 export"而非提取共享模块是合理的最小改动
- UTC+8 对照验证:旧实现 2026-09-29 23:23:01 vs 新实现 2026-09-30 07:23:01
  (同一时刻),8 小时偏差消除

## QA Notes

- PM 独立复跑 `pnpm test`:100/100 全绿(基线 95 + 新增 5)
- 待用户真机验收:TC1(打开 options 与墙钟对比)
